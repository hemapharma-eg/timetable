import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { 
  Play, Users, Settings, X, PlusCircle, CheckCircle, 
  Trash2, Edit3, Loader2, Save, Download, Copy,
  BarChart2, HelpCircle, UserCheck, MessageSquare,
  ChevronRight, ArrowRight, Share2, Rocket, Clock,
  Wifi, LogOut, Database, FileText, AlertCircle, Activity,
  ChevronLeft, ArrowLeft, XCircle, CheckSquare,
  Upload, Eye, Video, QrCode
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CourseAssessments({ session, userMeta, selectedCourse, isFaculty, isEditor, embeddedId = null }) {
  const [activeTab, setActiveTab] = useState(embeddedId ? 'live' : 'quizzes');
  const [assessments, setAssessments] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAssessment, setEditingAssessment] = useState(null);
  
  // Use session storage or room code in URL if present
  const [roomCode, setRoomCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || localStorage.getItem(`oc_room_${selectedCourse?.id}`) || '';
  });

  const userEmail = session?.user?.email;
  const userId = session?.user?.id;
  const studentName = userMeta?.full_name || userMeta?.name || userEmail;
  const studentId = userMeta?.student_id || '';

  useEffect(() => {
    if (selectedCourse?.id) {
      fetchData();
    }
    if (embeddedId) {
        supabase.from('oc_assessments').select('*').eq('id', embeddedId).single().then(res => {
            if (res.data) {
                // For embedded, we simulate an active room that is the assessment itself
                setActiveRoom({
                    id: `embedded_${embeddedId}`,
                    course_id: selectedCourse.id,
                    assessment_id: embeddedId,
                    assessment_state: {
                        ...res.data,
                        current_question_idx: 0,
                        show_results: false
                    }
                });
                setRoomCode(`embedded_${embeddedId}`);
            }
        });
    }
  }, [selectedCourse?.id, embeddedId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (isEditor) {
        const [resAssessments, resReports] = await Promise.all([
          supabase.from('oc_assessments').select('*').eq('course_id', selectedCourse.id).order('created_at', { ascending: false }),
          supabase.from('oc_reports').select('*').eq('course_id', selectedCourse.id).order('created_at', { ascending: false })
        ]);
        setAssessments(resAssessments.data || []);
        setReports(resReports.data || []);
      }
      
      // Also check for active rooms for this course regardless of role
      const { data: roomData } = await supabase
        .from('oc_rooms')
        .select('*')
        .eq('course_id', selectedCourse.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (roomData) {
        setRoomCode(roomData.id);
        setActiveRoom(roomData);
      }
    } catch (err) {
      console.error('Error fetching assessment data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!roomCode) return;

    const code = roomCode.toUpperCase();
    supabase.from('oc_rooms').select('*').eq('id', code).single().then(res => {
      if (res.data) {
        setActiveRoom(res.data);
        if (isEditor) {
          supabase.from('oc_responses').select('*').eq('room_id', code).then(r => {
            if (r.data) setResponses(r.data);
          });
        } else {
          // If student, check if they already have a response
          const respId = `${code}_${userEmail}`;
          supabase.from('oc_responses').select('*').eq('room_id', code).eq('user_email', userEmail).maybeSingle().then(r => {
            if (r.data) {
                // Pre-fill answers if they exist
            }
          });
        }
      } else {
        if (!isEditor) {
            setActiveRoom(null);
            setRoomCode('');
        }
      }
    });

    const roomSub = supabase.channel(`oc-room-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'oc_rooms', filter: `id=eq.${code}` }, p => {
        if (p.eventType === 'DELETE') {
            setActiveRoom(null);
            setRoomCode('');
            localStorage.removeItem(`oc_room_${selectedCourse.id}`);
        } else {
            setActiveRoom(p.new);
        }
      }).subscribe();

    if (isEditor) {
      const respSub = supabase.channel(`oc-resp-${code}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'oc_responses', filter: `room_id=eq.${code}` }, payload => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setResponses(prev => {
              const idx = prev.findIndex(r => r.id === payload.new.id);
              if (idx > -1) {
                const updated = [...prev];
                updated[idx] = payload.new;
                return updated;
              }
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'DELETE') {
            setResponses(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }).subscribe();
      return () => { supabase.removeChannel(roomSub); supabase.removeChannel(respSub); };
    }

    return () => { supabase.removeChannel(roomSub); };
  }, [roomCode, isEditor]);

  // Launch Assessment (Instructor Only)
  const handleLaunch = async (assessment) => {
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const roomData = {
      id: newCode,
      course_id: selectedCourse.id,
      assessment_id: assessment.id,
      type: assessment.type,
      assessment_state: { 
        ...assessment, 
        current_question_idx: 0, 
        show_results: false,
        is_live: true 
      },
      is_active: true,
      is_async: false,
      start_time: new Date().toISOString()
    };

    const { error } = await supabase.from('oc_rooms').insert(roomData);
    if (error) {
      alert("Error creating room: " + error.message);
    } else {
      setRoomCode(newCode);
      localStorage.setItem(`oc_room_${selectedCourse.id}`, newCode);
      setResponses([]);
      setActiveRoom(roomData);
      setActiveTab('live');
    }
  };

  const handleEndSession = async () => {
    if (!activeRoom) return;
    if (!window.confirm("Are you sure you want to end this live session? All results will be saved to reports.")) return;

    try {
      const reportData = {
        course_id: selectedCourse.id,
        assessment_id: activeRoom.assessment_id,
        title: activeRoom.assessment_state.title,
        type: activeRoom.type,
        report_data: {
          session_info: activeRoom,
          responses: responses,
          questions: activeRoom.assessment_state.questions
        }
      };

      await supabase.from('oc_reports').insert(reportData);
      await supabase.from('oc_rooms').delete().eq('id', roomCode);

      setActiveRoom(null);
      setRoomCode('');
      localStorage.removeItem(`oc_room_${selectedCourse.id}`);
      fetchData();
      setActiveTab('reports');
    } catch (err) {
      alert("Error saving report: " + err.message);
    }
  };

  const handleSaveAssessment = async (assessment) => {
    const { error } = await supabase.from('oc_assessments').upsert({
      ...assessment,
      course_id: selectedCourse.id
    });
    if (error) alert(error.message);
    else {
      setEditingAssessment(null);
      fetchData();
    }
  };

  const handleDeleteAssessment = async (id) => {
    if (!window.confirm("Delete this assessment?")) return;
    const { error } = await supabase.from('oc_assessments').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchData();
  };

  const submitResponse = async (qIdx, ans) => {
    if (!activeRoom) return;
    const respId = `${roomCode}_${userEmail}`;
    
    // Get existing answers
    const { data: existing } = await supabase.from('oc_responses').select('answers').eq('id', respId).maybeSingle();
    const nextAnswers = { ...(existing?.answers || {}), [qIdx]: ans };

    const { error } = await supabase.from('oc_responses').upsert({
      id: respId,
      room_id: roomCode,
      user_email: userEmail,
      student_name: studentName,
      student_id: studentId,
      answers: nextAnswers,
      submitted_at: new Date().toISOString()
    });
    if (error) console.error("Error submitting response:", error);
  };

  const updateRoomState = async (updates) => {
    if (!activeRoom) return;
    const { error } = await supabase.from('oc_rooms').update({
      assessment_state: { ...activeRoom.assessment_state, ...updates }
    }).eq('id', roomCode);
    if (error) console.error("Error updating room:", error);
  };

  if (isLoading) return <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-600" /></div>;

  // Render Student View if not an editor
  if (!isEditor) {
    if (activeRoom) {
      return (
        <StudentAssessmentView 
          session={activeRoom} 
          userEmail={userEmail} 
          onSubmit={submitResponse} 
        />
      );
    }
    return (
      <div className="p-20 text-center bg-white rounded-[2.5rem] border border-slate-200">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300"><Activity className="w-10 h-10" /></div>
        <h3 className="text-xl font-black text-slate-800">No Live Assessment</h3>
        <p className="text-slate-500 mt-2">There is no active quiz or poll currently running for this course.</p>
      </div>
    );
  }

  // Instructor Editor View
  if (editingAssessment) {
    return (
      <AssessmentEditor 
        assessment={editingAssessment} 
        onSave={handleSaveAssessment} 
        onCancel={() => setEditingAssessment(null)} 
      />
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-2">
            {[
                { id: 'quizzes', label: 'Quizzes', icon: HelpCircle, color: 'indigo' },
                { id: 'polls', label: 'Polls', icon: BarChart2, color: 'amber' },
                { id: 'attendance', label: 'Attendance', icon: UserCheck, color: 'emerald' },
                { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'purple' },
                { id: 'live', label: 'Live Session', icon: Activity, color: 'rose', disabled: !roomCode && !isEditor },
                { id: 'reports', label: 'Reports', icon: FileText, color: 'slate' }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    disabled={tab.disabled}
                    className={`flex items-center space-x-2 px-4 py-2 font-bold rounded-xl transition-all ${
                        activeTab === tab.id 
                        ? `bg-${tab.color}-50 text-${tab.color}-700 shadow-sm border border-${tab.color}-100` 
                        : 'text-slate-400 hover:bg-slate-50'
                    } ${tab.disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>
        
        {['quizzes', 'polls', 'attendance', 'feedback'].includes(activeTab) && (
            <div className="flex gap-3">
               <button 
                  onClick={() => {
                    const singular = 
                      activeTab === 'quizzes' ? 'Quiz' : 
                      activeTab === 'polls' ? 'Poll' : 
                      activeTab === 'attendance' ? 'Attendance' : 'Feedback';
                    setEditingAssessment({ 
                      title: `New ${singular}`, 
                      type: activeTab === 'quizzes' ? 'quiz' : 
                            activeTab === 'polls' ? 'poll' : 
                            activeTab === 'attendance' ? 'attendance' : 'feedback', 
                      questions: [],
                      mode: 'sync'
                    });
                  }}
                  className="flex items-center space-x-3 px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all transform hover:scale-105 whitespace-nowrap"
               >
                  <PlusCircle className="w-5 h-5" />
                  <span>Create {
                    activeTab === 'quizzes' ? 'Quiz' : 
                    activeTab === 'polls' ? 'Poll' : 
                    activeTab === 'attendance' ? 'Attendance' : 'Feedback'
                  }</span>
               </button>
            </div>
        )}
      </header>

      <main>
        {activeTab === 'live' ? (
            activeRoom ? (
                <LiveResults 
                  session={activeRoom} 
                  responses={responses} 
                  onEnd={handleEndSession} 
                  roomCode={roomCode} 
                />
            ) : (
                <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm text-center space-y-8 animate-in fade-in duration-500">
                    <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner"><Rocket className="w-12 h-12" /></div>
                    <div>
                        <h3 className="text-3xl font-black text-slate-800">Launch a Live Session</h3>
                        <p className="text-slate-500 max-w-md mx-auto mt-2 text-lg">Select one of your existing assessments below to start a real-time interactive session with your students.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        {assessments.map(a => (
                            <button key={a.id} onClick={() => handleLaunch(a)} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:border-indigo-600 transition-all group flex items-center justify-between text-left">
                                <div>
                                    <div className="font-black text-slate-800">{a.title}</div>
                                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{a.type} • {a.questions?.length || 0} items</div>
                                </div>
                                <ArrowRight className="text-slate-200 group-hover:text-indigo-600" />
                            </button>
                        ))}
                    </div>
                    {assessments.length === 0 && (
                        <p className="text-slate-400 italic">No assessments found. Create a quiz or poll first!</p>
                    )}
                </div>
            )
        ) : activeTab === 'reports' ? (
            <ReportsList reports={reports} />
        ) : (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[400px]">
                <h3 className="text-2xl font-black text-slate-800 capitalize mb-6">{activeTab}</h3>
                
                {assessments.filter(a => {
                    const type = 
                      activeTab === 'quizzes' ? 'quiz' : 
                      activeTab === 'polls' ? 'poll' : 
                      activeTab === 'attendance' ? 'attendance' : 'feedback';
                    return a.type === type;
                }).length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto">
                            <Database className="w-10 h-10" />
                        </div>
                        <h4 className="text-xl font-black text-slate-400">No {activeTab} created yet.</h4>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assessments.filter(a => {
                            const type = 
                              activeTab === 'quizzes' ? 'quiz' : 
                              activeTab === 'polls' ? 'poll' : 
                              activeTab === 'attendance' ? 'attendance' : 'feedback';
                            return a.type === type;
                        }).map(a => (
                            <div key={a.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all group flex flex-col justify-between">
                                <div>
                                  <h4 className="text-lg font-black text-slate-800 mb-2">{a.title}</h4>
                                  <span className="text-[10px] font-black uppercase text-slate-400">{a.questions?.length || 0} Questions</span>
                                </div>
                                <div className="flex items-center justify-between mt-8">
                                    <div className="flex space-x-2">
                                      <button onClick={() => setEditingAssessment(a)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteAssessment(a.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    <button 
                                        onClick={() => handleLaunch(a)}
                                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all transform group-hover:scale-105"
                                    >
                                        <Rocket className="w-4 h-4" />
                                        <span className="text-xs font-bold">Launch</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
}

function StudentAssessmentView({ session, userEmail, onSubmit }) {
    const [answers, setAnswers] = useState({});
    const [isFinished, setIsFinished] = useState(false);
    const qIdx = session.assessment_state.current_question_idx || 0;
    const q = session.assessment_state.questions[qIdx];
    const total = session.assessment_state.questions.length;

    // Fetch previous answers on join
    useEffect(() => {
        const respId = `${session.id}_${userEmail}`;
        supabase.from('oc_responses').select('answers').eq('id', respId).maybeSingle().then(res => {
            if (res.data?.answers) setAnswers(res.data.answers);
        });
    }, [session.id, userEmail]);

    const handleAnswer = (ans) => {
        setAnswers(prev => ({ ...prev, [qIdx]: ans }));
        onSubmit(qIdx, ans);
    };

    if (isFinished) {
        return (
            <div className="p-20 text-center bg-white rounded-[2.5rem] border border-slate-200 animate-in fade-in duration-700">
                <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
                <h3 className="text-3xl font-black text-slate-800">Assessment Complete</h3>
                <p className="text-slate-500 mt-2">Your responses have been saved. You can close this tab.</p>
            </div>
        );
    }

    if (!q) return <div className="p-20 text-center font-bold text-slate-400">Waiting for instructor to start...</div>;

    const isLocked = session.assessment_state.show_results;

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">
            <header className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
                <div>
                    <h2 className="font-black text-lg">{session.assessment_state.title}</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Item {qIdx + 1} of {total}</p>
                </div>
                <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest animate-pulse flex items-center gap-2">
                    <Activity size={14} /> Live
                </div>
            </header>

            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm min-h-[400px]">
                <h2 className="text-3xl font-black text-slate-800 text-center mb-12">{q.text}</h2>

                <div className="space-y-4">
                    {(q.type === 'mc' || q.type === 'tf') && q.options.map((opt, i) => {
                        const isSelected = answers[qIdx] === i;
                        let stateStyles = "border-slate-50 bg-slate-50 text-slate-700 hover:border-indigo-600 hover:bg-indigo-50";
                        
                        if (isLocked) {
                            if (q.correct === i && session.assessment_state.type === 'quiz') stateStyles = "border-emerald-500 bg-emerald-50 text-emerald-900";
                            else if (isSelected) stateStyles = "border-rose-400 bg-rose-50 text-rose-900 opacity-70";
                            else stateStyles = "border-slate-50 bg-slate-50 text-slate-300 opacity-50";
                        } else if (isSelected) {
                            stateStyles = "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-lg shadow-indigo-100";
                        }

                        return (
                            <button 
                                key={i}
                                disabled={isLocked}
                                onClick={() => handleAnswer(i)}
                                className={`w-full text-left p-6 rounded-[2rem] border-4 font-black text-xl transition-all flex items-center gap-6 ${stateStyles}`}
                            >
                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{String.fromCharCode(65+i)}</span>
                                {opt}
                            </button>
                        );
                    })}

                    {q.type === 'essay' && (
                        <textarea 
                            className="w-full bg-slate-50 p-8 rounded-[2rem] border-4 border-slate-100 focus:border-indigo-600 focus:bg-white text-2xl font-bold outline-none transition-all min-h-[200px]"
                            placeholder="Type your response here..."
                            value={answers[qIdx] || ''}
                            onChange={(e) => handleAnswer(e.target.value)}
                        />
                    )}
                </div>

                {isLocked && session.assessment_state.type === 'quiz' && (
                    <div className="mt-8 p-6 bg-amber-50 rounded-2xl border-2 border-amber-200 text-amber-800 font-bold text-center animate-in bounce-in duration-500">
                        Instructor is currently showing results.
                    </div>
                )}
            </div>
        </div>
    );
}

function AssessmentEditor({ assessment, onSave, onCancel }) {
  const [title, setTitle] = useState(assessment.title || '');
  const [questions, setQuestions] = useState(assessment.questions || []);

  const addQuestion = (type = 'mc') => {
    setQuestions([...questions, {
      id: Date.now(),
      type: type,
      text: '',
      options: type === 'mc' ? ['', '', '', ''] : (type === 'tf' ? ['True', 'False'] : []),
      correct: 0
    }]);
  };

  const removeQuestion = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx, data) => {
    const newQs = [...questions];
    newQs[idx] = { ...newQs[idx], ...data };
    setQuestions(newQs);
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
      <div className="p-8 bg-slate-50 border-b flex items-center justify-between gap-6">
        <div className="flex-1">
          <input 
            className="bg-transparent text-3xl font-black text-slate-800 w-full focus:outline-none border-b-2 border-transparent focus:border-indigo-600 transition-all"
            placeholder="Assessment Title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <div className="text-[10px] font-black uppercase text-indigo-400 mt-2 tracking-widest">{assessment.type} EDITOR</div>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white rounded-2xl border border-slate-200 p-1">
             {['sync', 'async', 'video'].map(m => (
                <button key={m} onClick={() => onSave({ ...assessment, title, questions, mode: m })} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${assessment.mode === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{m}</button>
             ))}
          </div>
          <button onClick={onCancel} className="px-6 py-2.5 font-bold text-slate-400 hover:text-slate-600">Discard</button>
          <button onClick={() => onSave({ ...assessment, title, questions, mode: assessment.mode || 'sync' })} className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center gap-2">
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar bg-slate-50/20">
        {questions.map((q, idx) => (
          <div key={q.id} className="p-8 bg-white rounded-[2.5rem] border border-slate-200 relative group hover:shadow-xl transition-all">
            <button onClick={() => removeQuestion(idx)} className="absolute top-6 right-6 text-slate-300 hover:text-rose-500"><Trash2 size={20} /></button>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4">Question {idx + 1} • {q.type}</div>
            
            <textarea 
              className="w-full bg-slate-50 p-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-50 border-2 border-slate-100 mb-6 font-bold text-slate-700"
              placeholder="Type your question here..."
              value={q.text}
              onChange={e => updateQuestion(idx, { text: e.target.value })}
            />

            {q.type === 'mc' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${q.correct === oIdx ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white'}`}>
                    <input type="radio" className="w-5 h-5 accent-indigo-600" checked={q.correct === oIdx} onChange={() => updateQuestion(idx, { correct: oIdx })} />
                    <input 
                      className="bg-transparent w-full font-bold text-slate-600 focus:outline-none" 
                      value={opt} 
                      onChange={e => {
                        const newOpts = [...q.options];
                        newOpts[oIdx] = e.target.value;
                        updateQuestion(idx, { options: newOpts });
                      }}
                      placeholder={`Option ${oIdx + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {q.type === 'tf' && (
              <div className="flex gap-4">
                {['True', 'False'].map((v, oIdx) => (
                  <button 
                    key={v} 
                    onClick={() => updateQuestion(idx, { correct: oIdx })}
                    className={`flex-1 py-5 rounded-2xl border-2 font-black transition-all ${q.correct === oIdx ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 text-slate-300'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
            
            {q.type === 'essay' && (
                <div className="p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center text-slate-400 font-bold text-sm">
                    Student will see a large text area for their response.
                </div>
            )}
          </div>
        ))}

        <div className="flex justify-center gap-4 py-10 border-t border-dashed border-slate-200">
          <button onClick={() => addQuestion('mc')} className="px-6 py-3 border-2 border-indigo-200 text-indigo-600 rounded-2xl font-black hover:bg-indigo-50 transition-all text-xs uppercase tracking-widest">+ Multiple Choice</button>
          <button onClick={() => addQuestion('tf')} className="px-6 py-3 border-2 border-indigo-200 text-indigo-600 rounded-2xl font-black hover:bg-indigo-50 transition-all text-xs uppercase tracking-widest">+ True/False</button>
          <button onClick={() => addQuestion('essay')} className="px-6 py-3 border-2 border-indigo-200 text-indigo-600 rounded-2xl font-black hover:bg-indigo-50 transition-all text-xs uppercase tracking-widest">+ Essay/Feedback</button>
        </div>
      </div>
    </div>
  );
}

function LiveResults({ session, responses, onEnd, roomCode }) {
    const [showQR, setShowQR] = useState(true);
    const total = session.assessment_state.questions?.length || 0;
    const qIdx = Math.min(session.assessment_state.current_question_idx || 0, Math.max(0, total - 1));
    const q = total > 0 ? session.assessment_state.questions[qIdx] : null;

    const joinUrl = `${window.location.origin}${window.location.pathname}?course=${session.course_id}&room=${roomCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`;

    const handleNext = async () => {
        if (qIdx < total - 1) {
            await supabase.from('oc_rooms').update({
                assessment_state: { ...session.assessment_state, current_question_idx: qIdx + 1, show_results: false }
            }).eq('id', roomCode);
        }
    };

    const handlePrev = async () => {
        if (qIdx > 0) {
            await supabase.from('oc_rooms').update({
                assessment_state: { ...session.assessment_state, current_question_idx: qIdx - 1, show_results: false }
            }).eq('id', roomCode);
        }
    };

    const toggleResults = async () => {
        await supabase.from('oc_rooms').update({
            assessment_state: { ...session.assessment_state, show_results: !session.assessment_state.show_results }
        }).eq('id', roomCode);
    };

    const currentResponses = responses.filter(r => r.answers && r.answers[qIdx] !== undefined);

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-2xl font-black">{session.assessment_state.title}</h2>
                    <div className="flex items-center gap-4 mt-1">
                        <span className="text-rose-500 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest animate-pulse"><Activity size={12}/> Live</span>
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest border-l border-slate-800 pl-4">{responses.length} Participants</span>
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest border-l border-slate-800 pl-4">Room: {roomCode}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowQR(!showQR)} className="p-3 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all"><QrCode size={20} /></button>
                    <button onClick={onEnd} className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-rose-900/20">Close Room</button>
                </div>
            </div>

            {showQR && (
                <div className="bg-indigo-600 text-white p-10 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-center gap-12 text-center md:text-left animate-in slide-in-from-top duration-500">
                    <img src={qrUrl} className="w-44 h-44 border-8 border-white/20 rounded-3xl shadow-2xl" />
                    <div>
                        <h3 className="text-4xl font-black mb-2">Join Assessment</h3>
                        <p className="text-indigo-200 mb-8 font-bold text-lg">Scan or enter the room code to join the live session.</p>
                        <div className="text-5xl font-black tracking-[0.3em] bg-white text-indigo-600 px-10 py-4 rounded-3xl shadow-2xl inline-block">{roomCode}</div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 text-center">Question {qIdx + 1} of {total}</div>
                        <h2 className="text-4xl font-black text-slate-800 text-center mb-12">{q?.text}</h2>

                        {session.assessment_state.show_results ? (
                            <div className="flex-1 animate-in fade-in duration-500">
                                {(q?.type === 'mc' || q?.type === 'tf') && (
                                    <div className="space-y-4">
                                        {q.options.map((opt, i) => {
                                            const count = currentResponses.filter(r => Number(r.answers[qIdx]) === i).length;
                                            const percent = currentResponses.length > 0 ? (count / currentResponses.length) * 100 : 0;
                                            const isCorrect = q.correct === i && session.assessment_state.type === 'quiz';
                                            return (
                                                <div key={i} className="relative h-16 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                                                    <div className={`absolute inset-y-0 left-0 transition-all duration-1000 ${isCorrect ? 'bg-emerald-500/20' : 'bg-indigo-500/10'}`} style={{ width: `${percent}%` }}></div>
                                                    <div className="absolute inset-0 px-6 flex items-center justify-between font-bold">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs text-white ${isCorrect ? 'bg-emerald-600' : 'bg-slate-700'}`}>{String.fromCharCode(65+i)}</span>
                                                            <span className="text-slate-700">{opt}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-slate-400 text-xs">{count} responses</span>
                                                            <span className="text-xl font-black text-slate-800">{Math.round(percent)}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {q?.type === 'essay' && (
                                    <div className="space-y-3">
                                        {currentResponses.map((r, i) => (
                                            <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <p className="font-bold text-slate-700">{r.answers[qIdx]}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{r.student_name}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center py-20">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                    <CheckSquare className="w-10 h-10 text-slate-300" />
                                </div>
                                <p className="text-xl font-black text-slate-300 uppercase tracking-widest">Responses are being collected...</p>
                                <p className="text-slate-400 font-bold mt-2">{currentResponses.length} of {responses.length} students have answered.</p>
                            </div>
                        )}

                        <div className="mt-12 flex justify-between items-center pt-8 border-t border-slate-50">
                            <button onClick={handlePrev} disabled={qIdx === 0} className="p-4 rounded-2xl bg-slate-100 text-slate-400 hover:bg-slate-200 disabled:opacity-30"><ChevronLeft/></button>
                            <button onClick={toggleResults} className={`px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${session.assessment_state.show_results ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50'}`}>
                                {session.assessment_state.show_results ? 'Hide Results' : 'Show Results'}
                            </button>
                            <button onClick={handleNext} disabled={qIdx === total - 1} className="p-4 rounded-2xl bg-slate-100 text-slate-400 hover:bg-slate-200 disabled:opacity-30"><ChevronRight/></button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                        <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 tracking-tighter uppercase text-xs text-slate-400"><Users className="w-4 h-4" /> Participants</h3>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto no-scrollbar">
                            {responses.map(r => {
                                const answered = r.answers && r.answers[qIdx] !== undefined;
                                return (
                                    <div key={r.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${answered ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">{r.student_name}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{r.student_id}</div>
                                            </div>
                                        </div>
                                        {answered && <CheckCircle className="text-emerald-500 w-4 h-4" />}
                                    </div>
                                );
                            })}
                            {responses.length === 0 && <p className="text-center py-10 text-slate-300 font-bold text-sm italic">Waiting for students to join...</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ReportsList({ reports }) {
    const [selectedReport, setSelectedReport] = useState(null);

    if (selectedReport) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button 
                    onClick={() => setSelectedReport(null)}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold transition-all"
                >
                    <ArrowLeft size={16} /> Back to Reports
                </button>

                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">{selectedReport.type} Report</span>
                            <h2 className="text-4xl font-black text-slate-800">{selectedReport.title}</h2>
                            <p className="text-slate-400 font-bold mt-1">Generated on {new Date(selectedReport.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-black text-indigo-600">{selectedReport.report_data?.responses?.length || 0}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Responses</div>
                        </div>
                    </div>

                    <div className="space-y-12">
                        {selectedReport.report_data?.questions?.map((q, qIdx) => (
                            <div key={qIdx} className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <span className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs">{qIdx + 1}</span>
                                    <h3 className="text-xl font-black text-slate-700">{q.text}</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        {q.options?.map((opt, oIdx) => {
                                            const responses = selectedReport.report_data?.responses || [];
                                            const count = responses.filter(r => Number(r.answers?.[qIdx]) === oIdx).length;
                                            const percent = responses.length > 0 ? (count / responses.length) * 100 : 0;
                                            const isCorrect = q.correct === oIdx;

                                            return (
                                                <div key={oIdx} className="relative h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                                                    <div className={`absolute inset-y-0 left-0 ${isCorrect ? 'bg-emerald-500/10' : 'bg-indigo-500/5'}`} style={{ width: `${percent}%` }}></div>
                                                    <div className="absolute inset-0 px-4 flex items-center justify-between text-xs font-bold">
                                                        <span className={isCorrect ? 'text-emerald-700' : 'text-slate-600'}>{opt}</span>
                                                        <span className="text-slate-400">{Math.round(percent)}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {!q.options && (
                                            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold italic">
                                                Open-ended or essay response question.
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Participant Answers</h4>
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                                            {selectedReport.report_data?.responses?.map((r, rIdx) => (
                                                <div key={rIdx} className="flex justify-between items-center text-[11px] font-bold py-1 border-b border-slate-200/50">
                                                    <span className="text-slate-600">{r.student_name}</span>
                                                    <span className="text-indigo-600">
                                                        {q.type === 'essay' ? (r.answers?.[qIdx]?.substring(0, 20) + '...') : (q.options?.[r.answers?.[qIdx]] || 'No Answer')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (reports.length === 0) return (
        <div className="bg-white p-20 text-center rounded-[2.5rem] border border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300"><FileText className="w-10 h-10" /></div>
            <h4 className="text-xl font-black text-slate-400">No Reports Available</h4>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map(r => (
                <div key={r.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            r.type === 'quiz' ? 'bg-indigo-50 text-indigo-600' :
                            r.type === 'poll' ? 'bg-amber-50 text-amber-600' :
                            r.type === 'attendance' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'
                        }`}>{r.type}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-xl font-black text-slate-800 mb-6">{r.title}</h4>
                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{r.report_data?.responses?.length || 0} Responses</span>
                        <button 
                            onClick={() => setSelectedReport(r)}
                            className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                        >
                            View Report <ArrowRight size={14}/>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
