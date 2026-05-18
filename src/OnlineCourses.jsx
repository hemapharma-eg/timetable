import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit3, Trash2, ChevronLeft, ChevronRight, Play, BookOpen, 
  Settings, Users, Download, Upload, Check, X, FileText, 
  Database, Video, Share2, Rocket, Clock, LogOut, Shield,
  Activity, HelpCircle, BarChart2, UserCheck, MessageSquare
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import RichTextEditor from './RichTextEditor';
import CourseAssessments from './CourseAssessments';

export default function OnlineCourses({ session, userMeta }) {
  const [view, setView] = useState('projects'); 
  const [builderTab, setBuilderTab] = useState('curriculum');
  const [courses, setCourses] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // States
  const [lessons, setLessons] = useState([]);
  const [questionBank, setQuestionBank] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courseClasses, setCourseClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [newCollaborator, setNewCollaborator] = useState('');
  const [newClass, setNewClass] = useState('');
  const [newStudent, setNewStudent] = useState({ student_id: '', name: '', email: '' });
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editingStudent, setEditingStudent] = useState({ student_id: '', name: '', email: '' });

  const userEmail = session?.user?.email;
  const userId = session?.user?.id;
  const isFaculty = userMeta?.role === 'faculty' || userMeta?.role === 'technical_admin' || userMeta?.role === 'academic_admin';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('course') || localStorage.getItem('oc_active_course');
    if (courseId) {
      handleLoadCourse(courseId);
    } else {
      fetchMyProjects();
    }
  }, [userId, userEmail]);

  const fetchMyProjects = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('oc_courses')
        .select(`*, oc_collaborators(user_email), oc_course_classes(class_id)`);
      if (error) throw error;
      
      let myClassIds = [];
      if (!isFaculty) {
        const { data: myClasses } = await supabase
          .from('oc_class_students')
          .select('class_id')
          .ilike('user_email', userEmail);
        myClassIds = myClasses?.map(c => c.class_id) || [];
      }

      const filtered = data.filter(c => {
        if (isFaculty) {
          return c.instructor_id === userId || c.oc_collaborators?.some(col => col.user_email?.toLowerCase() === userEmail?.toLowerCase());
        } else {
          return c.status !== 'draft' && c.oc_course_classes?.some(cc => myClassIds.includes(cc.class_id));
        }
      });
      setCourses(filtered || []);
      
      const { data: assessData } = await supabase.from('oc_assessments').select('*').order('created_at', { ascending: false });
      setAssessments(assessData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadCourse = async (id) => {
    setIsLoading(true);
    try {
      const { data: course, error } = await supabase
        .from('oc_courses')
        .select('*, oc_lessons(*, oc_activities(*)), oc_questions(*), oc_collaborators(*), oc_course_classes(*)')
        .eq('id', id)
        .single();
      
      if (error) throw error;

      setSelectedCourse(course);
      setLessons(course.oc_lessons?.sort((a,b) => a.order_index - b.order_index).map(l => ({
        ...l,
        oc_activities: l.oc_activities?.sort((a,b) => a.order_index - b.order_index) || []
      })) || []);
      setQuestionBank(course.oc_questions || []);
      setCollaborators(course.oc_collaborators || []);
      setCourseClasses(course.oc_course_classes?.map(cc => cc.class_id) || []);

      const isEditor = isFaculty && (course.instructor_id === userId || course.oc_collaborators?.some(c => c.user_email === userEmail));
      if (isEditor) {
        const { data: myClasses } = await supabase.from('oc_classes').select('*').eq('instructor_id', userId);
        setClasses(myClasses || []);
        setView('builder');
      } else {
        if (course.oc_course_classes && course.oc_course_classes.length > 0) {
          const classIds = course.oc_course_classes.map(c => c.class_id);
          const { data: myEnrollment } = await supabase
            .from('oc_class_students')
            .select('*')
            .in('class_id', classIds)
            .ilike('user_email', userEmail)
            .limit(1)
            .maybeSingle();

          if (myEnrollment && (myEnrollment.status === 'invited' || (myEnrollment.is_approved && myEnrollment.status !== 'active'))) {
            await supabase.from('oc_class_students').update({ status: 'active', is_approved: true }).eq('id', myEnrollment.id);
          }
        }
        setView('player');
      }
    } catch (err) {
      console.error('Error loading course:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProject = async () => {
    setIsSaving(true);
    try {
      await supabase.from('oc_courses').update({ title: selectedCourse.title, description: selectedCourse.description }).eq('id', selectedCourse.id);
      
      for (let i = 0; i < lessons.length; i++) {
        const lObj = { course_id: selectedCourse.id, title: lessons[i].title, order_index: i };
        if (lessons[i].id && !lessons[i].id.toString().startsWith('temp_')) lObj.id = lessons[i].id;
        const { data: lesson } = await supabase.from('oc_lessons').upsert(lObj).select().single();

        if (lessons[i].oc_activities?.length > 0) {
          const acts = lessons[i].oc_activities.map((a, j) => {
            const aObj = { lesson_id: lesson.id, title: a.title, type: a.type, content: a.content, resource_url: a.resource_url, question_id: a.question_id || null, order_index: j };
            if (a.id && !a.id.toString().startsWith('temp_')) aObj.id = a.id;
            return aObj;
          });
          await supabase.from('oc_activities').upsert(acts);
        }
      }
      alert('Project saved!');
      handleLoadCourse(selectedCourse.id);
    } catch (err) {
      alert(`Save Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateClass = async () => {
    if (!newClass) return alert('Class name required');
    const { data, error } = await supabase.from('oc_classes').insert({ name: newClass, instructor_id: userId }).select().single();
    if (error) alert(error.message);
    else {
      setClasses([...classes, data]);
      setNewClass('');
    }
  };

  const toggleClassMap = async (classId) => {
    const isMapped = courseClasses.includes(classId);
    if (isMapped) {
      await supabase.from('oc_course_classes').delete().eq('course_id', selectedCourse.id).eq('class_id', classId);
      setCourseClasses(courseClasses.filter(id => id !== classId));
    } else {
      await supabase.from('oc_course_classes').insert({ course_id: selectedCourse.id, class_id: classId });
      setCourseClasses([...courseClasses, classId]);
    }
  };

  const loadClassStudents = async (classId) => {
    const { data } = await supabase.from('oc_class_students').select('*').eq('class_id', classId);
    setClassStudents(data || []);
    setSelectedClass(classes.find(c => c.id === classId));
  };

  const handleAddStudentToClass = async () => {
    if (!selectedClass) return;
    if (!newStudent.email || !newStudent.student_id) return alert('Student ID and Email are required.');
    const { error } = await supabase.from('oc_class_students').insert({
      class_id: selectedClass.id,
      user_email: newStudent.email,
      full_name: newStudent.name,
      student_id: newStudent.student_id,
      status: 'active',
      is_approved: true
    });
    if (error) alert(error.message);
    else { 
      setNewStudent({ student_id: '', name: '', email: '' }); 
      loadClassStudents(selectedClass.id);
    }
  };

  const approveStudent = async (id) => {
    const { error } = await supabase.from('oc_class_students').update({ is_approved: true, status: 'active' }).eq('id', id);
    if (error) alert(error.message);
    else loadClassStudents(selectedClass.id);
  };

  const importStudentsToClass = (e) => {
    if (!selectedClass) return alert("Select a class first");
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      const imports = data.map(s => ({ 
        user_email: s.Email, 
        full_name: s.Name,
        student_id: s['Student ID'] || s.StudentID || s.ID ? String(s['Student ID'] || s.StudentID || s.ID) : null,
        class_id: selectedClass.id, 
        status: 'invited',
        is_approved: true 
      }));
      const { error } = await supabase.from('oc_class_students').upsert(imports, { onConflict: 'user_email,class_id' });
      if (error) alert(error.message);
      else { alert(`${data.length} students imported!`); loadClassStudents(selectedClass.id); }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddCollaborator = async () => {
    if (!newCollaborator) return;
    const { error } = await supabase.from('oc_collaborators').insert({ course_id: selectedCourse.id, user_email: newCollaborator });
    if (error) alert(error.message);
    else { setNewCollaborator(''); handleLoadCourse(selectedCourse.id); }
  };

  const removeCollaborator = async (id) => {
    const { error } = await supabase.from('oc_collaborators').delete().eq('id', id);
    if (error) alert(error.message);
    else handleLoadCourse(selectedCourse.id);
  };

  const renderProjects = () => (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 w-full px-8 lg:px-12">
      <div className="flex justify-between items-end border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">{isFaculty ? 'Course Architect' : 'My Learning Hub'}</h1>
          <p className="text-slate-500 mt-2 text-lg">{isFaculty ? 'Build and manage your online learning modules.' : 'Access and track your enrolled courses.'}</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchMyProjects} className="p-4 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-indigo-600 transition-all"><Clock className="w-5 h-5" /></button>
          {isFaculty && (
            <>
              <button onClick={() => setView('classes')} className="px-6 py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center"><Users className="mr-3 w-5 h-5" /> Manage Classes</button>
              <button onClick={async () => {
                if (!userId) return alert('Please sign in to create a project.');
                const { data, error } = await supabase.from('oc_courses').insert({ title: 'Untitled Course', instructor_id: userId }).select().single();
                if (error) alert(`Error creating project: ${error.message}`);
                else if (data) handleLoadCourse(data.id);
              }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center"><Plus className="mr-3 w-5 h-5" /> Start New Project</button>
            </>
          )}
        </div>
      </div>

      {courses?.length === 0 ? (
        <div className="py-20 text-center space-y-4">
           <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 mx-auto"><BookOpen className="w-10 h-10" /></div>
           <h3 className="text-xl font-black text-slate-400">{isFaculty ? 'No projects found.' : 'No enrolled courses.'}</h3>
           <p className="text-slate-400 text-sm max-w-xs mx-auto">{isFaculty ? 'Click the button above to start building your first online course.' : 'You have not been added to any courses yet. Please wait for an instructor to invite you.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
          {courses?.map(course => (
            <div key={course.id} className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 shadow-inner"><BookOpen className="w-7 h-7" /></div>
              <h3 className="text-2xl font-black text-slate-800 mb-3">{course.title}</h3>
              <p className="text-slate-500 text-sm mb-8 line-clamp-2">{course.description || 'No description provided.'}</p>
              <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                 <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{course.status}</span>
                 <button onClick={() => handleLoadCourse(course.id)} className="px-5 py-2.5 bg-slate-50 text-slate-700 font-black text-xs rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-slate-100">Open Project</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderBuilder = () => (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <header className="h-20 shrink-0 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-30">
        <div className="flex items-center space-x-6">
           <button onClick={() => setView('projects')} className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
           <input type="text" value={selectedCourse?.title || ''} onChange={e => setSelectedCourse({...selectedCourse, title: e.target.value})} className="text-xl font-black text-slate-800 outline-none focus:bg-slate-50 px-3 py-1 rounded-lg transition-all max-w-md" />
        </div>
        <div className="flex items-center space-x-3">
           <button onClick={() => {
              setPlayerStarted(false);
              setView('player');
           }} className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-xl hover:bg-emerald-100 transition-all"><BookOpen className="w-4 h-4" /> <span>Preview</span></button>
           <button onClick={saveProject} disabled={isSaving} className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white font-black text-xs rounded-xl shadow-lg hover:bg-indigo-700 transition-all">
              {isSaving ? <span className="animate-pulse">Saving...</span> : <><Check className="w-4 h-4" /> <span>Save Project</span></>}
           </button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
         <aside className="w-64 bg-white border-r border-slate-200 p-6 space-y-2 shrink-0">
            <button onClick={() => setBuilderTab('curriculum')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${builderTab === 'curriculum' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><BookOpen className="w-4 h-4" /> <span>Curriculum</span></button>
            <button onClick={() => setBuilderTab('assessments')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${builderTab === 'assessments' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><BarChart2 className="w-4 h-4" /> <span>Assessments</span></button>
            <button onClick={() => setBuilderTab('collaborators')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${builderTab === 'collaborators' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Users className="w-4 h-4" /> <span>Collaborators</span></button>
            <button onClick={() => setBuilderTab('classes')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${builderTab === 'classes' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><UserCheck className="w-4 h-4" /> <span>Map Classes</span></button>
         </aside>
         <main className="flex-1 overflow-y-auto bg-slate-50/30 p-10">
            {builderTab === 'curriculum' && (
               <div className="w-full space-y-6">
                  {lessons?.map((lesson, lIdx) => (
                    <div key={lIdx} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
                       <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                          <input className="bg-transparent font-black text-slate-800 text-lg outline-none focus:bg-white px-2 rounded w-full" value={lesson.title} onChange={e => { const newL = [...lessons]; newL[lIdx].title = e.target.value; setLessons(newL); }} />
                          <button onClick={() => setLessons(lessons.filter((_, i) => i !== lIdx))} className="text-slate-300 hover:text-rose-500 ml-4"><Trash2 className="w-4 h-4" /></button>
                       </div>
                       <div className="p-6 space-y-4">
                          {lesson.oc_activities?.map((act, aIdx) => (
                            <div key={aIdx} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 relative group">
                               <button onClick={() => { const newL = [...lessons]; newL[lIdx].oc_activities = newL[lIdx].oc_activities.filter((_, i) => i !== aIdx); setLessons(newL); }} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4" /></button>
                               <div className="flex items-center space-x-3 mb-4">
                                  {act.type === 'video' && <Video className="w-4 h-4 text-indigo-500" />}
                                  {act.type === 'text' && <FileText className="w-4 h-4 text-emerald-500" />}
                                  <input className="font-bold text-sm bg-transparent outline-none flex-1" value={act.title} onChange={e => { const newL = [...lessons]; newL[lIdx].oc_activities[aIdx].title = e.target.value; setLessons(newL); }} />
                               </div>
                               {act.type === 'text' && <RichTextEditor value={act.content} onChange={val => { const newL = [...lessons]; newL[lIdx].oc_activities[aIdx].content = val; setLessons(newL); }} />}
                               {act.type === 'video' && <input className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none" placeholder="Video URL" value={act.resource_url || ''} onChange={e => { const newL = [...lessons]; newL[lIdx].oc_activities[aIdx].resource_url = e.target.value; setLessons(newL); }} />}
                               {act.type === 'assessment' && (
                                 <select 
                                   className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none font-bold"
                                   value={act.resource_url || ''}
                                   onChange={e => {
                                     const newL = [...lessons];
                                     newL[lIdx].oc_activities[aIdx].resource_url = e.target.value;
                                     const selected = assessments.find(as => as.id === e.target.value);
                                     if (selected) newL[lIdx].oc_activities[aIdx].title = selected.title;
                                     setLessons(newL);
                                   }}
                                 >
                                   <option value="">Select Poll/Quiz...</option>
                                   {assessments.map(as => <option key={as.id} value={as.id}>{as.title} ({as.type})</option>)}
                                 </select>
                               )}
                            </div>
                          ))}
                          <div className="flex flex-wrap gap-2 pt-2">
                             {['video', 'text', 'assessment'].map(type => (
                               <button key={type} onClick={() => { const newL = [...lessons]; if(!newL[lIdx].oc_activities) newL[lIdx].oc_activities = []; newL[lIdx].oc_activities.push({ title: `New ${type}`, type }); setLessons(newL); }} className="px-3 py-1.5 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">+ {type === 'assessment' ? 'Poll/Quiz' : type}</button>
                             ))}
                          </div>
                       </div>
                    </div>
                  ))}
                  <button onClick={() => setLessons([...lessons, { title: 'New Lesson', oc_activities: [] }])} className="w-full py-8 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-bold hover:bg-white hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center space-x-2"><Plus className="w-6 h-6" /> <span>Add Lesson</span></button>
               </div>
            )}
            {builderTab === 'collaborators' && (
               <div className="w-full space-y-6">
                  <header><h2 className="text-2xl font-black text-slate-800">Collaborators</h2><p className="text-slate-500 text-sm">Add other instructors to help manage this course.</p></header>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex gap-3">
                     <input type="email" placeholder="Instructor Email" className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newCollaborator} onChange={e => setNewCollaborator(e.target.value)} />
                     <button onClick={handleAddCollaborator} className="px-6 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700">Add Collaborator</button>
                  </div>
                  <div className="space-y-4">
                     {collaborators.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl">
                           <span className="font-bold text-slate-700">{c.user_email}</span>
                           <button onClick={() => removeCollaborator(c.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>
                        </div>
                     ))}
                  </div>
               </div>
            )}
            {builderTab === 'assessments' && (
               <CourseAssessments 
                  session={session} 
                  userMeta={userMeta} 
                  selectedCourse={selectedCourse} 
                  isFaculty={isFaculty} 
                  isEditor={true} 
               />
            )}
            {builderTab === 'classes' && (
               <div className="w-full space-y-8">
                  <header>
                     <h2 className="text-2xl font-black text-slate-800">Classes</h2>
                     <p className="text-slate-500 text-sm">Create classes, map them to this course, and manage enrollments.</p>
                  </header>
                  
                  {!selectedClass ? (
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex gap-3">
                         <input type="text" placeholder="New Class Name" className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newClass} onChange={e => setNewClass(e.target.value)} />
                         <button onClick={handleCreateClass} className="px-6 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700">Create Class</button>
                      </div>

                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                         <h3 className="font-bold text-slate-700">Your Classes</h3>
                         {classes.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                               <div className="flex items-center gap-4">
                                 <input type="checkbox" checked={courseClasses.includes(c.id)} onChange={() => toggleClassMap(c.id)} />
                                 <span className="font-bold text-slate-800">{c.name}</span>
                               </div>
                               <button onClick={() => loadClassStudents(c.id)} className="text-indigo-600 text-xs font-bold underline">Manage Students</button>
                            </div>
                         ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-4">
                        <button onClick={() => { setSelectedClass(null); setClassStudents([]); }} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"><ChevronLeft className="w-5 h-5" /></button>
                        <h3 className="text-xl font-black text-slate-800">Managing: {selectedClass.name}</h3>
                      </div>
                      
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                            <input type="text" placeholder="Student ID" className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newStudent.student_id} onChange={e => setNewStudent({...newStudent, student_id: e.target.value})} />
                            <input type="text" placeholder="Student Name" className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                            <input type="email" placeholder="Student Email" className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
                            <button onClick={handleAddStudentToClass} className="px-6 bg-emerald-600 text-white font-black rounded-xl">Add Student</button>
                         </div>
                      </div>
                    </div>
                  )}
               </div>
            )}
         </main>
      </div>
    </div>
  );

  const [playerTab, setPlayerTab] = useState('content');
  const [playerStarted, setPlayerStarted] = useState(false);
  const [activeLesson, setActiveLesson] = useState(0);
  const [activeActivity, setActiveActivity] = useState(0);

  const renderPlayer = () => {
    const isEditor = isFaculty && (selectedCourse?.instructor_id === userId || collaborators?.some(c => c.user_email === userEmail));
    
    const handleStudentSignOut = () => {
      supabase.auth.signOut();
    };

    const logoutBtn = !isEditor ? (
      <button onClick={handleStudentSignOut} className="flex items-center space-x-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-xl hover:bg-rose-600 hover:text-white transition-all text-xs font-bold">
        <LogOut className="w-4 h-4" /> <span>Sign Out</span>
      </button>
    ) : (
      <button onClick={() => setView('builder')} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-xs font-black shadow-lg">
        <ChevronLeft className="w-4 h-4" /> <span>Exit Preview</span>
      </button>
    );

    if (!playerStarted) {
      return (
        <div className="h-screen w-full flex flex-col bg-slate-900 text-white overflow-hidden">
            <header className="h-16 shrink-0 bg-slate-800 border-b border-slate-700 px-8 flex items-center justify-between">
              <h2 className="font-black tracking-tight">{selectedCourse?.title}</h2>
              {logoutBtn}
           </header>
           <div className="flex-1 flex flex-col items-center justify-center p-10">
              <Play className="w-24 h-24 text-indigo-500 mb-8 animate-pulse" />
              <button onClick={() => { setPlayerStarted(true); setActiveLesson(0); setActiveActivity(0); }} className="px-12 py-5 bg-indigo-600 text-white font-black text-lg rounded-3xl shadow-2xl hover:bg-indigo-700 transition-all transform hover:scale-105">Start Learning</button>
           </div>
        </div>
      );
    }

    const currentLesson = lessons[activeLesson];
    const currentActivity = currentLesson?.oc_activities?.[activeActivity];
    const totalActivities = currentLesson?.oc_activities?.length || 0;

    return (
      <div className="h-screen w-full flex flex-col bg-white overflow-hidden">
         <header className="h-14 shrink-0 bg-slate-900 px-6 flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
               <BookOpen className="w-5 h-5 text-indigo-400" />
               <h2 className="font-black text-sm">{selectedCourse?.title}</h2>
            </div>
            {logoutBtn}
         </header>
         <div className="flex-1 flex overflow-hidden">
            <aside className="w-72 bg-slate-50 border-r border-slate-200 overflow-y-auto shrink-0 flex flex-col">
                <div className="flex bg-slate-100 p-1 m-4 rounded-xl border border-slate-200 shadow-inner">
                   <button 
                      onClick={() => setPlayerTab('content')}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${playerTab === 'content' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                      Content
                   </button>
                   <button 
                      onClick={() => setPlayerTab('assessments')}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${playerTab === 'assessments' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                      Assessments
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                  {playerTab === 'content' ? (
                    <>
                      <div className="p-4 border-b border-slate-200">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Course Outline</p>
                      </div>
                      {lessons?.map((lesson, lIdx) => (
                        <div key={lIdx}>
                          <button 
                            onClick={() => { setActiveLesson(lIdx); setActiveActivity(0); }} 
                            className={`w-full text-left p-4 border-b border-slate-100 transition-all ${
                              activeLesson === lIdx ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'hover:bg-slate-100'
                            }`}
                          >
                            <p className={`text-sm font-black ${activeLesson === lIdx ? 'text-indigo-700' : 'text-slate-700'}`}>{lesson.title}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{lesson.oc_activities?.length || 0} activities</p>
                          </button>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="p-4 space-y-4">
                       <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                          <h4 className="text-xs font-black text-rose-700 uppercase tracking-widest mb-1">Live Zone</h4>
                          <p className="text-[10px] text-rose-600 leading-relaxed font-bold">Join real-time quizzes, polls, and attendance sessions when your instructor launches them.</p>
                       </div>
                       <div className="p-2 space-y-2">
                          {[
                            { id: 'quiz', label: 'Quizzes', icon: HelpCircle },
                            { id: 'poll', label: 'Live Polls', icon: BarChart2 },
                            { id: 'attendance', label: 'Attendance', icon: UserCheck },
                            { id: 'feedback', label: 'Course Feedback', icon: MessageSquare }
                          ].map(t => (
                            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group">
                               <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                  <t.icon size={16} />
                               </div>
                               <span className="text-xs font-bold text-slate-600">{t.label}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
             </aside>

            <main className="flex-1 flex flex-col overflow-hidden">
                {playerTab === 'assessments' ? (
                   <div className="flex-1 overflow-y-auto p-10 bg-slate-50">
                      <CourseAssessments 
                        session={session} 
                        userMeta={userMeta} 
                        selectedCourse={selectedCourse} 
                        isFaculty={false} 
                        isEditor={false} 
                      />
                   </div>
                ) : currentActivity ? (
                   <>
                      <div className="p-6 border-b border-slate-200 bg-white">
                         <div className="flex items-center justify-between">
                            <div>
                               <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{currentLesson?.title} — Activity {activeActivity + 1} of {totalActivities}</p>
                               <h2 className="text-2xl font-black text-slate-800">{currentActivity.title}</h2>
                            </div>
                         </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-8">
                         {currentActivity.type === 'text' && (
                           <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: currentActivity.content || '<p class="text-slate-400">No content available.</p>' }} />
                         )}
                          {currentActivity.type === 'video' && currentActivity.resource_url && (
                            <div className="aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
                               <iframe 
                                 src={(() => {
                                   let url = currentActivity.resource_url;
                                   const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
                                   if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
                                   const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
                                   if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
                                   return url;
                                 })()} 
                                 className="w-full h-full border-0" 
                                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                 allowFullScreen 
                                 title="Course Video"
                                 referrerPolicy="strict-origin-when-cross-origin"
                               />
                            </div>
                          )}
                          {currentActivity.type === 'assessment' && currentActivity.resource_url && (
                            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                               <CourseAssessments 
                                  session={session} 
                                  userMeta={userMeta} 
                                  selectedCourse={selectedCourse} 
                                  isFaculty={false} 
                                  isEditor={false} 
                                  embeddedId={currentActivity.resource_url}
                               />
                            </div>
                          )}
                      </div>
                      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                         <button 
                           onClick={() => { if (activeActivity > 0) setActiveActivity(activeActivity - 1); else if (activeLesson > 0) { setActiveLesson(activeLesson - 1); setActiveActivity((lessons[activeLesson - 1]?.oc_activities?.length || 1) - 1); } }}
                           disabled={activeLesson === 0 && activeActivity === 0}
                           className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-100 transition-all disabled:opacity-30"
                         >
                           <ChevronLeft className="w-4 h-4 inline mr-2" />Previous
                         </button>
                         <button 
                           onClick={() => { if (activeActivity < totalActivities - 1) setActiveActivity(activeActivity + 1); else if (activeLesson < lessons.length - 1) { setActiveLesson(activeLesson + 1); setActiveActivity(0); } }}
                           disabled={activeLesson === lessons.length - 1 && activeActivity === totalActivities - 1}
                           className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-30"
                         >
                           Next<ChevronRight className="w-4 h-4 inline ml-2" />
                         </button>
                      </div>
                   </>
                ) : (
                   <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                      <Check className="w-16 h-16 text-emerald-400 mb-6" />
                      <h2 className="text-2xl font-black text-slate-800 mb-2">No Content</h2>
                   </div>
                )}
             </main>
         </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-white overflow-hidden flex flex-col font-sans">
      {isLoading ? <div className="flex-1 flex flex-col items-center justify-center space-y-6"><div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" /><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Syncing Hub...</p></div> : <>
        {view === 'projects' && renderProjects()}
        {view === 'builder' && renderBuilder()}
        {view === 'player' && renderPlayer()}
        {view === 'classes' && (
          <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            <header className="h-20 shrink-0 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-30">
              <div className="flex items-center space-x-6">
                 <button onClick={() => setView('projects')} className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                 <h2 className="text-xl font-black text-slate-800">Global Class Management</h2>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto p-10">
              <div className="max-w-4xl mx-auto space-y-8">
                {!selectedClass ? (
                  <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex gap-3">
                       <input type="text" placeholder="New Class Name (e.g. Pharmacy 2026)" className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newClass} onChange={e => setNewClass(e.target.value)} />
                       <button onClick={handleCreateClass} className="px-6 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700">Create Class</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {classes.map(c => (
                          <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                             <span className="font-bold text-slate-800">{c.name}</span>
                             <button onClick={() => loadClassStudents(c.id)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-indigo-600 hover:text-white transition-all">Manage Students</button>
                          </div>
                       ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button onClick={() => { setSelectedClass(null); setClassStudents([]); }} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"><ChevronLeft className="w-5 h-5" /></button>
                        <h3 className="text-xl font-black text-slate-800">Managing: {selectedClass.name}</h3>
                      </div>
                      <label className="px-4 py-2 bg-indigo-600 text-white font-black rounded-xl text-xs cursor-pointer"><Upload className="w-4 h-4 inline mr-2" /> Import Students<input type="file" className="hidden" accept=".xlsx" onChange={importStudentsToClass} /></label>
                    </div>
                    
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                          <input type="text" placeholder="Student ID" className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newStudent.student_id} onChange={e => setNewStudent({...newStudent, student_id: e.target.value})} />
                          <input type="text" placeholder="Student Name" className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                          <input type="email" placeholder="Student Email" className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
                          <button onClick={handleAddStudentToClass} className="px-6 bg-emerald-600 text-white font-black rounded-xl">Add Student</button>
                       </div>
                       <div className="space-y-3">
                          {classStudents.map(s => (
                             <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div>
                                   <div className="font-bold text-slate-800">{s.full_name}</div>
                                   <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{s.student_id} • {s.user_email}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                   {!s.is_approved && <button onClick={() => approveStudent(s.id)} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-lg">Approve</button>}
                                   <button onClick={async () => { await supabase.from('oc_class_students').delete().eq('id', s.id); loadClassStudents(selectedClass.id); }} className="p-2 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        )}
      </> }
    </div>
  );
}
