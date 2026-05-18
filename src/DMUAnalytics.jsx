import React, { useState, useRef, useEffect, useMemo, useCallback, useTransition, startTransition } from 'react';
import * as XLSX from 'xlsx';
import { 
  Database, AlertCircle, 
  CheckCircle2, FileText, Loader2, Trash2, 
  RefreshCw, Folder, LayoutDashboard, Briefcase, 
  GraduationCap, Users, BarChart3, Filter,
  ClipboardCheck, Activity, Target, Share2, Printer, Download, Globe, Plus, ChevronDown, ChevronLeft, Save, X, Edit, Eye, TrendingUp, Calendar as CalendarIcon, User, BarChart2
} from 'lucide-react';
import { supabase } from './supabase';
import RichTextEditor from './RichTextEditor';
import { Benchmarking } from './Benchmarking';

// --- ERROR BOUNDARY COMPONENT ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("DMU Analytics Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-white border-2 border-dashed border-rose-200 rounded-[2.5rem] text-center shadow-sm">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
            The analytics engine encountered an unexpected error while processing the data. 
            This is usually caused by missing columns or incorrect formats in the source files.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl text-left mb-6 w-full max-w-lg overflow-auto border border-slate-100">
            <p className="text-[10px] font-mono text-rose-600 break-all">{this.state.error?.toString()}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Analytics
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const KPI_METADATA = [
  {
    pillar: "1. Employment Outcomes",
    kpis: [
      { no: "1.1", title: "Employment Rate (%)" },
      { no: "1.2", title: "Employment Rate in Relevant Jobs (%)" }
    ]
  },
  {
    pillar: "2. Learning Outcomes",
    kpis: [
      { no: "2.1", title: "Assessment Quality Review (%)" },
      { no: "2.2", title: "Retention Rate (FYR) (%)" },
      { no: "2.3", title: "Employer Feedback in Work Placements (score out of 5)" },
      { no: "2.4", title: "Employer Feedback in Employment (score out of 5)" },
      { no: "2.5", title: "Rate of graduates obtaining microcredentials & licenses (%)" },
      { no: "2.6", title: "Student Satisfaction with Learning Experience (score out of 5)" }
    ]
  },
  {
    pillar: "3. Industry Collaboration",
    kpis: [
      { no: "3.1", title: "Job Offer Post Work-placement (%)" },
      { no: "3.2", title: "Student Participation Rate in Work Placements (%)" },
      { no: "3.3", title: "Joint Industry Courses (%)" },
      { no: "3.4", title: "Industry Contributions (AED)" }
    ]
  },
  {
    pillar: "4. Research Outcomes",
    kpis: [
      { no: "4.1", title: "Publication Ratio (#)" },
      { no: "4.2", title: "Field-Weighted Citations Impact (FWCI)" },
      { no: "4.3", title: "Joint Industry Research (%)" },
      { no: "4.4", title: "Student Participation Rate in Research (%)" },
      { no: "4.5", title: "Impact of Research (%)" },
      { no: "4.6", title: "Awarded Intellectual Property (IP) (#)" }
    ]
  },
  {
    pillar: "5. Reputation",
    kpis: [
      { no: "5.1", title: "Global University and Subject Rankings (#)" },
      { no: "5.2", title: "International Accreditation Status (%)" },
      { no: "5.3", title: "Student Participation Rate in International Dual/Joint Degrees (%)" },
      { no: "5.4", title: "International Research Collaboration (%)" }
    ]
  },
  {
    pillar: "6. Community Engagement",
    kpis: [
      { no: "6.1", title: "Academic Events" },
      { no: "6.2", title: "Community Engagement Events" }
    ]
  }
];

const PROGRESS_OPTIONS = [
  { value: 25, label: "action has been defined & approved" },
  { value: 50, label: "action has been implemented halfway" },
  { value: 75, label: "action is fully implemented pending evaluation" },
  { value: 100, label: "action impact evaluated" }
];

// DMU Analytics Dashboard - Refined KPI Visualization & Data Integration
// Stable Version - Reverted problematic enrollment fix (2026-05-06)
// --- CONFIGURATION ---
const apiKey = ""; 
const GOOGLE_API_KEY = "AIzaSyCxBIE67e5jQt1pUnDFCaaTAZ1EkekggyY"; 
const DEFAULT_FOLDER_ID = "1eXbNaJhXMQpSIBo-RIwVa6R3n0Zzz6Du";

// --- UTILITY: Universal Academic Year Matching ---
// Normalizes short (24/25) and full (2024/2025) formats to a canonical form
const normalizeAcademicYear = (val) => {
  if (!val) return '';
  const s = String(val).trim();
  // Match patterns like 24/25, 2024/2025, 24-25, 2024-2025
  const m = s.match(/(\d{2,4})[\/-](\d{2,4})/);
  if (m) {
    let y1 = m[1], y2 = m[2];
    // Expand 2-digit to 4-digit (assume 20xx)
    if (y1.length === 2) y1 = (parseInt(y1) > 50 ? '19' : '20') + y1;
    if (y2.length === 2) y2 = (parseInt(y2) > 50 ? '19' : '20') + y2;
    return `${y1}/${y2}`;
  }
  // Single year like "2024"
  const singleYear = s.match(/^(\d{4})$/);
  if (singleYear) return `${singleYear[1]}/${parseInt(singleYear[1]) + 1}`;
  return s;
};

// --- LOCAL DATABASE CACHE (INDEXEDDB) ---
const DB_NAME = 'DMU_Analytics_Cache';
const STORE_NAME = 'driveFiles';

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getCachedFile = async (id) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return null; }
};

const cacheFile = async (fileData) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(fileData);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { console.warn('Cache write failed', e); }
};

const getAllCachedFiles = async () => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return []; }
};

const matchAcademicYear = (rowValue, filterValue) => {
  if (filterValue === 'All') return true;
  if (!rowValue) return false;
  return normalizeAcademicYear(rowValue) === normalizeAcademicYear(filterValue);
};

const normalizeId = (val) => String(val || '').trim().replace(/\.0$/, '').replace(/^0+/, '').toLowerCase();
const normalizeName = (name) => String(name || '').trim().toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ');

const normalizeProgramName = (name) => {
  if (!name) return '';
  return String(name).trim();
};
const extractScopusId = (sid) => {
  const m = String(sid || '').match(/\d{10,12}/);
  return m ? m[0] : String(sid || '').trim();
};
const getStartYear = (ay) => {
  if (!ay) return 0;
  const match = String(ay).match(/\d{4}/);
  return match ? parseInt(match[0], 10) : 0;
};
const calToAcademic = (calYear) => {
  if (!calYear || calYear === 'All') return null;
  const yr = parseInt(calYear, 10);
  if (!isNaN(yr)) return `${yr}/${yr + 1}`;
  return null;
};

const getPeriodLabel = (kpiNo) => {
  if (!kpiNo) return 'Period';
  const no = String(kpiNo).trim();
  if (['2.2'].includes(no)) return 'Cohort';
  if (['1.1', '1.2', '2.4', '2.5', '3.1'].includes(no)) return 'Graduation Year';
  if (['2.3', '2.6', '3.3', '4.4'].includes(no)) return 'Academic Year';
  if (['4.1', '4.2', '4.3', '4.5', '5.4'].includes(no)) return 'Calendar Year';
  return 'Period';
};

const KPI_CONFIG = {
  '1.1': { title: "Employment Rate", denomLabel: "No. of Responses", numLabel: "No. of Responses with Yes", color: "indigo", icon: <Users className="w-4 h-4" /> },
  '1.2': { title: "Employability in Relevant Position", denomLabel: "No. of Responses", numLabel: "No. of Responses with Yes", color: "blue", icon: <Target className="w-4 h-4" /> },
  '2.2': { title: "Retention Rate", denomLabel: "Total First-Year Students", numLabel: "Retained into Next Year", color: "indigo", icon: <GraduationCap className="w-4 h-4" /> },
  '2.3': { title: "Employer Feedback in Workplacement", denomLabel: "No. of Responses", numLabel: "Satisfaction Score", type: "2-box", color: "indigo", icon: <Activity className="w-4 h-4" /> },
  '2.4': { title: "Employer Satisfaction", denomLabel: "No. of Employer Responses", numLabel: "Satisfaction Score", type: "2-box", color: "purple", icon: <Activity className="w-4 h-4" /> },
  '2.5': { title: "Licensing", denomLabel: "No. of Responses", numLabel: "No. of Responses with Yes", color: "orange", icon: <ClipboardCheck className="w-4 h-4" /> },
  '2.6': { title: "Student Satisfaction", denomLabel: "Invitees", numLabel: "Response Rate", type: "4-box", color: "purple", icon: <ClipboardCheck className="w-4 h-4" /> },
  '3.1': { title: "Offers Post Workplacement", denomLabel: "No. of Responses", numLabel: "No. of Responses with Yes", color: "rose", icon: <Activity className="w-4 h-4" /> },
  '3.3': { title: "Joint Industry Courses", denomLabel: "Total Credits (Non-BS/GE)", numLabel: "Industry Credits", color: "blue", icon: <Briefcase className="w-4 h-4" /> },
  '4.1': { title: "Publication Ratio", denomLabel: "Total FT Faculty", numLabel: "Total Publications", type: "3-box", color: "indigo", icon: <FileText className="w-4 h-4" /> },
  '4.2': { title: "Field-Weighted Citation Impact", denomLabel: "No. of Publications", numLabel: "Mean FWCI", type: "2-box", color: "purple", icon: <Activity className="w-4 h-4" /> },
  '4.3': { title: "Industry Collaboration", denomLabel: "Total Approved Projects", numLabel: "Projects with Industry Collaboration", color: "indigo", icon: <Briefcase className="w-4 h-4" /> },
  '4.4': { title: "Student Participation in Research", denomLabel: "Total Students", numLabel: "Students in Research", color: "indigo", icon: <Users className="w-4 h-4" /> },
  '4.5': { title: "Impact of Research", denomLabel: "Total Approved Projects", numLabel: "Projects with Impact", color: "blue", icon: <Activity className="w-4 h-4" /> },
  '5.4': { title: "International Research Collaboration", denomLabel: "Total Approved Projects", numLabel: "International Projects", color: "indigo", icon: <Globe className="w-4 h-4" /> },
  '4.6': { title: "Awarded Intellectual Property", denomLabel: "Total FT Faculty", numLabel: "No. of Awarded IP", color: "purple", icon: <FileText className="w-4 h-4" /> },
  '6.1': { title: "Academic Events", denomLabel: "Total FT Faculty", numLabel: "No. of Academic Events with students", color: "indigo", icon: <Activity className="w-4 h-4" /> },
  '6.2': { title: "Community Engagement Events", denomLabel: "Total FT Faculty", numLabel: "No. of Community Engagement Events", color: "emerald", icon: <Activity className="w-4 h-4" /> },
};

// --- SUB-COMPONENTS ---
// --- UTILITY: KPI Status Logic ---
const getKPIStatus = (kpiTag, value, isProgrammatic = false) => {
  if (value === undefined || value === null) return null;
  const val = parseFloat(value);
  if (isNaN(val)) return null;

  let thresholds = { h: 90, m: 65, l: 35, max: 100 }; // Default for 1.1

  const tag = String(kpiTag).replace('KPI ', '').trim();

  // Thresholds mapping based on institutional vs programmatic requirements from the reference table
  switch(tag) {
    case '1.1': thresholds = { h: 90, m: 65, l: 35, max: 100 }; break;
    case '1.2': thresholds = { h: 90, m: 60, l: 30, max: 100 }; break;
    case '2.2': thresholds = isProgrammatic ? { h: 80, m: 60, l: 40, max: 100 } : { h: 90, m: 75, l: 50, max: 100 }; break;
    case '2.3': thresholds = { h: 4.5, m: 3.5, l: 2.0, max: 5.0 }; break;
    case '2.4': thresholds = { h: 4.5, m: 3.5, l: 2.0, max: 5.0 }; break;
    case '2.5': thresholds = isProgrammatic ? { h: 40, m: 20, l: 10, max: 50 } : { h: 90, m: 60, l: 30, max: 100 }; break;
    case '2.6': thresholds = { h: 4.5, m: 3.5, l: 2.0, max: 5.0 }; break;
    case '3.1': thresholds = { h: 50, m: 30, l: 10, max: 100 }; break;
    case '3.2': thresholds = { h: 90, m: 70, l: 50, max: 100 }; break;
    case '3.3': thresholds = { h: 35, m: 20, l: 10, max: 100 }; break;
    case '3.4': thresholds = isProgrammatic ? { h: 1000000, m: 1000000, l: 1000000, max: 1000000 } : { h: 35000000, m: 15000000, l: 5000000, max: 50000000 }; break;
    case '4.1': thresholds = { h: 5, m: 3, l: 2, max: 10 }; break;
    case '4.2': thresholds = { h: 2.0, m: 0.9, l: 0.8, max: 4.0 }; break;
    case '4.3': thresholds = { h: 65, m: 40, l: 20, max: 75 }; break;
    case '4.4': thresholds = { h: 12, m: 6, l: 3, max: 15 }; break;
    case '4.5': thresholds = { h: 8, m: 4, l: 1, max: 10 }; break;
    case '4.6': thresholds = { h: 8, m: 4, l: 1, max: 10 }; break;
    case '5.1': thresholds = { h: 300, m: 400, l: 500, max: 2000 }; break;
    case '5.2': thresholds = { h: 90, m: 60, l: 30, max: 100 }; break;
    case '5.3': thresholds = { h: 5, m: 3, l: 1, max: 10 }; break;
    case '5.4': thresholds = { h: 40, m: 20, l: 10, max: 80 }; break;
    case '6.1': thresholds = isProgrammatic ? { h: 3, m: 2, l: 1, max: 4 } : { h: 20, m: 10, l: 5, max: 25 }; break;
    case '6.2': thresholds = isProgrammatic ? { h: 1.1, m: 0.1, l: 0.1, max: 2 } : { h: 20, m: 10, l: 5, max: 25 }; break;
  }

  // Handle Special Reversed Logic for Rankings (KPI 5.1) - Lower is better
  if (tag === '5.1') {
    let status = { label: 'Very Low', color: 'rose' };
    if (val <= thresholds.h) status = { label: 'High', color: 'emerald' };
    else if (val <= thresholds.m) status = { label: 'Medium', color: 'amber' };
    else if (val <= thresholds.l) status = { label: 'Low', color: 'orange' };
    return { ...status, thresholds };
  }

  let status = { label: 'Very Low', color: 'rose' };
  if (val >= thresholds.h) status = { label: 'High', color: 'emerald' };
  else if (val >= thresholds.m) status = { label: 'Medium', color: 'amber' };
  else if (val >= thresholds.l) status = { label: 'Low', color: 'orange' };

  return { ...status, thresholds };
};

const FilterHint = ({ text }) => (
  <div className="relative group ml-1 inline-block">
    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-400 cursor-help hover:border-indigo-400 hover:text-indigo-500 transition-colors bg-white shadow-sm">
      ?
    </div>
    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] shadow-2xl pointer-events-none border border-slate-700">
      <div className="font-bold border-b border-slate-700 pb-1.5 mb-1.5 uppercase tracking-wider text-indigo-400">Connected Metrics</div>
      <div className="whitespace-pre-line leading-relaxed text-slate-300 font-medium">{text}</div>
      <div className="absolute top-full left-3 border-8 border-transparent border-t-slate-900"></div>
    </div>
  </div>
);

