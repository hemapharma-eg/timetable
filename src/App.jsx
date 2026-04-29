import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Users, BookOpen, LayoutGrid, ShieldAlert, LogOut, LogIn, Database, UserCheck, Clock } from 'lucide-react';
import { FacultyManager } from './FacultyManager';
import { StudentManager } from './StudentManager';
import { CourseManager } from './CourseManager';
import { RolesManager } from './RolesManager';
import { supabase } from './supabase';
import { RiskManagement, PublicRiskReport } from './RiskManagement';

// Reusable Layout Components
const SidebarItem = ({ icon: Icon, label, path, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const PageContainer = ({ title, description, tabs, activeSubTab, setActiveSubTab, children }) => (
  <div className="flex h-full flex-col animate-in fade-in duration-300">
    <div className="mb-6 border-b border-slate-200 pb-0">
      <h2 className="text-2xl font-bold text-slate-800 mb-1">{title}</h2>
      {description && <p className="text-sm text-slate-500 mb-6">{description}</p>}
      <div className="flex gap-6 overflow-x-auto">
        {tabs && tabs.map(tab => (
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

// Portals
function AdminPortal({ session, userMeta, permissions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = location.pathname.split('/')[2] || 'risk';
  const [dbSubTab, setDbSubTab] = useState('faculty');

  // Shared Data States
  const [faculty, setFaculty] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    supabase.from('faculty').select('*').then(({ data }) => setFaculty(data || []));
    supabase.from('courses').select('*').then(({ data }) => setCourses(data || []));
    supabase.from('students').select('*').then(({ data }) => setStudents(data || []));
  }, []);

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 print:hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <Calendar className="mr-2 text-indigo-400" /> Admin <span className="text-indigo-400 font-light">Hub</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">QA & Management</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <SidebarItem id="risk" icon={ShieldAlert} label="Risk Management" active={currentTab === 'risk'} onClick={() => navigate('/admin/risk')} />
          <SidebarItem id="databases" icon={Database} label="Databases" active={currentTab === 'databases'} onClick={() => navigate('/admin/databases')} />
          <SidebarItem id="roles" icon={UserCheck} label="Role Management" active={currentTab === 'roles'} onClick={() => navigate('/admin/roles')} />
          
          <div className="pt-4 mt-auto pb-4">
            <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors">
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/risk" replace />} />
            <Route path="risk" element={<RiskManagement session={session} userMeta={userMeta} isTechAdmin={true} />} />
            <Route path="databases" element={
              <PageContainer title="Databases" description="Manage core system records" activeSubTab={dbSubTab} setActiveSubTab={setDbSubTab} tabs={[
                { id: 'faculty', label: 'Faculty & Staff' }, { id: 'students', label: 'Students' }, { id: 'courses', label: 'Courses' }
              ]}>
                {dbSubTab === 'faculty' && <FacultyManager faculty={faculty} setFaculty={setFaculty} />}
                {dbSubTab === 'students' && <StudentManager students={students} setStudents={setStudents} />}
                {dbSubTab === 'courses' && <CourseManager courses={courses} setCourses={setCourses} />}
              </PageContainer>
            } />
            <Route path="roles" element={<RolesManager />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function FacultyPortal({ session, userMeta, permissions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = location.pathname.split('/')[2] || '';

  const riskPerms = permissions.filter(p => p.module_name.startsWith('risk_') && p.can_view);
  const dbPerms = permissions.filter(p => p.module_name.startsWith('db_') && p.can_view);

  const hasRisk = riskPerms.length > 0;
  const hasDb = dbPerms.length > 0;

  const allowedRiskTabs = riskPerms.map(p => p.module_name.replace('risk_', ''));
  const allowedDbTabs = dbPerms.map(p => p.module_name.replace('db_', ''));

  const [dbSubTab, setDbSubTab] = useState(allowedDbTabs.length > 0 ? allowedDbTabs[0] : '');

  // Shared Data States
  const [faculty, setFaculty] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (hasDb) {
      supabase.from('faculty').select('*').then(({ data }) => setFaculty(data || []));
      supabase.from('courses').select('*').then(({ data }) => setCourses(data || []));
      supabase.from('students').select('*').then(({ data }) => setStudents(data || []));
    }
  }, [hasDb]);

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 print:hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <Calendar className="mr-2 text-indigo-400" /> Faculty <span className="text-indigo-400 font-light">Hub</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">{userMeta?.custom_role_name || 'Faculty Portal'}</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {hasRisk && (
            <SidebarItem id="risk" icon={ShieldAlert} label="Risk Management" active={currentTab === 'risk'} onClick={() => navigate('/faculty/risk')} />
          )}
          {hasDb && (
            <SidebarItem id="databases" icon={Database} label="Databases" active={currentTab === 'databases'} onClick={() => navigate('/faculty/databases')} />
          )}
          
          <div className="pt-4 mt-auto pb-4">
            <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors">
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to={hasRisk ? "/faculty/risk" : (hasDb ? "/faculty/databases" : "/faculty/welcome")} replace />} />
            
            {hasRisk && (
              <Route path="risk" element={<RiskManagement session={session} userMeta={userMeta} isTechAdmin={false} allowedSubTabs={allowedRiskTabs} permissions={permissions} />} />
            )}
            
            {hasDb && (
              <Route path="databases" element={
                <PageContainer title="Databases" description="Manage core system records" activeSubTab={dbSubTab} setActiveSubTab={setDbSubTab} tabs={[
                  ...(allowedDbTabs.includes('faculty') ? [{ id: 'faculty', label: 'Faculty & Staff' }] : []),
                  ...(allowedDbTabs.includes('students') ? [{ id: 'students', label: 'Students' }] : []),
                  ...(allowedDbTabs.includes('courses') ? [{ id: 'courses', label: 'Courses' }] : [])
                ]}>
                  {dbSubTab === 'faculty' && <FacultyManager faculty={faculty} setFaculty={setFaculty} isReadOnly={!permissions.some(p => p.module_name === 'db_faculty' && p.can_edit)} />}
                  {dbSubTab === 'students' && <StudentManager students={students} setStudents={setStudents} />}
                  {dbSubTab === 'courses' && <CourseManager courses={courses} setCourses={setCourses} />}
                </PageContainer>
              } />
            )}

            <Route path="welcome" element={
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-800">Welcome to Faculty Portal</h2>
                  <p className="text-slate-500 mt-2">More sections will be added here soon.</p>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function StudentPortal({ session, userMeta }) {
  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 print:hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <Calendar className="mr-2 text-indigo-400" /> Student <span className="text-indigo-400 font-light">Hub</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Student Portal</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <div className="pt-4 mt-auto pb-4">
            <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors">
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800">Welcome to Student Portal</h2>
            <p className="text-slate-500 mt-2">More sections will be added here soon.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function PendingPortal() {
  return (
    <div className="flex h-screen bg-slate-900 font-sans text-white items-center justify-center">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700 text-center">
        <div className="flex justify-center mb-6 text-yellow-400">
          <Clock size={48} />
        </div>
        <h2 className="text-2xl font-bold mb-4">Registration Pending</h2>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Your account has been successfully created and a request has been sent to the administrators. 
          You will be granted access once your account is verified and assigned a role.
        </p>
        <button onClick={() => supabase.auth.signOut()} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center">
          <LogOut size={18} className="mr-2" /> Sign Out
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [appRole, setAppRole] = useState(null);
  const [appUserMeta, setAppUserMeta] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRoleAndData(session.user.id, session.user.email);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchRoleAndData(session.user.id, session.user.email);
      } else {
        setAppRole(null);
        setAppUserMeta(null);
        setPermissions([]);
        setLoading(false);
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchRoleAndData = async (userId, userEmail) => {
    try {
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

      let roleToSet = 'pending';
      if (userEmail === 'dribrahimpharmaceutics@gmail.com') roleToSet = 'technical_admin';
      else if (matchedFaculty && matchedFaculty.role) roleToSet = matchedFaculty.role;
      else if (matchedFaculty) roleToSet = 'faculty';
      else if (matchedStudent && matchedStudent.role) roleToSet = matchedStudent.role;
      else if (matchedStudent) roleToSet = 'student';
      else if (userData && userData.role) roleToSet = userData.role;

      setAppRole(roleToSet);
      
      let meta = userData || {};
      if (matchedFaculty) {
         meta = { ...meta, role: 'faculty', faculty_id: matchedFaculty.id, custom_role_id: matchedFaculty.custom_role_id };
         if (matchedFaculty.custom_role_id) {
           const { data: roleData } = await supabase.from('custom_roles').select('name').eq('id', matchedFaculty.custom_role_id).single();
           if (roleData) meta.custom_role_name = roleData.name;
           
           const { data: perms } = await supabase.from('role_permissions').select('*').eq('role_id', matchedFaculty.custom_role_id);
           if (perms) setPermissions(perms);
         }
      } else if (matchedStudent) {
         meta = { ...meta, role: 'student', group_id: matchedStudent.group_id };
      }
      setAppUserMeta(meta);

      if (!userData) {
        await supabase.from('app_users').upsert({ id: userId, email: userEmail, role: roleToSet }, { onConflict: 'id' });
      }

      // Auto route to appropriate portal if at root or login
      if (location.pathname === '/' || location.pathname === '/login') {
        if (roleToSet === 'technical_admin' || roleToSet === 'academic_admin') navigate('/admin');
        else if (roleToSet === 'faculty') navigate('/faculty');
        else if (roleToSet === 'student') navigate('/student');
        else navigate('/pending');
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Allow public risk report without auth
  const params = new URLSearchParams(location.search);
  const viewParam = params.get('view');
  if (viewParam === 'public_risk_report' && params.get('year')) {
    return <PublicRiskReport year={params.get('year')} />;
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-sans">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="flex h-screen bg-slate-900 font-sans text-white items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
          <div className="flex justify-center mb-6 text-indigo-400">
            <Calendar size={48} />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">DMU QA Hub</h2>
          <p className="text-slate-400 text-center text-sm mb-8">
            {isSignUp ? "Create your account" : "Sign in to access your portal"}
          </p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            
            if (isSignUp) {
              const { error } = await supabase.auth.signUp({ email, password });
              if (error) alert(error.message);
              else alert("Signup successful! Please check your email for verification (if enabled) or sign in now.");
            } else {
              const { error } = await supabase.auth.signInWithPassword({ email, password });
              if (error) alert(error.message);
            }
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input name="email" type="email" required className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input name="password" type="password" required className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center">
              {isSignUp ? "Sign Up" : <><LogIn size={18} className="mr-2" /> Sign In</>}
            </button>
          </form>
          
          <div className="mt-6 pt-4 border-t border-slate-700 text-center text-sm">
            <span className="text-slate-400">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </span>
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-2 text-indigo-400 hover:text-indigo-300 font-medium"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">Contact admin if your account has no assigned permissions.</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/admin/*" element={
        (appRole === 'technical_admin' || appRole === 'academic_admin') 
          ? <AdminPortal session={session} userMeta={appUserMeta} permissions={permissions} /> 
          : <Navigate to="/" replace />
      } />
      <Route path="/faculty/*" element={
        (appRole === 'faculty' || appRole === 'technical_admin') 
          ? <FacultyPortal session={session} userMeta={appUserMeta} permissions={permissions} /> 
          : <Navigate to="/" replace />
      } />
      <Route path="/student/*" element={
        (appRole === 'student') 
          ? <StudentPortal session={session} userMeta={appUserMeta} /> 
          : <Navigate to="/" replace />
      } />
      <Route path="/pending" element={
        (appRole === 'pending') 
          ? <PendingPortal /> 
          : <Navigate to="/" replace />
      } />
      <Route path="/login" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
