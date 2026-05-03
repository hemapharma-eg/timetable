import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList 
} from 'recharts';
import { 
  LayoutDashboard, Database, ShieldAlert, ShieldCheck, 
  Plus, Trash2, Edit2, Save, X, Building2, ListTree,
  Share2, Printer, CheckCircle, ChevronRight, Settings,
  Activity, Users, Info, Calendar, Filter, ArrowLeft, Check
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { supabase } from './supabase';

// --- FIREBASE INIT (Optional fallback) ---
let app, auth, db, appId;
try {
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
  if (firebaseConfig) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  }
} catch (e) {
  console.warn("Firebase not configured", e);
}

// --- INITIAL DATA & UTILS ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const initialUniversities = [
  { id: 'uni1', name: "Gulf Medical University (GMU)", abbr: "GMU", active: true },
  { id: 'uni2', name: "Mohammed Bin Rashid University (MBRU)", abbr: "MBRU", active: true },
  { id: 'uni3', name: "Dubai Medical University", abbr: "DMU", active: true },
  { id: 'uni4', name: "RAKMHSU", abbr: "RAK", active: true },
  { id: 'uni5', name: "Battejee Medical College", abbr: "BMC", active: true },
  { id: 'uni6', name: "Royal College of Surgeons in Ireland (RCSI)", abbr: "RCSI", active: true }
];

const initialYears = [
  { id: 'y1', name: '2024-2025', active: true },
  { id: 'y2', name: '2023-2024', active: true }
];

const initialKpiDefinitions = [
  { id: 'k1', category: 'Students', name: 'Total Enrolled Students', active: true },
  { id: 'k2', category: 'Students', name: '% National Students', active: true },
  { id: 'k3', category: 'Students', name: 'Student Nationalities', active: true },
  { id: 'k4', category: 'Students', name: 'Student-to-Faculty Ratio', active: true },
  { id: 'k5', category: 'Research', name: 'Research Publications', active: true },
  { id: 'k6', category: 'Research', name: 'Publication in top 10% journals', active: true },
  { id: 'k7', category: 'Research', name: 'Research with International Collaboration', active: true },
  { id: 'k8', category: 'Graduates', name: 'Total Graduates (Latest)', active: true },
  { id: 'k9', category: 'Graduates', name: 'Employability', active: true },
  { id: 'k10', category: 'Ranking', name: 'THE World', active: true },
  { id: 'k11', category: 'Ranking', name: 'THE Arab Region', active: true },
];

// Initial data points for 2024-2025
const initialData = [
  { id: generateId(), kpiId: 'k1', yearId: 'y1', actionPlan: '', values: { "uni1": "2824", "uni2": "551", "uni3": "828", "uni4": "1700", "uni5": "1820", "uni6": "5267" } },
  { id: generateId(), kpiId: 'k2', yearId: 'y1', actionPlan: '', values: { "uni1": "9.8", "uni2": "27.2", "uni3": "13.8", "uni4": "21.1", "uni5": "81.59", "uni6": "32" } },
  { id: generateId(), kpiId: 'k3', yearId: 'y1', actionPlan: 'Increase marketing efforts in North Africa and South Asia.', values: { "uni1": "105", "uni2": "50", "uni3": "52", "uni4": "48", "uni5": "52", "uni6": "103" } },
  { id: generateId(), kpiId: 'k4', yearId: 'y1', actionPlan: '', values: { "uni1": "11", "uni2": "5", "uni3": "12", "uni4": "11", "uni5": "9", "uni6": "24" } },
  { id: generateId(), kpiId: 'k5', yearId: 'y1', actionPlan: 'Provide additional grants for faculty publishing in top journals.', values: { "uni1": "519", "uni2": "401", "uni3": "162", "uni4": "441", "uni5": "322", "uni6": "1923" } },
  { id: generateId(), kpiId: 'k6', yearId: 'y1', actionPlan: '', values: { "uni1": "14.1", "uni2": "26.6", "uni3": "16.2", "uni4": "11.4", "uni5": "10.5", "uni6": "30" } },
  { id: generateId(), kpiId: 'k7', yearId: 'y1', actionPlan: '', values: { "uni1": "83.4", "uni2": "79.3", "uni3": "72.8", "uni4": "87.8", "uni5": "76.7", "uni6": "63.2" } },
  { id: generateId(), kpiId: 'k8', yearId: 'y1', actionPlan: '', values: { "uni1": "561", "uni2": "99", "uni3": "114", "uni4": "247", "uni5": "232", "uni6": "1780" } },
  { id: generateId(), kpiId: 'k9', yearId: 'y1', actionPlan: 'Establish a new alumni network to improve career placement tracking.', values: { "uni1": "", "uni2": "", "uni3": "67", "uni4": "48", "uni5": "64", "uni6": "90" } },
  { id: generateId(), kpiId: 'k10', yearId: 'y1', actionPlan: '', values: { "uni1": "NR", "uni2": "NR", "uni3": "NR", "uni4": "NR", "uni5": "NR", "uni6": "251-300" } },
  { id: generateId(), kpiId: 'k11', yearId: 'y1', actionPlan: '', values: { "uni1": "101-125", "uni2": "NR", "uni3": "NR", "uni4": "151-175", "uni5": "NR", "uni6": "NA" } },
];

