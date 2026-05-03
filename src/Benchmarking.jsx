import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList 
} from 'recharts';
import { 
  LayoutDashboard, Database, ShieldAlert, ShieldCheck, 
  Plus, Trash2, Edit2, Save, X, Building2, ListTree,
  Share2, Printer, CheckCircle
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export function Benchmarking({ initialPage = 'dashboard' }) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  const [universities, setUniversities] = useState(initialUniversities);
  const [kpis, setKpis] = useState(initialKpis);

  // Toast & Firebase State
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [user, setUser] = useState(null);

  // Modal states
  const [isUniModalOpen, setIsUniModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, itemType: '', itemId: null, message: '' });

  // Dashboard specific states
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedKpi, setSelectedKpi] = useState('All');

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
  }, [user, db]); // Watch db as well

  // --- SHARE CAPABILITY ---
  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const handleShare = async () => {
    let shareUrl = window.location.href;
    
    if (db && user) {
      try {
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

  // --- CRUD OPERATIONS: UNIVERSITIES ---
  const handleAddUniversity = (name, abbr) => {
    if (!name.trim() || universities.find(u => u.name === name.trim())) return;
    const newName = name.trim();
    const newAbbr = abbr.trim() || newName.substring(0, 4).toUpperCase();
    
    setUniversities([...universities, { name: newName, abbr: newAbbr, active: true }]);
    // Add empty value for this new university to all KPIs
    setKpis(kpis.map(k => ({
      ...k,
      values: { ...k.values, [newName]: "" }
    })));
  };

  const handleEditUniversity = (oldName, newName, newAbbr) => {
    const cleanNewName = newName.trim();
    if (!cleanNewName || (oldName !== cleanNewName && universities.find(u => u.name === cleanNewName))) return;
    
    // Update list
    setUniversities(universities.map(u => 
      u.name === oldName ? { name: cleanNewName, abbr: newAbbr.trim() } : u
    ));
    
    // If the name actually changed, migrate the keys in all KPI values
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
    setUniversities(universities.map(u => 
      u.name === name ? { ...u, active: !u.active } : u
    ));
  };

  // --- CRUD OPERATIONS: KPIs ---
  const handleAddKpi = () => {
    const newKpi = {
      id: generateId(),
      active: true,
      year: '2025',
      category: 'New Category',
      kpi: 'New KPI Name',
      actionPlan: '',
      values: universities.reduce((acc, uni) => ({ ...acc, [uni.name]: "" }), {})
    };
    setKpis([newKpi, ...kpis]); // Add to top for visibility
  };

  const handleToggleKpiActive = (id) => {
    setKpis(kpis.map(k => k.id === id ? { ...k, active: !k.active } : k));
  };

  // --- CONFIRMATION HELPER ---
  const requestDelete = (type, id, message) => {
    setConfirmDelete({ isOpen: true, itemType: type, itemId: id, message });
  };
  const closeConfirmDelete = () => {
    setConfirmDelete({ isOpen: false, itemType: '', itemId: null, message: '' });
  };
  const executeDelete = () => {
    // No longer doing hard deletes
    closeConfirmDelete();
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

  const UniversityManager = () => {
    const [newUniName, setNewUniName] = useState('');
    const [newUniAbbr, setNewUniAbbr] = useState('');
    
    const [editingUni, setEditingUni] = useState(null); // stores oldName
    const [editUniName, setEditUniName] = useState('');
    const [editUniAbbr, setEditUniAbbr] = useState('');

    const add = () => {
      handleAddUniversity(newUniName, newUniAbbr);
      setNewUniName('');
      setNewUniAbbr('');
    };

    const saveEdit = () => {
      handleEditUniversity(editingUni, editUniName, editUniAbbr);
      setEditingUni(null);
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
          <div className="flex-1 flex gap-2">
            <input 
              type="text" 
              placeholder="University Name..." 
              value={newUniName} 
              onChange={(e) => setNewUniName(e.target.value)}
              className="flex-[2] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input 
              type="text" 
              placeholder="Abbr (e.g. DMU)" 
              value={newUniAbbr} 
              onChange={(e) => setNewUniAbbr(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button 
            onClick={add}
            disabled={!newUniName.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={16} /> Add
          </button>
        </div>
        
        <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {universities.map(uni => (
            <div key={uni.name} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
              {editingUni === uni.name ? (
                <div className="flex gap-2 flex-1 mr-4">
                  <input 
                    type="text" 
                    value={editUniName} 
                    onChange={(e) => setEditUniName(e.target.value)}
                    className="flex-[2] px-3 py-1.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Name"
                    autoFocus
                  />
                  <input 
                    type="text" 
                    value={editUniAbbr} 
                    onChange={(e) => setEditUniAbbr(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Abbr"
                  />
                  <div className="flex items-center">
                    <button onClick={saveEdit} className="text-green-600 hover:text-green-700 p-1.5 bg-green-50 rounded mx-1"><Save size={16} /></button>
                    <button onClick={() => setEditingUni(null)} className="text-gray-500 hover:text-gray-700 p-1.5 bg-gray-100 rounded"><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  <span className="font-medium text-gray-700">{uni.name}</span>
                  <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded w-fit mt-1">Abbr: {uni.abbr}</span>
                </div>
              )}
              
              {editingUni !== uni.name && (
                <div className="flex items-center gap-1 ml-4">
                  <button 
                    onClick={() => { setEditingUni(uni.name); setEditUniName(uni.name); setEditUniAbbr(uni.abbr); }}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                    title="Edit Name & Abbreviation"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleToggleUniversityActive(uni.name)}
                    className={`p-2 rounded-lg transition-colors ${uni.active !== false ? 'text-gray-400 hover:text-blue-600' : 'text-blue-600 hover:text-blue-700 bg-blue-50'}`}
                    title={uni.active !== false ? "Hide from Dashboard" : "Show in Dashboard"}
                  >
                    {uni.active !== false ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                  </button>
                </div>
              )}
            </div>
          ))}
          {universities.length === 0 && (
            <div className="p-4 text-center text-gray-500 italic">No universities added yet.</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-transparent font-sans text-gray-900 flex flex-col print:bg-white animate-in fade-in duration-500">
      
      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-800 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle size={18} className="text-green-400" />
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Internal Toolbar (Replacing the top nav) */}
      <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
           <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <LayoutDashboard size={20} />
           </div>
           <div>
              <h2 className="text-lg font-bold text-slate-800">Benchmarking Analysis</h2>
              <p className="text-xs text-slate-500">Comparative performance metrics across universities</p>
           </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Share2 size={16} /> <span className="hidden lg:inline">Share</span>
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Printer size={16} /> <span className="hidden lg:inline">Print</span>
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        
        {/* --- VIEW: DASHBOARD --- */}
        {currentPage === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Header / Selectors */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-800">Performance Overview</h1>
                <p className="text-gray-500 mt-1 print:hidden">Filter by category to view all corresponding metrics, or select a specific KPI.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto print:hidden">
                <div className="w-full sm:w-48">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <select 
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedKpi('All'); // Reset KPI when category changes
                    }}
                  >
                    <option value="All">All Categories</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full sm:w-72">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Indicator (KPI)</label>
                  <select 
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedKpi}
                    onChange={(e) => setSelectedKpi(e.target.value)}
                  >
                    <option value="All">All KPIs in Category</option>
                    {availableKpis.map(k => (
                      <option key={k.id} value={k.id}>{k.kpi}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Chart Rendering Area */}
            <div className="space-y-8">
              {kpisToRender.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-gray-100">
                  <p className="text-gray-500 font-medium">No KPIs match the selected filters.</p>
                </div>
              ) : (
                kpisToRender.map((kpi) => {
                  const chartData = universities.filter(u => u.active !== false).map(uni => ({
                    name: uni.name,
                    shortName: uni.abbr,
                    value: parseForChart(kpi.values[uni.name]),
                    originalValue: kpi.values[uni.name]
                  }));

                  return (
                    <div key={kpi.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col print:break-inside-avoid print:shadow-none print:border-gray-300">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                        <div>
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded mb-2 inline-block tracking-wider uppercase print:bg-white print:border print:border-blue-200">
                            {kpi.category}
                          </span>
                          <h2 className="text-xl font-bold text-gray-800">{kpi.kpi}</h2>
                        </div>
                        <div className="flex gap-3 text-xs text-gray-500 mt-2 md:mt-0 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 print:bg-white">
                          {chartData.map((d, i) => (
                            <span key={i} title={d.name}>{d.shortName}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="h-[350px] w-full min-h-0 relative">
                        {chartData.every(d => d.value === null) ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <BarChart size={40} className="mb-2 opacity-30" />
                            <p>No numeric data available for visualization.</p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis 
                                dataKey="shortName" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#4b5563', fontSize: 13, fontWeight: 600 }}
                                dy={10}
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                              />
                              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                              <Bar 
                                dataKey="value" 
                                fill="#2563eb" 
                                radius={[6, 6, 0, 0]} 
                                animationDuration={1000}
                                barSize={60}
                              >
                                <LabelList 
                                  dataKey="originalValue" 
                                  position="top" 
                                  offset={10} 
                                  fill="#4b5563" 
                                  fontSize={12} 
                                  fontWeight={600} 
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>

                      {/* Action Plan Section Display */}
                      {kpi.actionPlan && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl flex gap-3 items-start print:bg-white print:border-gray-200">
                          <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700 print:hidden">
                            <ListTree size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-emerald-900 mb-1 print:text-gray-800">Dubai Medical University (DMU) - Action Plan</h4>
                            <p className="text-sm text-emerald-800 leading-relaxed print:text-gray-600">{kpi.actionPlan}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Read-only Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:break-inside-avoid print:shadow-none print:border-gray-300 print:mt-8">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 print:bg-white print:border-b-2">
                <h3 className="text-lg font-bold text-gray-800">Raw Data View</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 print:bg-white">
                    <tr>
                      <th className="px-6 py-4 whitespace-nowrap">Year</th>
                      <th className="px-6 py-4 whitespace-nowrap">Category</th>
                      <th className="px-6 py-4 whitespace-nowrap border-r border-gray-200">KPI</th>
                      {universities.filter(u => u.active !== false).map(uni => (
                        <th key={uni.name} className="px-6 py-4 whitespace-nowrap font-medium text-gray-700">
                          {uni.name}
                        </th>
                      ))}
                      <th className="px-6 py-4 whitespace-nowrap border-l border-gray-200 bg-emerald-50/50 text-emerald-800 print:bg-white">DMU Action Plan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {kpisToRender.map((kpi) => (
                      <tr key={kpi.id} className="hover:bg-blue-50/30 transition-colors print:border-b">
                        <td className="px-6 py-3 font-medium text-gray-600">{kpi.year}</td>
                        <td className="px-6 py-3 font-medium text-gray-800">{kpi.category}</td>
                        <td className="px-6 py-3 border-r border-gray-100 text-gray-600 font-medium max-w-xs truncate print:whitespace-normal" title={kpi.kpi}>{kpi.kpi}</td>
                        {universities.filter(u => u.active !== false).map(uni => (
                          <td key={uni.name} className="px-6 py-3 text-gray-600">
                            {kpi.values[uni.name] || <span className="text-gray-300">-</span>}
                          </td>
                        ))}
                        <td className="px-6 py-3 border-l border-gray-100 text-emerald-700 italic max-w-xs truncate print:whitespace-normal print:text-gray-700" title={kpi.actionPlan}>
                          {kpi.actionPlan || <span className="text-emerald-300">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: DATA EDITOR (ADMIN ONLY) --- */}
        {currentPage === 'admin' && (
          <div className="space-y-6">
            
            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Database size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Data Management Matrix</h2>
                  <p className="text-xs text-gray-500">Changes made here reflect instantly across the dashboard charts.</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setIsUniModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-gray-700 font-medium rounded-lg shadow-sm transition-all text-sm"
                >
                  <Building2 size={16} /> Manage Universities
                </button>
                <button 
                  onClick={handleAddKpi}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-all text-sm"
                >
                  <ListTree size={16} /> Add New KPI Row
                </button>
              </div>
            </div>

            {/* Editable Spreadsheet View */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto max-h-[75vh] relative">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100/90 text-gray-700 font-semibold sticky top-0 z-20 backdrop-blur-md border-b border-gray-200 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap w-24 sticky left-0 z-30 bg-gray-100 shadow-[1px_0_0_0_#e5e7eb]">Year</th>
                      <th className="px-4 py-3 whitespace-nowrap w-40 sticky left-24 z-30 bg-gray-100 shadow-[1px_0_0_0_#e5e7eb]">Category</th>
                      <th className="px-4 py-3 whitespace-nowrap w-64 border-r border-gray-200 sticky left-64 z-30 bg-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Indicator (KPI)</th>
                      
                      {universities.map(uni => (
                        <th key={uni.name} className="px-4 py-3 min-w-[140px]">
                          <div className="line-clamp-2" title={uni.name}>{uni.abbr} <span className="text-[10px] font-normal text-gray-500 block">({uni.name})</span></div>
                        </th>
                      ))}
                      
                      <th className="px-4 py-3 min-w-[200px] border-l border-gray-200 bg-emerald-50/90 text-emerald-800">
                        DMU Action Plan
                      </th>
                      <th className="px-4 py-3 w-16 text-center sticky right-0 z-30 bg-gray-100 shadow-[-1px_0_0_0_#e5e7eb]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {kpis.map((kpi) => (
                      <tr key={kpi.id} className="group hover:bg-blue-50/20 transition-colors">
                        
                        <td className="p-0 sticky left-0 z-10 bg-white group-hover:bg-blue-50/20 align-top border-r border-gray-100">
                          <input 
                            value={kpi.year || ''}
                            onChange={(e) => handleUpdateKpiInfo(kpi.id, 'year', e.target.value)}
                            className="w-full h-full px-4 py-3 bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-blue-500 font-medium text-gray-800"
                            placeholder="Year"
                          />
                        </td>
                        
                        <td className="p-0 sticky left-24 z-10 bg-white group-hover:bg-blue-50/20 align-top border-r border-gray-100">
                          <input 
                            value={kpi.category}
                            onChange={(e) => handleUpdateKpiInfo(kpi.id, 'category', e.target.value)}
                            className="w-full h-full px-4 py-3 bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-blue-500 font-medium text-gray-800"
                            placeholder="Category"
                          />
                        </td>
                        
                        <td className="p-0 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] sticky left-64 z-10 bg-white group-hover:bg-blue-50/20 align-top">
                          <textarea 
                            value={kpi.kpi}
                            onChange={(e) => handleUpdateKpiInfo(kpi.id, 'kpi', e.target.value)}
                            className="w-full h-full min-h-[48px] px-4 py-3 bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-blue-500 text-gray-700 resize-none overflow-hidden"
                            placeholder="KPI Name"
                            rows={1}
                          />
                        </td>
                        
                        {universities.map(uni => (
                          <td key={uni.name} className="p-0 align-top border-r border-gray-50 last:border-r-0">
                            <input 
                              type="text"
                              value={kpi.values[uni.name] !== undefined ? kpi.values[uni.name] : ''}
                              onChange={(e) => handleUpdateKpiValue(kpi.id, uni.name, e.target.value)}
                              className="w-full h-full px-4 py-3 bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:bg-white text-gray-600 placeholder-gray-300"
                              placeholder="-"
                            />
                          </td>
                        ))}

                        <td className="p-0 align-top border-l border-gray-200 bg-emerald-50/30 group-hover:bg-emerald-50/60">
                           <textarea 
                            value={kpi.actionPlan || ''}
                            onChange={(e) => handleUpdateKpiInfo(kpi.id, 'actionPlan', e.target.value)}
                            className="w-full h-full min-h-[48px] px-4 py-3 bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-emerald-500 text-emerald-800 placeholder-emerald-300 resize-none overflow-hidden"
                            placeholder="Enter Action Plan for DMU..."
                            rows={1}
                          />
                        </td>

                        <td className="px-4 py-3 text-center align-middle sticky right-0 z-10 bg-white group-hover:bg-blue-50/20 border-l border-gray-200 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          <button 
                            onClick={() => handleToggleKpiActive(kpi.id)}
                            className={`p-1.5 rounded-lg transition-colors ${kpi.active !== false ? 'text-gray-400 hover:text-blue-600' : 'text-blue-600 hover:text-blue-700 bg-blue-50'}`}
                            title={kpi.active !== false ? "Hide from Dashboard" : "Show in Dashboard"}
                          >
                            {kpi.active !== false ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {kpis.length === 0 && (
                      <tr>
                        <td colSpan={universities.length + 5} className="px-6 py-12 text-center text-gray-500 bg-gray-50">
                          No data available. Click "Add New KPI Row" to start building your dataset.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      
      {/* University Manager Modal */}
      <Modal 
        isOpen={isUniModalOpen} 
        onClose={() => setIsUniModalOpen(false)}
        title="Manage Universities & Abbreviations"
      >
        <UniversityManager />
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
          <button 
            onClick={() => setIsUniModalOpen(false)}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmDelete.isOpen}
        onClose={closeConfirmDelete}
        title="Confirm Deletion"
      >
        <div className="py-2">
          <p className="text-gray-600 text-base">{confirmDelete.message}</p>
          <p className="text-sm text-red-500 mt-2 font-medium">This action cannot be undone.</p>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={closeConfirmDelete}
            className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={executeDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </Modal>

    </div>
  );
}
