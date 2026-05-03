import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList 
} from 'recharts';
import { 
  LayoutDashboard, Database, ShieldAlert, ShieldCheck, 
  Plus, Trash2, Edit2, Save, X, Building2, ListTree,
  Share2, Printer, CheckCircle, ChevronRight, Settings,
  Activity, Users, Info, Calendar, Filter, ArrowLeft, Check, Loader2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { supabase } from './supabase';
import RichTextEditor from './RichTextEditor';

// --- FIREBASE INIT ---
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

// --- UTILS ---
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- MAIN COMPONENT ---
export function Benchmarking({ initialPage = 'dashboard' }) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [adminTab, setAdminTab] = useState('universities'); 
  const [adminSubMode, setAdminSubMode] = useState('list'); 
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [universities, setUniversities] = useState([]);
  const [years, setYears] = useState([]);
  const [kpiDefinitions, setKpiDefinitions] = useState([]);
  const [benchmarkingData, setBenchmarkingData] = useState([]);

  // Filters
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedKpiId, setSelectedKpiId] = useState('All');

  // Selection for editing
  const [editingItem, setEditingItem] = useState(null);
  const [activeDataKpiId, setActiveDataKpiId] = useState(null);

  // Feedback State
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [user, setUser] = useState(null);

  useEffect(() => { setCurrentPage(initialPage); }, [initialPage]);

  // --- AUTH & DATA SYNC ---
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
    const fetchData = async () => {
      setLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const reportId = urlParams.get('report');

      if (reportId) {
        // Snapshot Mode (Public Shared Report)
        try {
          const { data: report, error } = await supabase.from('benchmarking_reports').select('data').eq('id', reportId).maybeSingle();
          if (!error && report) {
            const d = report.data;
            if (d.universities) setUniversities(d.universities);
            if (d.years) setYears(d.years);
            if (d.kpiDefinitions) setKpiDefinitions(d.kpiDefinitions);
            if (d.benchmarkingData) setBenchmarkingData(d.benchmarkingData);
            if (d.years?.length > 0) setSelectedYearId(d.years[0].id);
          }
        } catch(e) { console.error(e); }
      } else {
        // Master List Mode (Live Data)
        try {
          const [resUni, resYears, resKpis, resData] = await Promise.all([
            supabase.from('benchmarking_universities').select('*').order('name'),
            supabase.from('benchmarking_years').select('*').order('name', { ascending: false }),
            supabase.from('benchmarking_kpis').select('*').order('category'),
            supabase.from('benchmarking_values').select('*')
          ]);

          if (resUni.data) setUniversities(resUni.data);
          if (resYears.data) {
            setYears(resYears.data);
            if (resYears.data.length > 0) setSelectedYearId(resYears.data[0].id);
          }
          if (resKpis.data) setKpiDefinitions(resKpis.data);
          if (resData.data) {
            // Transform Supabase structure to our local structure if needed
            // Currently they match: { kpi_id, year_id, values, action_plan }
            setBenchmarkingData(resData.data.map(d => ({
               id: d.id,
               kpiId: d.kpi_id,
               yearId: d.year_id,
               values: d.values || {},
               actionPlan: d.action_plan || ''
            })));
          }
        } catch(e) { console.error(e); }
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const handleShare = async () => {
    showToast('Generating snapshot link...');
    try {
       const payload = { universities, years, kpiDefinitions, benchmarkingData };
       const { data, error } = await supabase.from('benchmarking_reports').insert([{ data: payload }]).select().single();
       if (error) throw error;
       const shareUrl = `${window.location.origin}${window.location.pathname}?view=benchmarking&report=${data.id}`;
       navigator.clipboard.writeText(shareUrl);
       showToast('Share link copied!');
    } catch (e) {
       console.error(e);
       showToast('Share failed. Run the SQL scripts!');
    }
  };

  // --- PERSISTENT CRUD OPERATIONS ---

  const handleAddUniversity = async (u) => {
    try {
      const { data, error } = await supabase.from('benchmarking_universities').insert([{ name: u.name, abbr: u.abbr }]).select().single();
      if (error) throw error;
      setUniversities([...universities, data]);
      setAdminSubMode('list');
      showToast('University saved to Master List');
    } catch(e) { showToast('Error saving university'); }
  };

  const handleUpdateUniversity = async (u) => {
    try {
      const { error } = await supabase.from('benchmarking_universities').update({ name: u.name, abbr: u.abbr, active: u.active }).eq('id', u.id);
      if (error) throw error;
      setUniversities(universities.map(item => item.id === u.id ? u : item));
      setAdminSubMode('list');
      setEditingItem(null);
      showToast('University updated');
    } catch(e) { showToast('Update failed'); }
  };

  const handleDeleteUniversity = async (id) => {
    if (!window.confirm('Delete this university? All historical data associated with it will remain but won\'t be visible.')) return;
    try {
      const { error } = await supabase.from('benchmarking_universities').delete().eq('id', id);
      if (error) throw error;
      setUniversities(universities.filter(u => u.id !== id));
      showToast('University deleted');
    } catch(e) { showToast('Delete failed'); }
  };

  const handleAddYear = async (y) => {
    try {
      const { data, error } = await supabase.from('benchmarking_years').insert([{ name: y.name }]).select().single();
      if (error) throw error;
      setYears([data, ...years]);
      setAdminSubMode('list');
      showToast('Year added to Master List');
    } catch(e) { showToast('Error adding year'); }
  };

  const handleUpdateYear = async (y) => {
    try {
      const { error } = await supabase.from('benchmarking_years').update({ name: y.name, active: y.active }).eq('id', y.id);
      if (error) throw error;
      setYears(years.map(item => item.id === y.id ? y : item));
      setAdminSubMode('list');
      setEditingItem(null);
      showToast('Year updated');
    } catch(e) { showToast('Update failed'); }
  };

  const handleDeleteYear = async (id) => {
    if (!window.confirm('Delete this year and all its benchmarking data?')) return;
    try {
      const { error } = await supabase.from('benchmarking_years').delete().eq('id', id);
      if (error) throw error;
      setYears(years.filter(y => y.id !== id));
      setBenchmarkingData(benchmarkingData.filter(d => d.yearId !== id));
      showToast('Year deleted');
    } catch(e) { showToast('Delete failed'); }
  };

  const handleAddKpiDef = async (k) => {
    try {
      const { data, error } = await supabase.from('benchmarking_kpis').insert([{ category: k.category, name: k.name }]).select().single();
      if (error) throw error;
      setKpiDefinitions([...kpiDefinitions, data]);
      setAdminSubMode('list');
      showToast('Indicator added to Master List');
    } catch(e) { showToast('Error adding indicator'); }
  };

  const handleUpdateKpiDef = async (k) => {
    try {
      const { error } = await supabase.from('benchmarking_kpis').update({ category: k.category, name: k.name, active: k.active }).eq('id', k.id);
      if (error) throw error;
      setKpiDefinitions(kpiDefinitions.map(item => item.id === k.id ? k : item));
      setAdminSubMode('list');
      setEditingItem(null);
      showToast('Indicator updated');
    } catch(e) { showToast('Update failed'); }
  };

  const handleDeleteKpiDef = async (id) => {
    if (!window.confirm('Delete this indicator definition and all values?')) return;
    try {
      const { error } = await supabase.from('benchmarking_kpis').delete().eq('id', id);
      if (error) throw error;
      setKpiDefinitions(kpiDefinitions.filter(k => k.id !== id));
      setBenchmarkingData(benchmarkingData.filter(d => d.kpiId !== id));
      showToast('Indicator deleted');
    } catch(e) { showToast('Delete failed'); }
  };

  const handleToggleMapping = async (kpiId, yearId) => {
    const exists = benchmarkingData.find(d => d.kpiId === kpiId && d.yearId === yearId);
    if (exists) {
      if (window.confirm('Remove mapping? Data will be deleted.')) {
        try {
          const { error } = await supabase.from('benchmarking_values').delete().eq('kpi_id', kpiId).eq('year_id', yearId);
          if (error) throw error;
          setBenchmarkingData(benchmarkingData.filter(d => !(d.kpiId === kpiId && d.yearId === yearId)));
        } catch(e) { showToast('Mapping removal failed'); }
      }
    } else {
      try {
        const { data, error } = await supabase.from('benchmarking_values').insert([{ kpi_id: kpiId, year_id: yearId, values: {} }]).select().single();
        if (error) throw error;
        setBenchmarkingData([...benchmarkingData, { id: data.id, kpiId: data.kpi_id, yearId: data.year_id, actionPlan: '', values: {} }]);
      } catch(e) { showToast('Mapping failed'); }
    }
  };

  const handleUpdateValue = async (kpiId, yearId, uniId, value) => {
    // Optimistic Update
    const prevData = [...benchmarkingData];
    const newData = benchmarkingData.map(d => {
      if (d.kpiId === kpiId && d.yearId === yearId) return { ...d, values: { ...d.values, [uniId]: value } };
      return d;
    });
    setBenchmarkingData(newData);

    try {
      const record = newData.find(d => d.kpiId === kpiId && d.yearId === yearId);
      const { error } = await supabase.from('benchmarking_values').update({ values: record.values }).eq('kpi_id', kpiId).eq('year_id', yearId);
      if (error) throw error;
    } catch(e) {
       setBenchmarkingData(prevData);
       showToast('Failed to save value');
    }
  };

  const handleUpdateActionPlan = async (kpiId, yearId, plan) => {
    // Optimistic Update
    const prevData = [...benchmarkingData];
    const newData = benchmarkingData.map(d => {
      if (d.kpiId === kpiId && d.yearId === yearId) return { ...d, actionPlan: plan };
      return d;
    });
    setBenchmarkingData(newData);

    try {
      const { error } = await supabase.from('benchmarking_values').update({ action_plan: plan }).eq('kpi_id', kpiId).eq('year_id', yearId);
      if (error) throw error;
    } catch(e) {
       setBenchmarkingData(prevData);
       showToast('Failed to save action plan');
    }
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

  // --- SHARED UI COMPONENTS ---
  
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-20 text-indigo-600">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="font-black text-lg">Synchronizing Master List...</p>
      </div>
    );
  }

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
                 <button onClick={() => {setCurrentPage('admin'); setAdminTab('universities'); setAdminSubMode('list'); setEditingItem(null);}} className="ml-2 bg-white text-indigo-600 border border-indigo-100 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2"><Settings size={18} /> Admin Studio</button>
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
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Year</label>
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
                           <div className="text-emerald-800 font-medium leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: d.actionPlan }} />
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
               <AdminNavItem id="years" icon={Calendar} label="Years" active={adminTab === 'years'} onClick={() => {setAdminTab('years'); setAdminSubMode('list'); setEditingItem(null);}} />
               <AdminNavItem id="kpis" icon={ShieldCheck} label="Indicators List" active={adminTab === 'kpis'} onClick={() => {setAdminTab('kpis'); setAdminSubMode('list'); setEditingItem(null);}} />
               <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest my-6">Data & Mapping</p>
               <AdminNavItem id="mapping" icon={Activity} label="KPI-Year Mapping" active={adminTab === 'mapping'} onClick={() => setAdminTab('mapping')} />
               <AdminNavItem id="data" icon={Edit2} label="Value Entry" active={adminTab === 'data'} onClick={() => setAdminTab('data')} />
            </aside>
            <main className="flex-1 min-w-0">
               {adminTab === 'universities' && (
                 <UniversityPage 
                   adminSubMode={adminSubMode} 
                   setAdminSubMode={setAdminSubMode} 
                   universities={universities} 
                   editingItem={editingItem} 
                   setEditingItem={setEditingItem} 
                   handleAddUniversity={handleAddUniversity} 
                   handleUpdateUniversity={handleUpdateUniversity} 
                   handleDeleteUniversity={handleDeleteUniversity} 
                 />
               )}
               {adminTab === 'years' && (
                 <YearPage 
                   adminSubMode={adminSubMode} 
                   setAdminSubMode={setAdminSubMode} 
                   years={years} 
                   editingItem={editingItem} 
                   setEditingItem={setEditingItem} 
                   handleAddYear={handleAddYear} 
                   handleUpdateYear={handleUpdateYear} 
                   handleDeleteYear={handleDeleteYear} 
                 />
               )}
               {adminTab === 'kpis' && (
                 <KpiDefPage 
                   adminSubMode={adminSubMode} 
                   setAdminSubMode={setAdminSubMode} 
                   kpiDefinitions={kpiDefinitions} 
                   editingItem={editingItem} 
                   setEditingItem={setEditingItem} 
                   handleAddKpiDef={handleAddKpiDef} 
                   handleUpdateKpiDef={handleUpdateKpiDef} 
                   handleDeleteKpiDef={handleDeleteKpiDef} 
                 />
               )}
               {adminTab === 'mapping' && (
                 <MappingPage 
                   years={years} 
                   selectedYearId={selectedYearId} 
                   setSelectedYearId={setSelectedYearId} 
                   kpiDefinitions={kpiDefinitions} 
                   benchmarkingData={benchmarkingData} 
                   handleToggleMapping={handleToggleMapping} 
                 />
               )}
               {adminTab === 'data' && (
                 <DataEntryPage 
                   benchmarkingData={benchmarkingData} 
                   selectedYearId={selectedYearId} 
                   setSelectedYearId={setSelectedYearId} 
                   activeDataKpiId={activeDataKpiId} 
                   setActiveDataKpiId={setActiveDataKpiId} 
                   kpiDefinitions={kpiDefinitions} 
                   years={years} 
                   currentYear={currentYear} 
                   universities={universities} 
                   handleUpdateValue={handleUpdateValue} 
                   handleUpdateActionPlan={handleUpdateActionPlan} 
                 />
               )}
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

// --- SUB-COMPONENTS ---

const AdminNavItem = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
    <Icon size={18} /> {label}
  </button>
);

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-2xl border border-gray-800 animate-in fade-in zoom-in-95 duration-200">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{payload[0].payload.fullName}</p>
        <p className="text-lg font-black">{payload[0].payload.originalValue || 'No Data'}</p>
      </div>
    );
  }
  return null;
};

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

