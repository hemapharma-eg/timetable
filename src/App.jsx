import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Users, BookOpen, LayoutGrid, ShieldAlert, LogOut, LogIn, Database, UserCheck, Clock, BarChart3, Activity, PlaySquare, GraduationCap, ChevronRight, KeyRound, Check, X, Mail, Home } from 'lucide-react';
import { FacultyManager } from './FacultyManager';
import { StudentManager } from './StudentManager';
import { CourseManager } from './CourseManager';
import { RolesManager } from './RolesManager';
import { supabase } from './supabase';
import { RiskManagement, PublicRiskReport } from './RiskManagement';
import { CollegesManager, ProgramsManager, CommitteesManager } from './OrgManager';
import { DynamicPage } from './DynamicPage';
import { DMUAnalytics } from './DMUAnalytics';
import OnlineCourses from './OnlineCourses';
import { fetchAll } from './supabaseUtils';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div className="p-8 text-center bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 font-bold">A component encountered a critical error. Please reload.</div>;
    }
    return this.props.children;
  }
}



// Reusable Layout Components
const SidebarItem = ({ icon: Icon, label, path, active, onClick, isExpanded }) => (
  <button
    onClick={onClick}
    title={!isExpanded ? label : ""}
    className={`w-full flex items-center ${isExpanded ? 'space-x-3 px-4' : 'justify-center'} py-3 rounded-lg transition-all duration-300 ${active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
  >
    <Icon size={20} className="flex-shrink-0" />
    {isExpanded && <span className="font-medium whitespace-nowrap overflow-hidden">{label}</span>}
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

function WelcomeHub({ role, navigate, permissions, userMeta }) {
  // Check permissions to dynamically display links
  const hasRisk = role === 'technical_admin' || role === 'academic_admin' || (permissions && permissions.some(p => p.module_name.startsWith('risk_') && p.can_view));
  const hasDb = role === 'technical_admin' || (permissions && permissions.some(p => p.module_name.startsWith('db_') && p.can_view));
  const hasAnalytics = role === 'technical_admin' || role === 'academic_admin' || (permissions && permissions.some(p => p.module_name === 'analytics' && p.can_view));
  const hasCourses = role === 'student' || role === 'technical_admin' || role === 'academic_admin' || (permissions && permissions.some(p => p.module_name === 'online_courses' && p.can_view));

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const isAdmin = role === 'technical_admin' || role === 'academic_admin' || (permissions && permissions.some(p => p.module_name === 'roles'));
    if (isAdmin) {
      const fetchPending = async () => {
        try {
          const { count, error } = await supabase
            .from('app_users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'pending');
          if (!error && count !== null) {
            setPendingCount(count);
          }
        } catch (e) {
          console.error("Error fetching pending approvals count:", e);
        }
      };
      fetchPending();
      
      // Setup realtime subscription to keep it perfectly updated!
      const channel = supabase
        .channel('app_users_pending_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, () => {
          fetchPending();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [role, permissions]);

  return (
    <div className="py-6 px-4 max-w-[95%] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 font-sans text-slate-800 font-sans">
      {/* Pending Approvals Notification Bar for Admins */}
      {pendingCount > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl shadow-xs animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl animate-pulse">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h5 className="font-bold text-amber-900 text-sm">Action Required: User Approvals Pending</h5>
              <p className="text-xs text-amber-700 mt-0.5">There are <span className="font-extrabold text-amber-900">{pendingCount}</span> user accounts pending administrator approval. Please review their access requests.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate(role === 'technical_admin' || role === 'academic_admin' ? '/admin/roles' : '/faculty/roles')}
            className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
          >
            Review & Approve <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Hero Welcome banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-[2rem] p-8 md:p-12 shadow-xl border border-indigo-950/50 mb-10">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold mb-6">
            <GraduationCap size={14} /> Dubai Medical University
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 leading-tight text-white">
            Welcome to the <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
              QAIE Hub
            </span>
          </h1>
          <p className="text-slate-300 text-base md:text-lg font-light leading-relaxed mb-0">
            The central gateway for Quality Assurance & Institutional Effectiveness. Access advanced educational analytics, curriculum assessments, risk profiles, and dynamic course platforms designed to elevate academic excellence.
          </p>
        </div>
      </div>

      {/* Grid of features */}
      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
        <LayoutGrid className="text-indigo-600" size={18} />
        Your Quick Gateways
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* DMU Analytics Card */}
        {hasAnalytics && (
          <div 
            onClick={() => navigate(role === 'technical_admin' || role === 'academic_admin' ? '/admin/analytics' : '/faculty/analytics')}
            className="group relative bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full group-hover:bg-indigo-500/10 transition-colors" />
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-5 group-hover:scale-110 transition-transform">
              <Activity size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">DMU Analytics</h4>
            <p className="text-slate-500 text-sm leading-relaxed">
              Explore dynamic performance analysis dashboards, grade attributions, and strategic Key Performance Indicators across cohorts and programs.
            </p>
          </div>
        )}

        {/* Online Courses Card */}
        {hasCourses && (
          <div 
            onClick={() => navigate(role === 'student' ? '/student/online_courses' : (role === 'faculty' ? '/faculty/online_courses' : '/admin/online_courses'))}
            className="group relative bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-violet-200 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-bl-full group-hover:bg-violet-500/10 transition-colors" />
            <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl w-fit mb-5 group-hover:scale-110 transition-transform">
              <PlaySquare size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-violet-600 transition-colors">Online Course Hub</h4>
            <p className="text-slate-500 text-sm leading-relaxed">
              Access online lecture slides, syllabus materials, interactive assessments, and course delivery platforms.
            </p>
          </div>
        )}

        {/* Risk Management Card */}
        {hasRisk && (
          <div 
            onClick={() => navigate(role === 'faculty' ? '/faculty/risk' : '/admin/risk')}
            className="group relative bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-rose-200 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full group-hover:bg-rose-500/10 transition-colors" />
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl w-fit mb-5 group-hover:scale-110 transition-transform">
              <ShieldAlert size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-rose-600 transition-colors">Risk Management</h4>
            <p className="text-slate-500 text-sm leading-relaxed">
              Assess risk logs, mitigate academic and institutional vulnerabilities, and generate executive compliance reports.
            </p>
          </div>
        )}

        {/* Databases Card */}
        {hasDb && (
          <div 
            onClick={() => navigate(role === 'faculty' ? '/faculty/databases' : '/admin/databases')}
            className="group relative bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full group-hover:bg-emerald-500/10 transition-colors" />
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-5 group-hover:scale-110 transition-transform">
              <Database size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">Central Databases</h4>
            <p className="text-slate-500 text-sm leading-relaxed">
              View and manage core system master datasets for faculty rosters, student lists, course mappings, and committees.
            </p>
          </div>
        )}
      </div>

      {/* Info footer or support box */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h5 className="font-bold text-slate-800 text-sm mb-1">Need help or permissions missing?</h5>
          <p className="text-xs text-slate-500">Contact the QAIE Department if you require additional module rights or need system onboarding.</p>
        </div>
        <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 font-bold text-xs">
          Role: {userMeta?.custom_role_names && userMeta.custom_role_names.length > 0 
            ? userMeta.custom_role_names.join(', ') 
            : (role === 'technical_admin' ? 'Technical Administrator' : role === 'student' ? 'Student' : 'Faculty')}
        </div>
      </div>
    </div>
  );
}

// Portals
function AdminPortal({ session, userMeta, permissions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isStudentPortal = params.get('course') !== null || params.get('room') !== null;
  const currentTab = location.pathname.split('/')[2] || 'welcome';
  const [dbSubTab, setDbSubTab] = useState('faculty');
  const [adminDbSubTab, setAdminDbSubTab] = useState('faculty');
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isExpanded && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Shared Data States
  const [faculty, setFaculty] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);

  // Dynamic Navigation
  const [sections, setSections] = useState([]);
  const [pages, setPages] = useState([]);


  useEffect(() => {
    fetchAll('faculty').then(data => setFaculty(data));
    fetchAll('courses').then(data => setCourses(data));
    fetchAll('students').then(data => setStudents(data));
    
    supabase.from('app_sections').select('*').order('order_index').then(({ data }) => setSections(data || []));
    supabase.from('app_pages').select('*').order('order_index').then(({ data }) => setPages(data || []));
  }, []);

  if (isStudentPortal) {
    return (
      <div className="h-screen w-screen bg-white">
        <OnlineCourses session={session} userMeta={userMeta} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden print:h-auto print:overflow-visible">
      <style>{`
        @media print {
          html, body { height: auto !important; overflow: visible !important; }
          .h-screen { height: auto !important; }
          .overflow-hidden { overflow: visible !important; }
          .overflow-y-auto { overflow: visible !important; }
          aside { display: none !important; }
          main { width: 100% !important; padding: 0 !important; margin: 0 !important; display: block !important; overflow: visible !important; }
          .max-w-\[95\%\] { max-width: none !important; width: 100% !important; }
          .animate-in { animation: none !important; }
          .shadow-lg, .shadow-md, .shadow-sm { box-shadow: none !important; }
          button { display: none !important; }
        }
      `}</style>
      <aside 
        ref={sidebarRef}
        className={`${isExpanded ? 'w-64' : 'w-20'} bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out print:hidden relative group`}
      >
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-3 top-20 bg-indigo-600 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-indigo-700"
        >
          <ChevronRight size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        <div className={`p-6 ${!isExpanded ? 'flex justify-center' : ''}`}>
          {isExpanded ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
                <Calendar className="mr-2 text-indigo-400" /> Admin <span className="text-indigo-400 font-light">Hub</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">QA & Management</p>
            </>
          ) : (
            <Calendar className="text-indigo-400" size={28} />
          )}
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <SidebarItem id="welcome" icon={Home} label="Home Dashboard" active={currentTab === 'welcome'} onClick={() => navigate('/admin/welcome')} isExpanded={isExpanded} />
          <SidebarItem id="risk" icon={ShieldAlert} label="Risk Management" active={currentTab === 'risk'} onClick={() => navigate('/admin/risk')} isExpanded={isExpanded} />
          <SidebarItem id="analytics" icon={Activity} label="DMU Analytics" active={currentTab === 'analytics'} onClick={() => navigate('/admin/analytics')} isExpanded={isExpanded} />
          <SidebarItem id="online_courses" icon={PlaySquare} label="Online Courses" active={currentTab === 'online_courses'} onClick={() => navigate('/admin/online_courses')} isExpanded={isExpanded} />
          <SidebarItem id="databases" icon={Database} label="Databases" active={currentTab === 'databases'} onClick={() => navigate('/admin/databases')} isExpanded={isExpanded} />
          <SidebarItem id="roles" icon={UserCheck} label="Role Management" active={currentTab === 'roles'} onClick={() => navigate('/admin/roles')} isExpanded={isExpanded} />

          {sections.filter(s => !['POLICIES', 'BENCHMARKING'].includes(s.name?.toUpperCase())).map(section => {
            const sectionPages = pages.filter(p => p.section_id === section.id);
            if (sectionPages.length === 0) return null;
            return (
              <div key={section.id} className="pt-4">
                {isExpanded ? (
                  <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 truncate">{section.name}</p>
                ) : (
                  <div className="h-px bg-slate-800 mx-2 mb-4" />
                )}
                {sectionPages.map(page => (
                  <SidebarItem 
                    key={page.id} 
                    id={`page_${page.id}`} 
                    icon={page.type === 'app' ? BookOpen : LayoutGrid} 
                    label={page.name} 
                    active={currentTab === `page_${page.id}`} 
                    onClick={() => navigate(`/admin/page/${page.id}`)} 
                    isExpanded={isExpanded}
                  />
                ))}
              </div>
            );
          })}
          
          <div className="pt-4 mt-auto pb-4">
            <button onClick={() => supabase.auth.signOut()} className={`w-full flex items-center ${isExpanded ? 'space-x-3 px-4' : 'justify-center'} py-3 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors`}>
              <LogOut size={20} />
              {isExpanded && <span className="font-medium">Sign Out</span>}
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
        <div className="max-w-[95%] mx-auto h-full flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/welcome" replace />} />
            <Route path="welcome" element={<WelcomeHub role="technical_admin" navigate={navigate} userMeta={userMeta} />} />
            <Route path="risk" element={<RiskManagement session={session} userMeta={userMeta} isTechAdmin={true} />} />
            <Route path="analytics" element={
              <ErrorBoundary fallback={<div className="p-8 text-center bg-white border-2 border-dashed border-rose-200 rounded-[2.5rem] text-rose-500 font-bold shadow-sm">Analytics dashboard failed to initialize. Please check your internet connection or contact support.</div>}>
                <DMUAnalytics session={session} userMeta={userMeta} />
              </ErrorBoundary>
            } />
            <Route path="online_courses" element={<OnlineCourses session={session} userMeta={userMeta} />} />

            <Route path="databases" element={
              <PageContainer title="Databases" description="Core institutional databases synced from Google Sheets" activeSubTab={adminDbSubTab} setActiveSubTab={setAdminDbSubTab} tabs={[
                { id: 'faculty', label: 'Faculty & Staff' },
                { id: 'students', label: 'Students' },
                { id: 'courses', label: 'Courses' },
              ]}>
                {adminDbSubTab === 'faculty' && <FacultyManager faculty={faculty} setFaculty={setFaculty} showSyncButton={true} />}
                {adminDbSubTab === 'students' && <StudentManager students={students} setStudents={setStudents} showSyncButton={true} />}
                {adminDbSubTab === 'courses' && <CourseManager courses={courses} setCourses={setCourses} showSyncButton={true} />}
              </PageContainer>
            } />
             <Route path="roles" element={<RolesManager />} />
            <Route path="page/:pageId" element={<DynamicPage session={session} userMeta={userMeta} permissions={permissions} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function FacultyPortal({ session, userMeta, permissions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = location.pathname.split('/')[2] || 'welcome';
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isExpanded && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const riskPerms = permissions.filter(p => p.module_name.startsWith('risk_') && p.can_view);
  const dbPerms = permissions.filter(p => p.module_name.startsWith('db_') && p.can_view);

  const hasRisk = riskPerms.length > 0;
  const hasDb = dbPerms.length > 0;

  const allowedRiskTabs = riskPerms.map(p => p.module_name.replace('risk_', ''));
  const allowedDbTabs = dbPerms.map(p => p.module_name.replace('db_', ''));
  
  const hasAnalytics = permissions.some(p => p.module_name === 'analytics' && p.can_view);
  const hasCourses = permissions.some(p => p.module_name === 'online_courses' && p.can_view);


  const [dbSubTab, setDbSubTab] = useState(allowedDbTabs.length > 0 ? allowedDbTabs[0] : '');

  // Shared Data States
  const [faculty, setFaculty] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);

  // Dynamic Navigation
  const [sections, setSections] = useState([]);
  const [pages, setPages] = useState([]);

  useEffect(() => {
    if (hasDb) {
      fetchAll('faculty').then(data => setFaculty(data));
      fetchAll('courses').then(data => setCourses(data));
      fetchAll('students').then(data => setStudents(data));
    }
    
    supabase.from('app_sections').select('*').order('order_index').then(({ data }) => setSections(data || []));
    supabase.from('app_pages').select('*').order('order_index').then(({ data }) => setPages(data || []));
  }, [hasDb]);

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden print:h-auto print:overflow-visible">
      <style>{`
        @media print {
          html, body { height: auto !important; overflow: visible !important; }
          .h-screen { height: auto !important; }
          .overflow-hidden { overflow: visible !important; }
          .overflow-y-auto { overflow: visible !important; }
          aside { display: none !important; }
          main { width: 100% !important; padding: 0 !important; margin: 0 !important; display: block !important; overflow: visible !important; }
          .max-w-\[95\%\] { max-width: none !important; width: 100% !important; }
          .animate-in { animation: none !important; }
          .shadow-lg, .shadow-md, .shadow-sm { box-shadow: none !important; }
          button { display: none !important; }
        }
      `}</style>
      <aside 
        ref={sidebarRef}
        className={`${isExpanded ? 'w-64' : 'w-20'} bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out print:hidden relative group`}
      >
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-3 top-20 bg-indigo-600 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-indigo-700"
        >
          <ChevronRight size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        <div className={`p-6 ${!isExpanded ? 'flex justify-center' : ''}`}>
          {isExpanded ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
                <Calendar className="mr-2 text-indigo-400" /> Faculty <span className="text-indigo-400 font-light">Hub</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {userMeta?.custom_role_names && userMeta.custom_role_names.length > 0 
                  ? userMeta.custom_role_names.join(', ') 
                  : 'Faculty Portal'}
              </p>
            </>
          ) : (
            <Calendar className="text-indigo-400" size={28} />
          )}
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <SidebarItem id="welcome" icon={Home} label="Home Dashboard" active={currentTab === 'welcome'} onClick={() => navigate('/faculty/welcome')} isExpanded={isExpanded} />
          {hasRisk && (
            <SidebarItem id="risk" icon={ShieldAlert} label="Risk Management" active={currentTab === 'risk'} onClick={() => navigate('/faculty/risk')} isExpanded={isExpanded} />
          )}
          {hasAnalytics && (
            <SidebarItem id="analytics" icon={Activity} label="DMU Analytics" active={currentTab === 'analytics'} onClick={() => navigate('/faculty/analytics')} isExpanded={isExpanded} />
          )}
          {hasCourses && (
            <SidebarItem id="online_courses" icon={PlaySquare} label="Online Courses" active={currentTab === 'online_courses'} onClick={() => navigate('/faculty/online_courses')} isExpanded={isExpanded} />
          )}
          {hasDb && (
            <SidebarItem id="databases" icon={Database} label="Databases" active={currentTab === 'databases'} onClick={() => navigate('/faculty/databases')} isExpanded={isExpanded} />
          )}
          {(permissions.some(p => p.module_name === 'roles' && p.can_view) || userMeta?.email === 'dribrahimpharmaceutics@gmail.com') && (
            <SidebarItem id="roles" icon={UserCheck} label="Role Management" active={currentTab === 'roles'} onClick={() => navigate('/faculty/roles')} isExpanded={isExpanded} />
          )}

          {sections.filter(s => {
            const n = s.name?.toUpperCase();
            return n !== 'BENCHMARKING' && n !== 'POLICIES';
          }).map(section => {
            const sectionPages = pages.filter(p => p.section_id === section.id && permissions.some(perm => perm.module_name === `page_${p.id}` && perm.can_view));
            if (sectionPages.length === 0) return null;
            return (
              <div key={section.id} className="pt-4">
                {isExpanded ? (
                  <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 truncate">{section.name}</p>
                ) : (
                  <div className="h-px bg-slate-800 mx-2 mb-4" />
                )}
                {sectionPages.map(page => (
                  <SidebarItem 
                    key={page.id} 
                    id={`page_${page.id}`} 
                    icon={page.type === 'app' ? BookOpen : LayoutGrid} 
                    label={page.name} 
                    active={currentTab === `page_${page.id}`} 
                    onClick={() => navigate(`/faculty/page/${page.id}`)} 
                    isExpanded={isExpanded}
                  />
                ))}
              </div>
            );
          })}
          
          <div className="pt-4 mt-auto pb-4">
            <button onClick={() => supabase.auth.signOut()} className={`w-full flex items-center ${isExpanded ? 'space-x-3 px-4' : 'justify-center'} py-3 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors`}>
              <LogOut size={20} />
              {isExpanded && <span className="font-medium">Sign Out</span>}
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
        <div className="max-w-[95%] mx-auto h-full flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/faculty/welcome" replace />} />
            <Route path="welcome" element={<WelcomeHub role="faculty" navigate={navigate} permissions={permissions} userMeta={userMeta} />} />
            
            {hasRisk && (
              <Route path="risk" element={<RiskManagement session={session} userMeta={userMeta} isTechAdmin={false} allowedSubTabs={allowedRiskTabs} permissions={permissions} />} />
            )}

            {hasAnalytics && (
              <Route path="analytics" element={
                <ErrorBoundary fallback={<div className="p-8 text-center bg-white border-2 border-dashed border-rose-200 rounded-[2.5rem] text-rose-500 font-bold shadow-sm">Analytics dashboard failed to initialize. Please contact support.</div>}>
                  <DMUAnalytics session={session} userMeta={userMeta} />
                </ErrorBoundary>
              } />
            )}
            {hasCourses && (
              <Route path="online_courses" element={<OnlineCourses session={session} userMeta={userMeta} />} />
            )}
            
            {hasDb && (
              <Route path="databases" element={
                <PageContainer title="Databases" description="Manage core system records" activeSubTab={dbSubTab} setActiveSubTab={setDbSubTab} tabs={[
                  ...(allowedDbTabs.includes('faculty') ? [{ id: 'faculty', label: 'Faculty & Staff' }] : []),
                  ...(allowedDbTabs.includes('students') ? [{ id: 'students', label: 'Students' }] : []),
                  ...(allowedDbTabs.includes('courses') ? [{ id: 'courses', label: 'Courses' }] : []),
                  ...(allowedDbTabs.includes('colleges') ? [{ id: 'colleges', label: 'Colleges' }] : []),
                  ...(allowedDbTabs.includes('programs') ? [{ id: 'programs', label: 'Programs' }] : []),
                  ...(allowedDbTabs.includes('committees') ? [{ id: 'committees', label: 'Committees' }] : [])
                ]}>
                  {dbSubTab === 'faculty' && <FacultyManager faculty={faculty} setFaculty={setFaculty} showSyncButton={true} />}
                  {dbSubTab === 'students' && <StudentManager students={students} setStudents={setStudents} showSyncButton={true} />}
                  {dbSubTab === 'courses' && <CourseManager courses={courses} setCourses={setCourses} showSyncButton={true} />}
                  {dbSubTab === 'colleges' && <CollegesManager />}
                  {dbSubTab === 'programs' && <ProgramsManager />}
                  {dbSubTab === 'committees' && <CommitteesManager />}
                </PageContainer>
              } />
            )}

            <Route path="roles" element={<RolesManager />} />
            <Route path="page/:pageId" element={<DynamicPage session={session} userMeta={userMeta} permissions={permissions} />} />

            <Route path="welcome" element={
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-800">Welcome to Faculty Portal</h2>
                  <p className="text-slate-500 mt-2">More sections will be added here soon.</p>
                  <p className="mt-2 text-center max-w-md text-red-500 font-bold">DEBUG INFO: hasRisk is {hasRisk ? 'TRUE' : 'FALSE'}</p>
                </div>
              </div>
            } />
            <Route path="*" element={<Navigate to="/faculty/welcome" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function StudentPortal({ session, userMeta }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = location.pathname.split('/')[2] || 'welcome';
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
          <SidebarItem id="welcome" icon={Home} label="Home Dashboard" active={currentTab === 'welcome'} onClick={() => navigate('/student/welcome')} />
          <SidebarItem id="online_courses" icon={PlaySquare} label="Online Courses" active={currentTab === 'online_courses'} onClick={() => navigate('/student/online_courses')} />
          <div className="pt-4 mt-auto pb-4">
            <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors">
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/student/welcome" replace />} />
            <Route path="welcome" element={<WelcomeHub role="student" navigate={navigate} userMeta={userMeta} />} />
            <Route path="online_courses" element={<OnlineCourses session={session} userMeta={userMeta} />} />
            <Route path="*" element={
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800">Welcome to Student Portal</h2>
                <p className="text-slate-500 mt-2">More sections will be added here soon.</p>
              </div>
            } />
          </Routes>
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
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showDirectReset, setShowDirectReset] = useState(false);
  const [directResetEmail, setDirectResetEmail] = useState('');
  const [directResetPassword, setDirectResetPassword] = useState('');
  const [directResetConfirm, setDirectResetConfirm] = useState('');
  const [directResetLoading, setDirectResetLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if URL has recovery tokens
    const hasRecoveryToken = window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');
    if (hasRecoveryToken) {
      setShowResetPassword(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRoleAndData(session.user.id, session.user.email);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetPassword(true);
      }
      setSession(session);
      if (session) {
        fetchRoleAndData(session.user.id, session.user.email);
      } else {
        setAppRole(null);
        setAppUserMeta(null);
        setPermissions([]);
        setLoading(false);
        
        // Don't redirect to login if we are viewing a public report
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view');
        const isPublicView = (viewParam === 'public_risk_report') || (viewParam === 'benchmarking') || (viewParam === 'obef_dashboard');
        
        if (!isPublicView) {
          navigate('/login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchRoleAndData = async (userId, userEmail) => {
    try {
      const { data: userData } = await supabase.from('app_users').select('*').eq('id', userId).maybeSingle();
      
      if (userEmail && userEmail !== 'dribrahimpharmaceutics@gmail.com') {
        if (userData && userData.role === 'pending') {
          await supabase.auth.signOut();
          localStorage.removeItem('oc_active_course');
          alert('Access Denied: Your account is pending administrator approval. Please contact the administrator.');
          setLoading(false);
          return;
        }
      }
      
      let matchedFaculty = null;
      let matchedStudent = null;
      let matchedOnlineStudent = null;
      let matchedCollaborator = null;
      if (userEmail && userEmail !== 'dribrahimpharmaceutics@gmail.com') {
        const { data: facData } = await supabase.from('faculty').select('*').eq('email', userEmail).maybeSingle();
        if (facData) matchedFaculty = facData;
        else {
          const { data: stuData } = await supabase.from('students').select('*').eq('email', userEmail).maybeSingle();
          if (stuData) matchedStudent = stuData;
          else {
            const { data: ocData } = await supabase.from('oc_class_students').select('*').ilike('user_email', userEmail).maybeSingle();
            if (ocData) matchedOnlineStudent = ocData;
            else {
              const { data: collabData } = await supabase.from('oc_collaborators').select('*').ilike('user_email', userEmail).maybeSingle();
              if (collabData) matchedCollaborator = collabData;
            }
          }
        }

        // STRICT ACCESS CONTROL: If not in any known database, reject them
        if (!matchedFaculty && !matchedStudent && !matchedOnlineStudent && !matchedCollaborator && (!userData || userData.role === 'pending')) {
          await supabase.auth.signOut();
          localStorage.removeItem('oc_active_course');
          alert('Access Denied: Your email is not registered in our system. Please contact your administrator or course instructor for access.');
          setLoading(false);
          return;
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
      const { data: roleAssigns } = await supabase.from('staff_roles').select('custom_role_id').eq('email', userEmail);
      const customRoleIds = roleAssigns?.map(ra => ra.custom_role_id) || [];
      
      if (customRoleIds.length === 0 && matchedFaculty?.custom_role_id) {
        customRoleIds.push(matchedFaculty.custom_role_id);
      }

      if (matchedFaculty) {
         meta = { ...meta, role: 'faculty', faculty_id: matchedFaculty.id, customRoleIds };
         if (customRoleIds.length > 0) {
           const { data: roleData } = await supabase.from('custom_roles').select('name').in('id', customRoleIds);
           if (roleData) meta.custom_role_names = roleData.map(r => r.name);
           
           const { data: perms } = await supabase.from('role_permissions').select('*').in('role_id', customRoleIds);
           if (perms) {
             const merged = Object.values(perms.reduce((acc, p) => {
               if (!acc[p.module_name]) acc[p.module_name] = { ...p };
               else {
                 acc[p.module_name].can_view = acc[p.module_name].can_view || p.can_view;
                 acc[p.module_name].can_edit = acc[p.module_name].can_edit || p.can_edit;
               }
               return acc;
             }, {}));
             setPermissions(merged);
           }
         }
      } else if (matchedStudent) {
         meta = { ...meta, role: 'student', group_id: matchedStudent.group_id };
      }
      setAppUserMeta(meta);

      if (!userData) {
        await supabase.from('app_users').upsert({ id: userId, email: userEmail, role: roleToSet }, { onConflict: 'id' });
      }

      // Auto route to appropriate portal
      const urlParams = new URLSearchParams(location.search);
      const courseFromUrl = urlParams.get('course');
      const courseFromStorage = localStorage.getItem('oc_active_course');
      const courseParam = courseFromUrl || courseFromStorage;

      if (courseParam) {
        // Direct link — always prioritize it
        setAppRole('course');
        localStorage.setItem('oc_active_course', courseParam);
        navigate(`/course?course=${courseParam}`);
      } else if (location.pathname === '/' || location.pathname === '/login') {
        if (roleToSet === 'technical_admin' || roleToSet === 'academic_admin') navigate('/admin');
        else if (roleToSet === 'faculty') navigate('/faculty');
        else if (roleToSet === 'student') navigate('/student');
        else if (matchedOnlineStudent || matchedCollaborator) navigate('/course');
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

  if (!session && viewParam === 'benchmarking' && (params.get('report') || params.get('data'))) {
    return <Benchmarking initialPage="dashboard" />;
  }

  if (viewParam === 'obef_dashboard') {
    return (
      <div className="h-screen w-screen bg-slate-50 overflow-auto print:h-auto print:overflow-visible">
        <ErrorBoundary fallback={<div className="p-8 text-center bg-white border-2 border-dashed border-rose-200 rounded-[2.5rem] text-rose-500 font-bold shadow-sm m-8">Public dashboard failed to initialize. Please reload the page.</div>}>
          <DMUAnalytics isPublic={true} />
        </ErrorBoundary>
      </div>
    );
  }



  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-sans">Loading...</div>;
  }

  // GLOBAL INTERCEPT: If course ID is in URL or localStorage, show course portal
  // This ensures students are never stuck on /pending after logout/login
  const coursePortalId = params.get('course') || params.get('room') || localStorage.getItem('oc_active_course');
  if (coursePortalId && session) {
    // Persist so it survives URL changes during auth flow
    localStorage.setItem('oc_active_course', coursePortalId);
    return (
      <div className="h-screen w-screen bg-white">
        <OnlineCourses session={session} userMeta={appUserMeta} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen bg-slate-900 font-sans text-white items-center justify-center relative">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700 animate-in fade-in duration-300">
          <div className="flex justify-center mb-6 text-indigo-400">
            <Calendar size={48} />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">DMU QA Hub</h2>
          <p className="text-slate-400 text-center text-sm mb-8">Sign in to access your portal</p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) alert(error.message);
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input name="email" type="email" required className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input name="password" type="password" required className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center transition-colors">
              <LogIn size={18} className="mr-2" /> Sign In
            </button>
          </form>
          
          <div className="text-center mt-4">
            <button 
              type="button" 
              onClick={() => {
                setShowDirectReset(true);
                setDirectResetEmail('');
                setDirectResetPassword('');
                setDirectResetConfirm('');
              }} 
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium hover:underline transition-colors"
            >
              Forgot Password? Reset it directly
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-700 text-center text-sm text-slate-500">
            Contact admin if your account has no assigned permissions.
          </div>
        </div>

        {/* Direct Reset Password Modal */}
        {showDirectReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-6 w-full max-w-md animate-in zoom-in-95 duration-200 font-sans text-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <KeyRound className="text-indigo-400" size={20} />
                  Reset Password Directly
                </h3>
                <button 
                  type="button"
                  onClick={() => setShowDirectReset(false)} 
                  className="text-slate-400 hover:text-slate-200 rounded-lg p-1 hover:bg-slate-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <p className="text-xs text-slate-400 mb-6">
                Enter your email address and choose a new password. After resetting, your account will require approval from the administrator before you can log in.
              </p>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!directResetEmail || !directResetPassword || !directResetConfirm) return;
                if (directResetPassword !== directResetConfirm) {
                  alert("Passwords do not match!");
                  return;
                }
                if (directResetPassword.length < 6) {
                  alert("Password must be at least 6 characters long.");
                  return;
                }
                setDirectResetLoading(true);
                try {
                  const { data: success, error } = await supabase.rpc('rpc_reset_password_direct', {
                    user_email: directResetEmail,
                    new_password: directResetPassword
                  });
                  if (error) {
                    alert(`Error: ${error.message}`);
                  } else if (success === false) {
                    alert("Error: This email address is not registered in our system.");
                  } else {

                    alert("Password reset successfully! Your account is now pending administrator approval. You can sign in once approved.");
                    setShowDirectReset(false);
                  }
                } catch (err) {
                  console.error(err);
                  alert("An unexpected error occurred.");
                } finally {
                  setDirectResetLoading(false);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    value={directResetEmail}
                    onChange={e => setDirectResetEmail(e.target.value)}
                    placeholder="name@institution.com"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                  <input 
                    type="password" 
                    required 
                    value={directResetPassword}
                    onChange={e => setDirectResetPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
                  <input 
                    type="password" 
                    required 
                    value={directResetConfirm}
                    onChange={e => setDirectResetConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                
                <div className="flex gap-3 justify-end pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowDirectReset(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-medium text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={directResetLoading}
                    className={`px-5 py-2 rounded-lg font-medium text-xs flex items-center gap-1.5 text-white transition-all ${
                      directResetLoading 
                        ? 'bg-indigo-600/50 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
                    }`}
                  >
                    {directResetLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound size={14} /> Reset Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Course portal — accessible by ANY authenticated user, no role required */}
        <Route path="/course" element={
          <div className="h-screen w-screen bg-white">
            <OnlineCourses session={session} userMeta={appUserMeta} />
          </div>
        } />
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
      <ResetPasswordModal isOpen={showResetPassword} onClose={() => setShowResetPassword(false)} />
    </>
  );
}

function ResetPasswordModal({ isOpen, onClose }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Your password has been successfully reset! Redirecting...' });
        setTimeout(() => {
          onClose();
          // Remove hash from URL to keep clean
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md text-white border-t-4 border-t-indigo-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex justify-center mb-6 text-indigo-400">
          <div className="p-3 bg-indigo-500/10 rounded-full ring-4 ring-indigo-500/5 animate-pulse">
            <KeyRound size={36} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-2">Reset Your Password</h2>
        <p className="text-slate-400 text-center text-sm mb-6">Choose a strong, secure new password for your account.</p>

        {message.text && (
          <div className={`p-4 mb-6 rounded-xl border text-sm flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            {message.type === 'success' ? <Check size={18} className="flex-shrink-0" /> : <X size={18} className="flex-shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-white transition-all text-sm"
              placeholder="Min. 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
            <input 
              type="password" 
              required 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-white transition-all text-sm"
              placeholder="Confirm new password"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all mt-6 ${
              loading 
                ? 'bg-indigo-600/50 text-white/50 cursor-not-allowed text-sm' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] text-sm'
            }`}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound size={18} /> Update Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
