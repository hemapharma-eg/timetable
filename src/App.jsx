import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar, Clock, Users, BookOpen, MapPin,
  Play, LayoutGrid, Plus, Trash2, AlertCircle, CheckCircle2, Pencil, GraduationCap, ShieldAlert,
  Download, Upload, FileSpreadsheet, LogOut, LogIn, Database, Wrench
} from 'lucide-react';
import { FacultyManager } from './FacultyManager';
import { StudentManager } from './StudentManager';
import { CourseManager } from './CourseManager';
import { supabase } from './supabase';
import { RiskManagement, PublicRiskReport } from './RiskManagement';

const PageContainer = ({ title, description, tabs, activeSubTab, setActiveSubTab, children }) => (
  <div className="flex h-full flex-col animate-in fade-in duration-300">
    <div className="mb-6 border-b border-slate-200 pb-0">
      <h2 className="text-2xl font-bold text-slate-800 mb-1">{title}</h2>
      {description && <p className="text-sm text-slate-500 mb-6">{description}</p>}
      <div className="flex gap-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeSubTab === tab.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
    <div className="flex-1 min-h-0 pb-8">
      {children}
    </div>
  </div>
);

export default function App() {
  const [session, setSession] = useState(null);
  const [appRole, setAppRole] = useState(null);
  const [appUserMeta, setAppUserMeta] = useState(null);

  const [authMode, setAuthMode] = useState('signIn'); // 'signIn' | 'forgotPassword'

  const [activeTab, setActiveTab] = useState('risk');
  const [dbSubTab, setDbSubTab] = useState('faculty');
    
  const [deepLinkId, setDeepLinkId] = useState(null);
  const [urlFilters, setUrlFilters] = useState(null);
  const [publicRiskReportYear, setPublicRiskReportYear] = useState(null);

  // URL deep linking for shared forms/apps/reports
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const idParam = params.get('id');
    if (viewParam && idParam) {
      
    }
    const yearParam = params.get('year');
    if (viewParam === 'public_risk_report' && yearParam) {
      setPublicRiskReportYear(yearParam);
    }
  }, []);

  // Data State
  const [faculty, setFaculty] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);

  // Fetch Session & Data
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchRoleAndData(session.user.id, session.user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchRoleAndData(session.user.id, session.user.email);
      } else {
        setAppRole(null);
        setAppUserMeta(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);



  const fetchRoleAndData = async (userId, userEmail) => {
    // 1. Fetch User Role
    const { data: userData } = await supabase.from('app_users').select('*').eq('id', userId).single();
    
    let matchedFaculty = null;
    let matchedStudent = null;

    if (userEmail && userEmail !== 'dribrahimpharmaceutics@gmail.com') {
      const { data: facData } = await supabase.from('faculty').select('*').eq('email', userEmail).maybeSingle();
      if (facData) matchedFaculty = facData;
      else {
        const { data: stuData } = await supabase.from('students').select('*').eq('email', userEmail).maybeSingle();
        if (stuData) matchedStudent = stuData;
      }
    }

    let roleToSet = 'student';
    if (userEmail === 'dribrahimpharmaceutics@gmail.com') {
      roleToSet = 'technical_admin';
    } else if (matchedFaculty && matchedFaculty.role) {
      roleToSet = matchedFaculty.role;
    } else if (matchedFaculty) {
      roleToSet = 'faculty';
    } else if (matchedStudent && matchedStudent.role) {
      roleToSet = matchedStudent.role;
    } else if (matchedStudent) {
      roleToSet = 'student';
    } else if (userData && userData.role) {
      roleToSet = userData.role;
    }

    setAppRole(roleToSet);
    
    let meta = userData || {};
    if (matchedFaculty) {
       meta = { ...meta, role: 'faculty', faculty_id: matchedFaculty.id };
    } else if (matchedStudent) {
       meta = { ...meta, role: 'student', group_id: matchedStudent.group_id };
    }
    setAppUserMeta(meta);

    // Auto-create app_users row if it doesn't exist (so all users appear in admin panel)
    if (!userData) {
      await supabase.from('app_users').upsert({
        id: userId,
        email: userEmail,
        role: roleToSet
      }, { onConflict: 'id' });
    }



    // 2. Fetch App Data
    try {
      const [tp, fac, crs, stu, tags, grp, rm, act, cons, sch] = await Promise.all([
        supabase.from('time_profiles').select('*'),
        supabase.from('faculty').select('*'),
        supabase.from('courses').select('*'),
        supabase.from('students').select('*'),
        supabase.from('activity_tags').select('*'),
        supabase.from('student_groups').select('*'),
        supabase.from('rooms').select('*'),
        supabase.from('activities').select('*'),
        supabase.from('constraints').select('*'),
        supabase.from('schedules').select('*')
      ]);
      
      if(tp.data) setTimeProfiles(tp.data);
      if(fac.data) setFaculty(fac.data);
      if(crs.data) setCourses(crs.data);
      if(stu.data) setStudents(stu.data);
      if(tags.data) setActivityTags(tags.data);
      if(grp.data) setGroups(grp.data);
      if(rm.data) setRooms(rm.data);
      if(act.data) setActivities(act.data);
      if(cons.data) setConstraints(cons.data);
      if(sch.data) setSchedule(sch.data);
    } catch (err) {
      console.error("Error fetching data", err);
    }
  };

  // Forms State

  // Generation State

  // Helpers for extracting unique master sets of days/hours for grid rendering

  const isTechAdmin = appRole === 'technical_admin';

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 print:hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <Calendar className="mr-2 text-indigo-400" /> DMU <span className="text-indigo-400 font-light">QA Hub</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Quality Assurance & Risk Management</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                              <SidebarItem id="risk" icon={ShieldAlert} label="Risk Management" activeTab={activeTab} setActiveTab={setActiveTab} />

          {isTechAdmin && (
            <>
              <SidebarItem id="databases" icon={Database} label="Databases" activeTab={activeTab} setActiveTab={setActiveTab} />
                          </>
          )}

          <div className="pt-4">
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors mt-auto"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
        <div className="max-w-6xl mx-auto h-full flex flex-col">
                              {activeTab === 'risk' && <RiskManagement session={session} userMeta={appUserMeta} isTechAdmin={isTechAdmin} />}
          
          {activeTab === 'databases' && isTechAdmin && (
            <PageContainer 
              title="Databases" 
              description="Manage core system records and parameters"
              activeSubTab={dbSubTab} 
              setActiveSubTab={setDbSubTab}
              tabs={[
                { id: 'faculty', label: 'Faculty & Staff' },
                { id: 'students', label: 'Students' },
                { id: 'courses', label: 'Courses' }
              ]}
            >
              {dbSubTab === 'faculty' && <FacultyManager faculty={faculty} setFaculty={setFaculty} />}
              {dbSubTab === 'students' && <StudentManager students={students} setStudents={setStudents} />}
              {dbSubTab === 'courses' && <CourseManager courses={courses} setCourses={setCourses} />}
            </PageContainer>
          )}

          {activeTab === 'scheduling' && (
            <PageContainer 
              title="Scheduling" 
              description="Manage timetables, rules, and activity generation"
              activeSubTab={schedSubTab} 
              setActiveSubTab={setSchedSubTab}
              tabs={[
                { id: 'timetable', label: 'View Timetable' },
                ...(isTechAdmin ? [
                  { id: 'tags', label: 'Activity Tags' },
                  { id: 'groups', label: 'Student Groups' },
                  { id: 'rooms', label: 'Rooms' },
                  { id: 'time', label: 'Time Profiles' },
                  { id: 'constraints', label: 'Constraints' },
                  { id: 'activities', label: 'Activities' },
                  { id: 'generate', label: 'Generate' }
                ] : [])
              ]}
            >
              {schedSubTab === 'timetable' && renderTimetable()}
              {isTechAdmin && schedSubTab === 'tags' && (
                <div className="max-w-3xl mx-auto"><ObjectListManager title="Activity Tags" items={activityTags} setItems={setActivityTags} fields={[{ key: 'name', label: 'Tag Name (e.g. Lecture, Lab)' }]} /></div>
              )}
              {isTechAdmin && schedSubTab === 'groups' && (
                <div className="max-w-3xl mx-auto"><ObjectListManager title="Student Groups" items={groups} setItems={setGroups} fields={[{ key: 'name', label: 'Group Name' }, { key: 'size', label: 'Number of Students (Size)', type: 'number' }, { key: 'timeProfileId', label: 'Time Profile', type: 'select', options: timeProfiles.map(tp => ({ value: tp.id, label: tp.name })) }]} /></div>
              )}
              {isTechAdmin && schedSubTab === 'rooms' && (
                <div className="max-w-3xl mx-auto"><ObjectListManager title="Rooms" items={rooms} setItems={setRooms} fields={[{ key: 'name', label: 'Room Name' }, { key: 'capacity', label: 'Room Capacity', type: 'number' }]} /></div>
              )}
              {isTechAdmin && schedSubTab === 'time' && renderTimeProfiles()}
              {isTechAdmin && schedSubTab === 'constraints' && <ConstraintsManager constraints={constraints} setConstraints={setConstraints} faculty={faculty} days={allGlobalDays} groups={groups} courses={courses} rooms={rooms} activities={activities} />}
              {isTechAdmin && schedSubTab === 'activities' && renderActivitiesManager()}
              {isTechAdmin && schedSubTab === 'generate' && renderGenerateTab()}
            </PageContainer>
          )}

          {activeTab === 'builders' && isTechAdmin && (
            <PageContainer 
              title="Builders" 
              description="Design custom forms, applications, and dynamic reports"
              activeSubTab={buildSubTab} 
              setActiveSubTab={setBuildSubTab}
              tabs={[
                { id: 'formbuilder', label: 'Form Builder' },
                { id: 'appbuilder', label: 'App Builder' },
                { id: 'reports', label: 'Report Builder' }
              ]}
            >
              {buildSubTab === 'formbuilder' && <FormBuilder deepLinkId={deepLinkId} />}
              {buildSubTab === 'appbuilder' && <AppBuilder deepLinkId={deepLinkId} urlFilters={urlFilters} />}
              {buildSubTab === 'reports' && <ReportBuilder deepLinkId={deepLinkId} />}
            </PageContainer>
          )}
        </div>
      </main>
    </div>
  );
}