const UniversityPage = ({ adminSubMode, setAdminSubMode, universities, editingItem, setEditingItem, handleAddUniversity, handleUpdateUniversity, handleDeleteUniversity }) => {
  const [form, setForm] = useState(editingItem || { name: '', abbr: '' });
  
  useEffect(() => {
    setForm(editingItem || { name: '', abbr: '' });
  }, [editingItem]);

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
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Full Name</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold" placeholder="e.g. Dubai Medical University" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Abbreviation</label>
          <input value={form.abbr} onChange={e => setForm({...form, abbr: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold" placeholder="e.g. DMU" />
        </div>
        <button onClick={() => adminSubMode === 'add' ? handleAddUniversity(form) : handleUpdateUniversity(form)} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
          <Save size={24} /> {adminSubMode === 'add' ? 'Create University' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const YearPage = ({ adminSubMode, setAdminSubMode, years, editingItem, setEditingItem, handleAddYear, handleUpdateYear, handleDeleteYear }) => {
  const [form, setForm] = useState(editingItem || { name: '' });
  
  useEffect(() => {
    setForm(editingItem || { name: '' });
  }, [editingItem]);

  if (adminSubMode === 'list') return (
    <ListView 
      items={years} 
      columns={[{key:'name', label:'Year'}]}
      onAdd={() => setAdminSubMode('add')}
      onEdit={(item) => { setEditingItem(item); setAdminSubMode('edit'); }}
      onDelete={handleDeleteYear}
    />
  );
  return (
    <div className="max-w-2xl mx-auto bg-white p-10 rounded-[40px] shadow-xl shadow-indigo-100/20 border border-indigo-50">
      <button onClick={() => setAdminSubMode('list')} className="flex items-center gap-2 text-indigo-600 font-bold mb-8 hover:underline"><ArrowLeft size={18}/> Back to List</button>
      <h2 className="text-3xl font-black text-gray-800 mb-2">{adminSubMode === 'add' ? 'Add Year' : 'Edit Year'}</h2>
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

const KpiDefPage = ({ adminSubMode, setAdminSubMode, kpiDefinitions, editingItem, setEditingItem, handleAddKpiDef, handleUpdateKpiDef, handleDeleteKpiDef }) => {
  const [form, setForm] = useState(editingItem || { name: '', category: 'Students' });
  
  useEffect(() => {
    setForm(editingItem || { name: '', category: 'Students' });
  }, [editingItem]);

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
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Indicator Name</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold" placeholder="e.g. Student-to-Faculty Ratio" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Category</label>
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl outline-none font-bold">
            <option>Students</option>
            <option>Faculty</option>
            <option>Research</option>
            <option>Facilities</option>
            <option>Financial</option>
          </select>
        </div>
        <button onClick={() => adminSubMode === 'add' ? handleAddKpiDef(form) : handleUpdateKpiDef(form)} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
          <Save size={24} /> {adminSubMode === 'add' ? 'Create Indicator' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const MappingPage = ({ years, selectedYearId, setSelectedYearId, kpiDefinitions, benchmarkingData, handleToggleMapping }) => (
  <div className="space-y-8">
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800">Indicator Mapping</h2>
        <p className="text-slate-400 font-medium text-sm">Select which indicators apply to each academic year.</p>
      </div>
      <div className="w-full md:w-64">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block text-center md:text-left">Target Year</label>
        <select className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-bold text-slate-700" value={selectedYearId} onChange={e => setSelectedYearId(e.target.value)}>
          {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {kpiDefinitions.map(kpi => {
        const isMapped = benchmarkingData.some(d => d.kpiId === kpi.id && d.yearId === selectedYearId);
        return (
          <button key={kpi.id} onClick={() => handleToggleMapping(kpi.id, selectedYearId)} className={`p-6 rounded-[28px] border-2 transition-all flex items-center justify-between text-left group ${isMapped ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm'}`}>
            <div className="flex-1 pr-4">
              <span className={`text-[9px] font-black uppercase tracking-widest mb-1 block ${isMapped ? 'text-indigo-200' : 'text-indigo-500'}`}>{kpi.category}</span>
              <h3 className={`font-black text-sm leading-tight ${isMapped ? 'text-white' : 'text-slate-700'}`}>{kpi.name}</h3>
            </div>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isMapped ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-400'}`}>
              {isMapped ? <Check size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

const DataEntryPage = ({ benchmarkingData, selectedYearId, setSelectedYearId, activeDataKpiId, setActiveDataKpiId, kpiDefinitions, years, currentYear, universities, handleUpdateValue, handleUpdateActionPlan }) => {
  const yearMappedKpis = benchmarkingData.filter(d => d.yearId === selectedYearId);
  const activeDataEntry = benchmarkingData.find(d => d.kpiId === activeDataKpiId && d.yearId === selectedYearId);

  return (
    <div className="flex flex-col xl:flex-row gap-8">
      <div className="xl:w-80 flex-shrink-0 space-y-4">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Reporting Year</label>
          <select className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-bold text-slate-700" value={selectedYearId} onChange={e => setSelectedYearId(e.target.value)}>
            {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Active Indicators</p>
          <div className="space-y-1.5">
            {yearMappedKpis.map(d => {
              const def = kpiDefinitions.find(k => k.id === d.kpiId);
              if (!def) return null;
              return (
                <button key={d.id} onClick={() => setActiveDataKpiId(d.kpiId)} className={`w-full text-left p-4 rounded-2xl text-xs font-bold transition-all border ${activeDataKpiId === d.kpiId ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'}`}>
                   {def.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1">
        {activeDataEntry ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
               <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full mb-3 inline-block tracking-widest uppercase">
                  {kpiDefinitions.find(k => k.id === activeDataKpiId)?.category}
               </span>
               <h2 className="text-3xl font-black text-slate-800">{kpiDefinitions.find(k => k.id === activeDataKpiId)?.name}</h2>
               <p className="text-slate-400 font-medium mt-1">Data collection for {currentYear?.name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {universities.map(uni => (
                <div key={uni.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black group-hover:bg-indigo-600 group-hover:text-white transition-all">{uni.abbr}</div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{uni.name}</p>
                        <p className="font-bold text-slate-700">Value Entry</p>
                     </div>
                  </div>
                  <input 
                    className="w-32 p-4 bg-slate-50 border-0 rounded-2xl text-right font-black text-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none" 
                    value={activeDataEntry.values[uni.id] || ''} 
                    onChange={e => handleUpdateValue(activeDataEntry.kpiId, activeDataEntry.yearId, uni.id, e.target.value)}
                    placeholder="Enter Val"
                  />
                </div>
              ))}
            </div>

            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
               <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><ShieldCheck size={24} /></div>
                  <h3 className="text-xl font-black text-slate-800">Strategic Action Plan</h3>
               </div>
               <RichTextEditor 
                 value={activeDataEntry.actionPlan} 
                 onChange={val => handleUpdateActionPlan(activeDataEntry.kpiId, activeDataEntry.yearId, val)}
                 placeholder="Outline the steps to maintain or improve this indicator's performance..."
                 className="min-h-[200px]"
               />
            </div>
          </div>
        ) : (
          <div className="h-[500px] bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-4">
             <Activity size={64} strokeWidth={1} />
             <p className="font-black text-lg">Select an indicator from the list to enter values</p>
          </div>
        )}
      </div>
    </div>
  );
};
