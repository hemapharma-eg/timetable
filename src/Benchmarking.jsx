import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList 
} from 'recharts';
import { 
  LayoutDashboard, Database, ShieldAlert, ShieldCheck, 
  Plus, Trash2, Edit2, Save, X, Building2, ListTree,
  Share2, Printer, CheckCircle, ChevronRight, Settings,
  Activity, Users, Info
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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

// --- INITIAL DATA ---
const initialUniversities = [
  { name: "Gulf Medical University (GMU)", abbr: "GMU", active: true },
  { name: "Mohammed Bin Rashid University (MBRU)", abbr: "MBRU", active: true },
  { name: "Dubai Medical University", abbr: "DMU", active: true },
  { name: "RAKMHSU", abbr: "RAK", active: true },
  { name: "Battejee Medical College", abbr: "BMC", active: true },
  { name: "Royal College of Surgeons in Ireland (RCSI)", abbr: "RCSI", active: true }
];

const generateId = () => Math.random().toString(36).substr(2, 9);

const initialKpis = [
  { id: generateId(), active: true, year: '2025', category: 'Students', kpi: 'Total Enrolled Students', actionPlan: '', values: { "Gulf Medical University (GMU)": "2824", "Mohammed Bin Rashid University (MBRU)": "551", "Dubai Medical University": "828", "RAKMHSU": "1700", "Battejee Medical College": "1820", "Royal College of Surgeons in Ireland (RCSI)": "5267" } },
  { id: generateId(), active: true, year: '2025', category: 'Students', kpi: '% National Students', actionPlan: '', values: { "Gulf Medical University (GMU)": "9.8", "Mohammed Bin Rashid University (MBRU)": "27.2", "Dubai Medical University": "13.8", "RAKMHSU": "21.1", "Battejee Medical College": "81.59", "Royal College of Surgeons in Ireland (RCSI)": "32" } },
  { id: generateId(), active: true, year: '2025', category: 'Students', kpi: 'Student Nationalities', actionPlan: 'Increase marketing efforts in North Africa and South Asia.', values: { "Gulf Medical University (GMU)": "105", "Mohammed Bin Rashid University (MBRU)": "50", "Dubai Medical University": "52", "RAKMHSU": "48", "Battejee Medical College": "52", "Royal College of Surgeons in Ireland (RCSI)": "103" } },
  { id: generateId(), active: true, year: '2025', category: 'Students', kpi: 'Student-to-Faculty Ratio', actionPlan: '', values: { "Gulf Medical University (GMU)": "11", "Mohammed Bin Rashid University (MBRU)": "5", "Dubai Medical University": "12", "RAKMHSU": "11", "Battejee Medical College": "9", "Royal College of Surgeons in Ireland (RCSI)": "24" } },
  { id: generateId(), active: true, year: '2025', category: 'Research', kpi: 'Research Publications', actionPlan: 'Provide additional grants for faculty publishing in top journals.', values: { "Gulf Medical University (GMU)": "519", "Mohammed Bin Rashid University (MBRU)": "401", "Dubai Medical University": "162", "RAKMHSU": "441", "Battejee Medical College": "322", "Royal College of Surgeons in Ireland (RCSI)": "1923" } },
  { id: generateId(), active: true, year: '2025', category: 'Research', kpi: 'Publication in top 10% journals', actionPlan: '', values: { "Gulf Medical University (GMU)": "14.1", "Mohammed Bin Rashid University (MBRU)": "26.6", "Dubai Medical University": "16.2", "RAKMHSU": "11.4", "Battejee Medical College": "10.5", "Royal College of Surgeons in Ireland (RCSI)": "30" } },
  { id: generateId(), active: true, year: '2025', category: 'Research', kpi: 'Research with International Collaboration', actionPlan: '', values: { "Gulf Medical University (GMU)": "83.4", "Mohammed Bin Rashid University (MBRU)": "79.3", "Dubai Medical University": "72.8", "RAKMHSU": "87.8", "Battejee Medical College": "76.7", "Royal College of Surgeons in Ireland (RCSI)": "63.2" } },
  { id: generateId(), active: true, year: '2025', category: 'Graduates', kpi: 'Total Graduates (Latest)', actionPlan: '', values: { "Gulf Medical University (GMU)": "561", "Mohammed Bin Rashid University (MBRU)": "99", "Dubai Medical University": "114", "RAKMHSU": "247", "Battejee Medical College": "232", "Royal College of Surgeons in Ireland (RCSI)": "1780" } },
  { id: generateId(), active: true, year: '2025', category: 'Graduates', kpi: 'Employability', actionPlan: 'Establish a new alumni network to improve career placement tracking.', values: { "Gulf Medical University (GMU)": "", "Mohammed Bin Rashid University (MBRU)": "", "Dubai Medical University": "67", "RAKMHSU": "48", "Battejee Medical College": "64", "Royal College of Surgeons in Ireland (RCSI)": "90" } },
  { id: generateId(), active: true, year: '2025', category: 'Ranking', kpi: 'THE World (2025)', actionPlan: '', values: { "Gulf Medical University (GMU)": "NR", "Mohammed Bin Rashid University (MBRU)": "NR", "Dubai Medical University": "NR", "RAKMHSU": "NR", "Battejee Medical College": "NR", "Royal College of Surgeons in Ireland (RCSI)": "251-300" } },
  { id: generateId(), active: true, year: '2025', category: 'Ranking', kpi: 'THE Arab Region', actionPlan: '', values: { "Gulf Medical University (GMU)": "101-125", "Mohammed Bin Rashid University (MBRU)": "NR", "Dubai Medical University": "NR", "RAKMHSU": "151-175", "Battejee Medical College": "NR", "Royal College of Surgeons in Ireland (RCSI)": "NA" } },
];

// --- UTILITY COMPONENTS ---
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export function Benchmarking({ initialPage = 'dashboard' }) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [adminTab, setAdminTab] = useState('universities'); // 'universities' | 'kpis' | 'data'
  
  const [universities, setUniversities] = useState(initialUniversities);
  const [kpis, setKpis] = useState(initialKpis);

  // Toast & Firebase State
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [user, setUser] = useState(null);

  // Dashboard specific states
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedKpi, setSelectedKpi] = useState('All');

  // Admin Data Entry state
  const [activeDataKpi, setActiveDataKpi] = useState(null);

  // Update currentPage if initialPage changes
  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  // --- EFFECTS FOR FIREBASE & URL DATA ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch(e) { console.error(e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('data');
    const reportId = urlParams.get('report');

    if (encodedData) {
      try {
         const parsed = JSON.parse(atob(decodeURIComponent(encodedData)));
         if (parsed.universities) setUniversities(parsed.universities);
         if (parsed.kpis) setKpis(parsed.kpis);
      } catch(e) { console.error("Failed to parse URL data"); }
    } else if (reportId && db) {
       const fetchReport = async () => {
          try {
             const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'reports', reportId);
             const docSnap = await getDoc(docRef);
             if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.universities) setUniversities(data.universities);
                if (data.kpis) setKpis(data.kpis);
             }
          } catch(e) { console.error(e); }
       };
       fetchReport();
    }
  }, [user, db]);

  // --- SHARE CAPABILITY ---
  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const handleShare = async () => {
    let shareUrl = window.location.href;
    
    // We try to use Firebase even if 'user' isn't fully synced yet, 
    // but we need the db and appId.
    if (db && appId) {
      try {
         showToast('Generating short link...');
         const reportId = new URLSearchParams(window.location.search).get('report') || generateId();
         const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'reports', reportId);
         await setDoc(docRef, { universities, kpis });
         
         const newUrl = new URL(window.location.origin + window.location.pathname);
         newUrl.searchParams.set('view', 'benchmarking');
         newUrl.searchParams.set('report', reportId);
         shareUrl = newUrl.toString();
         window.history.pushState({}, '', shareUrl);
      } catch (e) {
         console.error("Firebase share failed, falling back to URL encode", e);
         shareUrl = createBase64Url();
      }
    } else {
      shareUrl = createBase64Url();
    }

    const textArea = document.createElement("textarea");
    textArea.value = shareUrl;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Share link copied to clipboard!');
    } catch (e) {
      showToast('Failed to copy link.');
    }
    document.body.removeChild(textArea);
  };
  
  const createBase64Url = () => {
     const encoded = encodeURIComponent(btoa(JSON.stringify({ universities, kpis })));
     const newUrl = new URL(window.location.origin + window.location.pathname);
     newUrl.searchParams.set('view', 'benchmarking');
     newUrl.searchParams.set('data', encoded);
     window.history.pushState({}, '', newUrl.toString());
     return newUrl.toString();
  };

  // --- DERIVED STATE ---
  const uniqueCategories = useMemo(() => {
    const cats = new Set(kpis.map(k => k.category));
    return Array.from(cats);
  }, [kpis]);

  const availableKpis = useMemo(() => {
    return kpis.filter(k => (selectedCategory === 'All' || k.category === selectedCategory) && (currentPage === 'admin' || k.active !== false));
  }, [kpis, selectedCategory, currentPage]);

  const kpisToRender = useMemo(() => {
    return kpis.filter(k => {
      const matchCategory = selectedCategory === 'All' || k.category === selectedCategory;
      const matchKpi = selectedKpi === 'All' || k.id === selectedKpi;
      const matchActive = currentPage === 'admin' || k.active !== false;
      return matchCategory && matchKpi && matchActive;
    });
  }, [kpis, selectedCategory, selectedKpi, currentPage]);

  // --- CRUD OPERATIONS ---
  const handleAddUniversity = (name, abbr) => {
    if (!name.trim() || universities.find(u => u.name === name.trim())) return;
    const newName = name.trim();
    const newAbbr = abbr.trim() || newName.substring(0, 4).toUpperCase();
    setUniversities([...universities, { name: newName, abbr: newAbbr, active: true }]);
    setKpis(kpis.map(k => ({ ...k, values: { ...k.values, [newName]: "" } })));
  };

  const handleEditUniversity = (oldName, newName, newAbbr) => {
    const cleanNewName = newName.trim();
    if (!cleanNewName) return;
    setUniversities(universities.map(u => u.name === oldName ? { ...u, name: cleanNewName, abbr: newAbbr.trim() } : u));
    if (oldName !== cleanNewName) {
      setKpis(kpis.map(k => {
        const newValues = { ...k.values };
        newValues[cleanNewName] = newValues[oldName];
        delete newValues[oldName];
        return { ...k, values: newValues };
      }));
    }
  };

  const handleToggleUniversityActive = (name) => {
    setUniversities(universities.map(u => u.name === name ? { ...u, active: !u.active } : u));
  };

  const handleAddKpi = () => {
    const newKpi = {
      id: generateId(),
      active: true,
      year: new Date().getFullYear().toString(),
      category: 'General',
      kpi: 'New Indicator Name',
      actionPlan: '',
      values: universities.reduce((acc, uni) => ({ ...acc, [uni.name]: "" }), {})
    };
    setKpis([newKpi, ...kpis]);
  };

  const handleUpdateKpiInfo = (id, field, value) => {
    setKpis(kpis.map(k => k.id === id ? { ...k, [field]: value } : k));
  };

  const handleUpdateKpiValue = (id, uniName, value) => {
    setKpis(kpis.map(k => k.id === id ? { ...k, values: { ...k.values, [uniName]: value } } : k));
  };

  const handleToggleKpiActive = (id) => {
    setKpis(kpis.map(k => k.id === id ? { ...k, active: !k.active } : k));
  };

  // --- CHARTING HELPERS ---
  const parseForChart = (val) => {
    if (val === undefined || val === null || val === "") return null;
    const strVal = String(val).trim();
    if (strVal.toUpperCase() === 'NR' || strVal.toUpperCase() === 'NA') return null;
    if (strVal.includes('-')) {
      const parts = strVal.split('-');
      const num = parseFloat(parts[0]);
      return isNaN(num) ? null : num;
    }
    const cleanStr = strVal.replace(/,/g, '').replace(/%/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-lg">
          <p className="font-semibold text-gray-800 mb-1">{payload[0].payload.name}</p>
          <p className="text-blue-600 font-medium">
            Value: {payload[0].payload.originalValue || 'N/A'}
          </p>
        </div>
      );
    }
    return null;
  };

  // --- SUB-COMPONENTS ---
  const UniversityManager = () => {
    const [newUniName, setNewUniName] = useState('');
    const [newUniAbbr, setNewUniAbbr] = useState('');
    const [editingUni, setEditingUni] = useState(null);

    return (
      <div className="space-y-6">
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Full University Name</label>
            <input 
              type="text" value={newUniName} onChange={(e) => setNewUniName(e.target.value)}
              placeholder="e.g. Dubai Medical University"
              className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="w-full sm:w-40 space-y-1.5">
            <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Abbreviation</label>
            <input 
              type="text" value={newUniAbbr} onChange={(e) => setNewUniAbbr(e.target.value)}
              placeholder="e.g. DMU"
              className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button 
            onClick={() => { handleAddUniversity(newUniName, newUniAbbr); setNewUniName(''); setNewUniAbbr(''); }}
            disabled={!newUniName.trim()}
            className="h-[46px] bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Plus size={18} /> Add University
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {universities.map(uni => (
            <div key={uni.name} className={`bg-white p-5 rounded-2xl border transition-all ${uni.active ? 'border-gray-100 shadow-sm' : 'border-dashed border-gray-200 opacity-60'}`}>
              {editingUni === uni.name ? (
                 <div className="space-y-3">
                    <input value={uni.name} onChange={(e) => handleEditUniversity(uni.name, e.target.value, uni.abbr)} className="w-full p-2 border rounded-lg text-sm" />
                    <input value={uni.abbr} onChange={(e) => handleEditUniversity(uni.name, uni.name, e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                    <div className="flex justify-end gap-2">
                       <button onClick={() => setEditingUni(null)} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold">Done</button>
                    </div>
                 </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-800">{uni.name}</h4>
                    <span className="text-xs font-bold text-indigo-600 uppercase mt-1 inline-block">{uni.abbr}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingUni(uni.name)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><Edit2 size={16}/></button>
                    <button 
                      onClick={() => handleToggleUniversityActive(uni.name)} 
                      className={`p-2 rounded-lg transition-colors ${uni.active ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                    >
                      {uni.active ? <ShieldAlert size={16}/> : <ShieldCheck size={16}/>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const KpiManager = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200">
           <div>
              <h3 className="text-xl font-bold">Indicator Definitions</h3>
              <p className="text-indigo-100 text-sm">Manage the list of metrics used for benchmarking</p>
           </div>
           <button onClick={handleAddKpi} className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all">
              <Plus size={20} /> Add New Indicator
           </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Year</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Indicator (KPI)</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-32 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {kpis.map(kpi => (
                <tr key={kpi.id} className={`hover:bg-gray-50 transition-colors ${kpi.active ? '' : 'bg-gray-50/50 grayscale-[0.5] opacity-60'}`}>
                  <td className="px-6 py-4">
                    <input 
                      className="w-full bg-transparent border-0 focus:ring-0 font-medium text-gray-800"
                      value={kpi.year} onChange={(e) => handleUpdateKpiInfo(kpi.id, 'year', e.target.value)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      className="w-full bg-transparent border-0 focus:ring-0 font-medium text-gray-600"
                      value={kpi.category} onChange={(e) => handleUpdateKpiInfo(kpi.id, 'category', e.target.value)}
                    >
                      <option value="Students">Students</option>
                      <option value="Research">Research</option>
                      <option value="Graduates">Graduates</option>
                      <option value="Ranking">Ranking</option>
                      <option value="General">General</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      className="w-full bg-transparent border-0 focus:ring-0 font-bold text-gray-700"
                      value={kpi.kpi} onChange={(e) => handleUpdateKpiInfo(kpi.id, 'kpi', e.target.value)}
                    />
                  </td>
                  <td className="px-6 py-4 flex justify-center gap-2">
                    <button 
                      onClick={() => handleToggleKpiActive(kpi.id)}
                      className={`p-2 rounded-xl transition-colors ${kpi.active ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                      title={kpi.active ? "Deactivate" : "Activate"}
                    >
                      {kpi.active ? <ShieldAlert size={18}/> : <ShieldCheck size={18}/>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const DataEntryManager = () => {
    const filteredKpis = kpis.filter(k => k.active);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* KPI Selector Sidebar */}
        <div className="lg:col-span-4 space-y-4">
           <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ListTree size={20} className="text-indigo-600" /> Select Indicator
           </h3>
           <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                 <input 
                  type="text" placeholder="Search KPI..." 
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                 />
              </div>
              <div className="overflow-y-auto divide-y divide-gray-50">
                 {filteredKpis.map(k => (
                   <button 
                    key={k.id} 
                    onClick={() => setActiveDataKpi(k)}
                    className={`w-full p-4 text-left hover:bg-indigo-50 transition-all flex justify-between items-center group ${activeDataKpi?.id === k.id ? 'bg-indigo-50 border-r-4 border-indigo-600' : ''}`}
                   >
                     <div className="flex-1">
                        <p className="text-xs font-bold text-indigo-500 uppercase tracking-tighter">{k.category}</p>
                        <p className={`font-bold mt-0.5 ${activeDataKpi?.id === k.id ? 'text-indigo-700' : 'text-gray-700'}`}>{k.kpi}</p>
                     </div>
                     <ChevronRight size={16} className={`transition-transform ${activeDataKpi?.id === k.id ? 'translate-x-1 text-indigo-600' : 'text-gray-300'}`} />
                   </button>
                 ))}
              </div>
           </div>
        </div>

        {/* Values Editor */}
        <div className="lg:col-span-8 space-y-6">
           {activeDataKpi ? (
             <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-50/50 mb-8">
                   <div className="flex justify-between items-start mb-8">
                      <div>
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">{activeDataKpi.category}</span>
                        <h2 className="text-2xl font-black text-gray-800 mt-2">{activeDataKpi.kpi}</h2>
                        <p className="text-gray-400 text-sm mt-1">Editing values for year {activeDataKpi.year}</p>
                      </div>
                      <div className="bg-emerald-50 text-emerald-700 p-3 rounded-2xl flex items-center gap-2">
                        <CheckCircle size={20} />
                        <span className="text-sm font-bold">Auto-saved</span>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {universities.filter(u => u.active).map(uni => (
                        <div key={uni.name} className="space-y-2">
                           <div className="flex justify-between">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{uni.name}</label>
                              <span className="text-[10px] font-bold text-indigo-400">{uni.abbr}</span>
                           </div>
                           <input 
                              type="text"
                              value={activeDataKpi.values[uni.name] || ''}
                              onChange={(e) => handleUpdateKpiValue(activeDataKpi.id, uni.name, e.target.value)}
                              placeholder="Enter value..."
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-gray-700"
                           />
                        </div>
                      ))}
                   </div>

                   <div className="mt-10 pt-8 border-t border-gray-50 space-y-3">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                         <Info size={14} className="text-indigo-400" /> Dubai Medical University - Action Plan
                      </label>
                      <textarea 
                        value={activeDataKpi.actionPlan}
                        onChange={(e) => handleUpdateKpiInfo(activeDataKpi.id, 'actionPlan', e.target.value)}
                        placeholder="Define strategic steps based on these metrics..."
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all min-h-[120px] resize-none text-gray-700 leading-relaxed"
                      />
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 p-12">
                <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 text-indigo-400">
                   <Activity size={48} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">No Indicator Selected</h3>
                <p className="text-gray-400 max-w-xs mx-auto mt-2 leading-relaxed">Select an indicator from the left to start entering benchmarking data across all universities.</p>
             </div>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-transparent font-sans text-gray-900 flex flex-col print:bg-white animate-in fade-in duration-500">
      
      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed bottom-6 right-6 z-[200] bg-gray-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-6">
          <CheckCircle size={20} className="text-emerald-400" />
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Internal Toolbar */}
      <div className="mb-8 flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
           <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100">
              <LayoutDashboard size={24} />
           </div>
           <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Benchmarking Studio</h2>
              <p className="text-sm font-medium text-slate-400 uppercase tracking-widest text-[10px]">Institutional Effectiveness</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
            >
              <Share2 size={18} /> Share Result
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
            >
              <Printer size={18} /> Print
            </button>
            
            {/* Only show Admin Studio if we are NOT in a public shared view */}
            {currentPage === 'admin' ? (
               <button 
                onClick={() => setCurrentPage('dashboard')}
                className="ml-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
               >
                 <BarChart size={18} /> View Dashboard
               </button>
            ) : (
               !new URLSearchParams(window.location.search).get('report') && !new URLSearchParams(window.location.search).get('data') && (
                 <button 
                  onClick={() => setCurrentPage('admin')}
                  className="ml-2 bg-white text-indigo-600 border border-indigo-100 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2"
                 >
                   <Settings size={18} /> Admin Studio
                 </button>
               )
            )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        
        {/* --- VIEW: DASHBOARD --- */}
        {currentPage === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Header / Selectors */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-50">
              <div className="flex-1">
                <h1 className="text-3xl font-black text-gray-800">Performance Matrix</h1>
                <p className="text-gray-400 mt-2 font-medium max-w-xl leading-relaxed">Analyze institutional performance indicators across regional medical universities.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto print:hidden">
                <div className="w-full sm:w-56">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Category Filter</label>
                  <select 
                    className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none"
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setSelectedKpi('All'); }}
                  >
                    <option value="All">All Categories</option>
                    {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="w-full sm:w-80">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Specific Indicator</label>
                  <select 
                    className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none"
                    value={selectedKpi}
                    onChange={(e) => setSelectedKpi(e.target.value)}
                  >
                    <option value="All">All Indicators</option>
                    {availableKpis.map(k => <option key={k.id} value={k.id}>{k.kpi}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Chart Rendering Area */}
            <div className="grid grid-cols-1 gap-10">
              {kpisToRender.length === 0 ? (
                <div className="bg-white p-20 text-center rounded-3xl border border-gray-100 shadow-inner">
                  <Info size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-400 font-bold">No active indicators match your current selection.</p>
                </div>
              ) : (
                kpisToRender.map((kpi) => {
                  const chartData = universities.filter(u => u.active).map(uni => ({
                    name: uni.name,
                    shortName: uni.abbr,
                    value: parseForChart(kpi.values[uni.name]),
                    originalValue: kpi.values[uni.name]
                  }));

                  return (
                    <div key={kpi.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-50 flex flex-col group print:break-inside-avoid print:shadow-none print:border-gray-200">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
                        <div>
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full mb-3 inline-block tracking-widest uppercase">
                            {kpi.category}
                          </span>
                          <h2 className="text-2xl font-black text-gray-800 group-hover:text-indigo-600 transition-colors">{kpi.kpi}</h2>
                          <p className="text-gray-400 text-sm mt-1 font-medium">Measurement Period: Academic Year {kpi.year}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                          {chartData.map((d, i) => (
                            <span key={i} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">{d.shortName}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="h-[400px] w-full relative">
                        {chartData.every(d => d.value === null) ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                            <Activity size={40} className="mb-4 opacity-20" />
                            <p className="font-bold">Comparative data pending for this indicator.</p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f8fafc" />
                              <XAxis 
                                dataKey="shortName" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                                dy={15}
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                              />
                              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', radius: 10 }} />
                              <Bar 
                                dataKey="value" 
                                fill="#4f46e5" 
                                radius={[12, 12, 4, 4]} 
                                animationDuration={1200}
                                barSize={50}
                              >
                                <LabelList 
                                  dataKey="originalValue" 
                                  position="top" 
                                  offset={15} 
                                  fill="#1e293b" 
                                  fontSize={12} 
                                  fontWeight={900} 
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>

                      {kpi.actionPlan && (
                        <div className="mt-10 p-6 bg-emerald-50/50 border border-emerald-100/50 rounded-3xl flex gap-5 items-start">
                          <div className="bg-emerald-600 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-100">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-emerald-900 uppercase tracking-widest mb-1">Dubai Medical University - Strategic Action</h4>
                            <p className="text-emerald-800 leading-relaxed font-medium">{kpi.actionPlan}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Read-only Data Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-50 overflow-hidden print:break-inside-avoid">
              <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                <h3 className="text-xl font-black text-gray-800">Indicator Summary Table</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[10px]">
                    <tr>
                      <th className="px-8 py-5">Category</th>
                      <th className="px-8 py-5 border-r border-gray-100">Indicator</th>
                      {universities.filter(u => u.active).map(uni => (
                        <th key={uni.name} className="px-8 py-5 font-black text-indigo-600">
                          {uni.abbr}
                        </th>
                      ))}
                      <th className="px-8 py-5 border-l border-gray-100 bg-emerald-50/50 text-emerald-800">Action Plan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {kpisToRender.map((kpi) => (
                      <tr key={kpi.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-4 font-bold text-gray-500">{kpi.category}</td>
                        <td className="px-8 py-4 border-r border-gray-50 text-gray-800 font-black max-w-xs">{kpi.kpi}</td>
                        {universities.filter(u => u.active).map(uni => (
                          <td key={uni.name} className="px-8 py-4 font-bold text-gray-600">
                            {kpi.values[uni.name] || <span className="text-gray-200">—</span>}
                          </td>
                        ))}
                        <td className="px-8 py-4 border-l border-gray-50 text-emerald-700 italic text-xs font-medium max-w-xs truncate">
                          {kpi.actionPlan || <span className="text-emerald-100">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: ADMIN STUDIO (RE-STRUCTURED) --- */}
        {currentPage === 'admin' && (
          <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
            
            {/* Admin Sub-Navigation Sidebar */}
            <aside className="lg:w-64 flex-shrink-0 space-y-2">
               <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Management Modes</p>
               <button 
                  onClick={() => setAdminTab('universities')}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all font-bold text-sm ${adminTab === 'universities' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-white hover:text-indigo-600 shadow-sm border border-transparent hover:border-indigo-100'}`}
               >
                  <Building2 size={20} /> Universities
               </button>
               <button 
                  onClick={() => setAdminTab('kpis')}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all font-bold text-sm ${adminTab === 'kpis' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-white hover:text-indigo-600 shadow-sm border border-transparent hover:border-indigo-100'}`}
               >
                  <ShieldCheck size={20} /> Indicators List
               </button>
               <button 
                  onClick={() => setAdminTab('data')}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all font-bold text-sm ${adminTab === 'data' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-white hover:text-indigo-600 shadow-sm border border-transparent hover:border-indigo-100'}`}
               >
                  <Edit2 size={20} /> Value Entry
               </button>

               <div className="mt-8 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <h4 className="text-xs font-black text-gray-800 uppercase mb-3">Admin Statistics</h4>
                  <div className="space-y-4">
                     <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Entities</p>
                        <p className="text-2xl font-black text-indigo-600">{universities.length}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Indicators</p>
                        <p className="text-2xl font-black text-indigo-600">{kpis.length}</p>
                     </div>
                  </div>
               </div>
            </aside>

            {/* Sub-Page Content */}
            <main className="flex-1 min-w-0">
               {adminTab === 'universities' && <UniversityManager />}
               {adminTab === 'kpis' && <KpiManager />}
               {adminTab === 'data' && <DataEntryManager />}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