// --- MAIN COMPONENT ---
export function Benchmarking({ initialPage = 'dashboard' }) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [adminTab, setAdminTab] = useState('universities'); // 'universities' | 'kpis' | 'years' | 'mapping' | 'data'
  const [adminSubMode, setAdminSubMode] = useState('list'); // 'list' | 'add' | 'edit'
  
  // Data State
  const [universities, setUniversities] = useState(initialUniversities);
  const [years, setYears] = useState(initialYears);
  const [kpiDefinitions, setKpiDefinitions] = useState(initialKpiDefinitions);
  const [benchmarkingData, setBenchmarkingData] = useState(initialData);

  // Filters
  const [selectedYearId, setSelectedYearId] = useState(initialYears[0]?.id || '');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedKpiId, setSelectedKpiId] = useState('All');

  // Selection for editing
  const [editingItem, setEditingItem] = useState(null);
  const [activeDataKpiId, setActiveDataKpiId] = useState(null);

  // Feedback State
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [user, setUser] = useState(null);

  useEffect(() => { setCurrentPage(initialPage); }, [initialPage]);

  // --- AUTH & SYNC ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch(e) { console.error(e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('report');
    if (reportId) {
       const fetchReport = async () => {
          try {
             const { data: report, error } = await supabase.from('benchmarking_reports').select('data').eq('id', reportId).maybeSingle();
             if (!error && report) {
                const d = report.data;
                if (d.universities) setUniversities(d.universities);
                if (d.years) setYears(d.years);
                if (d.kpiDefinitions) setKpiDefinitions(d.kpiDefinitions);
                if (d.benchmarkingData) setBenchmarkingData(d.benchmarkingData);
             }
          } catch(e) { console.error(e); }
       };
       fetchReport();
    }
  }, [user]);

  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const handleShare = async () => {
    showToast('Generating short link...');
    try {
       const payload = { universities, years, kpiDefinitions, benchmarkingData };
       const { data, error } = await supabase.from('benchmarking_reports').insert([{ data: payload }]).select().single();
       if (error) throw error;
       const shareUrl = `${window.location.origin}${window.location.pathname}?view=benchmarking&report=${data.id}`;
       navigator.clipboard.writeText(shareUrl);
       showToast('Share link copied!');
    } catch (e) {
       console.error(e);
       showToast('Share failed. Run the SQL script!');
    }
  };

  // --- CRUD HELPERS ---
  const handleAddUniversity = (u) => {
    setUniversities([...universities, { ...u, id: generateId(), active: true }]);
    setAdminSubMode('list');
    showToast('University added');
  };
  const handleUpdateUniversity = (u) => {
    setUniversities(universities.map(item => item.id === u.id ? u : item));
    setAdminSubMode('list');
    setEditingItem(null);
    showToast('University updated');
  };
  const handleDeleteUniversity = (id) => {
    if (!window.confirm('Delete this university? All associated data will be lost.')) return;
    setUniversities(universities.filter(u => u.id !== id));
    showToast('University deleted');
  };

  const handleAddYear = (y) => {
    setYears([...years, { ...y, id: generateId(), active: true }]);
    setAdminSubMode('list');
    showToast('Academic year added');
  };
  const handleUpdateYear = (y) => {
    setYears(years.map(item => item.id === y.id ? y : item));
    setAdminSubMode('list');
    setEditingItem(null);
    showToast('Year updated');
  };
  const handleDeleteYear = (id) => {
    if (!window.confirm('Delete this year and all its benchmarking data?')) return;
    setYears(years.filter(y => y.id !== id));
    setBenchmarkingData(benchmarkingData.filter(d => d.yearId !== id));
    showToast('Year deleted');
  };

  const handleAddKpiDef = (k) => {
    setKpiDefinitions([...kpiDefinitions, { ...k, id: generateId(), active: true }]);
    setAdminSubMode('list');
    showToast('KPI definition added');
  };
  const handleUpdateKpiDef = (k) => {
    setKpiDefinitions(kpiDefinitions.map(item => item.id === k.id ? k : item));
    setAdminSubMode('list');
    setEditingItem(null);
    showToast('KPI updated');
  };
  const handleDeleteKpiDef = (id) => {
    if (!window.confirm('Delete this KPI and all its values across all years?')) return;
    setKpiDefinitions(kpiDefinitions.filter(k => k.id !== id));
    setBenchmarkingData(benchmarkingData.filter(d => d.kpiId !== id));
    showToast('KPI deleted');
  };

  const handleToggleMapping = (kpiId, yearId) => {
    const exists = benchmarkingData.find(d => d.kpiId === kpiId && d.yearId === yearId);
    if (exists) {
      if (window.confirm('Remove this KPI from this year? This will delete entered values.')) {
        setBenchmarkingData(benchmarkingData.filter(d => !(d.kpiId === kpiId && d.yearId === yearId)));
      }
    } else {
      setBenchmarkingData([...benchmarkingData, { id: generateId(), kpiId, yearId, actionPlan: '', values: {} }]);
    }
  };

  const handleUpdateValue = (kpiId, yearId, uniId, value) => {
    setBenchmarkingData(benchmarkingData.map(d => {
      if (d.kpiId === kpiId && d.yearId === yearId) {
        return { ...d, values: { ...d.values, [uniId]: value } };
      }
      return d;
    }));
  };

  const handleUpdateActionPlan = (kpiId, yearId, plan) => {
    setBenchmarkingData(benchmarkingData.map(d => {
      if (d.kpiId === kpiId && d.yearId === yearId) return { ...d, actionPlan: plan };
      return d;
    }));
  };

  // --- DERIVED VIEW DATA ---
  const activeUniversities = useMemo(() => universities.filter(u => u.active), [universities]);
  const activeYears = useMemo(() => years.filter(y => y.active), [years]);
  const categories = useMemo(() => Array.from(new Set(kpiDefinitions.map(k => k.category))), [kpiDefinitions]);
  
  const currentYear = useMemo(() => years.find(y => y.id === selectedYearId), [years, selectedYearId]);
  
  const dashboardData = useMemo(() => {
    return benchmarkingData
      .filter(d => d.yearId === selectedYearId)
      .map(d => {
        const def = kpiDefinitions.find(k => k.id === d.kpiId);
        if (!def || !def.active) return null;
        if (selectedCategory !== 'All' && def.category !== selectedCategory) return null;
        if (selectedKpiId !== 'All' && d.kpiId !== selectedKpiId) return null;
        return { ...d, definition: def };
      })
      .filter(Boolean);
  }, [benchmarkingData, selectedYearId, selectedCategory, selectedKpiId, kpiDefinitions]);

  const parseForChart = (val) => {
    if (!val) return null;
    const str = String(val).trim().toUpperCase();
    if (str === 'NR' || str === 'NA') return null;
    const clean = str.replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  };

  // --- ADMIN SUB-PAGES ---
  
  const ListView = ({ items, columns, onEdit, onDelete, onAdd }) => (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-black text-gray-800">Management List</h3>
        <button onClick={onAdd} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all">
          <Plus size={20} /> Add New
        </button>
      </div>
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {columns.map(col => <th key={col.key} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{col.label}</th>)}
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                {columns.map(col => <td key={col.key} className="px-6 py-4 text-sm font-medium text-gray-700">{item[col.key]}</td>)}
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onEdit(item)} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-xl"><Edit2 size={16} /></button>
                    <button onClick={() => onDelete(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const UniversityPage = () => {
    const [form, setForm] = useState(editingItem || { name: '', abbr: '' });
    if (adminSubMode === 'list') return (
      <ListView 
        items={universities} 
        columns={[{key:'name', label:'Name'}, {key:'abbr', label:'Abbr'}]}
        onAdd={() => setAdminSubMode('add')}
        onEdit={(item) => { setEditingItem(item); setAdminSubMode('edit'); }}
        onDelete={handleDeleteUniversity}
      />
    );
    return (
      <div className="max-w-2xl mx-auto bg-white p-10 rounded-[40px] shadow-xl shadow-indigo-100/20 border border-indigo-50">
        <button onClick={() => setAdminSubMode('list')} className="flex items-center gap-2 text-indigo-600 font-bold mb-8 hover:underline"><ArrowLeft size={18}/> Back to List</button>
        <h2 className="text-3xl font-black text-gray-800 mb-2">{adminSubMode === 'add' ? 'Add University' : 'Edit University'}</h2>
        <p className="text-gray-400 mb-10">Configure the institution details for benchmarking comparisons.</p>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Full Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold" placeholder="e.g. Gulf Medical University" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Abbreviation</label>
            <input value={form.abbr} onChange={e => setForm({...form, abbr: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold" placeholder="e.g. GMU" />
          </div>
          <button onClick={() => adminSubMode === 'add' ? handleAddUniversity(form) : handleUpdateUniversity(form)} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
            <Save size={24} /> {adminSubMode === 'add' ? 'Create University' : 'Save Changes'}
          </button>
        </div>
      </div>
    );
  };

  const YearPage = () => {
    const [form, setForm] = useState(editingItem || { name: '' });
    if (adminSubMode === 'list') return (
      <ListView 
        items={years} 
        columns={[{key:'name', label:'Academic Year'}]}
        onAdd={() => setAdminSubMode('add')}
        onEdit={(item) => { setEditingItem(item); setAdminSubMode('edit'); }}
        onDelete={handleDeleteYear}
      />
    );
    return (
      <div className="max-w-2xl mx-auto bg-white p-10 rounded-[40px] shadow-xl shadow-indigo-100/20 border border-indigo-50">
        <button onClick={() => setAdminSubMode('list')} className="flex items-center gap-2 text-indigo-600 font-bold mb-8 hover:underline"><ArrowLeft size={18}/> Back to List</button>
        <h2 className="text-3xl font-black text-gray-800 mb-2">{adminSubMode === 'add' ? 'Add Academic Year' : 'Edit Year'}</h2>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Year Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold" placeholder="e.g. 2025-2026" />
          </div>
          <button onClick={() => adminSubMode === 'add' ? handleAddYear(form) : handleUpdateYear(form)} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
            <Save size={24} /> Save Year
          </button>
        </div>
      </div>
    );
  };

  const KpiDefPage = () => {
    const [form, setForm] = useState(editingItem || { name: '', category: 'Students' });
    if (adminSubMode === 'list') return (
      <ListView 
        items={kpiDefinitions} 
        columns={[{key:'category', label:'Category'}, {key:'name', label:'Indicator Name'}]}
        onAdd={() => setAdminSubMode('add')}
        onEdit={(item) => { setEditingItem(item); setAdminSubMode('edit'); }}
        onDelete={handleDeleteKpiDef}
      />
    );
    return (
      <div className="max-w-2xl mx-auto bg-white p-10 rounded-[40px] shadow-xl shadow-indigo-100/20 border border-indigo-50">
        <button onClick={() => setAdminSubMode('list')} className="flex items-center gap-2 text-indigo-600 font-bold mb-8 hover:underline"><ArrowLeft size={18}/> Back to List</button>
        <h2 className="text-3xl font-black text-gray-800 mb-2">{adminSubMode === 'add' ? 'Add Indicator' : 'Edit Indicator'}</h2>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Category</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold">
               {['Students', 'Research', 'Graduates', 'Ranking', 'General'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Indicator Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold" placeholder="e.g. Student-to-Faculty Ratio" />
          </div>
          <button onClick={() => adminSubMode === 'add' ? handleAddKpiDef(form) : handleUpdateKpiDef(form)} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
            <Save size={24} /> Save Indicator
          </button>
        </div>
      </div>
    );
  };

  const MappingPage = () => {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-indigo-50 gap-6">
           <div>
              <h3 className="text-2xl font-black text-gray-800">Indicator Mapping</h3>
              <p className="text-gray-400 text-sm mt-1">Select which indicators are active for each academic year</p>
           </div>
           <div className="w-full md:w-64">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block text-center md:text-left">Target Year</label>
              <select 
                value={selectedYearId} onChange={e => setSelectedYearId(e.target.value)}
                className="w-full p-4 bg-indigo-50 border-0 rounded-2xl font-bold text-indigo-700 focus:ring-4 focus:ring-indigo-100 outline-none"
              >
                {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {kpiDefinitions.map(def => {
             const isMapped = benchmarkingData.some(d => d.kpiId === def.id && d.yearId === selectedYearId);
             return (
               <button 
                key={def.id} 
                onClick={() => handleToggleMapping(def.id, selectedYearId)}
                className={`p-6 rounded-3xl border text-left transition-all flex justify-between items-start group ${isMapped ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-white border-gray-100 text-gray-700 hover:border-indigo-200 shadow-sm'}`}
               >
                 <div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isMapped ? 'text-indigo-200' : 'text-indigo-500'}`}>{def.category}</span>
                    <h4 className="font-bold mt-1 text-lg leading-tight">{def.name}</h4>
                 </div>
                 <div className={`p-2 rounded-xl ${isMapped ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-indigo-50'}`}>
                    {isMapped ? <Check size={20} /> : <Plus size={20} className="text-gray-300 group-hover:text-indigo-400" />}
                 </div>
               </button>
             );
           })}
        </div>
      </div>
    );
  };

  const DataEntryPage = () => {
    const yearMappedKpis = benchmarkingData.filter(d => d.yearId === selectedYearId);
    const activeDataEntry = benchmarkingData.find(d => d.kpiId === activeDataKpiId && d.yearId === selectedYearId);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Active Year</label>
              <select value={selectedYearId} onChange={e => setSelectedYearId(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold">
                 {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
           </div>
           <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
              <div className="p-5 bg-indigo-600 text-white font-black flex justify-between items-center">
                 <span>Mapped Indicators</span>
                 <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{yearMappedKpis.length}</span>
              </div>
              <div className="overflow-y-auto divide-y divide-gray-50">
                 {yearMappedKpis.map(d => {
                   const def = kpiDefinitions.find(k => k.id === d.kpiId);
                   return (
                     <button 
                        key={d.id} 
                        onClick={() => setActiveDataKpiId(d.kpiId)}
                        className={`w-full p-5 text-left hover:bg-indigo-50 transition-all flex justify-between items-center group ${activeDataKpiId === d.kpiId ? 'bg-indigo-50 border-r-4 border-indigo-600' : ''}`}
                     >
                       <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{def?.category}</p>
                          <p className={`font-bold mt-1 ${activeDataKpiId === d.kpiId ? 'text-indigo-700' : 'text-gray-700'}`}>{def?.name}</p>
                       </div>
                       <ChevronRight size={18} className={`${activeDataKpiId === d.kpiId ? 'translate-x-1 text-indigo-600' : 'text-gray-300'}`} />
                     </button>
                   );
                 })}
              </div>
           </div>
        </div>

        <div className="lg:col-span-8">
           {activeDataEntry ? (
             <div className="bg-white p-10 rounded-[40px] border border-indigo-50 shadow-2xl shadow-indigo-100/30 animate-in fade-in slide-in-from-right-8">
                <div className="flex justify-between items-start mb-12">
                   <div>
                      <h2 className="text-3xl font-black text-gray-800">{kpiDefinitions.find(k => k.id === activeDataKpiId)?.name}</h2>
                      <p className="text-gray-400 font-bold mt-1">Data entry for Academic Year {currentYear?.name}</p>
                   </div>
                   <div className="flex gap-2 items-center text-emerald-600 bg-emerald-50 px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest">
                      <CheckCircle size={16}/> Auto-saved
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {universities.filter(u => u.active).map(uni => (
                     <div key={uni.id} className="space-y-3">
                        <div className="flex justify-between items-end">
                           <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{uni.name}</label>
                           <span className="text-[10px] font-black text-indigo-300">{uni.abbr}</span>
                        </div>
                        <input 
                           value={activeDataEntry.values[uni.id] || ''}
                           onChange={e => handleUpdateValue(activeDataKpiId, selectedYearId, uni.id, e.target.value)}
                           className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-3xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none font-black text-gray-700 transition-all text-lg"
                           placeholder="0.00"
                        />
                     </div>
                   ))}
                </div>
                <div className="mt-12 pt-10 border-t border-gray-100 space-y-4">
                   <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Info size={16} className="text-indigo-400" /> Strategic Action Plan</label>
                   <textarea 
                      value={activeDataEntry.actionPlan}
                      onChange={e => handleUpdateActionPlan(activeDataKpiId, selectedYearId, e.target.value)}
                      className="w-full p-6 bg-gray-50 border-2 border-transparent rounded-3xl focus:bg-white focus:border-indigo-500 outline-none min-h-[150px] font-medium text-gray-700 leading-relaxed transition-all"
                      placeholder="Enter the proposed actions for institutional improvement..."
                   />
                </div>
             </div>
           ) : (
             <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center bg-white rounded-[40px] border-2 border-dashed border-gray-200 p-20">
                <div className="bg-indigo-50 p-8 rounded-full text-indigo-400 mb-8"><ListTree size={64}/></div>
                <h3 className="text-2xl font-black text-gray-800">Select an Indicator</h3>
                <p className="text-gray-400 max-w-sm mx-auto mt-4 leading-relaxed font-medium">Choose an indicator from the sidebar to begin data entry for the academic year {currentYear?.name}.</p>
             </div>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-transparent font-sans text-gray-900 flex flex-col print:bg-white animate-in fade-in duration-500">
      
      {/* Print Styles (Portrait Fix) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: portrait; margin: 10mm; }
          body { background: white !important; }
          .print-shrink { zoom: 0.8; }
          .print-table { font-size: 8px !important; width: 100% !important; table-layout: fixed !important; }
          .print-table th, .print-table td { padding: 4px !important; word-wrap: break-word !important; }
          .print-no-break { break-inside: avoid; }
          .print-hide { display: none !important; }
        }
      `}} />

      {/* Internal Toolbar */}
      <div className="mb-8 flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
           <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100"><LayoutDashboard size={24} /></div>
           <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Benchmarking Studio</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Institutional Effectiveness</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Share2 size={18} /> Share Result</button>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Printer size={18} /> Print</button>
            {currentPage === 'admin' ? (
               <button onClick={() => setCurrentPage('dashboard')} className="ml-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 flex items-center gap-2"><BarChart size={18} /> Dashboard</button>
            ) : (
               !new URLSearchParams(window.location.search).get('report') && (
                 <button onClick={() => {setCurrentPage('admin'); setAdminTab('universities'); setAdminSubMode('list');}} className="ml-2 bg-white text-indigo-600 border border-indigo-100 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2"><Settings size={18} /> Admin Studio</button>
               )
            )}
        </div>
      </div>

      <div className="flex-1">
        {currentPage === 'dashboard' && (
          <div className="space-y-8 print-shrink">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-50">
              <div className="flex-1">
                <h1 className="text-3xl font-black text-gray-800">Performance Matrix</h1>
                <p className="text-gray-400 mt-2 font-medium max-w-xl leading-relaxed">Comparative performance indicators for Regional Medical Universities.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto print:hidden">
                <div className="w-full sm:w-44">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Academic Year</label>
                  <select className="w-full p-3.5 bg-gray-50 border-0 rounded-2xl text-sm font-bold" value={selectedYearId} onChange={e => setSelectedYearId(e.target.value)}>
                    {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div className="w-full sm:w-56">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Category Filter</label>
                  <select className="w-full p-3.5 bg-gray-50 border-0 rounded-2xl text-sm font-bold" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                    <option value="All">All Categories</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-10">
              {dashboardData.map((d) => {
                const chartData = universities.filter(u => u.active).map(uni => ({
                  name: uni.abbr,
                  value: parseForChart(d.values[uni.id]),
                  fullName: uni.name,
                  originalValue: d.values[uni.id]
                }));
                return (
                  <div key={d.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-50 print-no-break">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
                      <div>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full mb-3 inline-block tracking-widest uppercase">{d.definition.category}</span>
                        <h2 className="text-2xl font-black text-gray-800">{d.definition.name}</h2>
                        <p className="text-gray-400 text-sm mt-1 font-medium">Measurement Period: {currentYear?.name}</p>
                      </div>
                    </div>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#64748b', fontSize:12, fontWeight:700}} dy={10}/>
                          <YAxis axisLine={false} tickLine={false} tick={{fill:'#94a3b8', fontSize:11}}/>
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" fill="#4f46e5" radius={[10, 10, 4, 4]} barSize={50}>
                            <LabelList dataKey="originalValue" position="top" offset={10} fill="#1e293b" fontSize={11} fontWeight={900} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {d.actionPlan && (
                      <div className="mt-8 p-6 bg-emerald-50 rounded-3xl flex gap-4 items-start">
                        <CheckCircle size={20} className="text-emerald-600 mt-1" />
                        <div>
                           <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest mb-1">DMU Action Plan</p>
                           <p className="text-emerald-800 font-medium leading-relaxed">{d.actionPlan}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-50 overflow-hidden print-no-break">
              <div className="p-8 border-b border-gray-50 bg-gray-50/30 font-black text-xl text-gray-800">Indicator Summary Table</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left print-table">
                  <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <tr>
                      <th className="px-8 py-5">Category</th>
                      <th className="px-8 py-5 border-r border-gray-100">Indicator</th>
                      {activeUniversities.map(uni => <th key={uni.id} className="px-8 py-5 text-indigo-600">{uni.abbr}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dashboardData.map((d) => (
                      <tr key={d.id}>
                        <td className="px-8 py-4 font-bold text-gray-500">{d.definition.category}</td>
                        <td className="px-8 py-4 font-black text-gray-800 border-r border-gray-50">{d.definition.name}</td>
                        {activeUniversities.map(uni => (
                          <td key={uni.id} className="px-8 py-4 font-bold text-gray-600">{d.values[uni.id] || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'admin' && (
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-72 flex-shrink-0 space-y-3">
               <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Master Configuration</p>
               <AdminNavItem id="universities" icon={Building2} label="Universities" active={adminTab === 'universities'} onClick={() => {setAdminTab('universities'); setAdminSubMode('list'); setEditingItem(null);}} />
               <AdminNavItem id="years" icon={Calendar} label="Academic Years" active={adminTab === 'years'} onClick={() => {setAdminTab('years'); setAdminSubMode('list'); setEditingItem(null);}} />
               <AdminNavItem id="kpis" icon={ShieldCheck} label="Indicators List" active={adminTab === 'kpis'} onClick={() => {setAdminTab('kpis'); setAdminSubMode('list'); setEditingItem(null);}} />
               <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest my-6">Data & Mapping</p>
               <AdminNavItem id="mapping" icon={Activity} label="KPI-Year Mapping" active={adminTab === 'mapping'} onClick={() => setAdminTab('mapping')} />
               <AdminNavItem id="data" icon={Edit2} label="Value Entry" active={adminTab === 'data'} onClick={() => setAdminTab('data')} />
            </aside>
            <main className="flex-1 min-w-0">
               {adminTab === 'universities' && <UniversityPage />}
               {adminTab === 'years' && <YearPage />}
               {adminTab === 'kpis' && <KpiDefPage />}
               {adminTab === 'mapping' && <MappingPage />}
               {adminTab === 'data' && <DataEntryPage />}
            </main>
          </div>
        )}
      </div>

      {toast.visible && (
        <div className="fixed bottom-10 right-10 z-[200] bg-gray-900 text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10">
          <CheckCircle size={24} className="text-emerald-400" />
          <span className="font-black text-sm tracking-wide">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

function AdminNavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-6 py-4 rounded-[24px] transition-all group ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-gray-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-indigo-100 hover:text-indigo-600'}`}>
      <div className="flex items-center gap-3">
        <Icon size={20} className={active ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'} />
        <span className="font-black text-sm">{label}</span>
      </div>
      <ChevronRight size={16} className={active ? 'text-white/50' : 'text-gray-300'} />
    </button>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-5 rounded-3xl shadow-2xl border border-gray-100 animate-in zoom-in-95">
        <p className="font-black text-gray-800 text-lg mb-1">{payload[0].payload.fullName}</p>
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
           <p className="text-indigo-600 font-black">Value: {payload[0].payload.originalValue || 'N/A'}</p>
        </div>
      </div>
    );
  }
  return null;
};
