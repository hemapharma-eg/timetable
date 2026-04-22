import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar, Clock, Users, BookOpen, MapPin,
  Play, LayoutGrid, Plus, Trash2, AlertCircle, CheckCircle2, Pencil, GraduationCap, ShieldAlert,
  Download, Upload, FileSpreadsheet, LogOut, LogIn
} from 'lucide-react';
import ConstraintsManager from './ConstraintsManager';
import { FacultyManager } from './FacultyManager';
import { StudentManager } from './StudentManager';
import { CourseManager } from './CourseManager';
import { ReportBuilder } from './ReportBuilder';
import { FormBuilder } from './FormBuilder';
import { AppBuilder } from './AppBuilder';
import { supabase } from './supabase';

// --- Default Mock Data ---
const defaultTimeProfiles = [
  {
    id: 'tp1',
    name: 'Standard (Mon-Fri)',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    hours: ['08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '12:00 - 13:00']
  },
  {
    id: 'tp2',
    name: 'Weekend / Evening',
    days: ['Friday', 'Saturday'],
    hours: ['14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00']
  }
];

const defaultFaculty = [
  { id: 'f1', name: 'John Smith', title: 'Dr.', college: 'Engineering' },
  { id: 'f2', name: 'Sarah Connor', title: 'Prof.', college: 'Science' },
  { id: 'f3', name: 'Alan Turing', title: 'Prof.', college: 'Computer Science' }
];

const defaultCourses = [
  { id: 'c1', code: 'MATH101', name: 'Calculus I', program: 'Engineering BSc', year: '1' },
  { id: 'c2', code: 'PHYS201', name: 'Quantum Mechanics', program: 'Physics BSc', year: '2' },
  { id: 'c3', code: 'CS301', name: 'Data Structures', program: 'Computer Science BSc', year: '3' }
];

const defaultSubjects = [
  { id: 'sub1', name: 'Mathematics' },
  { id: 'sub2', name: 'Physics' },
  { id: 'sub3', name: 'Computer Science' }
];

const defaultTags = [
  { id: 'tag1', name: 'Lecture' },
  { id: 'tag2', name: 'Seminar' },
  { id: 'tag3', name: 'Lab' }
];

const defaultGroups = [
  { id: 'g1', name: 'Year 10A', size: 25, timeProfileId: 'tp1' },
  { id: 'g2', name: 'Year 10B', size: 15, timeProfileId: 'tp2' } // This group uses the weekend profile
];

const defaultRooms = [
  { id: 'r1', name: 'Room 101', capacity: 30 },
  { id: 'r2', name: 'Lab A', capacity: 20 }
];

const defaultActivities = [
  { id: 'a1', facultyId: 'f1', courseId: 'c1', groupId: 'g1', roomId: 'r1', duration: 2 },
  { id: 'a2', facultyId: 'f1', courseId: 'c1', groupId: 'g2', roomId: '', duration: 1 },
  { id: 'a3', facultyId: 'f2', courseId: 'c2', groupId: 'g1', roomId: 'r2', duration: 1 },
  { id: 'a4', facultyId: 'f3', courseId: 'c3', groupId: 'g2', roomId: '', duration: 2 },
];

const defaultConstraints = [
  { id: 'cons1', type: 'FAC_UNAVAIL_DAY', facultyId: 'f1', day: 'Friday' },
  { id: 'cons2', type: 'FAC_MAX_DAILY', facultyId: 'f3', maxHours: 2 }
];

// --- Helper Components ---
const SidebarItem = ({ icon: Icon, label, id, activeTab, setActiveTab }) => (
  <button
    onClick={() => setActiveTab(id)}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

// Manages simple arrays of strings (Used for Days and Hours within a Profile)
const StringListManager = ({ title, items, setItems, placeholder }) => {
  const [val, setVal] = useState('');
  const [editIndex, setEditIndex] = useState(-1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!val.trim()) return;
    if (editIndex >= 0) {
      const newItems = [...items];
      newItems[editIndex] = val.trim();
      setItems(newItems);
      setEditIndex(-1);
    } else {
      setItems([...items, val.trim()]);
    }
    setVal('');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <button type="submit" className={`text-white px-4 py-2 rounded-lg transition-colors ${editIndex >= 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
          {editIndex >= 0 ? <CheckCircle2 size={18} /> : <Plus size={18} />}
        </button>
      </form>
      <ul className="space-y-2 max-h-72 overflow-y-auto">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-700">{item}</span>
            <div className="flex gap-1">
              <button onClick={() => { setVal(items[index]); setEditIndex(index); }} className="text-blue-400 hover:text-blue-600 p-1"><Pencil size={16} /></button>
              <button onClick={() => { setItems(items.filter((_, i) => i !== index)); if (editIndex === index) { setVal(''); setEditIndex(-1); } }} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Manages complex Objects, now with CSV Import/Export capability
const ObjectListManager = ({ title, items, setItems, fields }) => {
  const initialForm = fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form[fields[0].key].toString().trim()) return;
    if (editId) {
      setItems(items.map(item => item.id === editId ? { ...item, ...form } : item));
      setEditId(null);
    } else {
      setItems([...items, { id: Date.now().toString(), ...form }]);
    }
    setForm(initialForm);
  };

  const handleDownloadTemplate = () => {
    if (typeof XLSX === 'undefined') {
      alert('Excel engine is still loading. Please try again in a moment.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet([], { header: fields.map(f => f.key) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${title.toLowerCase().replace(' ', '_')}_template.xlsx`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
      alert('Excel engine is still loading. Please try again in a moment.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length < 2) {
          alert('File is empty or missing data rows.');
          return;
        }

        const headers = data[0].map(h => h ? h.toString().trim() : '');
        const newItems = [];

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          
          let item = { id: Date.now().toString() + i };
          fields.forEach((f) => {
            const hIdx = headers.indexOf(f.key);
            if (hIdx >= 0 && row[hIdx] !== undefined) {
              item[f.key] = row[hIdx].toString().trim();
            }
          });
          
          if (item[fields[0].key]) { // Only add if the primary field is present
            newItems.push(item);
          }
        }
        setItems(prev => [...prev, ...newItems]);
        e.target.value = ''; // Reset input
      } catch (err) {
        console.error(err);
        alert('Failed to parse Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <div className="flex space-x-2">
          <button onClick={handleDownloadTemplate} title="Download Excel Template" className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center">
            <Download size={16} className="mr-1" /> <span className="text-xs font-medium">Template</span>
          </button>
          <label title="Upload Excel" className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center cursor-pointer">
            <Upload size={16} className="mr-1" /> <span className="text-xs font-medium">Import</span>
            <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-4">
        {fields.map(field => {
          if (field.type === 'select') {
            return (
              <select
                key={field.key} value={form[field.key] || ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="" disabled>{field.label}</option>
                {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            );
          }
          return (
            <input
              key={field.key} type={field.type || 'text'} value={form[field.key] || ''}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              placeholder={field.label}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          );
        })}
        <button type="submit" className={`text-white px-4 py-2 rounded-lg font-medium ${editId ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
          {editId ? 'Update Entry' : 'Add Entry'}
        </button>
      </form>

      <ul className="space-y-2 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex flex-col text-sm">
              <span className="font-semibold text-slate-800">{item[fields[0].key]}</span>
              {fields.slice(1).map(f => {
                let displayVal = item[f.key];
                if (f.type === 'select') {
                  const opt = f.options.find(o => o.value === displayVal);
                  if (opt) displayVal = opt.label;
                }
                return displayVal ? <span key={f.key} className="text-slate-500 text-xs">{f.label}: {displayVal}</span> : null;
              })}
            </div>
            <div className="flex gap-1 ml-2 flex-shrink-0">
              <button type="button" onClick={() => { setForm({ ...item }); setEditId(item.id); }} className="text-blue-400 hover:text-blue-600 p-1"><Pencil size={16} /></button>
              <button type="button" onClick={() => { setItems(items.filter(i => i.id !== item.id)); if (editId === item.id) { setForm(initialForm); setEditId(null); } }} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
            </div>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No entries yet.</p>}
      </ul>
    </div>
  );
};


export default function App() {
  const [session, setSession] = useState(null);
  const [appRole, setAppRole] = useState(null);
  const [appUserMeta, setAppUserMeta] = useState(null);
  const [appUsers, setAppUsers] = useState([]);
  const [authMode, setAuthMode] = useState('signIn'); // 'signIn' | 'signUp'
  const [signupGroups, setSignupGroups] = useState([]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [deepLinkId, setDeepLinkId] = useState(null);

  // URL deep linking for shared forms/apps/reports
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const idParam = params.get('id');
    if (viewParam && idParam) {
      const viewMap = { form: 'formbuilder', app: 'appbuilder', report: 'reports' };
      if (viewMap[viewParam]) {
        setActiveTab(viewMap[viewParam]);
        setDeepLinkId(idParam);
        // Clean URL without reloading
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Data State
  const [timeProfiles, setTimeProfiles] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [activityTags, setActivityTags] = useState([]);
  const [groups, setGroups] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activities, setActivities] = useState([]);
  const [constraints, setConstraints] = useState([]);

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

  useEffect(() => {
    if (!session && authMode === 'signUp') {
      supabase.from('student_groups').select('id, name').then(({data, error}) => {
        if (data && !error) setSignupGroups(data);
      });
    }
  }, [authMode, session]);

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
    } else if (matchedFaculty) {
      roleToSet = 'faculty';
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

    if (roleToSet === 'technical_admin') {
      supabase.from('app_users').select('*').then(({data}) => {
        if (data) setAppUsers(data);
      });
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
  const [newAct, setNewAct] = useState({ facultyId: '', courseId: '', tagId: '', groupId: '', roomId: '', duration: 1 });
  const [activeProfileId, setActiveProfileId] = useState(timeProfiles[0]?.id);

  // Generation State
  const [schedule, setSchedule] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewFilter, setViewFilter] = useState('all');
  const [lockedGroups, setLockedGroups] = useState([]);

  // Helpers for extracting unique master sets of days/hours for grid rendering
  const allGlobalDays = [...new Set(timeProfiles.flatMap(tp => tp.days))];
  const allGlobalHours = [...new Set(timeProfiles.flatMap(tp => tp.hours))].sort();

  // --- Core Algorithm (FET-Lite Scheduler) ---
  const generateTimetable = () => {
    setIsGenerating(true);

    setTimeout(async () => {
      // 1. Preserve schedules for locked groups
      let newSchedule = [...schedule.filter(s => lockedGroups.includes(s.groupId))];
      let newUnassigned = [];

      // 2. Filter activities to only schedule unlocked groups
      const activitiesToSchedule = activities.filter(a => !lockedGroups.includes(a.groupId));

      // Sort activities: Place those with longer durations or strict rooms first
      const sortedActivities = [...activitiesToSchedule].sort((a, b) => {
        if (b.duration !== a.duration) return b.duration - a.duration;
        if (b.roomId && !a.roomId) return 1;
        return Math.random() - 0.5;
      });

      sortedActivities.forEach(act => {
        let placed = false;
        const duration = parseInt(act.duration) || 1;

        const group = groups.find(g => g.id === act.groupId);
        const groupSize = parseInt(group?.size) || 0;
        const profile = timeProfiles.find(tp => tp.id === group?.timeProfileId) || timeProfiles[0];
        const groupDays = profile ? profile.days : [];
        const groupHours = profile ? profile.hours : [];

        // Load Constraints
        const unavailDays = constraints.filter(c => c.type === 'FAC_UNAVAIL_DAY' && c.facultyId === act.facultyId).map(c => c.day);
        const groupUnavailDays = constraints.filter(c => c.type === 'GROUP_UNAVAIL_DAY' && c.groupId === act.groupId).map(c => c.day);
        const maxDailyConst = constraints.find(c => c.type === 'FAC_MAX_DAILY' && c.facultyId === act.facultyId);
        const maxDaily = maxDailyConst ? parseInt(maxDailyConst.maxHours) : 999;
        const maxContConst = constraints.find(c => c.type === 'MAX_HOURS_CONTINUOUSLY' && c.facultyId === act.facultyId);
        const maxContinuous = maxContConst ? parseInt(maxContConst.maxHours) : 999;
        
        const groupMaxDailyConst = constraints.find(c => c.type === 'GROUP_MAX_DAILY' && c.groupId === act.groupId);
        const groupMaxDaily = groupMaxDailyConst ? parseInt(groupMaxDailyConst.maxHours) : 999;
        const groupMaxContConst = constraints.find(c => c.type === 'GROUP_MAX_CONTINUOUS' && c.groupId === act.groupId);
        const groupMaxContinuous = groupMaxContConst ? parseInt(groupMaxContConst.maxHours) : 999;

        const minDaysConst = constraints.find(c => c.type === 'MIN_DAYS_BETWEEN_ACTIVITIES' && c.groupId === act.groupId && c.courseId === act.courseId);
        const minDaysBetween = minDaysConst ? parseInt(minDaysConst.minDays) : 0;
        const preferredRoomConst = constraints.find(c => c.type === 'PREFERRED_ROOM' && c.courseId === act.courseId);

        // Check SAME_STARTING_TIME
        const sameTimeConst = constraints.find(c => c.type === 'SAME_STARTING_TIME' && (c.activityId1 === act.id || c.activityId2 === act.id));
        let forceDay = null;
        let forceHourIndex = null;

        if (sameTimeConst) {
            const linkedActId = sameTimeConst.activityId1 === act.id ? sameTimeConst.activityId2 : sameTimeConst.activityId1;
            const linkedSchedule = newSchedule.find(s => s.parentActId === linkedActId && s.part === 1);
            if (linkedSchedule) {
                forceDay = linkedSchedule.day;
                forceHourIndex = groupHours.indexOf(linkedSchedule.hour);
            }
        }

        // Helper for Min Days Between
        const scheduledDaysForCourse = new Set(newSchedule.filter(s => s.groupId === act.groupId && s.courseId === act.courseId).map(s => s.day));
        
        let roomsToTry = [...rooms].sort((a, b) => parseInt(a.capacity || 0) - parseInt(b.capacity || 0));
        if (preferredRoomConst) {
           const pRoom = rooms.find(r => r.id === preferredRoomConst.roomId);
           if (pRoom) roomsToTry = [pRoom, ...rooms.filter(r => r.id !== pRoom.id)];
        }

        for (let d of groupDays) {
          if (placed) break;
          if (forceDay && forceDay !== d) continue; // SAME_STARTING_TIME lock
          if (unavailDays.includes(d) || groupUnavailDays.includes(d)) continue; 

          // Verify MIN_DAYS_BETWEEN_ACTIVITIES
          if (minDaysBetween > 1 && act.courseId) {
             const dayIndex = allGlobalDays.indexOf(d);
             let tooClose = false;
             for (let sDay of scheduledDaysForCourse) {
                 const sIndex = allGlobalDays.indexOf(sDay);
                 if (Math.abs(dayIndex - sIndex) < minDaysBetween) tooClose = true;
             }
             if (tooClose) continue;
          }

          // Faculty Max Daily Hours
          const currentHoursToday = newSchedule.filter(s => s.day === d && s.facultyId === act.facultyId).length;
          if (currentHoursToday + duration > maxDaily) continue;

          // Group Max Daily Hours
          const groupHoursToday = newSchedule.filter(s => s.day === d && s.groupId === act.groupId).length;
          if (groupHoursToday + duration > groupMaxDaily) continue;

          for (let hIndex = 0; hIndex <= groupHours.length - duration; hIndex++) {
            if (placed) break;
            if (forceHourIndex !== null && forceHourIndex !== hIndex) continue; // SAME_STARTING_TIME lock

            // Verify MAX_HOURS_CONTINUOUSLY (Faculty)
            if (maxContinuous < 999) {
                let preCount = 0;
                while(hIndex - 1 - preCount >= 0 && newSchedule.some(s => s.day === d && s.hour === groupHours[hIndex - 1 - preCount] && s.facultyId === act.facultyId)) preCount++;
                let postCount = 0;
                while(hIndex + duration + postCount < groupHours.length && newSchedule.some(s => s.day === d && s.hour === groupHours[hIndex + duration + postCount] && s.facultyId === act.facultyId)) postCount++;
                if (preCount + duration + postCount > maxContinuous) continue;
            }

            // Verify MAX_HOURS_CONTINUOUSLY (Group)
            if (groupMaxContinuous < 999) {
                let preGrpCount = 0;
                while(hIndex - 1 - preGrpCount >= 0 && newSchedule.some(s => s.day === d && s.hour === groupHours[hIndex - 1 - preGrpCount] && s.groupId === act.groupId)) preGrpCount++;
                let postGrpCount = 0;
                while(hIndex + duration + postGrpCount < groupHours.length && newSchedule.some(s => s.day === d && s.hour === groupHours[hIndex + duration + postGrpCount] && s.groupId === act.groupId)) postGrpCount++;
                if (preGrpCount + duration + postGrpCount > groupMaxContinuous) continue;
            }

            for (let r of roomsToTry) {
              if (placed) break;
              if (parseInt(r.capacity || 0) < groupSize) continue;
              if (act.roomId && act.roomId !== r.id) continue;

              // Check Conflicts
              let slotsAreFree = true;
              for (let offset = 0; offset < duration; offset++) {
                const checkHour = groupHours[hIndex + offset];
                const hasConflict = newSchedule.some(s =>
                  s.day === d && s.hour === checkHour && (
                    s.roomId === r.id ||
                    s.facultyId === act.facultyId ||
                    s.groupId === act.groupId
                  )
                );
                if (hasConflict) { slotsAreFree = false; break; }
              }

              if (slotsAreFree) {
                for (let offset = 0; offset < duration; offset++) {
                  newSchedule.push({
                    id: `${act.id}-part${offset}`,
                    parentActId: act.id,
                    day: d,
                    hour: groupHours[hIndex + offset],
                    roomId: r.id,
                    facultyId: act.facultyId,
                    courseId: act.courseId,
                    tagId: act.tagId,
                    groupId: act.groupId,
                    part: offset + 1,
                    totalParts: duration
                  });
                }
                placed = true;
              }
            }
          }
        }

        if (!placed) newUnassigned.push(act);
      });

      setSchedule(newSchedule);
      setUnassigned(newUnassigned);

      // Push to Supabase optionally
      try {
        await supabase.from('schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (newSchedule.length > 0) {
          const dbReadySchedule = newSchedule.map(({ ...s }) => {
            // Ensure no invalid dummy ID goes to uuid column
            // We strip 'id' from local so DB generates valid UIUD
            const { id, ...clean } = s; 
            return clean;
          });
          await supabase.from('schedules').insert(dbReadySchedule);
        }
      } catch (err) {
        console.error("Failed to sync generated schedule to Supabase", err);
      }

      setIsGenerating(false);
      setActiveTab('timetable');
    }, 800);
  };

  // --- Rendering Functions ---
  const renderUsersManager = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <Users className="mr-2 text-indigo-600" /> Manage User Roles
        </h3>
        <p className="text-sm text-slate-500 mb-4">View and change user roles/access level in the system.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-sm">
                <th className="p-4">User ID (UUID)</th>
                <th className="p-4">Linked Group/Faculty</th>
                <th className="p-4 w-48">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-4 text-sm font-mono text-slate-500 truncate max-w-[200px]" title={u.id}>{u.id}</td>
                  <td className="p-4 text-sm">
                    {u.group_id ? `Group: ${groups.find(g => g.id === u.group_id)?.name || u.group_id}` : 
                     u.faculty_id ? `Faculty: ${faculty.find(f => f.id === u.faculty_id)?.name || u.faculty_id}` : '-'}
                  </td>
                  <td className="p-4">
                    <select 
                      value={u.role || 'student'} 
                      onChange={async (e) => {
                        const newRole = e.target.value;
                        const { error } = await supabase.from('app_users').update({ role: newRole }).eq('id', u.id);
                        if (error) alert("Failed to update role: " + error.message);
                        else {
                          setAppUsers(appUsers.map(user => user.id === u.id ? { ...user, role: newRole } : user));
                        }
                      }}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                    >
                      <option value="student">Viewer / Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="academic_admin">Academic Admin</option>
                      <option value="technical_admin">Technical Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
              {appUsers.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-slate-500 text-sm">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Welcome to DMU Timetable</h1>
        <p className="text-indigo-100 max-w-2xl">
          Define multiple Time Profiles, upload your CSV data, apply constraints, and automatically build a conflict-free university schedule.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Faculty', count: faculty.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Courses', count: courses.length, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-100' },
          { label: 'Students', count: students.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
          { label: 'Tags', count: activityTags.length, icon: Clock, color: 'text-pink-600', bg: 'bg-pink-100' },
          { label: 'Groups', count: groups.length, icon: GraduationCap, color: 'text-green-600', bg: 'bg-green-100' },
          { label: 'Profiles', count: timeProfiles.length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className={`p-4 rounded-full ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stat.count}</p>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTimeProfiles = () => {
    const activeProfile = timeProfiles.find(tp => tp.id === activeProfileId) || timeProfiles[0];

    const setProfileDays = (newDays) => {
      setTimeProfiles(timeProfiles.map(tp => tp.id === activeProfile.id ? { ...tp, days: newDays } : tp));
    };

    const setProfileHours = (newHours) => {
      setTimeProfiles(timeProfiles.map(tp => tp.id === activeProfile.id ? { ...tp, hours: newHours } : tp));
    };

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <Clock className="mr-2 text-indigo-600" /> Manage Time Profiles
          </h3>
          <p className="text-sm text-slate-500 mb-4">Create different sets of working days and times to assign to different student groups.</p>

          <div className="flex gap-4 mb-4">
            <select
              value={activeProfileId}
              onChange={e => setActiveProfileId(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {timeProfiles.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
            </select>
            <button
              onClick={() => {
                const name = prompt('Enter new Profile Name:');
                if (name) {
                  const newTp = { id: Date.now().toString(), name, days: [], hours: [] };
                  setTimeProfiles([...timeProfiles, newTp]);
                  setActiveProfileId(newTp.id);
                }
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <Plus size={18} className="mr-2" /> New Profile
            </button>
            <button
              onClick={() => {
                if (timeProfiles.length === 1) return alert('Cannot delete the last profile.');
                setTimeProfiles(timeProfiles.filter(tp => tp.id !== activeProfile.id));
                setActiveProfileId(timeProfiles[0].id);
              }}
              className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 flex items-center"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {activeProfile && (
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <StringListManager title={`Days for ${activeProfile.name}`} items={activeProfile.days} setItems={setProfileDays} placeholder="e.g. Monday" />
            <StringListManager title={`Hours for ${activeProfile.name}`} items={activeProfile.hours} setItems={setProfileHours} placeholder="e.g. 08:00 - 09:00" />
          </div>
        )}
      </div>
    );
  };

  const renderTimetable = () => {
    if (schedule.length === 0 && unassigned.length === 0) {
      return (
        <div className="text-center py-20">
          <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">No timetable generated yet. Go to Generate tab.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {unassigned.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start space-x-3">
            <AlertCircle className="flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold">Generation Incomplete ({unassigned.length} items failed)</h4>
              <p className="text-sm mt-1">Failed to place activities. Check if Space/Time constraints are too tight, or if the group's Time Profile lacks enough hours for the required duration.</p>
            </div>
          </div>
        )}

        {unassigned.length === 0 && schedule.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center space-x-3">
            <CheckCircle2 className="flex-shrink-0" />
            <span className="font-semibold">Generation Successful! All constraints satisfied.</span>
          </div>
        )}

        {['technical_admin', 'academic_admin'].includes(appRole) && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-slate-700">View By:</span>
              <select value={viewFilter} onChange={e => setViewFilter(e.target.value)} className="border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white min-w-[200px]">
                <option value="all">All Data (Global Master Grid)</option>
                <optgroup label="Student Groups">
                  {groups.map(g => <option key={`g-${g.id}`} value={`group-${g.id}`}>{g.name}</option>)}
                </optgroup>
                <optgroup label="Faculty">
                  {faculty.map(f => <option key={`f-${f.id}`} value={`faculty-${f.id}`}>{f.name}</option>)}
                </optgroup>
              </select>
            </div>
            
            {viewFilter.startsWith('group-') && (
              <button 
                onClick={() => {
                  const gId = viewFilter.replace('group-', '');
                  if (lockedGroups.includes(gId)) {
                    setLockedGroups(lockedGroups.filter(id => id !== gId));
                  } else {
                    setLockedGroups([...lockedGroups, gId]);
                  }
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  lockedGroups.includes(viewFilter.replace('group-', '')) 
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {lockedGroups.includes(viewFilter.replace('group-', '')) ? (
                  <><span>🔓 Unlock Group Timetable</span></>
                ) : (
                  <><span>🔒 Lock Group Timetable</span></>
                )}
              </button>
            )}
          </div>
        )}

        {/* Timetable Grid */}
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
          <table className="w-full min-w-max border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-3 border-r border-slate-200 w-32 bg-slate-100 z-10 font-semibold text-slate-600">Time / Day</th>
                {allGlobalDays.map((d, idx) => <th key={idx} className="p-3 border-r border-slate-200 text-center font-semibold text-slate-600 min-w-[150px]">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {allGlobalHours.map((hour, hIdx) => (
                <tr key={hIdx} className="border-b border-slate-100">
                  <td className="p-3 border-r border-slate-200 bg-slate-50 font-medium text-slate-600 text-sm whitespace-nowrap">{hour}</td>
                  {allGlobalDays.map((day, dIdx) => {
                    let cellActivities = schedule.filter(s => s.day === day && s.hour === hour);

                    if (viewFilter.startsWith('group-')) {
                      cellActivities = cellActivities.filter(s => s.groupId === viewFilter.replace('group-', ''));
                    } else if (viewFilter.startsWith('faculty-')) {
                      cellActivities = cellActivities.filter(s => s.facultyId === viewFilter.replace('faculty-', ''));
                    }

                    // Strict RBAC Enforcement
                    if (appRole === 'faculty') {
                      cellActivities = cellActivities.filter(s => s.facultyId === appUserMeta?.faculty_id);
                    } else if (appRole === 'student') {
                      cellActivities = cellActivities.filter(s => s.groupId === appUserMeta?.group_id);
                    }

                    return (
                      <td key={`cell-${dIdx}-${hIdx}`} className="p-2 border-r border-slate-100 align-top min-h-[80px]">
                        {cellActivities.map(act => (
                          <div key={act.id} className="bg-indigo-50 border border-indigo-200 p-2 rounded-md mb-1 text-sm shadow-sm">
                            <div className="font-bold text-indigo-900 flex justify-between">
                              <span>{courses.find(c => c.id === act.courseId)?.code}</span>
                              {act.totalParts > 1 && <span className="text-xs bg-indigo-200 px-1 rounded text-indigo-800">Pt {act.part}/{act.totalParts}</span>}
                            </div>
                            <div className="text-indigo-800 text-xs truncate mt-0.5">{courses.find(c => c.id === act.courseId)?.name}</div>
                            <div className="text-indigo-700 text-xs mt-1 border-t border-indigo-100 pt-1">{faculty.find(f => f.id === act.facultyId)?.name}</div>
                            <div className="flex justify-between text-indigo-500 text-xs mt-1 font-medium">
                              <span>{groups.find(g => g.id === act.groupId)?.name}</span>
                              <span>{rooms.find(r => r.id === act.roomId)?.name}</span>
                            </div>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (!session) {
    return (
      <div className="flex h-screen bg-slate-900 font-sans text-white items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
          <div className="flex justify-center mb-6 text-indigo-400">
            <Calendar size={48} />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">DMU Timetable</h2>
          <p className="text-slate-400 text-center text-sm mb-8">
            {authMode === 'signIn' ? 'Sign in to access your portal' : 'Create an account'}
          </p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            
            if (authMode === 'signIn') {
              const { error } = await supabase.auth.signInWithPassword({ email, password });
              if (error) alert(error.message);
            } else {
              const groupId = e.target.groupId?.value;
              const { data, error } = await supabase.auth.signUp({ email, password });
              if (error) {
                alert(error.message);
              } else if (data.user) {
                // By default make them a student (viewer) of their own timetable by mapping them to this group
                if (groupId) {
                  await supabase.from('app_users').insert([{ 
                    id: data.user.id, 
                    role: 'student',
                    group_id: groupId 
                  }]);
                } else {
                  // Fallback without group
                  await supabase.from('app_users').insert([{ 
                    id: data.user.id, 
                    role: 'student' 
                  }]);
                }
                alert('Account created! You are now a viewer by default.');
                if (!data.session) {
                    setAuthMode('signIn');
                }
              }
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
            {authMode === 'signUp' && signupGroups.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Your Student Group</label>
                <select name="groupId" className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">None / Will be assigned later</option>
                  {signupGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center">
              {authMode === 'signIn' ? <><LogIn size={18} className="mr-2" /> Sign In</> : <><Plus size={18} className="mr-2" /> Create Account</>}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-slate-400">
            {authMode === 'signIn' ? (
              <p>Don't have an account? <button type="button" onClick={() => setAuthMode('signUp')} className="text-indigo-400 hover:text-indigo-300 font-medium">Sign Up</button></p>
            ) : (
              <p>Already have an account? <button type="button" onClick={() => setAuthMode('signIn')} className="text-indigo-400 hover:text-indigo-300 font-medium">Sign In</button></p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isTechAdmin = appRole === 'technical_admin';

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <Calendar className="mr-2 text-indigo-400" /> DMU <span className="text-indigo-400 font-light">Timetable</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Web Timetabling Engine</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <SidebarItem id="dashboard" icon={LayoutGrid} label="Dashboard" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SidebarItem id="timetable" icon={Calendar} label="View Timetable" activeTab={activeTab} setActiveTab={setActiveTab} />

          {isTechAdmin && (
            <>
              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Parameters</div>
              <SidebarItem id="users" icon={Users} label="User Roles" activeTab={activeTab} setActiveTab={setActiveTab} />
              <SidebarItem id="time" icon={Clock} label="Time Profiles" activeTab={activeTab} setActiveTab={setActiveTab} />
              <SidebarItem id="faculty" icon={Users} label="Faculty" activeTab={activeTab} setActiveTab={setActiveTab} />
              <SidebarItem id="courses" icon={BookOpen} label="Courses" activeTab={activeTab} setActiveTab={setActiveTab} />
              <SidebarItem id="students" icon={Users} label="Students" activeTab={activeTab} setActiveTab={setActiveTab} />
              <SidebarItem id="tags" icon={Clock} label="Activity Tags" activeTab={activeTab} setActiveTab={setActiveTab} />
              <SidebarItem id="groups" icon={GraduationCap} label="Student Groups" activeTab={activeTab} setActiveTab={setActiveTab} />
              <SidebarItem id="rooms" icon={MapPin} label="Rooms" activeTab={activeTab} setActiveTab={setActiveTab} />

              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rules & Planning</div>
              <SidebarItem id="constraints" icon={ShieldAlert} label="Constraints" activeTab={activeTab} setActiveTab={setActiveTab} />
              <SidebarItem id="activities" icon={BookOpen} label="Activities" activeTab={activeTab} setActiveTab={setActiveTab} />

              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduling</div>
              <SidebarItem id="generate" icon={Play} label="Generate" activeTab={activeTab} setActiveTab={setActiveTab} />

              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reports</div>
              <SidebarItem id="reports" icon={FileSpreadsheet} label="Report Builder" activeTab={activeTab} setActiveTab={setActiveTab} />

              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Builders</div>
              <SidebarItem id="formbuilder" icon={FileSpreadsheet} label="Form Builder" activeTab={activeTab} setActiveTab={setActiveTab} />
              <SidebarItem id="appbuilder" icon={LayoutGrid} label="App Builder" activeTab={activeTab} setActiveTab={setActiveTab} />
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

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'users' && renderUsersManager()}
          {activeTab === 'time' && renderTimeProfiles()}
          {activeTab === 'faculty' && (
            <FacultyManager faculty={faculty} setFaculty={setFaculty} />
          )}
          {activeTab === 'courses' && (
            <CourseManager courses={courses} setCourses={setCourses} />
          )}
          {activeTab === 'students' && (
            <StudentManager students={students} setStudents={setStudents} />
          )}
          {activeTab === 'tags' && (
            <div className="max-w-3xl mx-auto">
              <ObjectListManager title="Activity Tags" items={activityTags} setItems={setActivityTags} fields={[{ key: 'name', label: 'Tag Name (e.g. Lecture, Lab)' }]} />
            </div>
          )}
          {activeTab === 'groups' && (
            <div className="max-w-3xl mx-auto">
              <ObjectListManager title="Student Groups" items={groups} setItems={setGroups} fields={[{ key: 'name', label: 'Group Name' }, { key: 'size', label: 'Number of Students (Size)', type: 'number' }, { key: 'timeProfileId', label: 'Time Profile', type: 'select', options: timeProfiles.map(tp => ({ value: tp.id, label: tp.name })) }]} />
            </div>
          )}
          {activeTab === 'rooms' && (
            <div className="max-w-3xl mx-auto">
              <ObjectListManager title="Rooms" items={rooms} setItems={setRooms} fields={[{ key: 'name', label: 'Room Name' }, { key: 'capacity', label: 'Room Capacity', type: 'number' }]} />
            </div>
          )}
          {activeTab === 'constraints' && (
            <ConstraintsManager constraints={constraints} setConstraints={setConstraints} faculty={faculty} days={allGlobalDays} groups={groups} courses={courses} rooms={rooms} activities={activities} />
          )}
          {activeTab === 'activities' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Activity Form */}
              <div className="p-6 border-b border-slate-200 bg-slate-50">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Add New Activity</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!newAct.facultyId || !newAct.courseId || !newAct.tagId || !newAct.groupId) return;
                  setActivities([...activities, { id: Date.now().toString(), ...newAct }]);
                  setNewAct({ facultyId: '', courseId: '', tagId: '', groupId: '', roomId: '', duration: 1 });
                }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <select required value={newAct.facultyId} onChange={e => setNewAct({ ...newAct, facultyId: e.target.value })} className="px-4 py-2 border rounded-lg bg-white">
                    <option value="">Select Faculty</option>
                    {faculty.map(f => <option key={f.id} value={f.id}>{f.title ? f.title + ' ' : ''}{f.name}</option>)}
                  </select>
                  <select required value={newAct.courseId} onChange={e => setNewAct({ ...newAct, courseId: e.target.value })} className="px-4 py-2 border rounded-lg bg-white">
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.code ? `${c.code} - ` : ''}{c.name}</option>)}
                  </select>
                  <select required value={newAct.tagId} onChange={e => setNewAct({ ...newAct, tagId: e.target.value })} className="px-4 py-2 border rounded-lg bg-white">
                    <option value="">Select Tag</option>
                    {activityTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <select required value={newAct.groupId} onChange={e => setNewAct({ ...newAct, groupId: e.target.value })} className="px-4 py-2 border rounded-lg bg-white">
                    <option value="">Select Group</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name} (Size: {g.size || 0})</option>)}
                  </select>
                  <select value={newAct.roomId} onChange={e => setNewAct({ ...newAct, roomId: e.target.value })} className="px-4 py-2 border rounded-lg bg-white">
                    <option value="">Room Pref (Optional)</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name} {r.capacity ? `(Cap: ${r.capacity})` : ''}</option>)}
                  </select>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Duration (Hrs):</label>
                    <input type="number" min="1" max="4" required value={newAct.duration} onChange={e => setNewAct({ ...newAct, duration: parseInt(e.target.value) || 1 })} className="w-full px-4 py-2 border rounded-lg bg-white outline-none" />
                  </div>
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium md:col-span-4">
                    Add Activity
                  </button>
                </form>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-slate-600 font-medium text-sm">
                      <th className="p-4">Faculty</th>
                      <th className="p-4">Course</th>
                      <th className="p-4">Tag</th>
                      <th className="p-4">Group</th>
                      <th className="p-4">Room Pref.</th>
                      <th className="p-4">Duration</th>
                      <th className="p-4 w-16">Act</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activities.map((act) => {
                      const fac = faculty.find(f => f.id === act.facultyId);
                      const cou = courses.find(c => c.id === act.courseId);
                      const tag = activityTags.find(t => t.id === act.tagId);
                      const grp = groups.find(g => g.id === act.groupId);
                      const rm = rooms.find(r => r.id === act.roomId);

                      return (
                        <tr key={act.id} className="hover:bg-slate-50">
                          <td className="p-4">{fac ? `${fac.name}` : 'Unknown'}</td>
                          <td className="p-4">{cou ? `${cou.code ? cou.code + ' - ' : ''}${cou.name}` : 'Unknown'}</td>
                          <td className="p-4">{tag?.name || 'None'}</td>
                          <td className="p-4">{grp?.name || 'Unknown'}</td>
                          <td className="p-4">{rm?.name || 'Any'}</td>
                          <td className="p-4"><span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold">{act.duration || 1} hrs</span></td>
                          <td className="p-4">
                            <button onClick={() => setActivities(activities.filter(a => a.id !== act.id))} className="text-red-400 hover:text-red-600">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'generate' && (
            <div className="max-w-2xl mx-auto text-center mt-12 space-y-8">
              <div className="bg-indigo-50 text-indigo-800 p-6 rounded-2xl border border-indigo-100">
                <Play size={48} className="mx-auto mb-4 text-indigo-500" />
                <h2 className="text-2xl font-bold mb-2">Ready to Generate</h2>
                <p className="text-indigo-600/80 mb-6">
                  The engine will schedule {activities.length} activities. Space capacity, specific Time Profiles for each group, and Constraints will be strictly enforced.
                </p>
                <button
                  onClick={generateTimetable}
                  disabled={isGenerating || activities.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-lg font-semibold px-8 py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center w-full max-w-xs mx-auto"
                >
                  {isGenerating ? 'Computing...' : 'Start Generation'}
                </button>
              </div>
            </div>
          )}
          {activeTab === 'reports' && (
            <ReportBuilder deepLinkId={deepLinkId} />
          )}
          {activeTab === 'formbuilder' && (
            <FormBuilder deepLinkId={deepLinkId} />
          )}
          {activeTab === 'appbuilder' && (
            <AppBuilder deepLinkId={deepLinkId} />
          )}
          {activeTab === 'timetable' && renderTimetable()}
        </div>
      </main>
    </div>
  );
}