const MiniTrend = ({ data: rawData, color = 'indigo', unit = '%', yMin, yMax }) => {
  if (!rawData || rawData.length < 1) return null;
  const data = rawData.slice(-3);
  const W = 300, H = 85, PAD = 30, PADT = 22, PADB = 22;
  const vals = data.map(d => parseFloat(d.value) || 0);
  const actualMin = Math.min(...vals);
  const actualMax = Math.max(...vals);
  const mn = yMin !== undefined ? Math.min(yMin, actualMin) : actualMin;
  const mx = yMax !== undefined ? Math.max(yMax, actualMax * 1.15) : Math.max(actualMax * 1.15, 1);
  const range = mx - mn || 1;
  const xStep = data.length > 1 ? (W - 2 * PAD) / (data.length - 1) : 0;
  const pts = vals.map((v, i) => ({
    x: data.length === 1 ? W / 2 : PAD + i * xStep,
    y: data.length === 1 ? H / 2 - 6 : PADT + (H - PADT - PADB) * (1 - (v - mn) / range),
    val: v, year: data[i].year
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1].x},${H - PADB} L${pts[0].x},${H - PADB} Z`;
  const strokeMap = { indigo: '#6366f1', blue: '#3b82f6', purple: '#a855f7', orange: '#f97316', rose: '#f43f5e', emerald: '#10b981' };
  const fillMap = { indigo: '#eef2ff', blue: '#eff6ff', purple: '#faf5ff', orange: '#fff7ed', rose: '#fff1f2', emerald: '#ecfdf5' };
  const stroke = strokeMap[color] || strokeMap.indigo;
  const fill = fillMap[color] || fillMap.indigo;
  return (
    <div className="px-6 pb-5 pt-3 border-t border-slate-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trend Analysis</span>
        <span className="text-[10px] font-bold text-slate-400">{data.length} periods</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: '95px', overflow: 'visible' }}>
        <path d={areaPath} fill={fill} opacity="0.5" />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={stroke} strokeWidth="2" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill={stroke}>{p.val}</text>
            <text x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill="#94a3b8">{p.year}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const KPILine = ({ tag, title, denomLabel, numLabel, data, type = '3-box', color = 'indigo', icon, isProgrammatic, extraBoxesBefore = [], extraBoxes = [], trendData, unit = '%', onNumClick, onDenomClick, onActionPlanClick, actionStats }) => {
  const status = data ? getKPIStatus(tag, data.value, isProgrammatic) : null;
  const trendUnit = (tag === 'KPI 2.3' || tag === 'KPI 2.4' || tag === 'KPI 4.1' || tag === 'KPI 4.2') ? '' : '%';
  const numBoxes = (parseInt(type) || 3) + extraBoxesBefore.length + extraBoxes.length - (!numLabel && type !== '1-box' ? 1 : 0);

  const colorMap = {
    indigo: 'bg-indigo-600',
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600',
    rose: 'bg-rose-600',
    emerald: 'bg-emerald-600 border-emerald-700 shadow-sm'
  };
  const bgColorMap = {
    indigo: 'bg-indigo-50',
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
    rose: 'bg-rose-50',
    emerald: 'bg-emerald-50'
  };
  const textColorMap = {
    indigo: 'text-indigo-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    rose: 'text-rose-600',
    emerald: 'text-emerald-600'
  };

  const statusClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between ${bgColorMap[color]} bg-opacity-30`}>
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${colorMap[color]}`}>
            {tag}
          </div>
          <h3 className="text-sm font-bold text-slate-700">{title}</h3>
          {status && (
            <div className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${statusClasses[status.color]}`}>
              {status.label}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onActionPlanClick && (
            <button 
              onClick={(e) => { e.stopPropagation(); onActionPlanClick(trendData); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-white text-slate-700 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all border border-slate-200/50"
              title="Add Corrective Action Plan"
            >
              <Plus size={12} strokeWidth={3} />
              Action Plan
            </button>
          )}
          <div className={textColorMap[color]}>{icon}</div>
        </div>
      </div>
      
      <div className={`p-6 grid grid-cols-1 ${
        numBoxes === 1 ? 'md:grid-cols-1' :
        numBoxes === 2 ? 'md:grid-cols-2' :
        numBoxes === 3 ? 'md:grid-cols-3' :
        numBoxes === 4 ? 'md:grid-cols-4' :
        numBoxes === 5 ? 'md:grid-cols-5' :
        'md:grid-cols-3'
      } gap-6`}>
        {/* Extra Boxes Before */}
        {type !== '1-box' && extraBoxesBefore.map((box, i) => (
          <div 
            key={`before-${i}`} 
            className={`bg-slate-50 p-4 rounded-2xl border flex flex-col justify-center relative group ${box.onClick ? 'cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors border-slate-200 shadow-sm hover:shadow' : 'border-slate-100'}`}
            onClick={box.onClick}
          >
            {box.onClick && (
              <div className="absolute top-2 right-2 text-slate-300 group-hover:text-indigo-500 transition-colors">
                <Eye size={14} strokeWidth={2.5} />
              </div>
            )}
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{box.label}</span>
            <span className="text-2xl font-black text-slate-800">{box.value}</span>
          </div>
        ))}

        {/* Box 1: Denominator / Absolute Count */}
        <div 
          className={`bg-slate-50 p-4 rounded-2xl border flex flex-col justify-center relative group ${onDenomClick ? 'cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors border-slate-200 shadow-sm hover:shadow' : 'border-slate-100'}`}
          onClick={onDenomClick}
        >
          {onDenomClick && (
            <div className="absolute top-2 right-2 text-slate-300 group-hover:text-indigo-500 transition-colors">
              <Eye size={14} strokeWidth={2.5} />
            </div>
          )}
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{denomLabel || (type === '1-box' ? numLabel : 'Total')}</span>
          <span className="text-2xl font-black text-slate-800">{type === '1-box' ? (data?.value || 0) : (data?.denominator || 0)}</span>
        </div>

        {/* Extra Boxes After Denominator */}
        {type !== '1-box' && extraBoxes.map((box, i) => (
          <div 
            key={`after-${i}`} 
            className={`bg-slate-50 p-4 rounded-2xl border flex flex-col justify-center relative group ${box.onClick ? 'cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors border-slate-200 shadow-sm hover:shadow' : 'border-slate-100'}`}
            onClick={box.onClick}
          >
            {box.onClick && (
              <div className="absolute top-2 right-2 text-slate-300 group-hover:text-indigo-500 transition-colors">
                <Eye size={14} strokeWidth={2.5} />
              </div>
            )}
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{box.label}</span>
            <span className="text-2xl font-black text-slate-800">{box.value}</span>
          </div>
        ))}

        {/* Box 2: Numerator or Score */}
        {type !== '1-box' && Boolean(numLabel) && (
          <div 
            className={`bg-slate-50 p-4 rounded-2xl border flex flex-col justify-center relative group ${onNumClick ? 'cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors border-slate-200 shadow-sm hover:shadow' : 'border-slate-100'}`}
            onClick={onNumClick}
          >
            {onNumClick && (
              <div className="absolute top-2 right-2 text-slate-300 group-hover:text-indigo-500 transition-colors">
                <Eye size={14} strokeWidth={2.5} />
              </div>
            )}
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{numLabel}</span>
            <span className="text-2xl font-black text-slate-800">
              {type === '2-box' ? (data?.value || 0) : (data?.numerator || 0)}
              {type === '2-box' && tag !== 'KPI 4.2' && <span className="text-sm font-medium text-slate-400 ml-1">/ 5</span>}
            </span>
          </div>
        )}

        {/* Box 3: KPI Value */}
        {type !== '2-box' && type !== '1-box' && (
          <div className={`${bgColorMap[color]} p-4 rounded-2xl border border-white flex flex-col justify-center relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 p-2 opacity-10 ${textColorMap[color]}`}>{icon}</div>
            <span className={`text-[10px] font-bold ${textColorMap[color]} uppercase tracking-wider mb-1`}>KPI Value</span>
            <div className="flex items-baseline space-x-1">
              <span className={`text-3xl font-black ${textColorMap[color]}`}>{data?.value || 0}</span>
              {unit && <span className={`text-lg font-bold opacity-70 ${textColorMap[color]}`}>{unit}</span>}
            </div>
            <div className="w-full bg-white/50 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className={`${colorMap[color]} h-full rounded-full`} style={{ width: `${data?.value || 0}%` }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Threshold Scale Visualization */}
      {status && status.thresholds && (
        <div className="px-6 pb-10 border-t border-slate-50 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Performance Scale</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase">{status.label} Zone</span>
          </div>
          <div className="relative">
            {/* Threshold Labels (Above the Scale) */}
            <div className="flex justify-between text-[10px] font-black text-slate-400 mb-3 uppercase tracking-tight relative h-4">
              <span>0</span>
              <span className="absolute" style={{ left: `${(status.thresholds.l / status.thresholds.max) * 100}%`, transform: 'translateX(-50%)' }}>{status.thresholds.l}</span>
              <span className="absolute" style={{ left: `${(status.thresholds.m / status.thresholds.max) * 100}%`, transform: 'translateX(-50%)' }}>{status.thresholds.m}</span>
              <span className="absolute" style={{ left: `${(status.thresholds.h / status.thresholds.max) * 100}%`, transform: 'translateX(-50%)' }}>{status.thresholds.h}</span>
              <span>{status.thresholds.max}</span>
            </div>

            <div className="h-1.5 w-full rounded-full flex overflow-hidden bg-slate-100">
              <div style={{ width: `${(status.thresholds.l / status.thresholds.max) * 100}%` }} className="bg-rose-400 h-full opacity-60"></div>
              <div style={{ width: `${((status.thresholds.m - status.thresholds.l) / status.thresholds.max) * 100}%` }} className="bg-orange-400 h-full opacity-60"></div>
              <div style={{ width: `${((status.thresholds.h - status.thresholds.m) / status.thresholds.max) * 100}%` }} className="bg-amber-400 h-full opacity-60"></div>
              <div style={{ width: `${((status.thresholds.max - status.thresholds.h) / status.thresholds.max) * 100}%` }} className="bg-emerald-400 h-full opacity-60"></div>
            </div>
            
            {/* Value Indicator */}
            <div 
              className="absolute top-[20px] w-1 h-3.5 bg-slate-900 rounded-full shadow-sm z-10 transition-all duration-1000" 
              style={{ left: `${Math.min((parseFloat(data?.value || 0) / (status?.thresholds?.max || 100)) * 100, 100)}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-900 whitespace-nowrap">
                {data?.value || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trend Sparkline */}
      <MiniTrend data={trendData} color={color} unit={trendUnit} yMin={0} yMax={status?.thresholds?.max || 100} />

      {/* Action Progress Statistics Badges */}
      {actionStats && (actionStats.p0 > 0 || actionStats.p25 > 0 || actionStats.p50 > 0 || actionStats.p75 > 0 || actionStats.p100 > 0) && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-50 flex items-center gap-3">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Strategy Progress:</span>
          <div className="flex flex-wrap gap-2">
            {actionStats.p0 > 0 && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[9px] font-black shadow-sm"><div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> {actionStats.p0} at 0%</span>}
            {actionStats.p25 > 0 && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-black shadow-sm"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> {actionStats.p25} at 25%</span>}
            {actionStats.p50 > 0 && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100 text-[9px] font-black shadow-sm"><div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" /> {actionStats.p50} at 50%</span>}
            {actionStats.p75 > 0 && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-black shadow-sm"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> {actionStats.p75} at 75%</span>}
            {actionStats.p100 > 0 && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black shadow-sm"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {actionStats.p100} at 100%</span>}
          </div>
        </div>
      )}
    </div>
  );
};

// --- HELPER: ROBUST CSV PARSER ---
const parseCSV = (text) => {
  if (!text || typeof text !== 'string') return { headers: [], data: [] };
  const data = [];
  let currentVal = '';
  let inQuotes = false;
  let row = [];
  
  try {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i+1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal);
        currentVal = '';
      } else if (char === '\n' && !inQuotes) {
        row.push(currentVal);
        data.push(row);
        row = [];
        currentVal = '';
      } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
      } else if (char !== '\r' || inQuotes) {
        currentVal += char;
      }
    }
    
    if (currentVal || row.length > 0) {
      row.push(currentVal);
      data.push(row);
    }
  } catch (e) {
    console.error('[parseCSV] Critical parsing error:', e);
    return { headers: [], data: [] };
  }
  
  if (data.length < 1) return { headers: [], data: [] };
  
  // Find the header row (the first row with a substantial number of columns)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
     if (data[i] && data[i].filter(cell => cell && String(cell).trim() !== '').length > 2) {
        headerIndex = i;
        break;
     }
  }
  
  if (headerIndex === -1) return { headers: [], data: [] };
  
  const headers = data[headerIndex].map(h => (h || '').trim().replace(/"/g, '').toLowerCase());
  const records = [];
  
  for (let i = headerIndex + 1; i < data.length; i++) {
    if (!data[i] || (data[i].length === 1 && String(data[i][0]).trim() === '')) continue;
    
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        obj[headers[j]] = (data[i][j] || '').trim();
      }
    }
    records.push(obj);
  }
  return { headers, data: records };
};

const CorrectiveActionPlan = ({ session, userMeta, dashboardData, programs, onCalculateTrend, prefillData, onPrefillClear }) => {
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [caps, setCaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filters, setFilters] = useState({ pillar: '', program: '', kpi_no: '' });
  
  const [formData, setFormData] = useState({
    pillar: '',
    kpi_title: '',
    kpi_no: '',
    program: [], // Changed to array for multi-select
    target_next_year: '',
    target_next_value: '',
    target_after_two_years: '',
    target_after_two_value: '',
    reflection: '',
    benchmarks: [], // New section for university benchmarking
    trend_data: [], // Stores trend values
    actions: [
      { 
        id: Date.now(), 
        owner: '', 
        details: '', 
        timeline: [
          { 
            year: '', 
            q1: { progress: 0, comment: '' }, 
            q2: { progress: 0, comment: '' }, 
            q3: { progress: 0, comment: '' }, 
            q4: { progress: 0, comment: '' } 
          }
        ]
      }
    ]
  });
  
  const [activeTimelineTabs, setActiveTimelineTabs] = useState({}); // { actionId: { yearIdx: 0, q: 'q1' } }

  const [capFilters, setCapFilters] = useState({
    programs: [],
    cohort: 'All',
    gradYear: 'All',
    academicYear: 'All',
    pubYear: 'All',
    projectStartYear: 'All'
  });

  const [trendTableData, setTrendTableData] = useState([]);

  useEffect(() => {
    fetchCaps();
  }, []);

  // Handle Prefill Data from Dashboard
  useEffect(() => {
    if (prefillData) {
      // Find the pillar for this KPI
      let pillar = '';
      KPI_METADATA.forEach(p => {
        if (p.kpis.some(k => k.no === prefillData.kpi_no)) pillar = p.pillar;
      });

      setFormData({
        ...formData,
        pillar: pillar,
        kpi_no: prefillData.kpi_no,
        kpi_title: prefillData.kpi_title,
        program: prefillData.programs || [],
        target_period: prefillData.period || 'All',
        target_next_year: '',
        target_next_value: '',
        target_after_two_years: '',
        target_after_two_value: '',
        reflection: '',
        trend_data: prefillData.trendData || [],
        benchmarks: [],
        actions: [{ 
          id: Date.now(), 
          owner: '', 
          details: '', 
          timeline: [{ year: '', q1: { progress: 0, comment: '' }, q2: { progress: 0, comment: '' }, q3: { progress: 0, comment: '' }, q4: { progress: 0, comment: '' } }] 
        }]
      });
      setIsEditing(true);
      setView('form');
      
      // Clear prefill so it doesn't trigger again on re-render
      if (onPrefillClear) onPrefillClear();
    }
  }, [prefillData]);

  const fetchCaps = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('corrective_action_plans')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setCaps(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...formData,
      created_by: session.user.email,
      created_at: formData.id ? formData.created_at : new Date().toISOString()
    };
    
    // Ensure id is removed for new records if using serial/uuid
    const { data, error } = await supabase
      .from('corrective_action_plans')
      .upsert({ ...payload, updated_at: new Date() });

    if (error) {
      alert("Error saving: " + error.message);
    } else {
      setView('list');
      fetchCaps();
    }
    setSaving(false);
  };

  // Cascade Logic
  const selectedPillarData = KPI_METADATA.find(p => p.pillar === formData.pillar);
  const availableTitles = selectedPillarData ? selectedPillarData.kpis.map(k => k.title) : [];
  
  useEffect(() => {
    if (formData.kpi_title && selectedPillarData) {
      const kpi = selectedPillarData.kpis.find(k => k.title === formData.kpi_title);
      if (kpi) setFormData(prev => ({ ...prev, kpi_no: kpi.no }));
    }
  }, [formData.kpi_title, formData.pillar]);

  // Load Trend Data
  useEffect(() => {
    if (formData.kpi_no && (onCalculateTrend || dashboardData)) {
      const fetchTrend = async () => {
        if (onCalculateTrend) {
          const trend = await onCalculateTrend(formData.kpi_no, capFilters);
          if (trend) {
            setTrendTableData(trend);
            return;
          }
        }

        // Fallback to dashboardData if onCalculateTrend fails or is not provided
        const stats = dashboardData?.stats;
        if (!stats) return;
        let trend = null;
        Object.keys(stats).forEach(k => {
          if (stats[k] && stats[k].trend && k.includes(formData.kpi_no.replace('.', ''))) {
            trend = stats[k].trend;
          }
        });
        setTrendTableData(trend || []);
      };
      
      fetchTrend();
    }
  }, [formData.kpi_no, capFilters, dashboardData, onCalculateTrend]);

  const stats = useMemo(() => {
    // Separate calculations for Internal Trend and External Benchmarking
    const dataToProcess = trendTableData.length > 0 ? trendTableData : (formData.trend_data || []);
    const visibleTrend = dataToProcess.slice(-3);
    const ourVals = visibleTrend.map(d => parseFloat(d.value)).filter(v => !isNaN(v) && v > 0);
    const benchVals = (formData.benchmarks || []).map(b => parseFloat(b.value)).filter(v => !isNaN(v) && v > 0);
    
    const calculate = (vals) => {
      if (vals.length === 0) return { mean: '0.00', p90: '0.00' };
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sorted = [...vals].sort((a, b) => a - b);
      const p90 = sorted[Math.floor(sorted.length * 0.9)] || 0;
      return { mean: mean.toFixed(2), p90: p90.toFixed(2) };
    };

    return {
      internal: calculate(ourVals),
      benchmarking: calculate(benchVals)
    };
  }, [trendTableData, formData.benchmarks]);

  const uniqueKpis = useMemo(() => {
    const map = new Map();
    caps.forEach(c => {
      if (c.kpi_no && !map.has(c.kpi_no)) {
        map.set(c.kpi_no, c.kpi_title);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [caps]);

  const years = Array.from({ length: 13 }, (_, i) => 2026 + i);

  if (view === 'list') {
    return (
      <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-500">
        <div className="bg-white px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0 shadow-sm relative z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Corrective Action Plans</h2>
            <p className="text-sm text-slate-400 mt-1 font-medium">Monitor and manage institutional improvement strategies</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white px-8 py-3 border-b border-slate-100 flex items-center gap-4 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">
            <Filter size={14} className="mr-2" />
            Filters:
          </div>
          <select 
            value={filters.program}
            onChange={e => setFilters({ ...filters, program: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Scopes</option>
            <option value="Institution Level">Institution Level</option>
            {programs && programs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select 
            value={filters.kpi_no}
            onChange={e => setFilters({ ...filters, kpi_no: e.target.value })}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="">All KPI Titles</option>
            {uniqueKpis.map(([no, title]) => (
              <option key={no} value={no}>{no} - {title}</option>
            ))}
          </select> 
          {(filters.pillar || filters.program || filters.kpi_no) && (
            <button 
              onClick={() => setFilters({ pillar: '', program: '', kpi_no: '' })}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest ml-auto underline"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Loader2 className="animate-spin text-indigo-500 w-10 h-10 mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Plans...</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {caps
                  .filter(cap => !filters.kpi_no || cap.kpi_no === filters.kpi_no)
                  .filter(cap => !filters.program || 
                    (filters.program === 'Institution Level' && (!cap.program || (Array.isArray(cap.program) && cap.program.length === 0))) ||
                    (Array.isArray(cap.program) && cap.program.includes(filters.program))
                  )
                  .length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FileText className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-400">No action plans found</h3>
                    <p className="text-slate-300 mt-2 max-w-xs mx-auto">Try adjusting your filters or create a new improvement strategy.</p>
                  </div>
                ) : caps
                    .filter(cap => !filters.kpi_no || cap.kpi_no === filters.kpi_no)
                    .filter(cap => !filters.program || 
                      (filters.program === 'Institution Level' && (!cap.program || (Array.isArray(cap.program) && cap.program.length === 0))) ||
                      (Array.isArray(cap.program) && cap.program.includes(filters.program))
                    )
                    .map(cap => (
                  <div key={cap.id} className="bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all group flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xs border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-500">
                        {cap.kpi_no}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{cap.pillar}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            {Array.isArray(cap.program) && cap.program.length > 0 ? cap.program.join(', ') : 'Institution Level'}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{cap.kpi_title}</h3>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <User size={12} className="mr-1.5 text-slate-300" />
                            {cap.created_by}
                          </div>
                          <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <CalendarIcon size={12} className="mr-1.5 text-slate-300" />
                            {new Date(cap.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => { 
                          setFormData(cap); 
                          setIsEditing(cap.created_by === session?.user?.email);
                          setView('form'); 
                        }} 
                        className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${cap.created_by === session?.user?.email ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-800 hover:text-white'}`}
                      >
                        {cap.created_by === session?.user?.email ? 'Edit' : 'View'}
                      </button>
                      {cap.created_by === session?.user?.email && (
                        <button 
                          onClick={async () => { if(confirm('Delete this plan?')) { await supabase.from('corrective_action_plans').delete().eq('id', cap.id); fetchCaps(); } }} 
                          className="w-10 h-10 flex items-center justify-center rounded-2xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setView('list')} className="flex items-center text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] hover:text-indigo-600 transition-colors">
          <ChevronLeft size={16} className="mr-1" /> Back to Plans
        </button>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setView('list')}
            className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
          >
            {isEditing ? 'Cancel' : 'Close'}
          </button>
          {isEditing && (
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-8 py-2.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{formData.id ? 'Update Strategy' : 'Save Strategy'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto mb-10 px-8">
        {!isEditing && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-8 flex items-center text-amber-700 text-xs font-bold">
            <Activity size={16} className="mr-3 text-amber-500" />
            READ-ONLY VIEW: You are viewing an action plan created by {formData.created_by}.
          </div>
        )}

      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mr-3">
              <Target size={18} />
            </div>
            KPI Identification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pillar</label>
              <div className="text-sm font-bold text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                {formData.pillar || 'Not Specified'}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">KPI Reference</label>
              <div className="text-sm font-bold text-indigo-600 bg-indigo-50/50 px-4 py-3 rounded-xl border border-indigo-100 flex items-center">
                <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] mr-2">{formData.kpi_no}</span>
                {formData.kpi_title}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Program / Scope</label>
              <div className="text-sm font-bold text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                {Array.isArray(formData.program) && formData.program.length > 0 ? formData.program.join(', ') : 'Institution Level'}
              </div>
            </div>
          </div>
        </div>


        {/* Trend Analysis Section */}
        {(formData.trend_data?.length > 0 || trendTableData?.length > 0) && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-slate-50/50 px-8 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center">
                <TrendingUp size={14} className="mr-2 text-indigo-600" />
                Performance Trend Analysis
              </h3>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Historical Evidence</span>
            </div>
            <div className="p-8">
              <MiniTrend 
                data={formData.trend_data?.length > 0 ? formData.trend_data : trendTableData} 
                color="indigo" 
                unit={ (formData.kpi_no === '2.3' || formData.kpi_no === '2.4' || formData.kpi_no === '4.1' || formData.kpi_no === '4.2') ? '' : '%' }
                yMin={0} 
                yMax={getKPIStatus(`KPI ${formData.kpi_no}`, (formData.trend_data?.length > 0 ? formData.trend_data : trendTableData).slice(-1)[0]?.value || 0)?.thresholds.max || 100} 
              />
            </div>
          </div>
        )}

        {/* Benchmarking Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3">
                <Globe size={18} />
              </div>
              University Benchmarking
            </h3>
            {isEditing && (
              <button 
                onClick={() => setFormData({ ...formData, benchmarks: [...(formData.benchmarks || []), { university: '', value: '' }] })}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
              >
                <Plus size={14} className="mr-1" /> Add University
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            {(formData.benchmarks || []).length === 0 ? (
              <p className="text-sm text-slate-400 italic py-4">No benchmark values added. Click "Add University" to include external data in statistics.</p>
            ) : (
              formData.benchmarks.map((b, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex-1">
                    <input 
                      type="text"
                      placeholder="University Name"
                      value={b.university}
                      readOnly={!isEditing}
                      onChange={(e) => {
                        const newB = [...formData.benchmarks];
                        newB[idx].university = e.target.value;
                        setFormData({ ...formData, benchmarks: newB });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="w-32">
                    <input 
                      type="text"
                      placeholder="Value"
                      value={b.value}
                      readOnly={!isEditing}
                      onChange={(e) => {
                        const newB = [...formData.benchmarks];
                        newB[idx].value = e.target.value;
                        setFormData({ ...formData, benchmarks: newB });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  {isEditing && (
                    <button 
                      onClick={() => setFormData({ ...formData, benchmarks: formData.benchmarks.filter((_, i) => i !== idx) })}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Statistics Summary */}
          {stats.benchmarking.mean !== '0.00' && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              {/* External Stats */}
              <div className="bg-blue-50/30 rounded-2xl p-5 border border-blue-100/50 max-w-md">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center">
                  <Globe size={12} className="mr-2" /> External Benchmarking Statistics
                </h4>
                <div className="flex items-center gap-8">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Mean</div>
                    <div className="text-xl font-black text-slate-800">{stats.benchmarking.mean}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">90th Percentile</div>
                    <div className="text-xl font-black text-slate-800">{stats.benchmarking.p90}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Targets & Reflection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mr-3">
              <CalendarIcon size={18} />
            </div>
            Targets & Reflection
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Next Year Target</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Year</label>
                  <select 
                    value={formData.target_next_year}
                    onChange={e => setFormData({ ...formData, target_next_year: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Year</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Value</label>
                  <input 
                    type="text"
                    placeholder="e.g. 85% or 4.2"
                    value={formData.target_next_value}
                    onChange={e => setFormData({ ...formData, target_next_value: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">After 2 Years</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Year</label>
                  <select 
                    value={formData.target_after_two_years}
                    onChange={e => setFormData({ ...formData, target_after_two_years: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Year</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Value</label>
                  <input 
                    type="text"
                    placeholder="e.g. 90% or 4.5"
                    value={formData.target_after_two_value}
                    onChange={e => setFormData({ ...formData, target_after_two_value: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reflection</label>
            {isEditing ? (
              <RichTextEditor 
                value={formData.reflection} 
                onChange={val => setFormData({ ...formData, reflection: val })} 
                className="mt-2"
              />
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl min-h-[150px] text-slate-600 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formData.reflection }} />
            )}
          </div>
        </div>

        {/* Improvement Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3">
                <Plus size={18} />
              </div>
              Improvement Actions
            </h3>
            <button 
              onClick={() => setFormData({ ...formData, actions: [...formData.actions, { id: Date.now(), owner: '', details: '', timeline: [{ year: '', q1: { progress: 0, comment: '' }, q2: { progress: 0, comment: '' }, q3: { progress: 0, comment: '' }, q4: { progress: 0, comment: '' } }] }] })}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline uppercase tracking-widest"
            >
              + Add Action
            </button>
          </div>
          
          <div className="space-y-12">
            {formData.actions.map((action, index) => {
              const tabState = activeTimelineTabs[action.id] || { yearIdx: 0, q: 'q1' };
              const currentYearIdx = tabState.yearIdx;
              const currentQ = tabState.q;
              const currentYearData = action.timeline[currentYearIdx] || action.timeline[0];

              return (
                <div key={action.id} className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm relative group hover:border-indigo-200 transition-all">
                  {isEditing && (
                    <button 
                      onClick={() => setFormData({ ...formData, actions: formData.actions.filter(a => a.id !== action.id) })}
                      className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-md opacity-0 group-hover:opacity-100 transition-all z-10"
                    >
                      <X size={14} />
                    </button>
                  )}

                  {/* Top Level: Strategy & Owner */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
                    <div className="md:col-span-8">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Improvement Strategy</label>
                      <textarea 
                        value={action.details}
                        onChange={e => {
                          const newActions = [...formData.actions];
                          newActions[index].details = e.target.value;
                          setFormData({ ...formData, actions: newActions });
                        }}
                        disabled={!isEditing}
                        placeholder="Define the specific corrective action..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] transition-all"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Strategy Owner</label>
                      <input 
                        type="text" 
                        value={action.owner}
                        onChange={e => {
                          const newActions = [...formData.actions];
                          newActions[index].owner = e.target.value;
                          setFormData({ ...formData, actions: newActions });
                        }}
                        disabled={!isEditing}
                        placeholder="Person/Committee Responsible"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                      
                      {isEditing && (
                        <button 
                          onClick={() => {
                            const newActions = [...formData.actions];
                            newActions[index].timeline.push({ year: '', q1: { progress: 0, comment: '' }, q2: { progress: 0, comment: '' }, q3: { progress: 0, comment: '' }, q4: { progress: 0, comment: '' } });
                            setFormData({ ...formData, actions: newActions });
                            setActiveTimelineTabs({ ...activeTimelineTabs, [action.id]: { yearIdx: newActions[index].timeline.length - 1, q: 'q1' } });
                          }}
                          className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                          <Plus size={14} /> Add Execution Year
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Execution Timeline (Years Tabs) */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {action.timeline.map((t, tIdx) => (
                      <div key={tIdx} className="flex items-center group/year">
                        <button
                          onClick={() => setActiveTimelineTabs({ ...activeTimelineTabs, [action.id]: { yearIdx: tIdx, q: 'q1' } })}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentYearIdx === tIdx ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        >
                          {t.year || `Select Year`}
                        </button>
                        {isEditing && action.timeline.length > 1 && (
                          <button 
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this reporting year and all its quarterly progress data? This action cannot be undone.")) {
                                const newActions = [...formData.actions];
                                newActions[index].timeline.splice(tIdx, 1);
                                setFormData({ ...formData, actions: newActions });
                                setActiveTimelineTabs({ ...activeTimelineTabs, [action.id]: { yearIdx: 0, q: 'q1' } });
                              }
                            }}
                            className="w-5 h-5 -ml-2 mb-4 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 opacity-0 group-hover/year:opacity-100 shadow-sm"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Year Specific Details */}
                  {currentYearData && (
                    <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                      <div className="p-6 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex-1 max-w-[200px]">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Reporting Year</label>
                          <select 
                            value={currentYearData.year}
                            onChange={e => {
                              const newActions = [...formData.actions];
                              newActions[index].timeline[currentYearIdx].year = e.target.value;
                              setFormData({ ...formData, actions: newActions });
                            }}
                            disabled={!isEditing}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select...</option>
                            {[...years].map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>

                        {/* Quarter Tabs */}
                        <div className="flex bg-slate-100 p-1 rounded-2xl min-w-fit">
                          {['q1', 'q2', 'q3', 'q4'].map(q => (
                            <button
                              key={q}
                              onClick={() => setActiveTimelineTabs({ ...activeTimelineTabs, [action.id]: { yearIdx: currentYearIdx, q: q } })}
                              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentQ === q ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              {q.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Execution Details for Selected Year/Quarter */}
                      <div className="p-8">
                        <div className="flex flex-col md:flex-row gap-8">
                          <div className="md:w-1/3">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center">
                              <Activity size={14} className="mr-2 text-indigo-500" />
                              Achievement Level
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {[25, 50, 75, 100].map(p => (
                                <button
                                  key={p}
                                  onClick={() => {
                                    const newActions = [...formData.actions];
                                    newActions[index].timeline[currentYearIdx][currentQ].progress = p;
                                    setFormData({ ...formData, actions: newActions });
                                  }}
                                  disabled={!isEditing}
                                  className={`py-3 rounded-xl text-[11px] font-black transition-all ${currentYearData[currentQ].progress === p ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:border-indigo-200'}`}
                                >
                                  {p}%
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                              {currentQ.toUpperCase()} Implementation Progress Comments
                            </label>
                            <textarea 
                              value={currentYearData[currentQ].comment}
                              onChange={e => {
                                const newActions = [...formData.actions];
                                newActions[index].timeline[currentYearIdx][currentQ].comment = e.target.value;
                                setFormData({ ...formData, actions: newActions });
                              }}
                              disabled={!isEditing}
                              placeholder={`What progress was made in ${currentQ.toUpperCase()}?`}
                              className="w-full bg-white border border-slate-100 rounded-2xl p-5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-h-[140px] shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export function DMUAnalytics({ isPublic = false, session, userMeta }) {
  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [capPrefill, setCapPrefill] = useState(null);

  // --- DASHBOARD FILTERS ---
  const [isPending, startFilterTransition] = useTransition();
  const [selectedPrograms, setSelectedPrograms] = useState(['All']);
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);
  const programDropdownRef = useRef(null);
  const [selectedGradYear, setSelectedGradYear] = useState('All');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('All');
  const [selectedCohort, setSelectedCohort] = useState('All');
  const [selectedCalendarYear, setSelectedCalendarYear] = useState('All');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef(null);

  const [allActionPlans, setAllActionPlans] = useState([]);

  useEffect(() => {
    const fetchAllPlans = async () => {
      const { data, error } = await supabase.from('corrective_action_plans').select('*');
      if (!error) setAllActionPlans(data || []);
    };
    fetchAllPlans();
  }, [activeTab]);

  const selectedProgramsLowerSet = useMemo(() => 
    new Set(selectedPrograms.map(p => p.replace(/['"]/g, '').trim().toLowerCase())), 
  [selectedPrograms]);

  const matchesProgramTokens = useCallback((tokens) => {
    if (selectedPrograms.includes('All')) return true;
    if (!tokens || !Array.isArray(tokens)) return false;
    return tokens.some(t => selectedProgramsLowerSet.has(t));
  }, [selectedPrograms, selectedProgramsLowerSet]);

  const matchesProgram = useCallback((val) => {
    if (selectedPrograms.includes('All')) return true;
    if (!val) return false;
    const parts = String(val).split(',').map(s => s.replace(/['"]/g, '').trim().toLowerCase());
    return parts.some(part => selectedProgramsLowerSet.has(part));
  }, [selectedPrograms, selectedProgramsLowerSet]);
  
  const matchesAnyProgram = useCallback((progList) => {
    if (selectedPrograms.includes('All')) return true;
    if (!progList || !Array.isArray(progList)) return false;
    return progList.some(p => {
       const tokens = String(p).split(',').map(s => s.replace(/['"]/g, '').trim().toLowerCase());
       return tokens.some(t => selectedProgramsLowerSet.has(t));
    });
  }, [selectedPrograms, selectedProgramsLowerSet]);

  const getActionStats = useMemo(() => (kpiNo) => {
    const stats = { p0: 0, p25: 0, p50: 0, p75: 0, p100: 0 };
    
    let periodFilter = 'All';
    if (['1.1', '1.2', '2.4', '2.5', '3.1'].includes(kpiNo)) periodFilter = selectedGradYear;
    else if (['2.2'].includes(kpiNo)) periodFilter = selectedCohort;
    else if (['2.3', '2.6', '3.3', '4.4'].includes(kpiNo)) periodFilter = selectedAcademicYear;
    else if (['4.1', '4.2', '4.3', '4.5', '5.4', '6.1', '6.2'].includes(kpiNo)) periodFilter = selectedCalendarYear;

    const relevantPlans = allActionPlans.filter(p => {
      const matchKpi = p.kpi_no === kpiNo;
      const matchPeriod = periodFilter === 'All' || String(p.target_period) === String(periodFilter);
      return matchKpi && matchPeriod;
    });
    
    const filteredPlans = relevantPlans.filter(plan => {
      let planProgs = [];
      if (Array.isArray(plan.program)) planProgs = plan.program;
      else if (typeof plan.program === 'string' && plan.program) {
        planProgs = plan.program.split(',').map(s => s.trim());
      }
      
      if (selectedPrograms.includes('All')) {
        return planProgs.length === 0 || planProgs.includes('All') || planProgs.includes('Institution Level');
      }
      return planProgs.some(pg => matchesProgram(pg));
    });

    filteredPlans.forEach(plan => {
      if (plan && Array.isArray(plan.actions)) {
        plan.actions.forEach(action => {
          let maxProgress = 0;
          if (action && Array.isArray(action.timeline)) {
            action.timeline.forEach(year => {
              if (year && typeof year === 'object') {
                ['q1','q2','q3','q4'].forEach(q => {
                  const prog = parseInt(year[q]?.progress) || 0;
                  if (prog > maxProgress) maxProgress = prog;
                });
              }
            });
          }
          if (maxProgress === 0) stats.p0++;
          else if (maxProgress === 25) stats.p25++;
          else if (maxProgress === 50) stats.p50++;
          else if (maxProgress === 75) stats.p75++;
          else if (maxProgress === 100) stats.p100++;
        });
      }
    });
    return stats;
  }, [allActionPlans, selectedPrograms, selectedGradYear, selectedAcademicYear, selectedCohort, selectedCalendarYear, matchesProgram]);

  const shouldRenderKPI = useCallback((tag, data, isProg) => {
    if (!data) return false;
    if (selectedStatuses.length === 0) return true;
    const status = getKPIStatus(tag, data.value, isProg);
    return selectedStatuses.includes(status?.label);
  }, [selectedStatuses]);

  const handleAddActionPlan = useCallback((kpiNo, kpiTitle, period, trend) => {
    const finalProgs = selectedPrograms.includes('All') ? [] : selectedPrograms;
    setCapPrefill({ 
      kpi_no: kpiNo, 
      kpi_title: kpiTitle, 
      programs: finalProgs, 
      period: period, 
      trendData: trend 
    });
    setActiveTab('corrective-action');
  }, [selectedPrograms]);
  
  // --- DATA STATE ---
  const [documents, setDocuments] = useState([]);
  const [folderId, setFolderId] = useState(DEFAULT_FOLDER_ID);
  
  // --- MODAL STATE ---
  const [modalContent, setModalContent] = useState(null);

  // --- SYNC STATE ---
  const [authError, setAuthError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);



  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (programDropdownRef.current && !programDropdownRef.current.contains(event.target)) {
        setShowProgramDropdown(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);




  useEffect(() => {
    if (GOOGLE_API_KEY && GOOGLE_API_KEY !== "YOUR_GOOGLE_API_KEY_HERE") {
      syncDriveFolder();
    } else {
      setAuthError("Developer Setup Required: Please paste your Google API Key into the code.");
    }
  }, [folderId]);

  // --- GOOGLE DRIVE SYNC LOGIC ---
  const syncDriveFolder = async (force = false) => {
    if (!folderId) return;
    setIsSyncing(true);
    setAuthError('');

    const todayStr = new Date().toLocaleDateString();
    if (!force) {
      const lastSync = localStorage.getItem('lastDriveSyncDate');
      if (lastSync === todayStr) {
        console.log('[DMU Analytics] Data already synced today. Loading from local IndexedDB cache...');
        const cachedRecords = await getAllCachedFiles();
        if (cachedRecords && cachedRecords.length > 0) {
          const fetchedDocs = [];
          cachedRecords.forEach(rec => {
            if (rec && rec.docs) fetchedDocs.push(...rec.docs);
          });
          if (fetchedDocs.length > 0) {
            setDocuments(fetchedDocs);
            setIsSyncing(false);
            console.log('[DMU Analytics] Wrote cached files from IndexedDB into memory successfully!');
            return;
          }
        }
        console.log('[DMU Analytics] No local cache found, falling back to full drive sync.');
      }
    }

    console.log('[DMU Analytics] Starting Drive Sync for Folder (Force=' + force + '):', folderId);
    try {
      const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType!='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name,mimeType,modifiedTime)&key=${GOOGLE_API_KEY}`;
      const listRes = await fetch(listUrl);
      
      if (!listRes.ok) throw new Error(`Drive API Error: ${listRes.status} - Ensure folder is public.`);
      
      const listData = await listRes.json();
      const fetchedDocs = [];
      const skippedFiles = [];
      
      // Fetch all files concurrently to vastly improve sync speed
      const fetchPromises = listData.files.map(async (file) => {
        try {
          // 1. FAST LOCAL CACHE CHECK
          const cached = await getCachedFile(file.id);
          if (cached && cached.lastModified === file.modifiedTime) {
            console.log(`[DMU Analytics] Fast Load: ${file.name} loaded from local IndexedDB cache.`);
            return cached.docs; // Return array of generated docs
          }

          let generatedDocs = [];
          let contentUrl = '';
          if (file.mimeType === 'application/vnd.google-apps.document') {
            contentUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain&key=${GOOGLE_API_KEY}`;
          } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
            if (file.name.toLowerCase().includes('cohort analysis')) {
              try {
                // Export entire spreadsheet as XLSX to get ALL sheets in one request
                const xlsxUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&key=${GOOGLE_API_KEY}`;
                const xlsxRes = await fetch(xlsxUrl);
                if (xlsxRes.ok) {
                  const arrayBuffer = await xlsxRes.arrayBuffer();
                  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                  console.log('[DMU Analytics] XLSX loaded. Sheet names:', workbook.SheetNames);
                  
                  // Find enrollment sheet (first sheet or one with 'enrollment'/'enrol' in name)
                  const enrollSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('enrollment')) 
                    || workbook.SheetNames.find(n => n.toLowerCase().includes('enrol'))
                    || workbook.SheetNames[0];
                  
                  if (enrollSheetName) {
                    const csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets[enrollSheetName]);
                    console.log('[DMU Analytics] Enrollment sheet:', enrollSheetName, 'rows ~', csvContent.split('\n').length);
                    generatedDocs.push({
                      id: file.id + '_enrollment',
                      name: file.name + ' - Enrollment',
                      type: 'csv',
                      content: csvContent,
                      lastModified: file.modifiedTime
                    });
                  }
                  
                  // Find attrition sheet by name
                  const attSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('attrition'))
                    || workbook.SheetNames.find(n => n.toLowerCase().includes('attrit'));
                  
                  if (attSheetName) {
                    const csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets[attSheetName]);
                    console.log('[DMU Analytics] Attrition sheet:', attSheetName, 'rows ~', csvContent.split('\n').length);
                    generatedDocs.push({
                      id: file.id + '_attrition',
                      name: file.name + ' - Attrition',
                      type: 'csv',
                      content: csvContent,
                      lastModified: file.modifiedTime
                    });
                  } else {
                    console.warn('[DMU Analytics] No attrition sheet found in:', workbook.SheetNames);
                  }
                } else {
                  console.warn('[DMU Analytics] XLSX export failed, status:', xlsxRes.status);
                }
                
                await cacheFile({ id: file.id, lastModified: file.modifiedTime, docs: generatedDocs });
                return generatedDocs;
              } catch (e) {
                console.warn('[DMU Analytics] Cohort Analysis XLSX parse failed, falling back to CSV', e);
                contentUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/csv&key=${GOOGLE_API_KEY}`;
              }
            } else if (file.name.toLowerCase().includes('exit survey') && file.name.toLowerCase().includes('questionnaire')) {
              // Export Exit Survey QUESTIONNAIRE as XLSX + JSON to preserve exact cell values
              try {
                const xlsxUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&key=${GOOGLE_API_KEY}`;
                const xlsxRes = await fetch(xlsxUrl);
                if (xlsxRes.ok) {
                  const arrayBuffer = await xlsxRes.arrayBuffer();
                  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                  const sheetName = workbook.SheetNames[0];
                  const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
                  console.log('[DMU Analytics] Exit Survey QUESTIONNAIRE XLSX→JSON loaded, rows:', jsonData.length);
                  if (jsonData.length > 0) console.log('[DMU Analytics] Exit Survey JSON first row keys:', Object.keys(jsonData[0]).slice(0, 5));
                  generatedDocs.push({
                    id: file.id,
                    name: file.name,
                    type: 'json',
                    content: jsonData,
                    lastModified: file.modifiedTime
                  });
                  await cacheFile({ id: file.id, lastModified: file.modifiedTime, docs: generatedDocs });
                  return generatedDocs;
                }
              } catch (e) {
                console.warn('[DMU Analytics] Exit Survey XLSX parse failed, falling back to CSV', e);
              }
              contentUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/csv&key=${GOOGLE_API_KEY}`;
            } else {
              contentUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/csv&key=${GOOGLE_API_KEY}`;
            }
          } else if (file.mimeType.startsWith('text/') || file.name.endsWith('.csv')) {
            contentUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${GOOGLE_API_KEY}`;
          } else {
            skippedFiles.push(file.name);
            return null;
          }

          const contentRes = await fetch(contentUrl);
          if (!contentRes.ok) throw new Error(`Failed to fetch content`);
          const text = await contentRes.text();
          
          generatedDocs.push({
            id: file.id,
            name: file.name,
            content: text,
            type: file.mimeType === 'application/vnd.google-apps.spreadsheet' || file.name.endsWith('.csv') ? 'csv' : 'text',
            size: text.length,
            lastModified: file.modifiedTime
          });
          
          await cacheFile({ id: file.id, lastModified: file.modifiedTime, docs: generatedDocs });
          return generatedDocs;
        } catch (e) {
          console.error(`Error fetching ${file.name}:`, e);
          return null;
        }
      });

      // Wait for all concurrent downloads to finish
      const results = await Promise.all(fetchPromises);
      
      // Combine all generated documents
      results.forEach(docsArray => {
        if (docsArray && Array.isArray(docsArray)) {
          fetchedDocs.push(...docsArray);
        }
      });
      
      if (fetchedDocs.length > 0) {
        setDocuments(fetchedDocs);
        localStorage.setItem('lastDriveSyncDate', todayStr);
        if (skippedFiles.length > 0) {
          setAuthError(`Synced ${fetchedDocs.length} files. Skipped unsupported formats: ${skippedFiles.join(', ')}.`);
        }
      } else {
        setAuthError("No readable files found in this folder.");
      }
    } catch (error) {
      setAuthError(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const removeDocument = (id) => setDocuments(prev => prev.filter(doc => doc.id !== id));



  // --- PARSED DOCUMENTS CACHE ---
  // Smart Pre-parsing & Indexing: Normalizes data ONCE when documents load
  const parsedDocs = useMemo(() => {
    if (!documents || documents.length === 0) return {};
    console.log('[DMU Analytics] Smart Indexing', documents.length, 'documents...');
    const cache = {};
    documents.forEach(doc => {
      try {
        if (doc.type === 'csv') {
          const parsed = parseCSV(doc.content);
          const { headers, data } = parsed;
          
          // Identify key columns for pre-normalization
          const pCol = headers.find(h => h === 'program' || h === 'major' || h.includes('program') || h.includes('major'));
          const yCol = headers.find(h => h.includes('graduation') || h.includes('cohort') || h === 'academic_year' || h.includes('calendar') || h.includes('year'));
          const idCol = headers.find(h => h === 'id' || h.includes('student_id') || h.includes('employee_id'));

          // Pre-process every row once to create high-speed search tokens
          data.forEach(row => {
            if (pCol) {
              const val = String(row[pCol] || 'Unknown').trim();
              row._p = normalizeProgramName(val);
              row._tokens = val.split(',').map(s => s.replace(/['"]/g, '').trim().toLowerCase());
            }
            if (yCol) {
              row._y = String(row[yCol] || '').replace(/\.0$/, '').trim();
            }
            if (idCol) {
              row._id = normalizeId(row[idCol]);
            }
          });
          cache[doc.id] = parsed;
        } else if (doc.type === 'json') {
          cache[doc.id] = { headers: [], data: doc.content };
        }
      } catch (e) {
        console.error(`Error pre-parsing ${doc.name}:`, e);
      }
    });
    return cache;
  }, [documents]);

  // --- STUDENT METADATA CACHE ---
  const studentMetaMap = useMemo(() => {
    const map = {};
    const studentsDoc = documents.find(d => d.type === 'csv' && d.name && (d.name.toLowerCase().includes('dmu student') || d.name.toLowerCase().includes('student')));
    if (studentsDoc && parsedDocs[studentsDoc.id]) {
      const { headers: sh, data: sd } = parsedDocs[studentsDoc.id];
      
      const findFuzzyCol = (targets) => {
        const normalizedHeaders = sh.map(h => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
        for (const t of targets) {
          const nt = t.toLowerCase().replace(/[^a-z0-9]/g, '');
          const idx = normalizedHeaders.findIndex(nh => nh && (nh === nt || nh.includes(nt)));
          if (idx !== -1) return sh[idx];
        }
        return null;
      };

      const sIdCol = sh.find(h => h === 'ID' || h.toLowerCase() === 'id' || h.toLowerCase() === 'student_id') || sh[0];
      const sNameCol = sh.find(h => h === 'Name' || h.toLowerCase() === 'name') || sh[1];
      const sEmailCol = findFuzzyCol(['Personal_Email', 'Email_ID', 'email', 'personalemail', 'emailid']);
      const sMobileCol = findFuzzyCol(['Enroll_Student_Mobile_Number', 'mobile', 'phone', 'mobilenumber', 'enrollstudentmobilenumber']);
      
      sd.forEach(row => {
        if (row._id) {
          map[row._id] = {
            id: row[sIdCol],
            name: row[sNameCol],
            email: sEmailCol ? (row[sEmailCol] || 'N/A') : 'N/A',
            mobile: sMobileCol ? (row[sMobileCol] || 'N/A') : 'N/A'
          };
        }
      });
    }
    return map;
  }, [documents, parsedDocs]);

  // --- DASHBOARD KPI DATA PROCESSING ---
  const [isCalculatingData, setIsCalculatingData] = useState(false);
  const [dashboardData, setDashboardData] = useState({ records: [], programs: [], cohorts: [], gradYears: [], academicYears: [], stats: null, docName: null });

  useEffect(() => {
    setIsCalculatingData(true);
    const timerId = setTimeout(() => {
      try {
        const compute = () => {
          if (!documents || documents.length === 0) {
            return { records: [], programs: [], cohorts: [], gradYears: [], academicYears: [], stats: null, docName: null };
          }

    const getParsed = (id) => parsedDocs[id] || { headers: [], data: [] };


      // 1. Target the correct sheets
      const alumniDoc = documents.find(d => d.type === 'csv' && d.name?.toLowerCase().includes('alumni')) 
                    || documents.find(d => d.type === 'csv' && d.name && !d.name.toLowerCase().includes('preceptor') && !d.name.toLowerCase().includes('cohort') && !d.name.toLowerCase().includes('research'));
      const preceptorDoc = documents.find(d => d.type === 'csv' && d.name && (d.name.toLowerCase().includes('preceptor') || d.name.toLowerCase().includes('evaluation by preceptors')));



      let alumniResult = {
        totalAlumni: 0, responseRate: 0, 
        kpi11: { denominator: 0, numerator: 0, value: 0 },
        kpi12: { denominator: 0, numerator: 0, value: 0 },
        kpi24: { denominator: 0, value: 0 },
        kpi25: { denominator: 0, numerator: 0, value: 0 },
        kpi31: { denominator: 0, numerator: 0, value: 0 },
        programs: [],
        gradYears: [],
        chartData: []
      };

      if (alumniDoc) {
      const { headers, data } = getParsed(alumniDoc.id);
      const programCol = headers.find(h => h === 'program') || headers.find(h => h === 'major') || headers.find(h => h.includes('program') || h.includes('major')) || headers[0];
      const gradYearCol = headers.find(h => h === 'graduation_year' || h === 'graduation year') 
                       || headers.find(h => h.includes('graduation')) 
                       || headers[13] 
                       || headers.find(h => h.includes('cohort'));
      const workingCol = headers.find(h => h === 'working' || h.includes('working')) || null;
      const studyingCol = headers.find(h => h === 'studying' || h.includes('studying')) || null;
      const relevantJobCol = headers.find(h => h.includes('relevant') && h.includes('job')) || null;
      const licensingCol = headers.find(h => h.includes('licensed_in_your_pro')) || null;
      const workPlacementCol = headers.find(h => h.includes('offer_from_workplacement')) || null;
      
      const idCol = headers.find(h => h === 'id' || h.includes('employee_id') || h.includes('student_id')) || headers[0];
      const nameCol = headers.find(h => h === 'name' || h.includes('name')) || headers[1];
      const emailCol = headers.find(h => h === 'email' || h.includes('email')) || headers[2];
      const mobileCol = headers.find(h => h.includes('mobile') || h.includes('phone') || h.includes('number')) || headers[3];
      const licensedByCol = headers.find(h => h.includes('licensed_by')) || 'licensed_by';
      const glcCntCol = headers.find(h => h.includes('glc_cnt')) || 'glc_cnt';
      const glcDateCol = headers.find(h => h.includes('glc_date')) || 'glc_date';
      const glcLcCol = headers.find(h => h.includes('glc_lc') && !h.includes('name')) || 'glc_lc';
      const glcLcNameCol = headers.find(h => h.includes('glc_lc_name')) || 'glc_lc_name';
      
      const employerNameCol = headers.find(h => h.includes('employer_name')) || 'employer_name';
      const workLocationCol = headers.find(h => h.includes('work_location')) || 'work_location';
      const studyInstCol = headers.find(h => h.includes('study_institution')) || 'study_institution';
      const studyCountryCol = headers.find(h => h.includes('studying_country')) || 'studying_country';

      const lineManagerNameCol = headers.find(h => h.toLowerCase().includes('line_manager') && h.toLowerCase().includes('name')) || headers.find(h => h.toLowerCase().includes('line') && h.toLowerCase().includes('name')) || 'line_manager_name';
      const lineManagerDesCol = headers.find(h => h.toLowerCase().includes('line_manager_designation')) || headers.find(h => h.toLowerCase().includes('designation')) || 'line_manager_designation';
      const lineManagerDeptCol = headers.find(h => h.toLowerCase().includes('line_manager_department')) || headers.find(h => h.toLowerCase().includes('department')) || 'line_manager_department';
      const lineManagerEmailCol = headers.find(h => h.toLowerCase().includes('line_manager_email')) || headers.find(h => h.toLowerCase().includes('email')) || 'line_manager_email';
      const lineManagerMobileCol = headers.find(h => h.toLowerCase().includes('line_manager_mobile_no')) || headers.find(h => h.toLowerCase().includes('mobile')) || 'line_manager_mobile_no';

      const skillCols = ['technical_skills_1', 'technical_skills_2', 'soft_skills_1', 'soft_skills_2', 'preparedness_1', 'preparedness_2', 'adaptability_1', 'adaptability_2'];
      const foundSkillCols = skillCols.map(sc => headers.find(h => h.toLowerCase().includes(sc.toLowerCase()))).filter(Boolean);
      const tech1Col = headers.find(h => h.toLowerCase().includes('technical_skills_1'));

      const validAlumni = data.filter(row => row[gradYearCol] && Object.values(row).length > 2);
      
      alumniResult.programs = [...new Set(validAlumni.map(r => r._p))].filter(Boolean).sort();
      alumniResult.gradYears = [...new Set(validAlumni.map(r => String(r[gradYearCol]||'').replace(/\.0$/, '').trim()))].filter(Boolean).sort((a, b) => String(b).localeCompare(String(a)));
      alumniResult.records = validAlumni;

      const filteredAlumni = validAlumni.filter(row => {
        const matchProgram = matchesProgramTokens(row._tokens);
        const ry = String(row[gradYearCol]||'').replace(/\.0$/, '').trim();
        const matchGradYear = selectedGradYear === 'All' || ry === selectedGradYear;
        return matchProgram && matchGradYear;
      });

      const isResponse = (row) => {
        const workVal = workingCol ? String(row[workingCol] || '').trim() : '';
        const studyVal = studyingCol ? String(row[studyingCol] || '').trim() : '';
        return workVal !== '' || studyVal !== '';
      };

      const isEmployedOrStudying = (row) => {
        const workVal = workingCol ? String(row[workingCol] || '').toLowerCase().trim() : '';
        const studyVal = studyingCol ? String(row[studyingCol] || '').toLowerCase().trim() : '';
        const isActive = (v) => v !== '' && v !== 'no' && v !== 'n/a' && v !== 'none' && v !== 'false' && v !== '-' && v !== '0';
        return isActive(workVal) || isActive(studyVal);
      };

      const isWorking = (row) => {
        const workVal = workingCol ? String(row[workingCol] || '').toLowerCase().trim() : '';
        const isActive = (v) => v !== '' && v !== 'no' && v !== 'n/a' && v !== 'none' && v !== 'false' && v !== '-' && v !== '0';
        return isActive(workVal);
      };

      let responseCount = 0;
      let employedCount = 0;
      let workingCount = 0;
      let relevantYesCount = 0;
      let relevantTotalCount = 0;
      let licenseYesCount = 0;
      let licenseTotalCount = 0;
      let offerYesCount = 0;
      let offerTotalCount = 0;
      let totalEmployerScoreSum = 0;
      let employerResponseCount = 0;

      filteredAlumni.forEach(row => {
        if (isResponse(row)) {
          responseCount++;
          if (isEmployedOrStudying(row)) employedCount++;
          if (isWorking(row)) workingCount++;
        }
        if (relevantJobCol) {
          const relVal = String(row[relevantJobCol] || '').toLowerCase().trim();
          if (relVal === 'yes') { relevantYesCount++; relevantTotalCount++; }
          else if (relVal === 'no') { relevantTotalCount++; }
        }
        if (licensingCol) {
          const licVal = String(row[licensingCol] || '').toUpperCase().trim();
          if (licVal === 'EP') { licenseYesCount++; licenseTotalCount++; }
          else if (licVal === 'IP' || licVal === 'UN') { licenseTotalCount++; }
        }
        if (workPlacementCol) {
          const offVal = String(row[workPlacementCol] || '').toLowerCase().trim();
          if (offVal === 'yes') { offerYesCount++; offerTotalCount++; }
          else if (offVal === 'no') { offerTotalCount++; }
        }
        if (foundSkillCols.length > 0) {
          let rowScoreSum = 0;
          let rowScoreCount = 0;
          foundSkillCols.forEach(col => {
            const val = parseFloat(row[col]);
            if (!isNaN(val)) { rowScoreSum += val; rowScoreCount++; }
          });
          if (rowScoreCount > 0) { totalEmployerScoreSum += (rowScoreSum / rowScoreCount); employerResponseCount++; }
        }
      });

      const getLicenseStatus = (val) => {
        const v = String(val || '').toUpperCase().trim();
        if (v === 'EP') return 'Licensed';
        if (v === 'IP') return 'In Process';
        if (v === 'UN') return 'Unknown';
        return v || 'N/A';
      };

      const licensedList = filteredAlumni.filter(row => {
        if (!licensingCol) return false;
        const licVal = String(row[licensingCol] || '').toUpperCase().trim();
        return licVal === 'EP'; 
      }).map(row => ({
        ...row,
        id: row[idCol],
        name: row[nameCol],
        email: row[emailCol],
        mobile: row[mobileCol],
        program: row[programCol],
        licensedBy: row[licensedByCol],
        glcCnt: row[glcCntCol],
        glcDate: row[glcDateCol],
        glcLc: row[glcLcCol],
        glcLcName: row[glcLcNameCol],
        licenseStatus: 'Licensed'
      }));

      const mapAlumniRow = (row) => ({
        ...row,
        id: row[idCol],
        name: row[nameCol],
        email: row[emailCol],
        mobile: row[mobileCol],
        program: row[programCol],
        workingStudying: isEmployedOrStudying(row) ? 'Yes' : 'No',
        employer: row[employerNameCol],
        workLocation: row[workLocationCol],
        studyInstitution: row[studyInstCol],
        studyCountry: row[studyCountryCol],
        relevant: row[relevantJobCol],
        offer: row[workPlacementCol],
        licenseStatus: licensingCol ? getLicenseStatus(row[licensingCol]) : 'N/A'
      });

      const mapEmployerRow = (row) => ({
        ...row,
        lineManagerName: row[lineManagerNameCol],
        employerName: row[employerNameCol],
        designation: row[lineManagerDesCol],
        department: row[lineManagerDeptCol],
        email: row[lineManagerEmailCol],
        mobile: row[lineManagerMobileCol]
      });

      const employerList = filteredAlumni.filter(row => {
        const val = tech1Col ? String(row[tech1Col] || '').trim() : '';
        return val !== '';
      }).map(mapEmployerRow);

      const respondentList = filteredAlumni.filter(row => isResponse(row)).map(mapAlumniRow);
      const relevantList = filteredAlumni.filter(row => {
        const v = String(row[relevantJobCol] || '').toLowerCase().trim();
        return v === 'yes' || v === 'no';
      }).map(mapAlumniRow);
      const offerList = filteredAlumni.filter(row => {
        const v = String(row[workPlacementCol] || '').toLowerCase().trim();
        return v === 'yes' || v === 'no';
      }).map(mapAlumniRow);

      const relevantYesList = filteredAlumni.filter(row => {
        const v = String(row[relevantJobCol] || '').toLowerCase().trim();
        return v === 'yes';
      }).map(mapAlumniRow);

      const alumniList = filteredAlumni.map(mapAlumniRow);
      const employedList = filteredAlumni.filter(row => isResponse(row) && isEmployedOrStudying(row)).map(mapAlumniRow);
      const workingList = filteredAlumni.filter(row => isResponse(row) && isWorking(row)).map(mapAlumniRow);

      alumniResult.totalAlumni = filteredAlumni.length;
      alumniResult.totalAlumniList = alumniList;
      alumniResult.workingCount = workingCount;
      alumniResult.workingList = workingList;
      alumniResult.responseRate = alumniResult.totalAlumni > 0 ? ((responseCount / alumniResult.totalAlumni) * 100).toFixed(1) : 0;
      alumniResult.kpi11 = { 
        denominator: responseCount, 
        numerator: employedCount, 
        value: responseCount > 0 ? ((employedCount / responseCount) * 100).toFixed(1) : 0,
        respondentList: respondentList,
        employedList: employedList
      };
      alumniResult.kpi12 = { 
        denominator: relevantTotalCount, 
        numerator: relevantYesCount, 
        value: relevantTotalCount > 0 ? ((relevantYesCount / relevantTotalCount) * 100).toFixed(1) : 0,
        relevantList: relevantList,
        relevantYesList: relevantYesList
      };
      alumniResult.kpi24 = { 
        denominator: employerResponseCount, 
        value: employerResponseCount > 0 ? (totalEmployerScoreSum / employerResponseCount).toFixed(1) : 0,
        employerList: employerList
      };
      const kpi25Respondents = filteredAlumni.filter(row => {
        if (!licensingCol) return false;
        const licVal = String(row[licensingCol] || '').toUpperCase().trim();
        return licVal === 'EP' || licVal === 'IP' || licVal === 'UN';
      }).map(mapAlumniRow);

      alumniResult.kpi25 = { 
        denominator: licenseTotalCount, 
        numerator: licenseYesCount, 
        value: licenseTotalCount > 0 ? ((licenseYesCount / licenseTotalCount) * 100).toFixed(1) : 0,
        responseRate: alumniResult.totalAlumni > 0 ? ((licenseTotalCount / alumniResult.totalAlumni) * 100).toFixed(1) : 0,
        respondentList: kpi25Respondents,
        licensedList: licensedList 
      };
      alumniResult.kpi31 = { 
        denominator: offerTotalCount, 
        numerator: offerYesCount, 
        value: offerTotalCount > 0 ? ((offerYesCount / offerTotalCount) * 100).toFixed(1) : 0,
        offerList: offerList
      };

      // --- TREND: Alumni KPIs per Graduation Year (filtered only by Program) ---
      const programAlumni = validAlumni.filter(row => matchesProgram(row[programCol]));
      const yearGroups = {};
      programAlumni.forEach(row => {
        const yr = row[gradYearCol];
        if (!yr) return;
        if (!yearGroups[yr]) yearGroups[yr] = [];
        yearGroups[yr].push(row);
      });
      const sortedYears = Object.keys(yearGroups).sort();
      alumniResult.trends = {
        kpi11: sortedYears.map(yr => {
          const rows = yearGroups[yr]; let resp = 0, emp = 0;
          rows.forEach(r => { if (isResponse(r)) { resp++; if (isEmployedOrStudying(r)) emp++; } });
          return { year: yr, value: parseFloat((resp > 0 ? (emp / resp * 100) : 0).toFixed(1)) };
        }),
        kpi12: sortedYears.map(yr => {
          const rows = yearGroups[yr]; let yes = 0, tot = 0;
          rows.forEach(r => { if (relevantJobCol) { const v = String(r[relevantJobCol]||'').toLowerCase().trim(); if (v==='yes'){yes++;tot++;}else if(v==='no'){tot++;} }});
          return { year: yr, value: parseFloat((tot > 0 ? (yes / tot * 100) : 0).toFixed(1)) };
        }),
        kpi24: sortedYears.map(yr => {
          const rows = yearGroups[yr]; let sum = 0, cnt = 0;
          rows.forEach(r => { if (foundSkillCols.length > 0) { let rs=0,rc=0; foundSkillCols.forEach(c=>{const v=parseFloat(r[c]);if(!isNaN(v)){rs+=v;rc++;}}); if(rc>0){sum+=rs/rc;cnt++;} }});
          return { year: yr, value: parseFloat((cnt > 0 ? (sum / cnt) : 0).toFixed(1)) };
        }),
        kpi25: sortedYears.map(yr => {
          const rows = yearGroups[yr]; let yes = 0, tot = 0;
          rows.forEach(r => { if (licensingCol) { const v = String(r[licensingCol]||'').toUpperCase().trim(); if(v==='EP'){yes++;tot++;}else if(v==='IP'){tot++;} }});
          return { year: yr, value: parseFloat((tot > 0 ? (yes / tot * 100) : 0).toFixed(1)) };
        }),
        kpi31: sortedYears.map(yr => {
          const rows = yearGroups[yr]; let yes = 0, tot = 0;
          rows.forEach(r => { if (workPlacementCol) { const v = String(r[workPlacementCol]||'').toLowerCase().trim(); if(v==='yes'){yes++;tot++;}else if(v==='no'){tot++;} }});
          return { year: yr, value: parseFloat((tot > 0 ? (yes / tot * 100) : 0).toFixed(1)) };
        })
      };
      console.log('[DMU Analytics] Trends computed:', { gradYears: sortedYears, kpi11pts: alumniResult.trends.kpi11.length, kpi12pts: alumniResult.trends.kpi12.length });
    }

    // --- PRECEPTOR DATA PROCESSING (KPI 2.3) ---
    let kpi23Data = { denominator: 0, value: 0 };
    let pAcademicYears = [];
    if (preceptorDoc) {
      const { headers, data } = parseCSV(preceptorDoc.content);
      const pProgCol = headers.find(h => h === 'program') || headers.find(h => h.includes('program')) || headers[0];
      const pAcadCol = headers.find(h => h.includes('academic') || h.includes('year')) || headers[1];
      const pPreceptorNameCol = headers.find(h => h.toLowerCase().includes('preceptor_name')) || 'preceptor_name';
      const pPreceptorDesCol = headers.find(h => h.toLowerCase().includes('preceptor_designation')) || 'preceptor_designation';
      const pPreceptorEmailCol = headers.find(h => h.toLowerCase().includes('preceptor_email')) || 'preceptor_email';
      const pHospitalCol = headers.find(h => h.toLowerCase().includes('hospital')) || 'hospital';
      const pStudentIdCol = headers.find(h => h.toLowerCase().includes('student_id')) || 'student_id';
      const pStudentNameCol = headers.find(h => h.toLowerCase().includes('student_name')) || 'student_name';
      const pStudentEmailCol = headers.find(h => h.toLowerCase().includes('student_email')) || 'student_email';
      const pCollegeCol = headers.find(h => h.toLowerCase().includes('college')) || 'college';
      
      const pQCols = headers.reduce((acc, h, i) => {
        if (h.match(/^q[1-8]/) || h.includes('question')) acc.push(h);
        return acc;
      }, []).slice(0, 8);

      pAcademicYears = [...new Set(data.map(r => r[pAcadCol]))].filter(Boolean).sort().reverse();

      const filteredP = data.filter(r => {
        const progMatch = matchesProgram(r[pProgCol]);
        const acadMatch = matchAcademicYear(r[pAcadCol], selectedAcademicYear);
        return progMatch && acadMatch;
      });

      let pTotalScore = 0;
      let pScoreCount = 0;

      filteredP.forEach(r => {
        let rowScores = [];
        pQCols.forEach(col => {
          const val = parseFloat(r[col]);
          if (!isNaN(val)) rowScores.push(val);
        });
        if (rowScores.length > 0) {
          pTotalScore += rowScores.reduce((a, b) => a + b, 0) / rowScores.length;
          pScoreCount++;
        }
      });

      kpi23Data = {
        denominator: pScoreCount,
        value: pScoreCount > 0 ? (pTotalScore / pScoreCount).toFixed(2) : 0,
        respondentList: filteredP.filter(r => {
          let rowScores = [];
          pQCols.forEach(col => {
            const val = parseFloat(r[col]);
            if (!isNaN(val)) rowScores.push(val);
          });
          return rowScores.length > 0;
        }).map(r => ({
          ...r,
          academicYear: r[pAcadCol],
          preceptorName: r[pPreceptorNameCol],
          preceptorDesignation: r[pPreceptorDesCol],
          preceptorEmail: r[pPreceptorEmailCol],
          hospital: r[pHospitalCol],
          studentId: r[pStudentIdCol],
          studentName: r[pStudentNameCol],
          studentEmail: r[pStudentEmailCol],
          program: r[pProgCol],
          college: r[pCollegeCol]
        }))
      };

      // --- TREND: KPI 2.3 per Academic Year (filtered only by Program) ---
      const pProgFiltered = data.filter(r => matchesProgram(r[pProgCol]));
      const pYearGroups = {};
      pProgFiltered.forEach(r => {
        const yr = normalizeAcademicYear(r[pAcadCol]);
        if (!yr) return;
        if (!pYearGroups[yr]) pYearGroups[yr] = [];
        pYearGroups[yr].push(r);
      });
      kpi23Data.trend = Object.keys(pYearGroups).sort().map(yr => {
        const rows = pYearGroups[yr]; let sum = 0, cnt = 0;
        rows.forEach(r => {
          let rs = []; pQCols.forEach(c => { const v = parseFloat(r[c]); if (!isNaN(v)) rs.push(v); });
          if (rs.length > 0) { sum += rs.reduce((a,b) => a+b, 0) / rs.length; cnt++; }
        });
        return { year: yr.replace(/\d{2}(\d{2})\/\d{2}(\d{2})/, '$1/$2'), value: parseFloat((cnt > 0 ? sum / cnt : 0).toFixed(2)) };
      });
    }

    // 3. Merge Programs from multiple sheets for filter
    let pProgs = [];
    if (preceptorDoc) {
      const { headers: ph, data: pd } = parseCSV(preceptorDoc.content);
      const pCol = ph.find(h => h.includes('program')) || ph[0];
      pProgs = pd.map(r => normalizeProgramName(r[pCol]));
    }
    
    let eProgs = [];
    let enrollmentDiag = "No data";
    const enrollmentDoc = documents.find(d => d.type === 'csv' && d.name.toLowerCase().includes('cohort analysis'));
    
    let combinedAcademicYears = [...pAcademicYears];
    let eCohorts = [];
    let totalStudents = 0;
    let kpi22Data = { denominator: 0, numerator: 0, value: 0 };

    if (enrollmentDoc) {
      const { headers: eh, data: ed } = parseCSV(enrollmentDoc.content);
      const mCol = eh.find(h => h === 'major') || eh.find(h => h === 'program') || eh.find(h => h.includes('std_30_student_major')) || eh.find(h => h.includes('major')) || eh.find(h => h.includes('program')) || eh.find(h => h.includes('degree'));
      const aCol = eh.find(h => h === 'academic_year') || eh.find(h => h.includes('std_03_academic_period')) || eh.find(h => h.includes('academic') || h.includes('year'));
      const sCol = eh.find(h => h === 'ID' || h.toLowerCase().includes('std_04_student_id')) || eh.find(h => h.toLowerCase().includes('student_id')) || eh[0];
      
      const yearCol = eh.find(h => h.includes('std_21_current_year')) || eh.find(h => h.includes('current_year')) || eh.find(h => h.includes('year_of_study')) || eh.find(h => h.includes('level'));
      const cohortCol = eh.find(h => {
        const nh = String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return nh === 'batch' || nh === 'cohort' || nh === 'std18cohort' || nh.includes('cohort');
      }) || eh[eh.length - 1];
      
      eProgs = ed.map(r => normalizeProgramName(r[mCol]));
      enrollmentDiag = `ID: ${sCol}, Major: ${mCol}, CohortCol: ${cohortCol}, Headers: ${eh.slice(0, 5).join(',')}`;

      // Merge years from enrollment too
      const eAcademicYears = [...new Set(ed.map(r => normalizeAcademicYear(r[aCol])))].filter(Boolean);
      combinedAcademicYears = [...new Set([...combinedAcademicYears.map(normalizeAcademicYear), ...eAcademicYears])].filter(Boolean).sort().reverse();


      const attritionDoc = documents.find(d => d.id.endsWith('_attrition'));

      const programFilteredEnrollment = ed.filter(r => matchesProgram(r[mCol]));

      // Extract cohorts from the ENTIRE dataset so the dropdown options never disappear
      eCohorts = [...new Set(ed.map(r => {
         return String(r[cohortCol] || '').trim();
      }))].filter(Boolean).sort().reverse();

      const attParsed = attritionDoc ? parseCSV(attritionDoc.content) : null;
      const attIdCol = attParsed ? (attParsed.headers.find(h => {
        const nh = String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return nh === 'studentid' || nh === 'id';
      }) || attParsed.headers[0]) : '';
      const attStatusCol = attParsed ? (attParsed.headers.find(h => String(h || '').toLowerCase().includes('status')) || 'status') : '';
      const attYearCol = attParsed ? (attParsed.headers.find(h => {
        const nh = String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return nh === 'enrollmentyear' || nh.includes('enrollmentyear');
      })) : '';
      
      const attMap = {};
      if (attParsed) {
        attParsed.data.forEach(r => {
          const id = normalizeId(r[attIdCol]);
          if (id) {
            attMap[id] = {
              status: r[attStatusCol],
              lastYear: r[attYearCol]
            };
          }
        });
      }

      const buildRetentionList = (ids) => {
        return ids.map(id => {
          const meta = studentMetaMap[id] || {};
          const att = attMap[id] || {};
          return {
            id: id,
            name: meta.name || 'Unknown',
            email: meta.email || 'N/A',
            mobile: meta.mobile || 'N/A',
            status: att.status || 'N/A',
            lastYear: att.lastYear || 'N/A'
          };
        });
      };
      
      // Normalize ID for comparison (trim whitespace, convert to string)
      
      console.log('[DMU Analytics] Attrition sheet:', attParsed ? `loaded (${attParsed.data.length} rows, idCol=${attIdCol}, statusCol=${attStatusCol})` : 'NOT LOADED');
      if (attParsed) {
        console.log('[DMU Analytics] Attrition sample:', attParsed.data.slice(0, 3).map(r => ({ id: r[attIdCol], status: r[attStatusCol] })));
      }

      if (selectedCohort !== 'All') {
        const cohortYear = parseInt(selectedCohort, 10);
        const joiningAY = cohortYear > 0 ? `${cohortYear}/${cohortYear + 1}` : '';

        const firstYearStudents = programFilteredEnrollment.filter(r => {
           const rowCohort = String(r[cohortCol] || '').trim();
           if (rowCohort !== selectedCohort) return false;
           // Also constrain to the joining academic year (e.g. 2024 → 2024/2025)
           if (joiningAY && aCol) {
              const rowAY = String(r[aCol] || '').trim();
              if (getStartYear(rowAY) !== cohortYear) return false;
           }
           return true;
        });

        const baselineIds = [...new Set(firstYearStudents.map(r => normalizeId(r[sCol])).filter(Boolean))];
        kpi22Data.denominator = baselineIds.length;
        kpi22Data.denominatorList = buildRetentionList(baselineIds);

        let retainedCount = 0;
        let breakCount = 0;
        const retainedIds = [];
        baselineIds.forEach(id => {
           const actualStartYear = cohortYear;
           
           // Check if student appears in enrollment in any FUTURE academic year
           const futureEnrolled = programFilteredEnrollment.find(r => normalizeId(r[sCol]) === id && getStartYear(r[aCol]) > actualStartYear);
           
           // Check if student has "break" status in attrition sheet
           const breakStatus = attParsed?.data.find(r => {
              if (normalizeId(r[attIdCol]) !== id) return false;
              const statusStr = String(r[attStatusCol] || '').toLowerCase();
              return statusStr.includes('break') || statusStr.includes('leave') || statusStr.includes('postpone') || statusStr.includes('suspend');
           });

           if (breakStatus) {
              breakCount++;
              console.log('[DMU Analytics] Break student found:', id, 'status:', breakStatus[attStatusCol]);
           }

           if (futureEnrolled || breakStatus) {
              retainedCount++;
              retainedIds.push(id);
           }
        });

        const attritionIds = baselineIds.filter(id => !retainedIds.includes(id));
        kpi22Data.numerator = retainedCount;
        kpi22Data.numeratorList = buildRetentionList(retainedIds);
        kpi22Data.attritionCount = attritionIds.length;
        kpi22Data.attritionList = buildRetentionList(attritionIds);
      } else {
        let allFirstYears = new Map();
        programFilteredEnrollment.forEach(r => {
           const id = normalizeId(r[sCol]);
           const rowCohort = String(r[cohortCol] || '').trim();
           const startYear = getStartYear(r[aCol]);
           
           if (id && rowCohort && startYear > 0) {
              if (!allFirstYears.has(id) || allFirstYears.get(id) > startYear) {
                 allFirstYears.set(id, startYear);
              }
           }
        });

        const baselineIds = Array.from(allFirstYears.keys());
        kpi22Data.denominator = baselineIds.length;
        kpi22Data.denominatorList = buildRetentionList(baselineIds);
        let retainedCount = 0;
        const retainedIds = [];
        for (let [id, startYear] of allFirstYears.entries()) {
           const futureEnrolled = programFilteredEnrollment.find(r => normalizeId(r[sCol]) === id && getStartYear(r[aCol]) > startYear);
           
           const breakStatus = attParsed?.data.find(r => {
              if (normalizeId(r[attIdCol]) !== id) return false;
              const statusStr = String(r[attStatusCol] || '').toLowerCase();
              return statusStr.includes('break') || statusStr.includes('leave') || statusStr.includes('postpone') || statusStr.includes('suspend');
           });

           if (futureEnrolled || breakStatus) {
             retainedCount++;
             retainedIds.push(id);
           }
        }
        const attritionIds = baselineIds.filter(id => !retainedIds.includes(id));
        kpi22Data.numerator = retainedCount;
        kpi22Data.numeratorList = buildRetentionList(retainedIds);
        kpi22Data.attritionCount = attritionIds.length;
        kpi22Data.attritionList = buildRetentionList(attritionIds);
      }
      kpi22Data.value = kpi22Data.denominator > 0 ? ((kpi22Data.numerator / kpi22Data.denominator) * 100).toFixed(1) : 0;

      // --- TREND: KPI 2.2 per Cohort (Skipping latest) ---
      const trendCohorts = eCohorts.slice(1).reverse(); 
      kpi22Data.trend = trendCohorts.map(cohortStr => {
        const cohortYear = parseInt(cohortStr, 10);
        const joiningAY = cohortYear > 0 ? `${cohortYear}/${cohortYear + 1}` : '';
        
        const firstYearStudents = programFilteredEnrollment.filter(r => {
           const rowCohort = String(r[cohortCol] || '').trim();
           if (rowCohort !== cohortStr) return false;
           if (joiningAY && aCol) {
              const rowAY = String(r[aCol] || '').trim();
              if (getStartYear(rowAY) !== cohortYear) return false;
           }
           return true;
        });

        const baselineIds = [...new Set(firstYearStudents.map(r => normalizeId(r[sCol])).filter(Boolean))];
        let retainedCount = 0;
        
        baselineIds.forEach(id => {
           const actualStartYear = cohortYear;
           const futureEnrolled = programFilteredEnrollment.find(r => normalizeId(r[sCol]) === id && getStartYear(r[aCol]) > actualStartYear);
           const breakStatus = attParsed?.data.find(r => {
              if (normalizeId(r[attIdCol]) !== id) return false;
              const statusStr = String(r[attStatusCol] || '').toLowerCase();
              return statusStr.includes('break') || statusStr.includes('leave') || statusStr.includes('postpone') || statusStr.includes('suspend');
           });
           if (futureEnrolled || breakStatus) retainedCount++;
        });

        return { 
          year: cohortStr, 
          value: baselineIds.length > 0 ? parseFloat(((retainedCount / baselineIds.length) * 100).toFixed(1)) : 0 
        };
      });

      const filteredEnrollment = programFilteredEnrollment.filter(r => {
        // Precise Academic Year Filter logic (matching 2024-2025 with 2024/2025)
        return matchAcademicYear(r[aCol], selectedAcademicYear);
      });
      
      totalStudents = new Set(filteredEnrollment.map(r => r[sCol]).filter(v => v && String(v).trim() !== '')).size;
    }

    // --- KPI 2.6: Student Satisfaction from Exit Survey ---
    let kpi26Data = { denominator: 0, numerator: 0, value: 0, categories: [] };
    const exitSurveyQDoc = documents.find(d => (d.type === 'csv' || d.type === 'json') && d.name.toLowerCase().includes('exit survey') && d.name.toLowerCase().includes('questionnaire'));
    const exitSurveyTrackerDoc = documents.find(d => d.type === 'csv' && d.name.toLowerCase().includes('exit survey') && !d.name.toLowerCase().includes('questionnaire'));
    
    // Smart Helpers for Exit Survey
    const getSmartAY = (val) => {
      if (!val) return null;
      const s = String(val).trim();
      const norm = normalizeAcademicYear(s);
      if (norm && norm.includes('/')) return norm;
      const date = new Date(s);
      if (!isNaN(date.getTime()) && date.getFullYear() > 2000) {
        const y = date.getFullYear(), m = date.getMonth();
        return m >= 8 ? `${y}/${y+1}` : `${y-1}/${y}`;
      }
      return norm;
    };

    const findBestCol = (headers, targets) => {
      for (const t of targets) {
        const found = headers.find(h => String(h || '').toLowerCase().includes(t.toLowerCase()));
        if (found) return found;
      }
      return null;
    };

    let exitResponseRate = 0;
    let exitInvitees = 0;
    let exitSubmitted = 0;

    if (exitSurveyTrackerDoc) {
      const { headers: etHeaders, data: etData } = parseCSV(exitSurveyTrackerDoc.content);
      const etProgramCol = findBestCol(etHeaders, ['program', 'college', 'major', 'specialization', 'stream']);
      const etAYCol = findBestCol(etHeaders, ['academic year', 'academic_year', 'ay', 'graduation', 'year']) || etHeaders[0];
      const etStatusCol = findBestCol(etHeaders, ['status', 'submitted', 'progress']) || 'status';
      const etIdCol = etHeaders.find(h => h.toLowerCase().includes('student') && (h.toLowerCase().includes('id') || h.toLowerCase().includes('no'))) || etHeaders.find(h => h.toLowerCase() === 'student') || etHeaders[0];
      const etNameCol = findBestCol(etHeaders, ['name', 'full name', 'student name']);
      
      const filteredTracker = etData.filter(r => {
        if (!r[etStatusCol] && !r[etProgramCol]) return false;
        const rowProg = etProgramCol ? normalizeProgramName(r[etProgramCol]) : 'All';
        const progMatch = matchesProgram(rowProg);
        const rowAY = getSmartAY(r[etAYCol]);
        const yearMatch = matchAcademicYear(rowAY, selectedAcademicYear);
        return progMatch && yearMatch;
      });
      
      exitInvitees = filteredTracker.length;
      exitSubmitted = filteredTracker.filter(r => {
        const status = String(r[etStatusCol] || '').trim().toLowerCase();
        return status === 'submitted' || status === 'completed' || status === 'yes' || status === '1';
      }).length;
      exitResponseRate = exitInvitees > 0 ? parseFloat(((exitSubmitted / exitInvitees) * 100).toFixed(1)) : 0;

      kpi26Data.inviteeList = filteredTracker.map(r => ({
        ...r,
        studentId: r[etIdCol],
        name: r[etNameCol],
        program: r[etProgramCol],
        status: r[etStatusCol]
      }));
      
      const etProgs = [...new Set(etData.map(r => etProgramCol ? normalizeProgramName(r[etProgramCol]) : null))].filter(Boolean);
      eProgs = [...new Set([...eProgs, ...etProgs])];
      const etAcademicYears = [...new Set(etData.map(r => getSmartAY(r[etAYCol])))].filter(Boolean);
      combinedAcademicYears = [...new Set([...combinedAcademicYears, ...etAcademicYears])].filter(Boolean).sort().reverse();
    }
    
    if (exitSurveyQDoc) {
      let esHeaders, esData;
      if (exitSurveyQDoc.type === 'json') {
        const jsonArr = exitSurveyQDoc.content;
        if (jsonArr.length > 0) {
          const rawKeys = Object.keys(jsonArr[0]);
          esHeaders = rawKeys.map(k => k.toLowerCase().trim());
          esData = jsonArr.map(row => {
            const obj = {};
            rawKeys.forEach((k, i) => { obj[esHeaders[i]] = row[k]; });
            return obj;
          });
        } else { esHeaders = []; esData = []; }
      } else {
        const parsed = parseCSV(exitSurveyQDoc.content);
        esHeaders = parsed.headers; esData = parsed.data;
      }
      
      const esProgramCol = findBestCol(esHeaders, ['program', 'college', 'major', 'specialization', 'stream']);
      const esAYCol = findBestCol(esHeaders, ['academic year', 'academic_year', 'ay', 'graduation', 'year']) || esHeaders[0];
      
      const categoryKeywords = [
        { name: 'Curriculum', keyword: 'curriculum' },
        { name: 'Faculty', keyword: 'faculty were competent' },
        { name: 'Practical/Labs', keyword: 'practical' },
        { name: 'Teaching & Learning', keyword: 'teaching' },
        { name: 'Assessment', keyword: 'assessment' },
        { name: 'Experiential Learning', keyword: 'experiential' },
        { name: 'Research Facilities', keyword: 'research facilit' },
        { name: 'Academic Advising', keyword: 'academic advising' },
        { name: 'Career Advising', keyword: 'career advising' },
        { name: 'Simulation', keyword: 'simulation' }
      ];
      
      const categoryColumns = categoryKeywords.map(cat => ({
        ...cat,
        col: esHeaders.find(h => h.includes(cat.keyword))
      }));
      
      const filteredSurvey = esData.filter(r => {
        const rowProg = esProgramCol ? normalizeProgramName(r[esProgramCol]) : 'All';
        const progMatch = matchesProgram(rowProg);
        const rowAY = getSmartAY(r[esAYCol]);
        const yearMatch = matchAcademicYear(rowAY, selectedAcademicYear);
        return progMatch && yearMatch;
      });
      
      kpi26Data.denominator = filteredSurvey.length;
      
      if (filteredSurvey.length > 0) {
        const catResults = categoryColumns.map(cat => {
          if (!cat.col) return { name: cat.name, rate: 0, agree: 0, total: 0 };
          let agree = 0, total = 0, naCount = 0;
          filteredSurvey.forEach(r => {
            const rawVal = r[cat.col];
            if (rawVal === undefined || rawVal === null || rawVal === '') return;
            const val = String(rawVal).trim().toLowerCase();
            if (val.includes('not applicable') || val.includes('n/a') || val === 'na' || val === '-') { naCount++; return; }
            
            const num = parseFloat(val);
            if (!isNaN(num) && num >= 1 && num <= 5) {
              if (num >= 4) agree++;
              total++;
              return;
            }
            if (val.includes('agree') && !val.includes('disagree')) { agree++; total++; }
            else if (val.includes('disagree')) { total++; }
          });
          return { name: cat.name, rate: total > 0 ? (agree / total) * 100 : 0, agree, total, na: naCount };
        });
        
        const validCats = catResults.filter(c => c.total > 0);
        const overallSatisfaction = validCats.length > 0 ? validCats.reduce((sum, c) => sum + c.rate, 0) / validCats.length : 0;
        
        kpi26Data.value = parseFloat((overallSatisfaction / 20).toFixed(2));
        kpi26Data.numerator = exitSubmitted;
        kpi26Data.categories = catResults;
        kpi26Data.responseRate = exitResponseRate;
        kpi26Data.invitees = exitInvitees;
      }

      // TREND calculation
      const esProgFiltered = esData.filter(r => {
        const rowProg = esProgramCol ? normalizeProgramName(r[esProgramCol]) : 'All';
        return matchesProgram(rowProg);
      });
      const esYearGroups = {};
      esProgFiltered.forEach(r => {
        const yr = getSmartAY(r[esAYCol]);
        if (yr) {
          if (!esYearGroups[yr]) esYearGroups[yr] = [];
          esYearGroups[yr].push(r);
        }
      });
      
      kpi26Data.trend = Object.keys(esYearGroups).sort().map(yr => {
        const rows = esYearGroups[yr];
        const catRates = categoryColumns.map(cat => {
          if (!cat.col) return null;
          let agree = 0, total = 0;
          rows.forEach(r => {
            const val = String(r[cat.col] || '').trim().toLowerCase();
            if (!val || val.includes('not applicable') || val.includes('n/a')) return;
            const num = parseFloat(val);
            if (!isNaN(num) && num >= 1 && num <= 5) { if (num >= 4) agree++; total++; return; }
            if (val.includes('agree') && !val.includes('disagree')) { agree++; total++; }
            else if (val.includes('disagree')) { total++; }
          });
          return total > 0 ? (agree / total) * 100 : null;
        }).filter(r => r !== null);
        const avg = catRates.length > 0 ? catRates.reduce((s, v) => s + v, 0) / catRates.length : 0;
        return { year: yr.replace(/\d{2}(\d{2})\/\d{2}(\d{2})/, '$1/$2'), value: parseFloat((avg / 20).toFixed(2)) };
      });

      const esAcademicYears = [...new Set(esData.map(r => getSmartAY(r[esAYCol])))].filter(Boolean);
      combinedAcademicYears = [...new Set([...combinedAcademicYears, ...esAcademicYears])].filter(Boolean).sort().reverse();
    } else {
      kpi26Data.denominator = exitInvitees;
      kpi26Data.numerator = exitSubmitted;
      kpi26Data.responseRate = exitResponseRate;
      kpi26Data.invitees = exitInvitees;
    }

    // --- KPI 3.3: Joint Industry Courses ---
    let kpi33Data = { denominator: 0, numerator: 0, value: 0 };
    const teachingAssignmentDoc = documents.find(d => d.type === 'csv' && d.name?.toLowerCase().includes('teaching assignment'));
    
    if (teachingAssignmentDoc) {
      const { headers: th, data: td } = parseCSV(teachingAssignmentDoc.content);
      const creditsCol = th.find(h => h === 'credits');
      const facultyTypeCol = th.find(h => h === 'course_faculty_type');
      const basicScienceCol = th.find(h => h === 'basic_science');
      const college1Col = th.find(h => h === 'college_1');
      const taAYCol = th.find(h => h === 'academic_year') || th.find(h => h.includes('academic') || h.includes('year'));
      const taProgCol = th.find(h => h === 'program') || th.find(h => h.includes('program'));
      const courseCodeCol = th.find(h => h === 'course_code') || th.find(h => h.includes('course') && h.includes('code')) || th.find(h => h === 'code') || th.find(h => h.includes('course'));
      const courseNameCol = th.find(h => h === 'course_name') || th.find(h => h.includes('course') && h.includes('name'));
      const facultyNameCol = th.find(h => h === 'faculty_name') || th.find(h => h.includes('faculty') && h.includes('name'));
      const affiliationCol = th.find(h => h === 'affiliation') || th.find(h => h.includes('affiliation') || h.includes('institution'));
      const shareCol = th.find(h => h === 'credit_share') || th.find(h => h.includes('share'));
      const roleCol = th.find(h => h === 'role_teaching_design') || th.find(h => h.toLowerCase().includes('role_teaching_design'));

      // Filter by program and academic year if available
      const filteredTA = td.filter(r => {
        const progMatch = matchesProgram(taProgCol ? r[taProgCol] : 'All');
        const yearMatch = matchAcademicYear(r[taAYCol], selectedAcademicYear);
        return progMatch && yearMatch;
      });

      // Deduplicate by course code
      const uniqueCourses = new Map();
      filteredTA.forEach(r => {
        const code = String(r[courseCodeCol] || '').trim();
        if (!code) return;
        
        const credits = parseFloat(r[creditsCol]) || 0;
        const facultyType = String(r[facultyTypeCol] || '').trim();
        const basicScience = String(r[basicScienceCol] || '').trim().toUpperCase();
        const college1 = String(r[college1Col] || '').trim().toUpperCase();

        const isNotBasicScience = basicScience !== 'TRUE';
        const isNotGE = college1 !== 'GE';

        if (isNotBasicScience && isNotGE) {
          if (!uniqueCourses.has(code)) {
            uniqueCourses.set(code, { credits, isIndustry: facultyType === 'I' });
          } else {
            const existing = uniqueCourses.get(code);
            if (facultyType === 'I') existing.isIndustry = true;
            // Always keep the largest credit value if they differ (safety measure)
            if (credits > existing.credits) existing.credits = credits;
          }
        }
      });

      let numerator = 0;
      let denominator = 0;
      uniqueCourses.forEach(c => {
        denominator += c.credits;
        if (c.isIndustry) numerator += c.credits;
      });

      const mapCourseRow = (r) => {
        const role = String(r[roleCol] || '').trim();
        let tp = 0, dp = 0;
        if (role === 'Teaching Only') { tp = 100; dp = 0; }
        else if (role === 'Design Only') { tp = 0; dp = 100; }
        else if (role === 'Mainly Teaching') { tp = 80; dp = 20; }
        else if (role === 'Mainly Design') { tp = 20; dp = 80; }
        
        return {
          ...r,
          program: r[taProgCol],
          code: r[courseCodeCol],
          name: r[courseNameCol],
          faculty: r[facultyNameCol],
          affiliation: r[affiliationCol],
          share: r[shareCol],
          credits: r[creditsCol],
          role: role,
          teachingPercent: tp,
          designPercent: dp
        };
      };

      const totalCoursesList = filteredTA.filter(r => {
        const basicScience = String(r[basicScienceCol] || '').trim().toUpperCase();
        const college1 = String(r[college1Col] || '').trim().toUpperCase();
        return basicScience !== 'TRUE' && college1 !== 'GE';
      }).map(mapCourseRow);

      const industryCoursesList = totalCoursesList.filter(r => String(r[facultyTypeCol] || '').trim() === 'I');

      kpi33Data = {
        denominator: denominator.toFixed(1),
        numerator: numerator.toFixed(1),
        value: denominator > 0 ? ((numerator / denominator) * 100).toFixed(1) : 0,
        industryCourses: industryCoursesList,
        totalCourses: totalCoursesList
      };

      // --- TREND: KPI 3.3 per Academic Year (filtered only by Program) ---
      const taProgFiltered = td.filter(r => {
        const rowProg = taProgCol ? normalizeProgramName(r[taProgCol]) : 'All';
        return matchesProgram(rowProg);
      });
      const taYearGroups = {};
      taProgFiltered.forEach(r => {
        const yr = normalizeAcademicYear(r[taAYCol]);
        if (!yr) return;
        if (!taYearGroups[yr]) taYearGroups[yr] = [];
        taYearGroups[yr].push(r);
      });
      kpi33Data.trend = Object.keys(taYearGroups).sort().map(yr => {
        const rows = taYearGroups[yr];
        const yearUniqueCourses = new Map();
        rows.forEach(r => {
          const code = String(r[courseCodeCol] || '').trim();
          if (!code) return;
          const credits = parseFloat(r[creditsCol]) || 0;
          if (String(r[basicScienceCol] || '').trim().toUpperCase() !== 'TRUE' && String(r[college1Col] || '').trim().toUpperCase() !== 'GE') {
            if (!yearUniqueCourses.has(code)) {
              yearUniqueCourses.set(code, { credits, isIndustry: String(r[facultyTypeCol] || '').trim() === 'I' });
            } else {
              const existing = yearUniqueCourses.get(code);
              if (String(r[facultyTypeCol] || '').trim() === 'I') existing.isIndustry = true;
              if (credits > existing.credits) existing.credits = credits;
            }
          }
        });
        let n = 0, d = 0;
        yearUniqueCourses.forEach(c => { d += c.credits; if (c.isIndustry) n += c.credits; });
        return { year: yr.replace(/\d{2}(\d{2})\/\d{2}(\d{2})/, '$1/$2'), value: parseFloat((d > 0 ? (n / d * 100) : 0).toFixed(1)) };
      });

      // Merge academic years and programs
      const taAcademicYears = [...new Set(td.map(r => normalizeAcademicYear(r[taAYCol])))].filter(Boolean);
      combinedAcademicYears = [...new Set([...combinedAcademicYears, ...taAcademicYears])].filter(Boolean).sort().reverse();
      if (taProgCol) {
        const taProgs = [...new Set(td.map(r => normalizeProgramName(r[taProgCol])))].filter(Boolean);
        eProgs = [...new Set([...eProgs, ...taProgs])];
      }
    }

    const allPrograms = [...new Set([...alumniResult.programs, ...pProgs, ...eProgs].map(normalizeProgramName))].filter(p => p && String(p).trim().toUpperCase() !== 'GE').sort();

    // --- KPI 4.4: Student Participation in Research ---
    let kpi44Data = { denominator: 0, numerator: 0, value: 0 };
    const studentResearchDoc = documents.find(d => d.type === 'csv' && d.name?.toLowerCase().includes('student participation in research'));
    
    if (enrollmentDoc && studentResearchDoc) {
      const { headers: eh, data: ed } = parseCSV(enrollmentDoc.content);
      const { headers: srh, data: srd } = parseCSV(studentResearchDoc.content);
      
      // Enrollment columns (reuse the same column detection as above)
      const eMajorCol = eh.find(h => h === 'major') || eh.find(h => h === 'program') || eh.find(h => h.includes('std_30_student_major')) || eh.find(h => h.includes('major')) || eh.find(h => h.includes('program')) || eh.find(h => h.includes('degree'));
      const eAcadCol = eh.find(h => h === 'academic_year') || eh.find(h => h.includes('std_03_academic_period')) || eh.find(h => h.includes('academic') || h.includes('year'));
      const eStudentIdCol = eh.find(h => h === 'ID') || eh.find(h => h.includes('std_04_student_id')) || eh.find(h => h.includes('student') && h.includes('id')) || eh[0];
      
      // Student Research columns
      const srStudentIdCol = srh.find(h => h.includes('sr_student_id')) || srh.find(h => h.includes('student_id') || h.includes('student id')) || srh[0];
      const srTypeCol = srh.find(h => h.includes('sr_type_of_research')) || srh.find(h => h.includes('type_of_research') || h.includes('type of research'));
      const srImpactIndexed = srh.find(h => h.includes('impact__indexed_publication') || h.includes('indexed_publication'));
      const srImpactIP = srh.find(h => h.includes('impact_registered_ip') || h.includes('registered_ip'));
      const srImpactRevenue = srh.find(h => h.includes('impact_revenue'));
      const srImpactCompetitions = srh.find(h => h.includes('impact_competitions'));
      const srImpactScholarship = srh.find(h => h.includes('impact_scholarship'));
      const srImpactSpinoff = srh.find(h => h.includes('impact_spinoff'));
      const srImpactPolicy = srh.find(h => h.includes('impact_policy'));
      const srImpactPublic = srh.find(h => h.includes('impact_public'));
      const srImpactGovt = srh.find(h => h.includes('impact_govt'));
      const srImpactEducation = srh.find(h => h.includes('impact_education'));
      const srImpactMedia = srh.find(h => h.includes('impact_media'));

      console.log('[KPI 4.4] Student Research headers:', srh);
      console.log('[KPI 4.4] Detected cols → srStudentIdCol:', srStudentIdCol, '| srTypeCol:', srTypeCol);
      console.log('[KPI 4.4] Enrollment ID col:', eStudentIdCol, '| Major col:', eMajorCol, '| AY col:', eAcadCol);
      
      const normalizeStudentId = (val) => String(val || '').trim().replace(/\.0$/, '');

      // CASE formula: check if a student's research qualifies
      const hasQualifyingResearch = (researchRow) => {
        const resType = String(researchRow[srTypeCol] || '').trim().toUpperCase();
        // If FL, always counts
        if (resType === 'FL') return true;
        // Otherwise, check all 11 impact fields
        const isYes = (col) => col && String(researchRow[col] || '').trim().toUpperCase() === 'Y';
        return isYes(srImpactIndexed) || isYes(srImpactIP) || isYes(srImpactRevenue) ||
               isYes(srImpactCompetitions) || isYes(srImpactScholarship) || isYes(srImpactSpinoff) ||
               isYes(srImpactPolicy) || isYes(srImpactPublic) || isYes(srImpactGovt) ||
               isYes(srImpactEducation) || isYes(srImpactMedia);
      };

      // Build a set of student IDs that have qualifying research
      const studentsWithQualifyingResearch = new Set();
      srd.forEach(row => {
        const studentId = normalizeStudentId(row[srStudentIdCol]);
        if (studentId && hasQualifyingResearch(row)) {
          studentsWithQualifyingResearch.add(studentId);
        }
      });

      console.log('[KPI 4.4] Total research rows:', srd.length, '| Students with qualifying research:', studentsWithQualifyingResearch.size);

      // Additional columns for modal display
      const eNameCol = eh.find(h => h.includes('std_11_student_name_english')) || eh.find(h => h.includes('name'));
      const srNameCol = srh.find(h => h.toLowerCase().includes('sr_student_name_english')) || srh.find(h => h.toLowerCase().includes('name'));
      const srTopicCol = srh.find(h => h.includes('sr_research_topic')) || srh.find(h => h.includes('topic') || h.includes('title'));
      const srProgramCol = srh.find(h => h === 'program') || srh.find(h => h.includes('college'));

      // Filter enrollment by program and academic year (same filters as enrollment KPIs)
      const kpi44Enrollment = ed.filter(r => {
        const progMatch = matchesProgram(r[eMajorCol]);
        const yearMatch = matchAcademicYear(r[eAcadCol], selectedAcademicYear);
        return progMatch && yearMatch;
      });

      // Get unique enrolled students and build their details list
      const enrolledStudentIds = new Set();
      const kpi44EnrolledList = [];
      
      kpi44Enrollment.forEach(r => {
        const id = normalizeStudentId(r[eStudentIdCol]);
        if (id && !enrolledStudentIds.has(id)) {
          enrolledStudentIds.add(id);
          kpi44EnrolledList.push({
            id: r[eStudentIdCol],
            name: r[eNameCol] || 'Unknown',
            category: r[eMajorCol] || 'Unknown Program'
          });
        }
      });

      // Collect qualifying research details (deduplicated per student, combining project titles)
      const kpi44ResearchMap = new Map();
      
      srd.forEach(row => {
        const studentId = normalizeStudentId(row[srStudentIdCol]);
        if (studentId && enrolledStudentIds.has(studentId) && hasQualifyingResearch(row)) {
          const topic = row[srTopicCol] || 'Untitled Research';
          const name = row[srNameCol] || 'Unknown Student';
          const category = row[srProgramCol] || 'Unknown Program';
          
          if (!kpi44ResearchMap.has(studentId)) {
            kpi44ResearchMap.set(studentId, {
              title: topic,
              name: name,
              id: row[srStudentIdCol] || studentId,
              category: category
            });
          } else {
            const existing = kpi44ResearchMap.get(studentId);
            if (!existing.title.includes(topic)) {
              existing.title += `; ${topic}`;
            }
          }
        }
      });
      
      const researchParticipants = kpi44ResearchMap.size;
      const kpi44ResearchList = Array.from(kpi44ResearchMap.values());

      kpi44Data = {
        denominator: enrolledStudentIds.size,
        numerator: researchParticipants,
        value: enrolledStudentIds.size > 0 ? ((researchParticipants / enrolledStudentIds.size) * 100).toFixed(1) : 0,
        enrolledStudents: kpi44EnrolledList,
        qualifyingResearch: kpi44ResearchList
      };
      console.log('[KPI 4.4] Result:', { enrolled: enrolledStudentIds.size, withResearch: researchParticipants, value: kpi44Data.value });


      // --- TREND: KPI 4.4 per Academic Year (filtered only by Program) ---
      const kpi44ProgFiltered = ed.filter(r => matchesProgram(r[eMajorCol]));
      const kpi44YearGroups = {};
      kpi44ProgFiltered.forEach(r => {
        const yr = normalizeAcademicYear(r[eAcadCol]);
        if (!yr) return;
        if (!kpi44YearGroups[yr]) kpi44YearGroups[yr] = [];
        kpi44YearGroups[yr].push(r);
      });
      kpi44Data.trend = Object.keys(kpi44YearGroups).sort().map(yr => {
        const rows = kpi44YearGroups[yr];
        const yearEnrolled = new Set(rows.map(r => normalizeStudentId(r[eStudentIdCol])).filter(Boolean));
        let yearResearch = 0;
        yearEnrolled.forEach(id => {
          if (studentsWithQualifyingResearch.has(id)) yearResearch++;
        });
        return { 
          year: yr.replace(/\d{2}(\d{2})\/\d{2}(\d{2})/, '$1/$2'), 
          value: parseFloat((yearEnrolled.size > 0 ? (yearResearch / yearEnrolled.size * 100) : 0).toFixed(1)) 
        };
      });
    }

    // --- RESEARCH KPIs (4.3 & 5.4) ---
    let kpi43Data = { denominator: 0, numerator: 0, value: 0, projects: [] };
    let kpi45Data = { denominator: 0, numerator: 0, value: 0 };
    let kpi54Data = { denominator: 0, numerator: 0, value: 0, projects: [] };
    let projectStartYears = [];

    const researchProjectsDoc = documents.find(d => d.type === 'csv' && d.name?.toLowerCase().includes('research projects'));
    
    if (researchProjectsDoc && teachingAssignmentDoc) {
      const { headers: rph, data: rpd } = parseCSV(researchProjectsDoc.content);
      const { headers: th, data: td } = parseCSV(teachingAssignmentDoc.content);

      const rpPiIdCol = rph.find(h => h.includes('pi_id')) || rph.find(h => h.includes('pi') && h.includes('id')) || rph[0];
      const rpYearCol = rph.find(h => h.includes('project_year_start')) || rph.find(h => h.includes('year') && h.includes('start'));
      const rpIndCol = rph.find(h => h.includes('joint_industry_indicator')) || rph.find(h => h.includes('industry'));
      const rpIntCol = rph.find(h => h.includes('international_collabo_indicator')) || rph.find(h => h.includes('international'));
      const rpStatusCol = rph.find(h => h === 'status') || rph.find(h => h.includes('status'));
      const rpImpactCol = rph.find(h => h.includes('impact_indicator')) || rph.find(h => h.includes('impact'));
      const rpTitleCol = rph.find(h => h === 'project_title') || rph.find(h => h.includes('project_title')) || rph.find(h => h.includes('title'));
      // Search for PI Name more strictly to avoid picking up collaborators, prioritizing Principal_Investigator
      const rpNameCol = rph.find(h => h === 'principal_investigator') || rph.find(h => h.includes('principal_investigator')) || rph.find(h => h === 'pi_name') || rph.find(h => h.includes('pi_name')) || rph.find(h => h.includes('pi') && h.includes('name')) || rph.find(h => h === 'name') || rph.find(h => h.includes('name') && !h.includes('collaborator') && !h.includes('institution'));
      // Explicitly find collaborator/institution info
      const rpCollabCol = rph.find(h => h.includes('collaborator')) || rph.find(h => h.includes('partner')) || rph.find(h => h.includes('institution')) || rph.find(h => h.includes('affiliation'));


      const tFacultyIdCol = th.find(h => h.includes('faculty') && h.includes('id')) || th.find(h => h.includes('emp') && h.includes('id')) || th.find(h => h === 'id') || 'faculty_id';
      const tFacultyNameCol = th.find(h => h === 'faculty_name') || th.find(h => h.includes('faculty') && h.includes('name')) || th.find(h => h.includes('instructor') && h.includes('name')) || 'faculty_name';
      const tProgCol = th.find(h => h === 'program') || th.find(h => h.includes('program') && !h.includes('_')) || th.find(h => h.includes('program')) || 'program';
      const tAYCol = th.find(h => h === 'academic_year') || th.find(h => h.includes('academic') || h.includes('year'));
      
      // Map for clean faculty names from Teaching Assignment
      const facultyNameMap = {};
      td.forEach(tr => {
        const fid = normalizeId(tr[tFacultyIdCol]);
        const fname = tr[tFacultyNameCol];
        if (fid && fname) facultyNameMap[fid] = fname;
      });

      projectStartYears = [...new Set(rpd.map(r => String(r[rpYearCol] || '').trim()))].filter(Boolean).sort().reverse();

      const blendedProjects = [];

      rpd.forEach(row => {
        const status = String(row[rpStatusCol] || '').trim().toLowerCase();
        if (status !== 'approved' && status !== 'for submission' && status !== 'for submission only') return;
        
        const piId = normalizeId(row[rpPiIdCol]);
        const startYear = String(row[rpYearCol] || '').trim();
        if (!piId || !startYear) return;

        // Apply start year filter
        if (selectedCalendarYear !== 'All' && startYear !== selectedCalendarYear) return;

        // Map startYear (e.g. 2023) to Academic_Year (e.g. 2023/2024)
        const mappedAY = `${startYear}/${parseInt(startYear) + 1}`;

        // Find matches in Teaching Assignment
        let teachingMatches = td.filter(tr => 
          normalizeId(tr[tFacultyIdCol]) === piId && 
          normalizeAcademicYear(tr[tAYCol]) === mappedAY
        );

        // Fallback Logic: if no matches in target year, try the previous academic year
        if (teachingMatches.length === 0) {
          const fallbackAY = `${parseInt(startYear) - 1}/${startYear}`;
          teachingMatches = td.filter(tr => 
            normalizeId(tr[tFacultyIdCol]) === piId && 
            normalizeAcademicYear(tr[tAYCol]) === fallbackAY
          );
        }

        // Find all unique programs from teaching assignments, excluding GE
        const projectPrograms = Array.from(new Set(
          teachingMatches.flatMap(m => String(m[tProgCol] || '').split(',').map(s => s.trim()))
            .filter(p => p && p.toUpperCase() !== 'GE')
        ));

        // Check if any matching teaching assignment passes the program filter
        let passesProgramFilter = false;
        
        if (projectPrograms.length === 0) {
          // Unblended project or only GE: only passes if All is selected
          if (selectedPrograms.includes('All')) {
            passesProgramFilter = true;
          }
        } else {
          if (selectedPrograms.includes('All')) {
            passesProgramFilter = true;
          } else {
            // Check if any of the project's programs match the selected filter
            passesProgramFilter = projectPrograms.some(prog => 
              matchesProgram(prog)
            );
          }
        }

        if (passesProgramFilter) {
          const indVal = String(row[rpIndCol] || '').trim().toUpperCase();
          const intVal = String(row[rpIntCol] || '').trim().toUpperCase();
          const impactVal = String(row[rpImpactCol] || '').trim().toUpperCase();
          
          blendedProjects.push({
            id: piId,
            title: row[rpTitleCol] || 'Untitled Project',
            name: facultyNameMap[piId] || (teachingMatches.length > 0 && teachingMatches[0][tFacultyNameCol]) ? (facultyNameMap[piId] || teachingMatches[0][tFacultyNameCol]) : (row[rpNameCol] || 'Unknown PI'),
            collaborators: row[rpCollabCol] || '',
            category: projectPrograms.length > 0 ? projectPrograms.join(', ') : 'Unknown Program',
            programs: projectPrograms,
            startYear: startYear,
            isIndustry: indVal === 'Y' || indVal === 'YES',
            isInternational: intVal === 'Y' || intVal === 'YES',
            isImpact: impactVal === 'Y' || impactVal === 'YES'
          });
        }
      });

      kpi43Data.denominator = 0;
      kpi43Data.numerator = 0;
      kpi43Data.numeratorProjects = [];
      kpi43Data.denominatorProjects = [];
      
      kpi54Data.denominator = 0;
      kpi54Data.numerator = 0;
      kpi54Data.numeratorProjects = [];
      kpi54Data.denominatorProjects = [];

      kpi43Data.denominator = blendedProjects.length;
      kpi43Data.numerator = blendedProjects.filter(p => p.isIndustry).length;
      kpi43Data.numeratorProjects = blendedProjects.filter(p => p.isIndustry);
      kpi43Data.denominatorProjects = blendedProjects;

      kpi54Data.denominator = blendedProjects.length;
      kpi54Data.numerator = blendedProjects.filter(p => p.isInternational).length;
      kpi54Data.internationalCollaborations = blendedProjects.filter(p => p.isInternational);
      kpi54Data.totalProjects = blendedProjects;
      
      kpi43Data.value = kpi43Data.denominator > 0 ? ((kpi43Data.numerator / kpi43Data.denominator) * 100).toFixed(1) : 0;
      kpi54Data.value = kpi54Data.denominator > 0 ? ((kpi54Data.numerator / kpi54Data.denominator) * 100).toFixed(1) : 0;
      
      // Trend calculation
      const trendProjects = [];
      rpd.forEach(row => {
        const status = String(row[rpStatusCol] || '').trim().toLowerCase();
        if (status !== 'approved' && status !== 'for submission' && status !== 'for submission only') return;
        const piId = normalizeId(row[rpPiIdCol]);
        const startYear = String(row[rpYearCol] || '').trim();
        if (!piId || !startYear) return;

        const mappedAY = `${startYear}/${parseInt(startYear) + 1}`;
        let teachingMatches = td.filter(tr => normalizeId(tr[tFacultyIdCol]) === piId && normalizeAcademicYear(tr[tAYCol]) === mappedAY);

        // Fallback Logic
        if (teachingMatches.length === 0) {
          const fallbackAY = `${parseInt(startYear) - 1}/${startYear}`;
          teachingMatches = td.filter(tr => normalizeId(tr[tFacultyIdCol]) === piId && normalizeAcademicYear(tr[tAYCol]) === fallbackAY);
        }

        let passesProgramFilter = false;
        if (teachingMatches.length === 0) {
          passesProgramFilter = selectedPrograms.includes('All');
        } else {
          if (selectedPrograms.includes('All')) {
            passesProgramFilter = true;
          } else {
            passesProgramFilter = teachingMatches.some(match => {
              const progs = String(match[tProgCol] || '').split(',').map(s => s.trim());
              return matchesAnyProgram(progs);
            });
          }
        }

        if (passesProgramFilter) {
          const indVal = String(row[rpIndCol] || '').trim().toUpperCase();
          const intVal = String(row[rpIntCol] || '').trim().toUpperCase();

          trendProjects.push({
            year: startYear,
            isIndustry: indVal === 'Y' || indVal === 'YES',
            isInternational: intVal === 'Y' || intVal === 'YES'
          });
        }
      });

      const startYears = [...new Set(trendProjects.map(p => p.year))].sort();
      kpi43Data.trend = startYears.map(yr => {
        const yrProjects = trendProjects.filter(p => p.year === yr);
        const indProjects = yrProjects.filter(p => p.isIndustry);
        return {
          year: yr,
          value: yrProjects.length > 0 ? parseFloat(((indProjects.length / yrProjects.length) * 100).toFixed(1)) : 0
        };
      });
      kpi54Data.trend = startYears.map(yr => {
        const yrProjects = trendProjects.filter(p => p.year === yr);
        const intProjects = yrProjects.filter(p => p.isInternational);
        return {
          year: yr,
          value: yrProjects.length > 0 ? parseFloat(((intProjects.length / yrProjects.length) * 100).toFixed(1)) : 0
        };
      });

      kpi54Data.value = kpi54Data.denominator > 0 ? ((kpi54Data.numerator / kpi54Data.denominator) * 100).toFixed(1) : 0;

      // --- KPI 4.5: Research Impact (Institution Level) ---
      if (selectedPrograms.includes('All')) {
        kpi45Data.denominator = blendedProjects.length;
        kpi45Data.numerator = blendedProjects.filter(p => p.isImpact).length;
        kpi45Data.denominatorProjects = blendedProjects;
        kpi45Data.numeratorProjects = blendedProjects.filter(p => p.isImpact);
        kpi45Data.value = kpi45Data.denominator > 0 ? ((kpi45Data.numerator / kpi45Data.denominator) * 100).toFixed(1) : 0;
      }

      // Trend logic for 4.5 remains institutional as requested
      const rpYears = [...new Set(rpd.map(r => String(r[rpYearCol] || '').trim()))].filter(Boolean).sort();
      kpi45Data.trend = rpYears.map(yr => {
        const yrProjects = rpd.filter(row => {
          const status = String(row[rpStatusCol] || '').trim().toLowerCase();
          return (status === 'approved' || status === 'for submission' || status === 'for submission only') && String(row[rpYearCol] || '').trim() === yr;
        });
        const yrImpact = yrProjects.filter(row => {
          const impact = String(row[rpImpactCol] || '').trim().toUpperCase();
          return impact === 'Y' || impact === 'YES';
        });
        return {
          year: yr,
          value: yrProjects.length > 0 ? parseFloat(((yrImpact.length / yrProjects.length) * 100).toFixed(1)) : 0
        };
      });
    }

    // --- RESEARCH KPIs (4.1 & 4.2) ---
    let kpi41Data = { denominator: 0, numerator: 0, value: 0 };
    let kpi42Data = { denominator: 0, value: 0 };
    let publicationYears = [];

    const facultyDoc = documents.find(d => d.type === 'csv' && d.name?.toLowerCase().includes('faculty') && !d.name?.toLowerCase().includes('teaching'));
    const scopusDoc = documents.find(d => d.type === 'csv' && d.name && (d.name.toLowerCase().includes('scopus') || d.name.toLowerCase().includes('publication')));

    if (facultyDoc && scopusDoc && teachingAssignmentDoc) {
      const { headers: fh, data: fd } = parseCSV(facultyDoc.content);
      const { headers: sh, data: sd } = parseCSV(scopusDoc.content);
      const { headers: th, data: td } = parseCSV(teachingAssignmentDoc.content);

      // Identify columns with broader keywords
      const fScopusIdCol = fh.find(h => h.includes('scopus')) || 'scopus_id';
      const fIdCol = fh.find(h => h.includes('employee') || h.includes('emp_id') || h === 'id') || 'employee_id';
      const fCatCol = fh.find(h => h.includes('category') || h.includes('type')) || 'category';
      const fNameCol = fh.find(h => h === 'name' || h.includes('name')) || 'name';
      
      const sScopusIdCol = sh.find(h => h.includes('author') && h.includes('id')) || sh.find(h => h.includes('scopus') && h.includes('id')) || sh.find(h => h.includes('id')) || 'author id';
      const sYearCol = sh.find(h => h === 'year' || h.includes('year')) || 'year';
      const sFwciCol = sh.find(h => h.includes('field-weighted') || h.includes('fwci')) || 'fwci';
      const sPubIdCol = sh.find(h => h.includes('eid') || h.includes('doi') || h.includes('link') || h.includes('title')) || Object.keys(sd[0] || {})[0];

      const tFacultyIdCol = th.find(h => h.includes('faculty') && h.includes('id')) || th.find(h => h.includes('emp') && h.includes('id')) || th.find(h => h === 'id') || 'faculty_id';
      // IMPORTANT: Use exact match first to avoid picking up 'program_ge' before 'program'
      const tProgCol = th.find(h => h === 'program') || th.find(h => h.includes('program') && !h.includes('_')) || th.find(h => h.includes('program')) || 'program';
      const tFacultyNameCol = th.find(h => h.includes('faculty') && h.includes('name')) || th.find(h => h === 'name') || th.find(h => h.includes('instructor') || h.includes('lecturer')) || null;

      console.log('[Research KPI] Faculty headers:', fh);
      console.log('[Research KPI] Scopus headers:', sh);
      console.log('[Research KPI] Teaching headers:', th);
      console.log('[Research KPI] Detected cols → fIdCol:', fIdCol, '| fScopusIdCol:', fScopusIdCol, '| fCatCol:', fCatCol);
      console.log('[Research KPI] Detected cols → tFacultyIdCol:', tFacultyIdCol, '| tProgCol:', tProgCol, '| tFacultyNameCol:', tFacultyNameCol);
      console.log('[Research KPI] Faculty sample IDs:', fd.slice(0, 3).map(r => ({ id: r[fIdCol], scopus: r[fScopusIdCol], cat: r[fCatCol], name: r[fNameCol] })));
      console.log('[Research KPI] Teaching sample IDs:', td.slice(0, 3).map(r => ({ fid: r[tFacultyIdCol], prog: r[tProgCol], name: tFacultyNameCol ? r[tFacultyNameCol] : 'N/A' })));
      
      // Map for clean faculty names from Teaching Assignment
      const facultyNameMap = {};
      td.forEach(tr => {
        const fid = normalizeId(tr[tFacultyIdCol]);
        const fname = tr[tFacultyNameCol];
        if (fid && fname) facultyNameMap[fid] = fname;
      });


      publicationYears = [...new Set(sd.map(r => r[sYearCol]))].filter(Boolean).sort().reverse();

      // Blending Logic
      // 1. FT Faculty (Fuzzy match Category)
      const ftFaculty = fd.filter(r => {
        const cat = String(r[fCatCol] || '').trim().toLowerCase();
        return cat.includes('ft') || cat.includes('full time') || cat.includes('full-time') || cat === 'ft faculty';
      });

      console.log('[Research KPI] FT Faculty count:', ftFaculty.length);
      if (ftFaculty.length > 0) {
        const sample = ftFaculty[0];
        console.log('[Research KPI] FT Faculty sample:', { id: sample[fIdCol], scopus: sample[fScopusIdCol], cat: sample[fCatCol], name: sample[fNameCol] });
      }

      // Helper to convert calendar year to academic year (e.g. 2023 -> 2023/2024)

      const tAcYearCol = th.find(h => h === 'academic_year') || th.find(h => h.includes('academic') || h.includes('year'));
      console.log('[Research KPI] Academic Year Col:', tAcYearCol);

      // Function to get a year-specific faculty -> program mapping
      const getFacultyProgramsMap = (targetAcademicYear) => {
        const idMap = {};
        const nameMap = {};
        
        console.log('[Research KPI] Mapping faculty for Academic Year:', targetAcademicYear);
        let matchCount = 0;
        let mismatchCount = 0;
        
        td.forEach(row => {
          if (targetAcademicYear && tAcYearCol) {
            const rowAcYear = normalizeAcademicYear(row[tAcYearCol]);
            if (rowAcYear !== targetAcademicYear) {
              mismatchCount++;
              return;
            }
            matchCount++;
          }
          const fid = normalizeId(row[tFacultyIdCol]);
          const progString = String(row[tProgCol] || '').trim();
          
          progString.split(',').forEach(progRaw => {
            const prog = progRaw.trim();
            // Exclude GE from programs
            if (fid && prog && prog.toUpperCase() !== 'GE') {
              if (!idMap[fid]) idMap[fid] = new Set();
              idMap[fid].add(prog);
            }
            if (tFacultyNameCol) {
              const fname = normalizeName(row[tFacultyNameCol]);
              if (fname && prog && prog.toUpperCase() !== 'GE') {
                const normProg = normalizeProgramName(prog);
                if (!nameMap[fname]) nameMap[fname] = new Set();
                nameMap[fname].add(normProg);
              }
            }
          });
        });

        console.log(`[Research KPI] AY Mapping stats - target: ${targetAcademicYear}`);
        return { idMap, nameMap };
      };

      const allYearsMaps = getFacultyProgramsMap(null);

      const getProgramsForFaculty = (faculty, currentMaps, fallbackMaps = null) => {
        const fid = normalizeId(faculty[fIdCol]);
        const fname = normalizeName(faculty[fNameCol]);
        
        const allProgs = new Set();
        
        // 1. Try Current Year Mapping
        let progs = currentMaps.idMap[fid];
        if (progs && progs.size > 0) { progs.forEach(p => allProgs.add(p)); }
        else {
          progs = currentMaps.nameMap[fname];
          if (progs && progs.size > 0) { progs.forEach(p => allProgs.add(p)); }
        }
        
        // 2. Try Specific Fallback Mapping (e.g. Previous Year) if provided
        if (fallbackMaps) {
          progs = fallbackMaps.idMap[fid];
          if (progs && progs.size > 0) { progs.forEach(p => allProgs.add(p)); }
          else {
            progs = fallbackMaps.nameMap[fname];
            if (progs && progs.size > 0) { progs.forEach(p => allProgs.add(p)); }
          }
        }
        
        return Array.from(allProgs);
      };

      // Get global mapping based on selectedCalendarYear
      const globalTargetAY = calToAcademic(selectedCalendarYear);
      const globalMaps = globalTargetAY ? getFacultyProgramsMap(globalTargetAY) : allYearsMaps;
      
      let globalFallbackMaps = null;
      if (globalTargetAY) {
        const match = globalTargetAY.match(/^(\d{4})\/(\d{4})$/);
        if (match) {
          const prevYear = `${parseInt(match[1]) - 1}/${parseInt(match[2]) - 1}`;
          globalFallbackMaps = getFacultyProgramsMap(prevYear);
        }
      }
      
      const getPrograms = (faculty) => getProgramsForFaculty(faculty, globalMaps, globalFallbackMaps);

      // 2. Prepare Blended Data (Pub + Faculty Info + Programs)
      const finalBlendedData = [];
      let matchedPubCount = 0;
      let unmatchedProgCount = 0;
      sd.forEach(pub => {
        const pubScopusId = extractScopusId(pub[sScopusIdCol]);
        if (!pubScopusId) return;

        // Find faculty member(s) for this Scopus ID
        const matchingFaculty = ftFaculty.filter(f => {
          const fSid = extractScopusId(f[fScopusIdCol]);
          return fSid && fSid === pubScopusId;
        });
        
        matchingFaculty.forEach(f => {
          matchedPubCount++;
          const programs = getPrograms(f);
          if (programs.length === 0) unmatchedProgCount++;
          // Enrichment: use clean name from teaching assignment if possible
          const fid = normalizeId(f[fIdCol]);
          const enrichedFaculty = { ...f, [fNameCol]: facultyNameMap[fid] || f[fNameCol] };
          finalBlendedData.push({ pub, faculty: enrichedFaculty, programs });
        });
      });

      console.log('[Research KPI] Blended data size:', finalBlendedData.length, '| Matched pubs:', matchedPubCount, '| No program match:', unmatchedProgCount);
      if (finalBlendedData.length > 0) {
        console.log('[Research KPI] Sample blended item:', { 
          pubId: finalBlendedData[0].pub[sPubIdCol],
          facultyId: finalBlendedData[0].faculty[fIdCol],
          facultyName: finalBlendedData[0].faculty[fNameCol],
          programs: finalBlendedData[0].programs 
        });
      }

      // Apply Filters for base attribution
      const filteredBlended = finalBlendedData.filter(item => {
        const progMatch = matchesAnyProgram(item.programs);
        const yearMatch = selectedCalendarYear === 'All' || String(item.pub[sYearCol] || '').trim() === selectedCalendarYear;
        return progMatch && yearMatch;
      });

      // 1. Get the base of FT Faculty for the selected program(s) (Attributed)
      let totalBaseFacultySize = 0;
      const baseFtFacultyForExport = [];
      
      ftFaculty.forEach(f => {
        const progs = getPrograms(f); // Already excludes GE
        if (selectedPrograms.includes('All')) {
          // Institutional Total: Unique faculty who taught
          if (progs.length > 0) {
            totalBaseFacultySize++;
            baseFtFacultyForExport.push(f);
          }
        } else {
          // Program-attributed Total: Count each faculty once per selected program they teach in
          const matchingProgs = progs.filter(p => matchesProgram(p));
          totalBaseFacultySize += matchingProgs.length;
          if (matchingProgs.length > 0) {
            baseFtFacultyForExport.push(f);
          }
        }
      });

      // 2. Calculate Numerator (Attributed Publications)
      let pubNumerator = 0;
      let totalFWCI = 0;
      let fwciCount = 0;
      const publicationsForExport = [];
      const seenPubsInstitutional = new Set();
      
      if (selectedPrograms.includes('All')) {
        // Institutional Total: Unique publications
        filteredBlended.forEach(item => {
          const pubId = String(item.pub[sPubIdCol] || JSON.stringify(item.pub)).trim();
          if (!seenPubsInstitutional.has(pubId)) {
            seenPubsInstitutional.add(pubId);
            pubNumerator++;
            
            // Collect author names and programs from all matching faculty for this publication
            const facultyAuthors = Array.from(new Set(
              filteredBlended
                .filter(i => String(i.pub[sPubIdCol] || JSON.stringify(i.pub)).trim() === pubId)
                .map(i => i.faculty[fNameCol] || i.faculty.name || i.faculty.Name)
                .filter(Boolean)
            )).join(', ');

            const authorPrograms = Array.from(new Set(
              filteredBlended
                .filter(i => String(i.pub[sPubIdCol] || JSON.stringify(i.pub)).trim() === pubId)
                .flatMap(i => i.programs)
                .filter(Boolean)
            )).join(', ');

            const pubWithMeta = { 
              ...item.pub, 
              derivedAuthors: facultyAuthors,
              derivedPrograms: authorPrograms,
              derivedYear: item.pub[sYearCol],
              derivedFWCI: item.pub[sFwciCol] 
            };
            publicationsForExport.push(pubWithMeta);

            // Add to FWCI calculation
            const fwci = parseFloat(item.pub[sFwciCol]);
            if (!isNaN(fwci)) {
              totalFWCI += fwci;
              fwciCount++;
            }
          }
        });
      } else {
        // Program-attributed Total: Unique publications for the selected programs
        const seenPubsInProg = new Set();
        
        filteredBlended.forEach(item => {
          // If any of the programs this publication is attributed to matches any of our selected programs
          if (matchesAnyProgram(item.programs)) {
            const pubId = String(item.pub[sPubIdCol] || JSON.stringify(item.pub)).trim();
            if (!seenPubsInProg.has(pubId)) {
              seenPubsInProg.add(pubId);
              pubNumerator++;
              
              const facultyAuthors = Array.from(new Set(
                filteredBlended
                  .filter(i => String(i.pub[sPubIdCol] || JSON.stringify(i.pub)).trim() === pubId)
                  .map(i => i.faculty[fNameCol] || i.faculty.name || i.faculty.Name)
                  .filter(Boolean)
              )).join(', ');

              const authorPrograms = Array.from(new Set(
                filteredBlended
                  .filter(i => String(i.pub[sPubIdCol] || JSON.stringify(i.pub)).trim() === pubId)
                  .flatMap(i => i.programs)
                  .filter(Boolean)
              )).join(', ');

              const pubWithMeta = {
                ...item.pub,
                derivedAuthors: facultyAuthors,
                derivedPrograms: authorPrograms,
                derivedYear: item.pub[sYearCol],
                derivedFWCI: item.pub[sFwciCol],
                Program: selectedPrograms.join(', ')
              };
              publicationsForExport.push(pubWithMeta);

              // Add to FWCI calculation
              const fwci = parseFloat(item.pub[sFwciCol]);
              if (!isNaN(fwci)) {
                totalFWCI += fwci;
                fwciCount++;
              }
            }
          }
        });
      }

      kpi41Data = {
        denominator: totalBaseFacultySize,
        numerator: pubNumerator,
        value: totalBaseFacultySize > 0 ? (pubNumerator / totalBaseFacultySize).toFixed(2) : 0,
        publications: publicationsForExport,
        facultyList: baseFtFacultyForExport
      };

      kpi42Data = {
        denominator: pubNumerator,
        numerator: fwciCount,
        value: fwciCount > 0 ? (totalFWCI / fwciCount).toFixed(2) : 0,
        publications: publicationsForExport,
        totalFWCI: totalFWCI.toFixed(2)
      };

      // Trends
      const yearGroups = {};
      const progFilteredBlended = finalBlendedData.filter(item => 
        matchesAnyProgram(item.programs)
      );

      progFilteredBlended.forEach(item => {
        const yr = String(item.pub[sYearCol] || '').trim();
        if (!yr) return;
        if (!yearGroups[yr]) yearGroups[yr] = [];
        yearGroups[yr].push(item);
      });

      const sortedYears = Object.keys(yearGroups).sort();
      kpi41Data.trend = sortedYears.map(yr => {
        const items = yearGroups[yr];
        const uPubs = new Set(items.map(i => String(i.pub[sPubIdCol] || JSON.stringify(i.pub)).trim()));
        
        // Dynamically calculate the base faculty pool for THIS specific year
        const trendTargetAY = calToAcademic(yr);
        const trendMaps = getFacultyProgramsMap(trendTargetAY);
        
        let trendFallbackMaps = null;
        if (trendTargetAY) {
          const match = trendTargetAY.match(/^(\d{4})\/(\d{4})$/);
          if (match) {
            const prevYear = `${parseInt(match[1]) - 1}/${parseInt(match[2]) - 1}`;
            trendFallbackMaps = getFacultyProgramsMap(prevYear);
          }
        }
        
        const seenTrendBaseFac = new Set();
        const yrFtFaculty = ftFaculty.filter(f => {
          const progs = getProgramsForFaculty(f, trendMaps, trendFallbackMaps);
          const taughtInTargetYear = !trendTargetAY || progs.length > 0;
          const progMatch = taughtInTargetYear && matchesAnyProgram(progs);
          if (progMatch) {
            const facId = normalizeId(f[fIdCol]);
            if (!seenTrendBaseFac.has(facId)) {
              seenTrendBaseFac.add(facId);
            }
          }
        });
        const trendBaseFacultySize = seenTrendBaseFac.size;

        return { year: yr, value: trendBaseFacultySize > 0 ? parseFloat((uPubs.size / trendBaseFacultySize).toFixed(2)) : 0 };
      });

      kpi42Data.trend = sortedYears.map(yr => {
        const items = yearGroups[yr];
        // Unique pubs for this year
        const yearPubs = [];
        const seenYP = new Set();
        items.forEach(i => {
          const pid = String(i.pub[sPubIdCol] || JSON.stringify(i.pub)).trim();
          if (!seenYP.has(pid)) { seenYP.add(pid); yearPubs.push(i.pub); }
        });
        const fwcis = yearPubs.map(p => parseFloat(p[sFwciCol])).filter(v => !isNaN(v));
        return { year: yr, value: fwcis.length > 0 ? parseFloat((fwcis.reduce((a,b) => a+b, 0) / fwcis.length).toFixed(2)) : 0 };
      });
    }

    // --- EVENTS DATA PROCESSING (KPI 6.1, 6.2) ---
    let kpi61Data = { value: 0 };
    let kpi62Data = { value: 0 };
    let eventYears = [];
    const eventsDoc = documents.find(d => d.type === 'csv' && d.name?.toLowerCase().includes('event'));
    if (eventsDoc) {
      const { headers, data } = parseCSV(eventsDoc.content);
      const typeCol = headers.find(h => h.toLowerCase() === 'event_type_' || h.toLowerCase().includes('type')) || headers[0];
      const attendeesCol = headers.find(h => h.toLowerCase() === 'event_attendees_' || h.toLowerCase().includes('attendee')) || headers[1];
      const yearCol = headers.find(h => h.toLowerCase() === 'event_year' || h.toLowerCase().includes('year')) || headers[2];
      const catCol = headers.find(h => h.toLowerCase() === 'event_main_category' || h.toLowerCase().includes('category')) || headers[3];
      const studentIndCol = headers.find(h => h.toLowerCase() === 'event_student_ind' || h.toLowerCase().includes('student_ind')) || headers[4];

      const validEvents = data.filter(row => row[yearCol] && String(row[yearCol]).trim() !== '');
      eventYears = [...new Set(validEvents.map(r => String(r[yearCol]).trim()))].filter(Boolean).sort().reverse();

      const specCol = headers.find(h => h.toLowerCase() === 'event_specialization') || headers.find(h => h.toLowerCase().includes('specialization'));
      
      console.log('[KPI 6.1/6.2] Event processing diagnostic:', {
        totalRows: data.length,
        validEvents: validEvents.length,
        specCol,
        selectedPrograms,
        selectedCalendarYear
      });

      const programFilteredEvents = validEvents.filter((row, idx) => {
        if (selectedPrograms.includes('All')) return true;
        if (!specCol) return true;
        const rowSpec = String(row[specCol] || '').trim();
        const match = matchesProgram(rowSpec);
        if (idx < 5 || (rowSpec.includes('BBMS'))) {
          console.log(`[KPI 6.1/6.2] Row ${idx} Program Match: "${rowSpec}" vs ${JSON.stringify(selectedPrograms)} -> ${match}`);
        }
        return match;
      });

      console.log(`[KPI 6.1/6.2] Events after program filter: ${programFilteredEvents.size || programFilteredEvents.length}`);

      const filteredEvents = programFilteredEvents.filter(row => {
        const matchYear = selectedCalendarYear === 'All' || String(row[yearCol]).trim() === selectedCalendarYear;
        return matchYear;
      });

      let kpi61Count = 0;
      let kpi62Count = 0;

      const seenAcademic = new Set();
      const seenCommunity = new Set();
      // Prioritize specific Event ID or Title columns for deduplication
      const eventIdCol = headers.find(h => h === 'event_id' || h.includes('event_id')) || 
                        headers.find(h => h.includes('id') && h.includes('event')) ||
                        headers.find(h => h === 'event_name' || h === 'title') ||
                        headers.find(h => h.includes('title') || h.includes('name')) || null;

      filteredEvents.forEach((row, idx) => {
        const type = String(row[typeCol] || '').trim().toUpperCase();
        const attendeesStr = String(row[attendeesCol] || '').trim().toUpperCase();
        const category = String(row[catCol] || '').trim().toUpperCase();
        const studentInd = String(row[studentIndCol] || '').trim().toUpperCase();
        const eventId = eventIdCol ? String(row[eventIdCol]).trim() : JSON.stringify(row);
        
        // Helper to check if any provided attendees match the qualifying list
        const hasAttendee = (qualifying) => {
          if (!attendeesStr) return false;
          // Split by common delimiters in case multiple attendees are listed
          const parts = attendeesStr.split(/[\s,;/]+/).map(p => p.trim());
          return parts.some(p => qualifying.includes(p));
        };

        // KPI 6.1: Academic Events (AE) + Student Participation (Y)
        const isAcademic = (category === 'AE') && (studentInd === 'Y') && (
          (type === 'WS' && hasAttendee(['C', 'D', 'E', 'F', 'G', 'H'])) ||
          (type === 'CN' && hasAttendee(['G', 'H'])) ||
          (type === 'LC' && hasAttendee(['D', 'E', 'F', 'G', 'H'])) ||
          (['CM', 'SM', 'SYM', 'EF', 'CE', 'NE', 'CO', 'PD', 'WB', 'EP', 'PL', 'VL', 'FC', 'OT'].includes(type) && hasAttendee(['E', 'F', 'G', 'H']))
        );
        
        if (isAcademic && eventId) seenAcademic.add(eventId);

        // KPI 6.2: Community Engagement Events (CE)
        const isCommunity = (category === 'CE') && (
          (type === 'EP' && hasAttendee(['D', 'E', 'F', 'G', 'H'])) ||
          (['VL', 'CO', 'FC'].includes(type) && hasAttendee(['B', 'C', 'D', 'E', 'F', 'G', 'H'])) ||
          (['CE', 'PL'].includes(type) && hasAttendee(['E', 'F', 'G', 'H'])) ||
          (['CN', 'WS', 'CM', 'SM', 'SYM', 'LC', 'EF', 'NE', 'PD', 'WB', 'OT'].includes(type) && hasAttendee(['E', 'F', 'G', 'H']))
        );
        if (isCommunity && eventId) seenCommunity.add(eventId);

        if (idx < 10) {
           console.log(`[KPI 6.1/6.2] Row ${idx} Details:`, { category, type, studentInd, attendeesStr, isAcademic, isCommunity });
        }
      });

      const nameCol = headers.find(h => h.includes('event_name') || h === 'title' || h.includes('title')) || headers[0];
      const deptCol = headers.find(h => h.includes('event_department') || h.includes('dept') || h.includes('college')) || headers[1];

      const allEventsList = filteredEvents.map(row => {
        const type = String(row[typeCol] || '').trim().toUpperCase();
        const attendeesStr = String(row[attendeesCol] || '').trim().toUpperCase();
        const category = String(row[catCol] || '').trim().toUpperCase();
        const studentInd = String(row[studentIndCol] || '').trim().toUpperCase();
        
        const hasAttendee = (qualifying) => {
          if (!attendeesStr) return false;
          const parts = attendeesStr.split(/[\s,;/]+/).map(p => p.trim());
          return parts.some(p => qualifying.includes(p));
        };

        const isAcademic = (category === 'AE') && (studentInd === 'Y') && (
          (type === 'WS' && hasAttendee(['C', 'D', 'E', 'F', 'G', 'H'])) ||
          (type === 'CN' && hasAttendee(['G', 'H'])) ||
          (type === 'LC' && hasAttendee(['D', 'E', 'F', 'G', 'H'])) ||
          (['CM', 'SM', 'SYM', 'EF', 'CE', 'NE', 'CO', 'PD', 'WB', 'EP', 'PL', 'VL', 'FC', 'OT'].includes(type) && hasAttendee(['E', 'F', 'G', 'H']))
        );

        const isCommunity = (category === 'CE') && (
          (type === 'EP' && hasAttendee(['D', 'E', 'F', 'G', 'H'])) ||
          (['VL', 'CO', 'FC'].includes(type) && hasAttendee(['B', 'C', 'D', 'E', 'F', 'G', 'H'])) ||
          (['CE', 'PL'].includes(type) && hasAttendee(['E', 'F', 'G', 'H'])) ||
          (['CN', 'WS', 'CM', 'SM', 'SYM', 'LC', 'EF', 'NE', 'PD', 'WB', 'OT'].includes(type) && hasAttendee(['E', 'F', 'G', 'H']))
        );

        return {
          ...row,
          name: row[nameCol],
          dept: row[deptCol],
          year: row[yearCol],
          type: row[typeCol],
          attendees: row[attendeesCol],
          isAcademicCounted: isAcademic ? 'Yes' : 'No',
          isCommunityCounted: isCommunity ? 'Yes' : 'No'
        };
      });

      kpi61Data.value = seenAcademic.size;
      kpi61Data.events = allEventsList.filter(e => e.isAcademicCounted === 'Yes');
      kpi62Data.value = seenCommunity.size;
      kpi62Data.events = allEventsList.filter(e => e.isCommunityCounted === 'Yes');

      const yrGroups = {};
      programFilteredEvents.forEach(row => {
        const yr = String(row[yearCol]).trim();
        if (yr) { if (!yrGroups[yr]) yrGroups[yr] = []; yrGroups[yr].push(row); }
      });
      const sortedYrs = Object.keys(yrGroups).sort();
      kpi61Data.trend = sortedYrs.map(yr => {
        const rows = yrGroups[yr];
        const seen = new Set();
        rows.forEach(r => {
          const t = String(r[typeCol] || '').trim().toUpperCase();
          const aStr = String(r[attendeesCol] || '').trim().toUpperCase();
          const c = String(r[catCol] || '').trim().toUpperCase();
          const s = String(r[studentIndCol] || '').trim().toUpperCase();
          const id = eventIdCol ? String(r[eventIdCol]).trim() : JSON.stringify(r);
          
          const parts = aStr.split(/[\s,;/]+/).map(p => p.trim());
          const hasAtt = (qualifying) => parts.some(p => qualifying.includes(p));

          const isA = (c === 'AE') && (s === 'Y') && (
            (t === 'WS' && hasAtt(['C', 'D', 'E', 'F', 'G', 'H'])) || 
            (t === 'CN' && hasAtt(['G', 'H'])) || 
            (t === 'LC' && hasAtt(['D', 'E', 'F', 'G', 'H'])) || 
            (['CM', 'SM', 'SYM', 'EF', 'CE', 'NE', 'CO', 'PD', 'WB', 'EP', 'PL', 'VL', 'FC', 'OT'].includes(t) && hasAtt(['E', 'F', 'G', 'H']))
          );
          if (isA && id) seen.add(id);
        });
        return { year: yr, value: seen.size };
      });
      kpi62Data.trend = sortedYrs.map(yr => {
        const rows = yrGroups[yr];
        const seen = new Set();
        rows.forEach(r => {
          const t = String(r[typeCol] || '').trim().toUpperCase();
          const a = String(r[attendeesCol] || '').trim().toUpperCase();
          const c = String(r[catCol] || '').trim().toUpperCase();
          const id = eventIdCol ? String(r[eventIdCol]).trim() : JSON.stringify(r);
          const isC = (c === 'CE') && ((t === 'EP' && ['D', 'E', 'F', 'G', 'H'].includes(a)) || (['VL', 'CO', 'FC'].includes(t) && ['B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(a)) || (['CE', 'PL'].includes(t) && ['E', 'F', 'G', 'H'].includes(a)) || (['CN', 'WS', 'CM', 'SM', 'SYM', 'LC', 'EF', 'NE', 'PD', 'WB', 'OT'].includes(t) && ['E', 'F', 'G', 'H'].includes(a)));
          if (isC && id) seen.add(id);
        });
        return { year: yr, value: seen.size };
      });
    }

    return { 
      records: alumniResult.records, 
      programs: allPrograms, 
      gradYears: alumniResult.gradYears, 
      academicYears: combinedAcademicYears,
      cohorts: eCohorts,
      stats: { 
        ...alumniResult,
        kpi22: kpi22Data,
        kpi26: kpi26Data,
        kpi23: kpi23Data,
        kpi33: kpi33Data,
        kpi41: kpi41Data,
        kpi42: kpi42Data,
        kpi43: kpi43Data,
        kpi44: kpi44Data,
        kpi45: kpi45Data,
        kpi54: kpi54Data,
        kpi61: kpi61Data,
        kpi62: kpi62Data,
        calendarYears: [...new Set([...publicationYears, ...projectStartYears, ...eventYears])].filter(Boolean).sort().reverse(),
        totalAlumni: alumniResult.totalAlumni,
        responseRate: alumniResult.responseRate,
        totalStudents,
        publicationYears,
        projectStartYears
      },
      diagnostic: {
        docName: alumniDoc?.name || preceptorDoc?.name || enrollmentDoc?.name,
        enrollmentDiag
      }
    };
    };

    const results = compute();
    setDashboardData(results);
      } catch (err) {
        console.error("[DMU Analytics] Fatal Error in data processing:", err);
        setDashboardData({
          records: [],
          programs: [],
          gradYears: [],
          academicYears: [],
          cohorts: [],
          stats: null,
          error: err?.message || "Unknown error"
        });
      } finally {
        setIsCalculatingData(false);
      }
    }, 50);
    return () => clearTimeout(timerId);
  }, [documents, parsedDocs, selectedPrograms, selectedGradYear, selectedAcademicYear, selectedCohort, selectedCalendarYear, matchesProgram, matchesAnyProgram, matchesProgramTokens]);

  // --- POWERPOINT EXPORT LOGIC ---
  const downloadPowerPoint = useCallback(() => {
    // Note: PptxGenJS is loaded via CDN in index.html and attached to window
    const PptxGen = window.PptxGenJS || window.pptxgen;
    if (!PptxGen) {
      alert("PowerPoint library is still loading. Please try again in a moment.");
      return;
    }

    const pptx = new PptxGen();
    pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
    pptx.layout = 'WIDE';

    // 1. Title Slide
    let titleSlide = pptx.addSlide();
    titleSlide.background = { color: 'FFFFFF' };
    titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.5, fill: { color: '4338CA' } });
    
    titleSlide.addText("OBEF Performance Dashboard", { 
      x: 1, y: 2.5, w: 11.33, h: 1.5, 
      fontSize: 44, bold: true, color: '1E293B', align: 'center',
      fontFace: 'Arial'
    });
    
    titleSlide.addText(`Comprehensive Analysis Report • ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, { 
      x: 1, y: 4, w: 11.33, h: 0.5, 
      fontSize: 18, color: '64748B', align: 'center',
      fontFace: 'Arial'
    });

    if (!selectedPrograms.includes('All')) {
      titleSlide.addText(`Programs: ${selectedPrograms.join(', ')}`, { 
        x: 1, y: 5, w: 11.33, h: 0.5, 
        fontSize: 14, color: '94A3B8', align: 'center',
        fontFace: 'Arial', italic: true
      });
    }

    // 2. KPI Slides
    KPI_METADATA.forEach(pillar => {
      pillar.kpis.forEach(kpi => {
        const kpiNo = kpi.no;
        const kpiKey = `kpi${kpiNo.replace('.', '')}`;
        const data = dashboardData.stats?.[kpiKey];
        const config = KPI_CONFIG[kpiNo] || { title: kpi.title, denomLabel: 'Denominator', numLabel: 'Numerator' };
        
        if (!shouldRenderKPI(`KPI ${kpiNo}`, data, !selectedPrograms.includes('All'))) return;

        let slide = pptx.addSlide();
        
        // Header Bar
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: 'F8FAFC' } });
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.78, w: '100%', h: 0.02, fill: { color: 'E2E8F0' } });
        
        slide.addText(pillar.pillar.toUpperCase(), { 
          x: 0.5, y: 0.15, w: 12.33, h: 0.2, 
          fontSize: 10, color: '6366F1', bold: true, tracking: 2 
        });
        
        slide.addText(`KPI ${kpiNo}: ${config.title || kpi.title}`, { 
          x: 0.5, y: 0.35, w: 12.33, h: 0.4, 
          fontSize: 24, color: '1E293B', bold: true 
        });

        // Main Metric Area (Shrunk Boxes)
        // Box 1: Denominator
        slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.2, w: 2.2, h: 1.0, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 } });
        slide.addText(config.denomLabel.toUpperCase(), { x: 0.6, y: 1.3, w: 2.0, h: 0.2, fontSize: 8, color: '64748B', bold: true });
        slide.addText(String(data.denominator || 0), { x: 0.6, y: 1.5, w: 2.0, h: 0.6, fontSize: 24, color: '1E293B', bold: true, align: 'center' });

        // Box 2: Numerator
        slide.addShape(pptx.ShapeType.rect, { x: 2.9, y: 1.2, w: 2.2, h: 1.0, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 } });
        slide.addText(config.numLabel.toUpperCase(), { x: 3.0, y: 1.3, w: 2.0, h: 0.2, fontSize: 8, color: '64748B', bold: true });
        slide.addText(String(data.numerator || 0), { x: 3.0, y: 1.5, w: 2.0, h: 0.6, fontSize: 24, color: '1E293B', bold: true, align: 'center' });

        // Box 3: KPI Value (Main Highlight)
        const highlightColor = '4F46E5';
        const unit = (kpiNo === '2.3' || kpiNo === '2.4' || kpiNo === '4.1' || kpiNo === '4.2' || kpiNo === '4.6' || kpiNo === '6.1' || kpiNo === '6.2') ? '' : '%';
        slide.addShape(pptx.ShapeType.rect, { x: 5.3, y: 1.2, w: 2.2, h: 1.0, fill: { color: 'EEF2FF' }, line: { color: 'C7D2FE', width: 2 } });
        slide.addText("KPI VALUE", { x: 5.4, y: 1.3, w: 2.0, h: 0.2, fontSize: 8, color: highlightColor, bold: true, align: 'center' });
        slide.addText(`${data.value || 0}${unit}`, { x: 5.4, y: 1.5, w: 2.0, h: 0.6, fontSize: 24, color: highlightColor, bold: true, align: 'center' });

        // Strategic Action Progress (Replaces generic status box)
        let periodFilter = 'All';
        if (['1.1', '1.2', '2.4', '2.5', '3.1'].includes(kpiNo)) periodFilter = selectedGradYear;
        else if (['2.2'].includes(kpiNo)) periodFilter = selectedCohort;
        else if (['2.3', '2.6', '3.3', '4.4'].includes(kpiNo)) periodFilter = selectedAcademicYear;
        else if (['4.1', '4.2', '4.3', '4.5', '5.4', '6.1', '6.2'].includes(kpiNo)) periodFilter = selectedCalendarYear;

        const relevantPlan = allActionPlans.find(p => {
          const matchKpi = p.kpi_no === kpiNo;
          const matchPeriod = periodFilter === 'All' || String(p.target_period) === String(periodFilter);
          
          let planProgs = [];
          if (Array.isArray(p.program)) planProgs = p.program;
          else if (typeof p.program === 'string' && p.program) planProgs = p.program.split(',').map(s => s.trim());
          
          let matchProg = false;
          if (selectedPrograms.includes('All')) {
            matchProg = planProgs.length === 0 || planProgs.includes('All') || planProgs.includes('Institution Level');
          } else {
            matchProg = planProgs.some(pg => selectedPrograms.includes(pg));
          }
          
          return matchKpi && matchPeriod && matchProg;
        });

        // Status Indicator (Always show on every slide)
        const isProg = !selectedPrograms.includes('All');
        const calculatedStatus = getKPIStatus(kpiNo, data.value, isProg);
        const status = calculatedStatus?.label || 'N/A';
        const sColor = calculatedStatus?.color || 'indigo';
        
        // Match status colors from UI
        const statusColors = {
          emerald: { text: '059669', bg: 'ECFDF5' },
          amber: { text: 'D97706', bg: 'FFFBEB' },
          orange: { text: 'EA580C', bg: 'FFF7ED' },
          rose: { text: 'E11D48', bg: 'FFF1F2' },
          indigo: { text: '4F46E5', bg: 'EEF2FF' }
        };
        const activeColors = statusColors[sColor] || statusColors.indigo;
        
        // Add a small status badge next to the KPI title
        slide.addShape(pptx.ShapeType.roundRect, { x: 10.3, y: 0.35, w: 2.5, h: 0.4, fill: { color: activeColors.bg }, line: { color: activeColors.text, width: 1 }, rectRadius: 0.2 });
        slide.addText(status.toUpperCase(), { x: 10.3, y: 0.35, w: 2.5, h: 0.4, fontSize: 14, color: activeColors.text, bold: true, align: 'center' });

        // Strategic Action Progress (Even Larger Column on Right)
        slide.addText("STRATEGIC ACTION PROGRESS", { x: 8.0, y: 0.9, w: 4.8, h: 0.3, fontSize: 10, color: '6366F1', bold: true, align: 'center' });
        
        if (relevantPlan && Array.isArray(relevantPlan.actions) && relevantPlan.actions.length > 0) {
          relevantPlan.actions.slice(0, 8).forEach((action, idx) => {
            let maxProgress = 0;
            if (action.timeline && Array.isArray(action.timeline)) {
              action.timeline.forEach(year => {
                ['q1','q2','q3','q4'].forEach(q => {
                  const p = parseInt(year[q]?.progress) || 0;
                  if (p > maxProgress) maxProgress = p;
                });
              });
            }
            
            const actionY = 1.2 + (idx * 0.72);
            slide.addShape(pptx.ShapeType.rect, { x: 8.0, y: actionY, w: 4.8, h: 0.65, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 } });
            slide.addText(action.details || 'Action Item', { x: 8.1, y: actionY, w: 4.0, h: 0.65, fontSize: 8, color: '475569', valign: 'middle' });
            slide.addText(`${maxProgress}%`, { x: 12.1, y: actionY, w: 0.6, h: 0.65, fontSize: 11, color: '6366F1', bold: true, align: 'right', valign: 'middle' });
          });
        } else {
          slide.addShape(pptx.ShapeType.rect, { x: 8.0, y: 1.2, w: 4.8, h: 1.2, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 } });
          slide.addText("N/A", { x: 8.1, y: 1.5, w: 4.6, h: 0.6, fontSize: 24, color: 'CBD5E1', bold: true, align: 'center' });
        }

        // Historical Trend as Line Chart (Last 3 Years Only)
        let trend = dashboardData.stats?.trends?.[kpiKey] || data.trend || [];
        if (trend && Array.isArray(trend) && trend.length > 0) {
          slide.addText("HISTORICAL PERFORMANCE TREND (LAST 3 YEARS)", { x: 0.5, y: 2.5, w: 7.0, h: 0.3, fontSize: 10, color: '64748B', bold: true });
          
          const last3Trend = trend.slice(-3);
          const chartData = [
            {
              name: "Performance",
              labels: last3Trend.map(t => String(t.year || t.label)),
              values: last3Trend.map(t => t.value || 0)
            }
          ];
          
          slide.addChart(pptx.ChartType.line, chartData, { 
            x: 0.5, y: 2.8, w: 7.0, h: 4.2,
            showTitle: false,
            showLegend: false,
            valAxisLabelFontSize: 8,
            catAxisLabelFontSize: 8,
            lineDataSymbol: 'circle',
            lineDataSymbolSize: 6,
            dataLabelFontSize: 9,
            showValue: true,
            chartColors: ['6366F1']
          });
        }

        // Footer
        slide.addText(`DMU Quality Assurance Hub • Generated on ${new Date().toLocaleDateString()}`, { x: 0.5, y: 7.1, w: 12.33, h: 0.2, fontSize: 8, color: 'CBD5E1', align: 'right' });
      });
    });

    pptx.writeFile({ fileName: `DMU_Performance_Report_${new Date().toISOString().split('T')[0]}.pptx` });
  }, [dashboardData, selectedPrograms, shouldRenderKPI, allActionPlans, selectedGradYear, selectedCohort, selectedAcademicYear, selectedCalendarYear]);

  return (
    <ErrorBoundary>
      <div className="flex h-full min-h-[800px] w-full bg-slate-50 text-slate-800 font-sans overflow-hidden border border-slate-200 rounded-xl print:h-auto print:min-h-0 print:overflow-visible print:border-none print:block">
      
      {/* Sidebar Navigation & Config */}
      {/* Sidebar Navigation & Config */}
      {!isPublic && (
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 shadow-sm z-10 hidden md:flex">
          <div className="p-5 border-b border-slate-100 flex items-center space-x-3 bg-indigo-700 text-white">
            <Database className="w-6 h-6" />
            <div>
              <h1 className="font-bold text-lg tracking-tight">DMU Analytics</h1>
              <p className="text-indigo-200 text-xs font-medium">Interactive Platform</p>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {/* Navigation */}
            <div className="mb-8">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Applications</h2>
              <nav className="space-y-1">
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>OBEF KPIs</span>
                </button>

                <button 
                  onClick={() => setActiveTab('corrective-action')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'corrective-action' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Corrective Action Plans</span>
                </button>

                <button 
                  onClick={() => setActiveTab('benchmarking')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'benchmarking' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>Benchmarking</span>
                </button>
              </nav>
            </div>

            {/* Drive Connection Status */}
            <div className="mb-6">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Data Source</h2>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center text-slate-700 font-medium text-xs mb-3">
                  {isSyncing ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-2 text-indigo-500 animate-spin" /> Syncing Google Drive...</>
                  ) : documents.length > 0 ? (
                    <><CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Drive Connected</>
                  ) : (
                    <><Folder className="w-3.5 h-3.5 mr-2 text-indigo-500" /> Pending Connection</>
                  )}
                </div>
                <button 
                  onClick={() => syncDriveFolder(true)}
                  disabled={isSyncing}
                  className="w-full py-1.5 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3 mr-2" /> Refresh Data
                </button>
              </div>
              {authError && (
                <div className="mt-2 text-[10px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 leading-tight">
                  {authError}
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

{/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative overflow-hidden print:overflow-visible print:h-auto print:block">
        
        {/* --- BENCHMARKING VIEW --- */}
        {activeTab === 'benchmarking' && (
          <div className="flex-1 overflow-y-auto">
            <Benchmarking initialPage="dashboard" />
          </div>
        )}

        {/* --- CORRECTIVE ACTION PLAN VIEW --- */}
        {activeTab === 'corrective-action' && (
          <div className="flex-1 overflow-y-auto">
            <CorrectiveActionPlan 
              session={session} 
              userMeta={userMeta} 
              dashboardData={dashboardData} 
              programs={dashboardData?.programs || []} 
              prefillData={capPrefill}
              onPrefillClear={() => setCapPrefill(null)}
              onCalculateTrend={(kpiNo, f) => {
                const programs = f.programs || 'All';
                // --- 1. Smart Document Discovery ---
                const alumniDoc = documents.find(d => d.type === 'csv' && d.name?.toLowerCase().includes('alumni')) 
                               || documents.find(d => d.type === 'csv' && d.name && !d.name.toLowerCase().includes('preceptor') && !d.name.toLowerCase().includes('cohort') && !d.name.toLowerCase().includes('research'));
                const enrollmentDoc = documents.find(d => d.type === 'csv' && d.name && (d.name.toLowerCase().includes('cohort') || d.name.toLowerCase().includes('enrollment')));
                const attDoc = documents.find(d => d.id?.endsWith('_attrition')) || documents.find(d => d.type === 'csv' && d.name?.toLowerCase().includes('attrition'));
                const exitSurveyQDoc = documents.find(d => (d.type === 'csv' || d.type === 'json') && d.name && d.name.toLowerCase().includes('exit survey') && d.name.toLowerCase().includes('questionnaire'));
                const preceptorDoc = documents.find(d => d.type === 'csv' && d.name?.toLowerCase().includes('preceptor'));
                const teachingAssignmentDoc = documents.find(d => d.type === 'csv' && d.name?.toLowerCase().includes('teaching assignment'));
                const scopusDoc = documents.find(d => d.type === 'csv' && d.name && (d.name.toLowerCase().includes('scopus') || d.name.toLowerCase().includes('publication')));
                const facultyDoc = documents.find(d => d.type === 'csv' && d.name && d.name.toLowerCase().includes('faculty') && !d.name.toLowerCase().includes('teaching'));
                const projDoc = documents.find(d => d.type === 'csv' && d.name?.toLowerCase().includes('research project'));
                const studResDoc = documents.find(d => d.type === 'csv' && d.name?.toLowerCase().includes('student participation'));

                // --- 2. Independent Calculation Blocks ---

                const matchesProg = (val) => {
                  if (programs === 'All') return true;
                  if (!val) return false;
                  const parts = String(val).split(',').map(p => p.replace(/['"]/g, '').trim().toLowerCase());
                  const sel = Array.isArray(programs) ? programs : [programs];
                  const selLower = sel.map(p => p.replace(/['"]/g, '').trim().toLowerCase());
                  return parts.some(p => selLower.includes(p));
                };

                // Alumni Data KPIs
                if (['1.1', '1.2', '2.4', '2.5', '3.1'].includes(kpiNo) && alumniDoc) {
                    const { headers, data } = parseCSV(alumniDoc.content);
                    const pCol = headers.find(h => h.includes('program') || h.includes('major')) || headers[0];
                    const gyCol = headers.find(h => h.includes('graduation')) || headers.find(h => h.includes('cohort'));
                    const wCol = headers.find(h => h.includes('working'));
                    const sCol = headers.find(h => h.includes('studying'));
                    const rCol = headers.find(h => h.includes('relevant') && h.includes('job'));
                    const lCol = headers.find(h => h.includes('licensed')) || headers.find(h => h.toLowerCase().includes('license'));
                    const wpCol = headers.find(h => h.includes('workplacement'));
                    const skillCols = ['technical_skills_1', 'technical_skills_2', 'soft_skills_1', 'soft_skills_2', 'preparedness_1', 'preparedness_2', 'adaptability_1', 'adaptability_2'].map(sc => headers.find(h => h.includes(sc))).filter(Boolean);
                    
                    const isR = (r) => (wCol ? String(r[wCol]||'').trim() : '') !== '' || (sCol ? String(r[sCol]||'').trim() : '') !== '';
                    const isE = (r) => { const w = wCol ? String(r[wCol]||'').toLowerCase().trim() : ''; const s = sCol ? String(r[sCol]||'').toLowerCase().trim() : ''; const iA = (v) => v !== '' && !['no','n/a','none','false','-','0'].includes(v); return iA(w) || iA(s); };
                    
                    const filtered = data.filter(r => { 
                        if (!r[gyCol]) return false; 
                        if (!matchesProg(r[pCol])) return false;
                        return true; 
                    });
                    const grps = {}; filtered.forEach(r => { const yr = String(r[gyCol]).replace(/\.0$/, '').trim(); if (yr) { if (!grps[yr]) grps[yr] = []; grps[yr].push(r); } });
                    const sorted = Object.keys(grps).sort();

                    if (kpiNo === '1.1') return sorted.map(y => { let r=0,e=0; grps[y].forEach(x=>{if(isR(x)){r++;if(isE(x))e++;}}); return {year:y, denominator:r, numerator:e, value:parseFloat((r>0?(e/r*100):0).toFixed(1))}; });
                    if (kpiNo === '1.2') return sorted.map(y => { let yes=0,tot=0; grps[y].forEach(x=>{if(rCol){const v=String(x[rCol]||'').toLowerCase().trim(); if(v==='yes'){yes++;tot++;}else if(v==='no')tot++;}}); return {year:y, denominator:tot, numerator:yes, value:parseFloat((tot>0?(yes/tot*100):0).toFixed(1))}; });
                    if (kpiNo === '2.4') return sorted.map(y => { let sum=0,cnt=0; grps[y].forEach(x=>{if(skillCols.length>0){let rs=0,rc=0;skillCols.forEach(c=>{const v=parseFloat(x[c]);if(!isNaN(v)){rs+=v;rc++;}});if(rc>0){sum+=rs/rc;cnt++;}}}); return {year:y, denominator:cnt, numerator:parseFloat((cnt>0?sum/cnt:0).toFixed(1)), value:parseFloat((cnt>0?sum/cnt:0).toFixed(1))}; });
                    if (kpiNo === '2.5') return sorted.map(y => { let yes=0,tot=0; grps[y].forEach(x=>{if(lCol){const v=String(x[lCol]||'').toUpperCase().trim(); if(v==='EP'){yes++;tot++;}else if(v==='IP')tot++;}}); return {year:y, denominator:tot, numerator:yes, value:parseFloat((tot>0?(yes/tot*100):0).toFixed(1))}; });
                    if (kpiNo === '3.1') return sorted.map(y => { let yes=0,tot=0; grps[y].forEach(x=>{if(wpCol){const v=String(x[wpCol]||'').toLowerCase().trim(); if(v==='yes'){yes++;tot++;}else if(v==='no')tot++;}}); return {year:y, denominator:tot, numerator:yes, value:parseFloat((tot>0?(yes/tot*100):0).toFixed(1))}; });
                }

                // Retention (2.2)
                if (kpiNo === '2.2' && enrollmentDoc) {
                    const { headers: eh, data: ed } = parseCSV(enrollmentDoc.content);
                    const aCol = eh.find(h => h === 'academic_year') || eh.find(h => h.includes('std_03_academic_period')) || eh.find(h => h.includes('academic') || h.includes('year'));
                    const sCol = eh.find(h => h === 'ID') || eh.find(h => h.includes('std_04_student_id')) || eh.find(h => h.includes('student') && h.includes('id')) || eh[0];
                    const mCol = eh.find(h => h === 'major') || eh.find(h => h === 'program') || eh.find(h => h.includes('std_30_student_major')) || eh.find(h => h.includes('major')) || eh.find(h => h.includes('program')) || eh.find(h => h.includes('degree'));
                    const cohortCol = eh.find(h => h.toLowerCase().includes('batch')) || eh.find(h => h.toLowerCase().includes('cohort')) || eh.find(h => h.toLowerCase().includes('std_18_cohort'));
                    const attritionDoc = documents.find(d => d.id.endsWith('_attrition'));
                    const attParsed = attritionDoc ? parseCSV(attritionDoc.content) : null;
                    const attIdCol = attParsed ? (attParsed.headers.find(h => h === 'student_id') || attParsed.headers.find(h => h === 'id') || attParsed.headers.find(h => h.includes('student') && h.includes('id')) || attParsed.headers[0]) : '';
                    const attStatusCol = attParsed ? (attParsed.headers.find(h => h.includes('status')) || 'status') : '';

                    const fEd = ed.filter(r => matchesProg(r[mCol]));
                    const cohorts = [...new Set(ed.map(r => String(r[cohortCol] || '').trim()))].filter(Boolean).sort().reverse().slice(0, 5);
                    
                    return cohorts.reverse().map(cStr => {
                      const cYear = parseInt(cStr, 10);
                      const joiningAY = cYear > 0 ? `${cYear}/${cYear + 1}` : '';
                      const baselineIds = [...new Set(fEd.filter(r => {
                          if (String(r[cohortCol]||'').trim() !== cStr) return false;
                          if (joiningAY && aCol && getStartYear(r[aCol]) !== cYear) return false;
                          return true;
                      }).map(r => normalizeId(r[sCol])).filter(Boolean))];
                      
                      let ret = 0; 
                      baselineIds.forEach(id => { 
                        const future = fEd.find(r => normalizeId(r[sCol]) === id && getStartYear(r[aCol]) > cYear);
                        const isBreak = attParsed?.data.find(r => {
                           if (normalizeId(r[attIdCol]) !== id) return false;
                           const s = String(r[attStatusCol]||'').toLowerCase();
                           return s.includes('break') || s.includes('leave') || s.includes('postpone') || s.includes('suspend');
                        });
                        if (future || isBreak) ret++; 
                      });
                      return { year: cStr, denominator: baselineIds.length, numerator: ret, value: baselineIds.length > 0 ? parseFloat(((ret / baselineIds.length) * 100).toFixed(1)) : 0 };
                    });
                }

                // Projects (4.3, 4.4, 4.5, 5.4)
                if (['4.3', '4.4', '4.5', '5.4'].includes(kpiNo)) {
                    if (['4.3', '4.5', '5.4'].includes(kpiNo) && projDoc && teachingAssignmentDoc) {
                        const { headers: ph, data: pd } = parseCSV(projDoc.content);
                        const { headers: th, data: td } = parseCSV(teachingAssignmentDoc.content);
                        const piCol = ph.find(h => h.includes('pi') && h.includes('id')) || ph[0];
                        const yrCol = ph.find(h.toLowerCase().includes('year')) || ph[1];
                        const stCol = ph.find(h.toLowerCase().includes('status'));
                        const indCol = ph.find(h.toLowerCase().includes('industry'));
                        const intCol = ph.find(h.toLowerCase().includes('international'));
                        const impCol = ph.find(h.toLowerCase().includes('impact'));
                        const fidCol = th.find(h.toLowerCase().includes('faculty') && h.toLowerCase().includes('id')) || 'faculty_id';
                        const pCol = th.find(h.toLowerCase().includes('program')) || 'program';
                        const ayCol = th.find(h.toLowerCase().includes('academic')) || 'academic_year';
                        const tFacultyIdCol = th.find(h => h.toLowerCase().includes('faculty') && h.toLowerCase().includes('id')) || 'faculty_id';
                        const tProgCol = th.find(h.toLowerCase().includes('program')) || 'program';
                        const tAYCol = th.find(h.toLowerCase().includes('academic')) || 'academic_year';
                        const tP = []; pd.forEach(row => {
                          const st = String(row[stCol] || '').trim().toLowerCase();
                          if (st !== 'approved' && st !== 'for submission' && st !== 'for submission only') return;
                          
                          const yr = String(row[yrCol]||'').trim(); if (!yr) return;
                          
                          const piId = normalizeId(row[piCol]);
                          const mappedAY = `${yr}/${parseInt(yr) + 1}`;
                          let matches = td.filter(tr => normalizeId(tr[tFacultyIdCol]) === piId && normalizeAcademicYear(tr[tAYCol]) === mappedAY);
                          if (matches.length === 0) {
                             const fAY = `${parseInt(yr)-1}/${yr}`;
                             matches = td.filter(tr => normalizeId(tr[tFacultyIdCol]) === piId && normalizeAcademicYear(tr[tAYCol]) === fAY);
                          }
                          
                          let pass = programs.length === 0;
                          if (!pass && piId) {
                             pass = matches.some(m => matchesProg(m[tProgCol]));
                          }
                          
                          if (pass) tP.push({ yr, ind: String(row[indCol]||'').toUpperCase().includes('Y'), int: String(row[intCol]||'').toUpperCase().includes('Y') || String(row[intCol]||'').toLowerCase().includes('international'), imp: String(row[impCol]||'').toUpperCase().includes('Y') });
                        });
                        const yrs = [...new Set(tP.map(x=>x.yr))].sort();
                        if (kpiNo === '4.3') return yrs.map(y => { const yp = tP.filter(x=>x.yr===y); const ind = yp.filter(x=>x.ind); return { year: y, denominator: yp.length, numerator: ind.length, value: yp.length > 0 ? parseFloat((ind.length/yp.length*100).toFixed(1)) : 0 }; });
                        if (kpiNo === '4.5') return yrs.map(y => { const yp = tP.filter(x=>x.yr===y); const imp = yp.filter(x=>x.imp); return { year: y, denominator: yp.length, numerator: imp.length, value: yp.length > 0 ? parseFloat((imp.length/yp.length*100).toFixed(1)) : 0 }; });
                        if (kpiNo === '5.4') return yrs.map(y => { const yp = tP.filter(x=>x.yr===y); const int = yp.filter(x=>x.int); return { year: y, denominator: yp.length, numerator: int.length, value: yp.length > 0 ? parseFloat((int.length/yp.length*100).toFixed(1)) : 0 }; });
                    }
                    if (kpiNo === '4.4' && studResDoc && enrollmentDoc) {
                        const { headers: eh, data: ed } = parseCSV(enrollmentDoc.content);
                        const { headers: srh, data: srd } = parseCSV(studResDoc.content);
                        
                        const eMajorCol = eh.find(h => h === 'major' || h === 'program' || h.includes('std_30_student_major') || h.includes('major') || h.includes('program') || h.includes('degree'));
                        const eAcadCol = eh.find(h => h === 'academic_year') || eh.find(h.includes('std_03_academic_period')) || eh.find(h => h.includes('academic') || h.includes('year'));
                        const eStudentIdCol = eh.find(h => h === 'ID') || eh.find(h.includes('std_04_student_id')) || eh.find(h => h.includes('student') && h.includes('id')) || eh[0];
                        
                        const srStudentIdCol = srh.find(h => h.includes('sr_student_id')) || srh.find(h => h.includes('student_id') || h.includes('student id')) || srh[0];
                        const srTypeCol = srh.find(h => h.includes('sr_type_of_research')) || srh.find(h => h.includes('type_of_research') || h.includes('type of research'));
                        const impactCols = srh.filter(h => h.includes('impact') || h.includes('indexed_publication') || h.includes('registered_ip'));

                        const hasQualifyingResearch = (row) => {
                            const resType = String(row[srTypeCol] || '').trim().toUpperCase();
                            if (resType === 'FL') return true;
                            return impactCols.some(col => String(row[col] || '').trim().toUpperCase() === 'Y');
                        };

                        const studentsWithQualifyingResearch = new Set();
                        srd.forEach(row => { if (hasQualifyingResearch(row)) studentsWithQualifyingResearch.add(normalizeId(row[srStudentIdCol])); });

                        const grp = {}; 
                        ed.forEach(r => { 
                            if (!matchesProg(r[eMajorCol])) return false; 
                            const ay = normalizeAcademicYear(r[eAcadCol]); 
                            if (ay) { if (!grp[ay]) grp[ay] = []; grp[ay].push(r); } 
                        });

                        return Object.keys(grp).sort().map(ay => { 
                            const yearEnrolled = new Set(grp[ay].map(r => normalizeId(r[eStudentIdCol])).filter(Boolean));
                            let yearResearch = 0;
                            yearEnrolled.forEach(id => { if (studentsWithQualifyingResearch.has(id)) yearResearch++; });
                            return { 
                                year: ay.replace(/\d{2}(\d{2})\/\d{2}(\d{2})/, '$1/$2'), 
                                denominator: yearEnrolled.size, 
                                numerator: yearResearch, 
                                value: yearEnrolled.size > 0 ? parseFloat((yearResearch / yearEnrolled.size * 100).toFixed(1)) : 0 
                            }; 
                        });
                    }
                }

                // Research Output (4.1, 4.2)
                if (['4.1', '4.2'].includes(kpiNo) && scopusDoc && facultyDoc && teachingAssignmentDoc) {
                    const { headers: fh, data: fd } = parseCSV(facultyDoc.content);
                    const { headers: sh, data: sd } = parseCSV(scopusDoc.content);
                    const { headers: th, data: td } = parseCSV(teachingAssignmentDoc.content);
                    
                    const fScopusIdCol = fh.find(h => h.includes('scopus')) || 'scopus_id';
                    const fIdCol = fh.find(h => h.includes('employee') || h.includes('emp_id') || h === 'id') || 'employee_id';
                    const fCatCol = fh.find(h => h.includes('category') || h.includes('type')) || 'category';
                    const fNameCol = fh.find(h => h === 'name' || h.includes('name')) || 'name';
                    const sScopusIdCol = sh.find(h => h.includes('author') && h.includes('id')) || sh.find(h => h.includes('scopus') && h.includes('id')) || 'author id';
                    const sYearCol = sh.find(h => h === 'year' || h.includes('year')) || 'year';
                    const sFwciCol = sh.find(h => h.includes('field-weighted') || h.includes('fwci')) || 'fwci';
                    const tFacultyIdCol = th.find(h => h.includes('faculty') && h.includes('id')) || 'faculty_id';
                    const tProgCol = th.find(h => h === 'program') || th.find(h => h.includes('program') && !h.includes('_')) || 'program';
                    const tAYCol = th.find(h => h === 'academic_year') || th.find(h => h.includes('academic') || h.includes('year'));
                    
                    const tFacultyNameCol = th.find(h => h.includes('faculty') && h.includes('name')) || th.find(h => h === 'name') || th.find(h => h.includes('instructor') || h.includes('lecturer')) || null;
                    
                    const ftFaculty = fd.filter(r => { const cat = String(r[fCatCol]||'').toLowerCase(); return cat.includes('ft') || cat.includes('full time') || cat.includes('full-time'); });
                    const yrs = [...new Set(sd.map(r => String(r[sYearCol]||'').trim()))].filter(Boolean).sort();
                    
                    return yrs.map(y => {
                        if (f.pubYear !== 'All' && y !== String(f.pubYear)) return null;
                        const targetAY = `${y}/${parseInt(y)+1}`;
                        const fAY = `${parseInt(y)-1}/${y}`;
                        
                        const idMap = {};
                        td.forEach(row => { 
                            const rowAY = normalizeAcademicYear(row[tAYCol]);
                            if (rowAY === targetAY || rowAY === fAY) { 
                                const fid = normalizeId(row[tFacultyIdCol]); 
                                const pStr = String(row[tProgCol]||'').trim(); 
                                pStr.split(',').forEach(p => { 
                                    p = p.trim(); 
                                    if (fid && p && p.toUpperCase() !== 'GE') { 
                                        if (!idMap[fid]) idMap[fid] = new Set(); 
                                        idMap[fid].add(p); 
                                    } 
                                }); 
                            } 
                        });
                        
                        const ftInYear = ftFaculty.filter(fac => {
                            const fid = normalizeId(fac[fIdCol]);
                            const fname = normalizeName(fac[fNameCol]);
                            let pSet = new Set();
                            td.forEach(tr => { 
                                const rowAY = normalizeAcademicYear(tr[tAYCol]);
                                if (rowAY === targetAY || rowAY === fAY) { 
                                    const trFid = normalizeId(tr[tFacultyIdCol]);
                                    const trFname = tFacultyNameCol ? normalizeName(tr[tFacultyNameCol]) : null;
                                    if (trFid === fid || (trFname && trFname === fname)) {
                                        const pStr = String(tr[tProgCol]||'').trim(); 
                                        pStr.split(',').forEach(p => { 
                                            p = p.trim(); 
                                            if (p && p.toUpperCase() !== 'GE') pSet.add(p); 
                                        }); 
                                    }
                                } 
                            });
                            const pList = Array.from(pSet);
                            return pList.some(p => matchesProg(p));
                        });
                        
                        const scopusIds = new Set(ftInYear.map(fac => extractScopusId(fac[fScopusIdCol])).filter(Boolean));
                        const pubsInYear = sd.filter(p => String(p[sYearCol]).trim() === y && scopusIds.has(extractScopusId(p[sScopusIdCol])));
                        
                        if (kpiNo === '4.1') return { year: y, denominator: ftInYear.length, numerator: pubsInYear.length, value: ftInYear.length > 0 ? parseFloat((pubsInYear.length / ftInYear.length).toFixed(2)) : 0 };
                        const validFwci = pubsInYear.map(p => parseFloat(p[sFwciCol])).filter(v => !isNaN(v));
                        return { year: y, denominator: pubsInYear.length, numerator: parseFloat((validFwci.length > 0 ? validFwci.reduce((a,b)=>a+b,0)/validFwci.length : 0).toFixed(2)), value: parseFloat((validFwci.length > 0 ? validFwci.reduce((a,b)=>a+b,0)/validFwci.length : 0).toFixed(2)) };
                    }).filter(Boolean);
                }

                // Default Fallback
                const stats = dashboardData?.stats;
                if (stats && typeof stats === 'object') {
                  let res = null;
                  Object.keys(stats).forEach(k => { 
                    if (stats[k] && typeof stats[k] === 'object' && stats[k].trend && k.includes(kpiNo.replace('.',''))) {
                      res = stats[k].trend; 
                    }
                  });
                  if (!res && stats.trends) res = stats.trends[`kpi${kpiNo.replace('.','')}`];
                  if (res) return res;
                }
                return null;
            }}
            />
          </div>
        )}

        {/* --- DASHBOARD VIEW --- */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 print:overflow-visible print:h-auto print:block print:p-0">
            <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">OBEF Dashboard</h2>
                {isPublic && <p className="text-sm text-slate-500 mt-1">Public Interactive Report</p>}
              </div>
              
              <div className="flex items-center gap-3 print:hidden">
                {!isPublic && (
                  <button 
                    onClick={() => {
                      const publicUrl = window.location.origin + '/?view=obef_dashboard';
                      navigator.clipboard.writeText(publicUrl);
                      alert('Public link copied to clipboard: ' + publicUrl);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-sm font-medium"
                  >
                    <Share2 className="w-4 h-4 text-indigo-500" />
                    <span>Share Dashboard</span>
                  </button>
                )}
                <button 
                  onClick={downloadPowerPoint}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-sm font-medium"
                >
                  <Download className="w-4 h-4 text-indigo-500" />
                  <span>Download PPTX</span>
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 text-sm font-medium"
                >
                  <Printer className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            </header>

            <style>{`
              @media print {
                body { background: white !important; }
                .print\\:hidden { display: none !important; }
                .print\\:mb-4 { margin-bottom: 1rem !important; }
                .print\\:shadow-none { box-shadow: none !important; }
                .print\\:p-0 { padding: 0 !important; }
                .print\\:bg-white { background: white !important; }
                .print\\:border-none { border: none !important; }
                
                /* Avoid breaking KPI cards and charts */
                .kpi-card, .chart-container, .data-card, .bg-white { 
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                
                /* Ensure colors are printed */
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                
                /* Remove scrollbars and ensure full height */
                .flex-1, main, .overflow-y-auto { 
                  overflow: visible !important; 
                  height: auto !important;
                  display: block !important;
                }
                
                aside { display: none !important; }
                main { width: 100% !important; margin: 0 !important; padding: 0 !important; }
              }
            `}</style>

            {dashboardData.error ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-white border-2 border-dashed border-rose-200 rounded-[2.5rem] text-center shadow-sm">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Processing Error</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
                  We encountered an error while processing your analytics data. 
                  This usually happens when a required file is missing or has an unexpected format.
                </p>
                <div className="bg-slate-50 p-4 rounded-xl text-left mb-6 w-full max-w-lg overflow-auto border border-slate-100">
                  <p className="text-[10px] font-mono text-rose-600 break-all">{dashboardData.error}</p>
                </div>
                <button 
                  onClick={() => syncDriveFolder(true)}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            ) : !dashboardData.stats ? (
              <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white text-slate-500 shadow-sm animate-in fade-in zoom-in-95 duration-700">
                <div className="relative mb-8">
                   <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-inner">
                      <BarChart3 className="w-10 h-10 animate-pulse" />
                   </div>
                   <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-xl shadow-md border border-slate-100 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                   </div>
                </div>
                
                <div className="text-center space-y-3">
                   <h3 className="text-xl font-black text-slate-800 tracking-tight">Data is Loading</h3>
                   <p className="text-xs text-slate-400 font-medium max-w-[280px] mx-auto leading-relaxed">
                     Synchronizing with Google Drive...
                   </p>
                </div>

                <div className="mt-10 w-64 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50 relative">
                   <div className="absolute inset-0 bg-indigo-600 rounded-full animate-progress-indefinite shadow-lg shadow-indigo-100" style={{ width: '40%' }} />
                </div>
                
                <p className="mt-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Please stay on this page</p>
              </div>
            ) : (
              <div className="space-y-6 max-w-6xl mx-auto">
                
                {/* Filters */}
                <div className="bg-white/95 backdrop-blur-md p-3 px-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-end sticky top-0 z-40 mt-[-8px] pt-3 pb-3">
                  <div className="flex items-center text-sm font-semibold text-slate-700 mr-2">
                    <Filter className="w-4 h-4 mr-2 text-indigo-500" /> Filters
                    {isCalculatingData && <Loader2 className="w-4 h-4 ml-2 text-indigo-500 animate-spin" />}
                  </div>
                  <div className="flex flex-col relative" ref={programDropdownRef}>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 flex items-center">
                      Programs
                      <FilterHint text="Affects ALL KPIs (1.1 - 6.2) by filtering the source data to the selected academic departments." />
                    </label>
                    <button 
                      onClick={() => setShowProgramDropdown(!showProgramDropdown)}
                      className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1 outline-none focus:border-indigo-500 min-w-[180px] flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                      <span className="truncate max-w-[160px]">
                        {selectedPrograms.includes('All') ? 'All Programs' : 
                         selectedPrograms.length === 1 ? selectedPrograms[0] : 
                         `${selectedPrograms.length} Selected`}
                      </span>
                      <Filter className={`w-3 h-3 transition-transform ${showProgramDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showProgramDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2">
                        <div className="max-h-64 overflow-y-auto px-1">
                          <label className="flex items-center space-x-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border-b border-slate-100 mb-1">
                            <input 
                              type="checkbox" 
                              checked={selectedPrograms.includes('All')}
                              onChange={() => React.startTransition(() => setSelectedPrograms(['All']))}
                              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <span className="text-sm font-bold text-indigo-600">All Programs</span>
                          </label>
                          {dashboardData.programs.map(p => (
                            <label key={p} className="flex items-center space-x-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                              <input 
                                type="checkbox" 
                                checked={selectedPrograms.includes(p)}
                                onChange={() => {
                                  let next;
                                  if (selectedPrograms.includes('All')) {
                                    next = [p];
                                  } else if (selectedPrograms.includes(p)) {
                                    next = selectedPrograms.filter(x => x !== p);
                                    if (next.length === 0) next = ['All'];
                                  } else {
                                    next = [...selectedPrograms, p];
                                  }
                                  React.startTransition(() => setSelectedPrograms(next));
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                              />
                              <span className="text-sm font-medium text-slate-700">{p}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 flex items-center">
                      Retention Cohort
                      <FilterHint text="KPI 2.2 (Retention Rate)&#10;Filters based on student intake batch." />
                    </label>
                    <select 
                      value={selectedCohort} 
                      onChange={(e) => { const val = e.target.value; React.startTransition(() => setSelectedCohort(val)); }}
                      className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1 outline-none focus:border-indigo-500 min-w-[110px]"
                    >
                      <option value="All">All Cohorts</option>
                      {dashboardData.cohorts?.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 flex items-center">
                      Graduation Year
                      <FilterHint text="KPI 1.1, 1.2, 2.4, 2.5, 3.1&#10;Filters results for graduates of specific years." />
                    </label>
                    <select 
                      value={selectedGradYear} 
                      onChange={(e) => { const val = e.target.value; React.startTransition(() => setSelectedGradYear(val)); }}
                      className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1 outline-none focus:border-indigo-500 min-w-[120px]"
                    >
                      <option value="All">All Years</option>
                      {dashboardData.gradYears?.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 flex items-center">
                      Academic Year
                      <FilterHint text="KPI 2.3, 2.6&#10;Filters data based on the active academic/teaching cycle." />
                    </label>
                    <select 
                      value={selectedAcademicYear} 
                      onChange={(e) => { const val = e.target.value; React.startTransition(() => setSelectedAcademicYear(val)); }}
                      className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1 outline-none focus:border-indigo-500 min-w-[130px]"
                    >
                      <option value="All">All Academic Years</option>
                      {dashboardData.academicYears?.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 flex items-center">
                      Calendar Year
                      <FilterHint text="KPI 4.1 - 6.2&#10;Filters based on publication, research project, or event year." />
                    </label>
                    <select 
                      value={selectedCalendarYear} 
                      onChange={(e) => { const val = e.target.value; React.startTransition(() => setSelectedCalendarYear(val)); }}
                      className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1 outline-none focus:border-indigo-500 min-w-[110px]"
                    >
                      <option value="All">All Years</option>
                      {dashboardData.stats?.calendarYears?.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col relative" ref={statusDropdownRef}>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 flex items-center">
                      KPI Status
                    </label>
                    <button 
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1 outline-none focus:border-indigo-500 min-w-[140px] flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                      <span className="truncate max-w-[130px]">
                        {selectedStatuses.length === 0 ? 'All Statuses' : 
                         selectedStatuses.length === 1 ? selectedStatuses[0] : 
                         `${selectedStatuses.length} Selected`}
                      </span>
                      <Filter className={`w-3 h-3 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showStatusDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2">
                        <div className="max-h-64 overflow-y-auto px-1">
                          {['High', 'Medium', 'Low', 'Very Low'].map(s => (
                            <label key={s} className="flex items-center space-x-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                              <input 
                                type="checkbox" 
                                checked={selectedStatuses.includes(s)}
                                onChange={() => {
                                  React.startTransition(() => {
                                    if (selectedStatuses.includes(s)) {
                                      setSelectedStatuses(selectedStatuses.filter(x => x !== s));
                                    } else {
                                      setSelectedStatuses([...selectedStatuses, s]);
                                    }
                                  });
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                              />
                              <span className="text-sm font-medium text-slate-700">{s}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>


                {/* KPI Rows */}
                <div className="space-y-10" style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
                  {shouldRenderKPI('KPI 1.1', dashboardData.stats?.kpi11, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 1.1" 
                      title="Employability" 
                      denomLabel="No. of Responses" 
                      numLabel="No. of Responses with Yes" 
                      data={dashboardData.stats?.kpi11} 
                      color="indigo" 
                      icon={<Users className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.trends?.kpi11}
                      extraBoxesBefore={[
                        { 
                          label: "Total Alumni", 
                          value: dashboardData.stats?.totalAlumni || 0,
                          onClick: () => setModalContent({ title: 'Total Alumni List', type: 'respondents', items: dashboardData.stats?.totalAlumniList || [] })
                        }
                      ]}
                      extraBoxes={[
                        { label: "Response Rate", value: `${dashboardData.stats?.responseRate || 0}%` }
                      ]}
                      onDenomClick={() => setModalContent({ title: 'Respondent List (KPI 1.1)', type: 'respondents', items: dashboardData.stats?.kpi11?.respondentList || [] })}
                      onNumClick={() => setModalContent({ title: 'Employed Graduates List (KPI 1.1)', type: 'respondents', items: dashboardData.stats?.kpi11?.employedList || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("1.1", "Employment Rate", selectedGradYear, trend)}
                      actionStats={getActionStats("1.1")}
                    />
                  )}
                  {shouldRenderKPI('KPI 1.2', dashboardData.stats?.kpi12, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 1.2" 
                      title="Employability in Relevant Position" 
                      denomLabel="No. of Responses" 
                      numLabel="No. of Students Working in Relevant Position" 
                      data={dashboardData.stats?.kpi12} 
                      color="blue" 
                      icon={<Target className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.trends?.kpi12}
                      extraBoxesBefore={[
                        { 
                          label: "No. of Students Working", 
                          value: dashboardData.stats?.workingCount || 0,
                          onClick: () => setModalContent({ title: 'Working Graduates List', type: 'respondents', items: dashboardData.stats?.workingList || [] })
                        }
                      ]}
                      onDenomClick={() => setModalContent({ title: 'Relevant Job Survey List (KPI 1.2)', type: 'respondents', items: dashboardData.stats?.kpi12?.relevantList || [] })}
                      onNumClick={() => setModalContent({ title: 'Working in Relevant Position List', type: 'respondents', items: dashboardData.stats?.kpi12?.relevantYesList || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("1.2", "Employability in Relevant Position", selectedGradYear, trend)}
                      actionStats={getActionStats("1.2")}
                    />
                  )}
                  {shouldRenderKPI('KPI 2.2', dashboardData.stats?.kpi22, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 2.2" 
                      title="Retention Rate" 
                      denomLabel="Total First-Year Students" 
                      numLabel="Retained into Next Year" 
                      data={dashboardData.stats?.kpi22} 
                      color="indigo" 
                      icon={<GraduationCap className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.kpi22?.trend}
                      extraBoxes={[
                        { 
                          label: "No. of Students Counted as Attrition", 
                          value: dashboardData.stats?.kpi22?.attritionCount || 0,
                          onClick: () => setModalContent({ title: 'Attrition List (KPI 2.2)', type: 'retention', items: dashboardData.stats?.kpi22?.attritionList || [] })
                        }
                      ]}
                      onDenomClick={() => setModalContent({ title: 'Total First-Year Students List', type: 'retention', items: dashboardData.stats?.kpi22?.denominatorList || [] })}
                      onNumClick={() => setModalContent({ title: 'Retained Students List', type: 'retention', items: dashboardData.stats?.kpi22?.numeratorList || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("2.2", "Retention Rate", selectedCohort, trend)}
                      actionStats={getActionStats("2.2")}
                    />
                  )}
                  {shouldRenderKPI('KPI 2.3', dashboardData.stats?.kpi23, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 2.3" 
                      title="Employer Feedback in Workplacement" 
                      denomLabel="No. of Responses" 
                      numLabel="Satisfaction Score" 
                      data={dashboardData.stats?.kpi23} 
                      type="2-box" 
                      color="indigo" 
                      icon={<Activity className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.kpi23?.trend}
                      onDenomClick={() => setModalContent({ title: 'Preceptor Evaluation List', type: 'preceptors', items: dashboardData.stats?.kpi23?.respondentList || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("2.3", "Employer Feedback in Workplacement", selectedAcademicYear, trend)}
                      actionStats={getActionStats("2.3")}
                    />
                  )}
                  {shouldRenderKPI('KPI 2.4', dashboardData.stats?.kpi24, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 2.4" 
                      title="Employer Satisfaction" 
                      denomLabel="No. of Employer Responses" 
                      numLabel="Satisfaction Score" 
                      data={dashboardData.stats?.kpi24} 
                      type="2-box" 
                      color="purple" 
                      icon={<Activity className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.trends?.kpi24}
                      onDenomClick={() => setModalContent({ title: 'Employer Response List', type: 'employers', items: dashboardData.stats?.kpi24?.employerList || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("2.4", "Employer Satisfaction", selectedGradYear, trend)}
                      actionStats={getActionStats("2.4")}
                    />
                  )}
                  {shouldRenderKPI('KPI 2.5', dashboardData.stats?.kpi25, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 2.5" 
                      title="Licensing" 
                      denomLabel="No. of Responses" 
                      numLabel="No. of Responses with Yes" 
                      data={dashboardData.stats?.kpi25} 
                      color="orange" 
                      icon={<ClipboardCheck className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.trends?.kpi25}
                      extraBoxesBefore={[
                        { 
                          label: "Total Alumni", 
                          value: dashboardData.stats?.totalAlumni || 0,
                          onClick: () => setModalContent({ title: 'Total Alumni List', type: 'respondents', items: dashboardData.stats?.totalAlumniList || [] })
                        }
                      ]}
                      extraBoxes={[
                        { label: "Response Rate", value: `${dashboardData.stats?.kpi25?.responseRate || 0}%` }
                      ]}
                      onDenomClick={() => setModalContent({ title: 'Respondent List (KPI 2.5)', type: 'respondents', items: dashboardData.stats?.kpi25?.respondentList || [] })}
                      onNumClick={() => setModalContent({ title: 'Licensed Graduates List', type: 'licensing', items: dashboardData.stats?.kpi25?.licensedList || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("2.5", "Licensing", selectedGradYear, trend)}
                      actionStats={getActionStats("2.5")}
                    />
                  )}
                  {shouldRenderKPI('KPI 2.6', dashboardData.stats?.kpi26, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 2.6" 
                      title="Student Satisfaction" 
                      denomLabel="Invitees" 
                      numLabel="Response Rate" 
                      type="4-box"
                      extraBoxes={[{ 
                        label: 'No. of Responses', 
                        value: dashboardData.stats?.kpi26?.denominator || 0,
                        onClick: () => setModalContent({ 
                          title: 'Survey Responses List', 
                          type: 'invitees', 
                          items: (dashboardData.stats?.kpi26?.inviteeList || []).filter(item => {
                            const s = String(item.status || '').trim().toLowerCase();
                            return s === 'submitted' || s === 'completed' || s === 'yes' || s === '1';
                          }) 
                        }) 
                      }]}
                      data={{
                        denominator: dashboardData.stats?.kpi26?.invitees || 0,
                        numerator: `${dashboardData.stats?.kpi26?.responseRate || 0}%`,
                        value: dashboardData.stats?.kpi26?.value || 0
                      }} 
                      color="purple" 
                      unit=""
                      icon={<ClipboardCheck className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.kpi26?.trend}
                      onDenomClick={() => setModalContent({ title: 'Survey Invitees List', type: 'invitees', items: dashboardData.stats?.kpi26?.inviteeList || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("2.6", "Student Satisfaction", selectedAcademicYear, trend)}
                      actionStats={getActionStats("2.6")}
                    />
                  )}
                  {shouldRenderKPI('KPI 3.1', dashboardData.stats?.kpi31, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 3.1" 
                      title="Offers Post Workplacement" 
                      denomLabel="No. of Responses" 
                      numLabel="No. of Responses with Yes" 
                      data={dashboardData.stats?.kpi31} 
                      color="rose" 
                      icon={<Activity className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.trends?.kpi31}
                      onDenomClick={() => setModalContent({ title: 'Respondent List (KPI 3.1)', type: 'respondents', items: dashboardData.stats?.kpi31?.offerList || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("3.1", "Offers Post Workplacement", selectedGradYear, trend)}
                      actionStats={getActionStats("3.1")}
                    />
                  )}
                  {shouldRenderKPI('KPI 3.3', dashboardData.stats?.kpi33, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 3.3" 
                      title="Joint Industry Courses" 
                      denomLabel="Total Credits (Non-BS/GE)" 
                      numLabel="Industry Credits" 
                      data={dashboardData.stats?.kpi33} 
                      color="blue" 
                      icon={<Briefcase className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.kpi33?.trend}
                      onNumClick={() => setModalContent({ title: 'Joint Industry Courses List', type: 'courses', items: dashboardData.stats?.kpi33?.industryCourses || [] })}
                      onDenomClick={() => setModalContent({ title: 'Total Credits List (Non-BS/GE)', type: 'courses', items: dashboardData.stats?.kpi33?.totalCourses || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("3.3", "Joint Industry Courses", selectedAcademicYear, trend)}
                      actionStats={getActionStats("3.3")}
                    />
                  )}
                  {shouldRenderKPI('KPI 4.1', dashboardData.stats?.kpi41, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 4.1" 
                      title="Publication Ratio" 
                      denomLabel="Total FT Faculty" 
                      numLabel="Total Publications" 
                      data={dashboardData.stats?.kpi41} 
                      type="3-box"
                      color="indigo" 
                      unit=""
                      icon={<FileText className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.kpi41?.trend}
                      onDenomClick={() => setModalContent({ title: 'FT Faculty List', type: 'faculty', items: dashboardData.stats?.kpi41?.facultyList || [] })}
                      onNumClick={() => setModalContent({ title: 'Publications List', type: 'publications', items: dashboardData.stats?.kpi41?.publications || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("4.1", "Publication Ratio", selectedCalendarYear, trend)}
                      actionStats={getActionStats("4.1")}
                    />
                  )}
                  {shouldRenderKPI('KPI 4.2', dashboardData.stats?.kpi42, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 4.2" 
                      title="Mean FWCI" 
                      denomLabel="Scopus Publications" 
                      numLabel="" 
                      data={dashboardData.stats?.kpi42} 
                      color="blue" 
                      unit=""
                      icon={<Activity className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.kpi42?.trend}
                      extraBoxes={[
                        { label: "Total FWCI", value: dashboardData.stats?.kpi42?.totalFWCI || 0 }
                      ]}
                      onDenomClick={() => setModalContent({ title: 'Scopus Publications (KPI 4.2)', type: 'publications', items: dashboardData.stats?.kpi42?.publications || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("4.2", "Mean FWCI", selectedCalendarYear, trend)}
                      actionStats={getActionStats("4.2")}
                    />
                  )}
                  {shouldRenderKPI('KPI 4.3', dashboardData.stats?.kpi43, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 4.3" 
                      title="Joint Industry Research" 
                      denomLabel="Total Publications" 
                      numLabel="Industry Collaborations" 
                      data={dashboardData.stats?.kpi43} 
                      color="rose" 
                      icon={<Globe className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.kpi43?.trend}
                      onDenomClick={() => setModalContent({ title: 'Total Publications (KPI 4.3)', type: 'student-research', items: dashboardData.stats?.kpi43?.denominatorProjects || [] })}
                      onNumClick={() => setModalContent({ title: 'Industry Collaboration List', type: 'student-research', items: dashboardData.stats?.kpi43?.numeratorProjects || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("4.3", "Joint Industry Research", selectedCalendarYear, trend)}
                      actionStats={getActionStats("4.3")}
                    />
                  )}
                  {shouldRenderKPI('KPI 4.4', dashboardData.stats?.kpi44, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 4.4" 
                      title="Student Participation in Research" 
                      denomLabel="Total Enrolled Students" 
                      numLabel="No. of Students participating in Research" 
                      data={dashboardData.stats?.kpi44} 
                      color="indigo" 
                      unit=""
                      icon={<Users className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.kpi44?.trend}
                      onDenomClick={() => setModalContent({ title: 'Enrolled Students List', type: 'default', items: dashboardData.stats?.kpi44?.enrolledStudents || [] })}
                      onNumClick={() => setModalContent({ title: 'Student Research Participants', type: 'student-research', items: dashboardData.stats?.kpi44?.qualifyingResearch || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("4.4", "Student Participation in Research", selectedAcademicYear, trend)}
                      actionStats={getActionStats("4.4")}
                    />
                  )}
                  {selectedPrograms.includes('All') && shouldRenderKPI('KPI 4.5', dashboardData.stats?.kpi45, false) && (
                    <KPILine 
                      tag="KPI 4.5" 
                      title="Impact of Research" 
                      denomLabel="Total Projects" 
                      numLabel="Projects with Impact" 
                      data={dashboardData.stats?.kpi45} 
                      color="emerald" 
                      icon={<Activity className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.kpi45?.trend}
                      onDenomClick={() => setModalContent({ title: 'Total Research Projects (KPI 4.5)', type: 'student-research', items: dashboardData.stats?.kpi45?.denominatorProjects || [] })}
                      onNumClick={() => setModalContent({ title: 'Impact Research Projects (KPI 4.5)', type: 'student-research', items: dashboardData.stats?.kpi45?.numeratorProjects || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("4.5", "Impact of Research", selectedCalendarYear, trend)}
                      actionStats={getActionStats("4.5")}
                    />
                  )}
                  {shouldRenderKPI('KPI 4.6', dashboardData.stats?.kpi46, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 4.6" 
                      title="Awarded IP" 
                      denomLabel="Total FT Faculty" 
                      numLabel="No. of Awarded IP" 
                      data={dashboardData.stats?.kpi46} 
                      type="1-box"
                      color="purple" 
                      unit=""
                      icon={<FileText className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.kpi46?.trend}
                      onActionPlanClick={(trend) => handleAddActionPlan("4.6", "Awarded IP", selectedCalendarYear, trend)}
                      actionStats={getActionStats("4.6")}
                    />
                  )}
                  {shouldRenderKPI('KPI 5.4', dashboardData.stats?.kpi54, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 5.4" 
                      title="International Research Collaboration" 
                      denomLabel="Total Projects" 
                      numLabel="International Collaborations" 
                      data={dashboardData.stats?.kpi54} 
                      color="indigo" 
                      icon={<Globe className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.kpi54?.trend}
                      onDenomClick={() => setModalContent({ title: 'Total Research Projects (KPI 5.4)', type: 'student-research', items: dashboardData.stats?.kpi54?.totalProjects || [] })}
                      onNumClick={() => setModalContent({ title: 'International Collaborations List (KPI 5.4)', type: 'student-research', items: dashboardData.stats?.kpi54?.internationalCollaborations || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("5.4", "International Research Collaboration", selectedCalendarYear, trend)}
                      actionStats={getActionStats("5.4")}
                    />
                  )}
                  {shouldRenderKPI('KPI 6.1', dashboardData.stats?.kpi61, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 6.1" 
                      title="Academic Events" 
                      numLabel="No. of Academic Events with students" 
                      data={dashboardData.stats?.kpi61} 
                      type="1-box"
                      color="indigo" 
                      unit=""
                      icon={<Activity className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.kpi61?.trend}
                      onDenomClick={() => setModalContent({ title: 'Academic Events List', type: 'events', isCommunity: false, items: dashboardData.stats?.kpi61?.events || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("6.1", "Academic Events", selectedCalendarYear, trend)}
                      actionStats={getActionStats("6.1")}
                    />
                  )}
                  {shouldRenderKPI('KPI 6.2', dashboardData.stats?.kpi62, !selectedPrograms.includes('All')) && (
                    <KPILine 
                      tag="KPI 6.2" 
                      title="Community Engagement Events" 
                      numLabel="No. of Community Engagement Events" 
                      data={dashboardData.stats?.kpi62} 
                      type="1-box"
                      color="emerald" 
                      unit=""
                      icon={<Activity className="w-4 h-4" />}
                      isProgrammatic={!selectedPrograms.includes('All')}
                      trendData={dashboardData.stats?.kpi62?.trend}
                      onDenomClick={() => setModalContent({ title: 'Community Engagement Events List', type: 'events', isCommunity: true, items: dashboardData.stats?.kpi62?.events || [] })}
                      onActionPlanClick={(trend) => handleAddActionPlan("6.2", "Community Engagement Events", selectedCalendarYear, trend)}
                      actionStats={getActionStats("6.2")}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      {/* Modal Overlay */}
      {modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                {modalContent.title}
                <button
                  onClick={() => {
                    if (!modalContent || !modalContent.items || modalContent.items.length === 0) return;
                    
                    const wsData = modalContent.items.map(item => {
                      if (modalContent.type === 'publications') {
                        return {
                          'Title': item.Title || item.title || 'Untitled',
                          'Authors': item.derivedAuthors || item.Authors || item.authors || item['Authors with affiliations'] || item['author names'] || 'Unknown',
                          'Programs': item.derivedPrograms || item.Program || '',
                          'Year': item.derivedYear || item.Year || item.year || '',
                          'FWCI': item.derivedFWCI || item.FWCI || item.fwci || item['Field-Weighted Citation Impact'] || ''
                        };
                      } else if (modalContent.type === 'student-research') {
                        return {
                          'Title': item.title || item.Title || 'Untitled',
                          'Author/PI Name': item.name || 'Unknown',
                          'Collaborators/Institutions': item.collaborators || '',
                          'Student/PI ID': item.id || item.ID || '',
                          'Program': item.category || item.Category || '',
                          'Project_Year_Start': item.startYear || item.Year || item.year || ''
                        };
                      } else if (modalContent.type === 'events') {
                        return {
                          'Event_Name_': item.name || item.Event_Name_ || '',
                          'Event_Department': item.dept || item.Event_Department || '',
                          'Event_Year': item.year || item.Event_Year || '',
                          'Event_Type_': item.type || item.Event_Type_ || '',
                          'Event_Attendees_': item.attendees || item.Event_Attendees_ || '',
                          [modalContent.isCommunity ? 'Counted CE Y/N' : 'Counted AE Y/N']: modalContent.isCommunity ? item.isCommunityCounted : item.isAcademicCounted
                        };
                      } else if (modalContent.type === 'courses') {
                        return {
                          'Program': item.program || '',
                          'Course_Code': item.code || '',
                          'Course_Name': item.name || '',
                          'Faculty_Name': item.faculty || '',
                          'Affiliation': item.affiliation || '',
                          'Credit_Share': item.share || '',
                          'Credits': item.credits || '',
                          'Role': item.role || '',
                          'Teaching Percent': item.teachingPercent || 0,
                          'Design Percent': item.designPercent || 0
                        };
                      } else if (modalContent.type === 'licensing') {
                        return {
                          'ID': item.id || '',
                          'Name': item.name || '',
                          'Email': item.email || '',
                          'Mobile_Number': item.mobile || '',
                          'Program': item.program || '',
                          'Licensed_by': item.licensedBy || '',
                          'GLC_CNT_Name': item.glcCnt || '',
                          'GLC_date': item.glcDate || '',
                          'GLC_LC_Number': item.glcLc || '',
                          'GLC_LC_Name': item.glcLcName || '',
                          'Licensing Status': item.licenseStatus || ''
                        };
                      } else if (modalContent.type === 'respondents') {
                        return {
                          'ID': item.id || '',
                          'Name': item.name || '',
                          'Email': item.email || '',
                          'Mobile_Number': item.mobile || '',
                          'Program': item.program || '',
                          'Working and/or Studying': item.workingStudying || '',
                          'Employer_name': item.employer || '',
                          'Work_location': item.workLocation || '',
                          'Study_institution': item.studyInstitution || '',
                          'Studying_Country': item.studyCountry || '',
                          'First_Job_relevant': item.relevant || '',
                          'Offer_from_workplacement': item.offer || '',
                          'Licensing Status': item.licenseStatus || ''
                        };
                      } else if (modalContent.type === 'invitees') {
                        return {
                          'Student': item.studentId || '',
                          'Student Name': item.name || '',
                          'Email': item.email || '',
                          'College': item.college || '',
                          'Program': item.program || '',
                          'Status': item.status || 'Not Submitted'
                        };
                      } else if (modalContent.type === 'retention') {
                        return {
                          'ID': item.id || '',
                          'Name': item.name || '',
                          'Email_ID': item.email || '',
                          'Enroll_Student_Mobile_Number': item.mobile || '',
                          'Status': item.status || '',
                          'Last Enrollment Year': item.lastYear || ''
                        };
                      } else if (modalContent.type === 'employers') {
                        return {
                          'Line Manager Name': item.lineManagerName || '',
                          'Employer Name': item.employerName || '',
                          'Designation': item.designation || '',
                          'Department': item.department || '',
                          'Email': item.email || '',
                          'Mobile': item.mobile || ''
                        };
                      } else if (modalContent.type === 'preceptors') {
                        return {
                          'Academic Year': item.academicYear || '',
                          'Preceptor Name': item.preceptorName || '',
                          'Preceptor Designation': item.preceptorDesignation || '',
                          'Preceptor Email': item.preceptorEmail || '',
                          'Hospital': item.hospital || '',
                          'Student ID': item.studentId || '',
                          'Student Name': item.studentName || '',
                          'Student Email': item.studentEmail || '',
                          'Program': item.program || '',
                          'College': item.college || ''
                        };
                      } else {
                        return {
                          'Name': item.Name || item.name || 'Unknown',
                          'ID': item.ID || item.id || item.employee_id || '',
                          'Category': item.Category || item.category || ''
                        };
                      }
                    });

                    const ws = XLSX.utils.json_to_sheet(wsData);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Data");
                    XLSX.writeFile(wb, `${modalContent.title}.xlsx`);
                  }}
                  className="ml-4 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-100 transition-colors flex items-center"
                >
                  Export to Excel
                </button>
              </h3>
              <button 
                onClick={() => setModalContent(null)}
                className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors flex items-center justify-center"
              >
                <span className="w-5 h-5 flex items-center justify-center font-bold text-xl leading-none">&times;</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="space-y-3">
                {modalContent.items && modalContent.items.length > 0 ? (
                  modalContent.items.map((item, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start space-x-4">
                      <div className="flex-1">
                        {modalContent.type === 'publications' ? (
                          <>
                            <div className="font-semibold text-slate-800 mb-1">{item.Title || item.title || 'Untitled Publication'}</div>
                            <div className="text-sm text-slate-500">
                              <span className="font-medium text-slate-700">Authors:</span> {item.derivedAuthors || item.Authors || item.authors || item['Authors with affiliations'] || item['author names'] || 'Unknown'}
                            </div>
                            <div className="text-sm text-slate-500 mt-0.5">
                              <span className="font-medium text-slate-700">Programs:</span> {item.derivedPrograms || item.Program || 'N/A'}
                            </div>
                            <div className="text-xs text-slate-400 mt-2 flex items-center space-x-4">
                              {(item.derivedYear || item.Year || item.year) ? <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">Year: {item.derivedYear || item.Year || item.year}</span> : null}
                              {(item.derivedFWCI || item.FWCI || item.fwci || item['Field-Weighted Citation Impact']) ? <span className="bg-purple-50 text-purple-600 px-2 py-1 rounded font-medium">FWCI: {item.derivedFWCI || item.FWCI || item.fwci || item['Field-Weighted Citation Impact']}</span> : null}
                            </div>
                          </>
                        ) : modalContent.type === 'student-research' ? (
                          <>
                            <div className="font-semibold text-slate-800 mb-1">{item.title || item.Title || 'Untitled Project'}</div>
                            <div className="text-sm text-slate-600 mb-1">
                              <span className="font-medium text-slate-700">Author/PI:</span> {item.name || 'Unknown'}
                            </div>
                            {item.collaborators && !modalContent.hideCollaborators && (
                              <div className="text-sm text-slate-500 mb-1 italic">
                                <span className="font-medium text-slate-700 not-italic">Collaborators/Institutions:</span> {item.collaborators}
                              </div>
                            )}
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-2">
                              {item.id && <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">ID: {item.id}</span>}
                              {item.category && <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded font-medium">{item.category}</span>}
                              {(item.startYear || item.Year || item.year) && <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">Year: {item.startYear || item.Year || item.year}</span>}
                            </div>
                          </>
                        ) : modalContent.type === 'events' ? (
                          <>
                            <div className="font-semibold text-slate-800 mb-1">{item.name || item.Event_Name_ || 'Untitled Event'}</div>
                            <div className="text-sm text-slate-600 mb-1">
                              <span className="font-medium text-slate-700">Department:</span> {item.dept || item.Event_Department || 'N/A'}
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-2">
                              {item.year && <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">Year: {item.year}</span>}
                              {item.type && <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded">Type: {item.type}</span>}
                              {item.attendees && <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded">Attendees: {item.attendees}</span>}
                              <span className={`px-2 py-1 rounded font-bold ${modalContent.isCommunity ? (item.isCommunityCounted === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700') : (item.isAcademicCounted === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}`}>
                                {modalContent.isCommunity ? `Counted CE: ${item.isCommunityCounted}` : `Counted AE: ${item.isAcademicCounted}`}
                              </span>
                            </div>
                          </>
                        ) : modalContent.type === 'courses' ? (
                          <>
                            <div className="font-semibold text-slate-800 mb-1">{item.name || 'Untitled Course'}</div>
                            <div className="text-sm text-slate-600 mb-1">
                              <span className="font-medium text-slate-700">Faculty:</span> {item.faculty || 'Unknown'}
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-2">
                              {item.code && <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">Code: {item.code}</span>}
                              {item.program && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded font-medium">{item.program}</span>}
                              {item.affiliation && <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded">Affiliation: {item.affiliation}</span>}
                              {item.share && <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded">Share: {item.share}</span>}
                              {item.credits && <span className="bg-slate-900 text-white px-2 py-1 rounded font-bold">Credits: {item.credits}</span>}
                              {item.role && <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium border border-slate-200">Role: {item.role}</span>}
                              <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded">Teaching: {item.teachingPercent}%</span>
                              <span className="bg-purple-50 text-purple-600 px-2 py-1 rounded">Design: {item.designPercent}%</span>
                            </div>
                          </>
                        ) : modalContent.type === 'licensing' ? (
                          <>
                            <div className="font-semibold text-slate-800 mb-1">{item.name || 'Unknown Graduate'}</div>
                            <div className="text-sm text-slate-600 mb-1">
                              <span className="font-medium text-slate-700">Licensed By:</span> {item.licensedBy || 'N/A'}
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-2">
                              {item.id && <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">ID: {item.id}</span>}
                              {item.program && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded font-medium">{item.program}</span>}
                              {item.email && <span className="bg-slate-50 text-slate-500 px-2 py-1 rounded lowercase">{item.email}</span>}
                              {item.glcDate && <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded">Date: {item.glcDate}</span>}
                              {item.glcLcName && <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded">{item.glcLcName}</span>}
                              {item.licenseStatus && (
                                <span className={`px-2 py-1 rounded font-bold ${
                                  item.licenseStatus === 'Licensed' ? 'bg-emerald-100 text-emerald-700' : 
                                  item.licenseStatus === 'In Process' ? 'bg-amber-100 text-amber-700' : 
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {item.licenseStatus}
                                </span>
                              )}
                            </div>
                          </>
                        ) : modalContent.type === 'respondents' ? (
                          <>
                            <div className="font-semibold text-slate-800 mb-1">{item.name || 'Unknown Graduate'}</div>
                            <div className="text-sm text-slate-600 mb-1">
                              <span className="font-medium text-slate-700">Status:</span> {item.workingStudying === 'Yes' ? 'Working/Studying' : 'Not Working/Studying'}
                              {item.employer && <span className="ml-2">• {item.employer}</span>}
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-2">
                              {item.id && <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">ID: {item.id}</span>}
                              {item.program && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded font-medium">{item.program}</span>}
                              {item.email && <span className="bg-slate-50 text-slate-500 px-2 py-1 rounded lowercase">{item.email}</span>}
                              {item.workLocation && <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded">{item.workLocation}</span>}
                              {item.relevant && <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded">Relevant: {item.relevant}</span>}
                              {item.licenseStatus && (
                                <span className={`px-2 py-1 rounded font-bold ${
                                  item.licenseStatus === 'Licensed' ? 'bg-emerald-100 text-emerald-700' : 
                                  item.licenseStatus === 'In Process' ? 'bg-amber-100 text-amber-700' : 
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {item.licenseStatus}
                                </span>
                              )}
                            </div>
                          </>
                        ) : modalContent.type === 'invitees' ? (
                          <>
                            <div className="font-semibold text-slate-800 mb-1">{item.name || 'Unknown Student'}</div>
                            <div className="text-sm text-slate-600 mb-1">
                              <span className="font-medium text-slate-700">Program:</span> {item.program || 'N/A'} • <span className="font-medium text-slate-700">Status:</span> {item.status || 'N/A'}
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-2">
                              {item.studentId && <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">ID: {item.studentId}</span>}
                              {item.college && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded font-medium">{item.college}</span>}
                              {item.email && <span className="bg-slate-50 text-slate-500 px-2 py-1 rounded lowercase">{item.email}</span>}
                            </div>
                          </>
                        ) : modalContent.type === 'retention' ? (
                          <>
                            <div className="font-semibold text-slate-800 mb-1">{item.name || 'Unknown Student'}</div>
                            <div className="text-sm text-slate-600 mb-1">
                              <span className="font-medium text-slate-700">Status:</span> {item.status || 'N/A'} • <span className="font-medium text-slate-700">Last Enroll Year:</span> {item.lastYear || 'N/A'}
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-2">
                              {item.id && <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">ID: {item.id}</span>}
                              {item.email && <span className="bg-slate-50 text-slate-500 px-2 py-1 rounded lowercase">{item.email}</span>}
                              {item.mobile && <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded">{item.mobile}</span>}
                            </div>
                          </>
                        ) : modalContent.type === 'employers' ? (
                          <>
                            <div className="font-semibold text-slate-800 mb-1">{item.lineManagerName || 'Unknown Manager'}</div>
                            <div className="text-sm text-slate-600 mb-1">
                              <span className="font-medium text-slate-700">Employer:</span> {item.employerName || 'N/A'}
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-2">
                              {item.designation && <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-medium">{item.designation}</span>}
                              {item.department && <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">{item.department}</span>}
                              {item.email && <span className="bg-slate-50 text-slate-500 px-2 py-1 rounded lowercase">{item.email}</span>}
                              {item.mobile && <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded">{item.mobile}</span>}
                            </div>
                          </>
                        ) : modalContent.type === 'preceptors' ? (
                          <>
                            <div className="font-semibold text-slate-800 mb-1">{item.studentName || 'Unknown Student'}</div>
                            <div className="text-sm text-slate-600 mb-1">
                              <span className="font-medium text-slate-700">Preceptor:</span> {item.preceptorName || 'N/A'} • <span className="font-medium text-slate-700">Hospital:</span> {item.hospital || 'N/A'}
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-2">
                              {item.studentId && <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">Student ID: {item.studentId}</span>}
                              {item.program && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded font-medium">{item.program}</span>}
                              {item.academicYear && <span className="bg-slate-50 text-slate-500 px-2 py-1 rounded">AY: {item.academicYear}</span>}
                              {item.preceptorEmail && <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded">{item.preceptorEmail}</span>}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-semibold text-slate-800">{item.Name || item.name || 'Unknown Faculty'}</div>
                            <div className="text-sm text-slate-500 mt-1">ID: {item.ID || item.id || item.employee_id || 'N/A'}</div>
                            {(item.Category || item.category) && (
                              <div className="text-xs font-medium uppercase tracking-wider text-indigo-500 bg-indigo-50 inline-block px-2 py-1 rounded mt-2">
                                {item.Category || item.category}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">No data available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
    </ErrorBoundary>
  );
}
