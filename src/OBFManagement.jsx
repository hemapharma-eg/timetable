import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, PlusCircle, List as ListIcon, 
  Search, Info, CheckCircle, Clock,
  Activity, BookOpen, Calculator, Target,
  Edit, Trash2, X, Download, Share2, Printer, Tags, Upload, ArrowUpRight
} from 'lucide-react';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';
import RichTextEditor from './RichTextEditor';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ImportModeDialog from './ImportModeDialog';

// Error Boundary to catch render crashes
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('Component crash:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <p className="text-red-700 font-semibold mb-2">Something went wrong loading this section.</p>
          <p className="text-red-500 text-sm mb-4">{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Reusable Page Container
const PageContainer = ({ title, description, tabs, activeSubTab, setActiveSubTab, children }) => (
  <div className="flex h-full flex-col animate-in fade-in duration-300">
    <div className="mb-6 border-b border-slate-200 pb-0 print:hidden">
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
    <div className="flex-1 min-h-0 pb-8 overflow-auto px-1 print:overflow-visible print:h-auto">
      {children}
    </div>
  </div>
);

export function OBFManagement({ session, userMeta, isTechAdmin, allowedSubTabs, permissions }) {
  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (isTechAdmin) return 'dashboard';
    if (allowedSubTabs && allowedSubTabs.length > 0) return allowedSubTabs[0];
    return 'dashboard';
  });
  const [categories, setCategories] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('obf_categories').select('*').order('sort_order');
      if (error) throw error;
      setCategories(data || []);
    } catch (e) {
      console.warn('Categories fetch error:', e.message);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase.from('academic_years').select('*').order('sort_order');
      if (error) throw error;
      setAcademicYears(data || []);
    } catch (e) {
      console.warn('Academic years fetch error:', e.message);
    }
  };

  useEffect(() => { fetchCategories(); fetchAcademicYears(); }, []);

  const allTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'new_kpi', label: 'Add KPI' },
    { id: 'register', label: 'OBF KPIs' },
    { id: 'reports', label: 'Yearly Reports' },
    ...(isTechAdmin ? [
      { id: 'categories', label: 'Manage Categories' },
      { id: 'years', label: 'Academic Years' },
      { id: 'mapping', label: 'KPI-Year Mapping' }
    ] : [])
  ];

  const tabs = isTechAdmin ? allTabs : allTabs.filter(t => allowedSubTabs && allowedSubTabs.includes(t.id));

  useEffect(() => {
    if (!isTechAdmin && allowedSubTabs && !allowedSubTabs.includes(activeSubTab) && allowedSubTabs.length > 0) {
      setActiveSubTab(allowedSubTabs[0]);
    }
  }, [allowedSubTabs, activeSubTab, isTechAdmin]);

  return (
    <PageContainer
      title="OBF Management"
      description="Track Key Performance Indicators (KPIs) across various categories and monitor academic progress."
      tabs={tabs}
      activeSubTab={activeSubTab}
      setActiveSubTab={setActiveSubTab}
    >
      {activeSubTab === 'dashboard' && <DashboardView categories={categories} />}
      {activeSubTab === 'new_kpi' && <NewKPIForm onSuccess={() => setActiveSubTab('register')} session={session} categories={categories} />}
      {activeSubTab === 'register' && <KPIRegister isTechAdmin={isTechAdmin} permissions={permissions} categories={categories} />}
      {(activeSubTab === 'reports' || (!isTechAdmin && tabs.length === 1 && tabs[0].id === 'reports')) && <ErrorBoundary><KPIReportsView /></ErrorBoundary>}
      {activeSubTab === 'categories' && isTechAdmin && <CategoriesManager categories={categories} onRefresh={fetchCategories} />}
      {activeSubTab === 'years' && isTechAdmin && <AcademicYearsManager years={academicYears} onRefresh={fetchAcademicYears} />}
      {activeSubTab === 'mapping' && isTechAdmin && <KPIYearMappingManager academicYears={academicYears} />}
    </PageContainer>
  );
}

// --- Dashboard View ---
function DashboardView({ categories }) {
  const [stats, setStats] = useState({ total: 0, healthy: 0, critical: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: kpis } = await supabase.from('obf_kpis').select('id');
        const { data: values } = await supabase.from('obf_kpi_values').select('value, kpi_id');
        
        setStats({
          total: kpis?.length || 0,
          healthy: 0, // Logic for healthy/critical needs rubrics evaluation
          critical: 0
        });
      } catch (err) {
        console.warn("Stats fetch error:", err.message);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total KPIs Tracked" value={stats.total} icon={<ListIcon className="text-blue-500 w-8 h-8" />} bg="bg-blue-50" />
        <StatCard title="Recent KPI Updates" value={'-'} icon={<Activity className="text-emerald-500 w-8 h-8" />} bg="bg-emerald-50" />
        <StatCard title="Overall Performance" value={'Good'} icon={<CheckCircle className="text-indigo-500 w-8 h-8" />} bg="bg-indigo-50" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-slate-500" />
          OBF Framework Overview
        </h3>
        <p className="text-slate-600 mb-4 leading-relaxed">
          The Outcome Based Framework (OBF) uses Key Performance Indicators (KPIs) to measure institutional and program success against defined benchmarks.
        </p>
        <div className="grid grid-cols-1 gap-4 mt-6">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <h4 className="font-semibold text-slate-700 mb-2">KPI Categories</h4>
            <ul className="text-sm text-slate-600 space-y-1 list-disc pl-4">
              {categories.map(c => (
                <li key={c.id}>{c.label}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bg }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
      </div>
      <div className={`p-4 rounded-full ${bg}`}>{icon}</div>
    </div>
  );
}

// --- Form Components ---

const RubricConditionBuilder = ({ colorClass, label, value, onChange }) => {
  const parseValue = (valStr) => {
    if (!valStr) return { op1: '', val1: '', op2: '', val2: '', useAnd: false };
    const parts = valStr.split('&&').map(s => s.trim());
    const parsePart = (p) => {
      let cleanP = p.replace(/^value\s+|^val\s+/, '');
      const match = cleanP.match(/^(>=|<=|>|<|==)\s*(-?\d+(\.\d+)?)$/);
      if (match) return { op: match[1], val: match[2] };
      return { op: '', val: '' };
    };
    const p1 = parsePart(parts[0] || '');
    const p2 = parts.length > 1 ? parsePart(parts[1]) : { op: '', val: '' };
    return {
      op1: p1.op, val1: p1.val,
      useAnd: parts.length > 1,
      op2: p2.op, val2: p2.val
    };
  };

  const [state, setState] = useState(parseValue(value));

  useEffect(() => {
    setState(parseValue(value));
  }, [value]);

  const update = (updates) => {
    const next = { ...state, ...updates };
    setState(next);
    let str = '';
    if (next.op1 && next.val1) str += `${next.op1} ${next.val1}`;
    if (next.useAnd && next.op2 && next.val2) str += ` && ${next.op2} ${next.val2}`;
    onChange(str);
  };

  return (
    <div className={`p-3 rounded-lg border bg-white shadow-sm flex flex-col gap-2`}>
      <label className={`block text-xs font-bold ${colorClass}`}>{label}</label>
      <div className="flex items-center gap-2 flex-wrap">
        <select value={state.op1} onChange={e => update({op1: e.target.value})} className="border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-indigo-500 bg-slate-50">
          <option value="">Op</option>
          <option value="<">&lt;</option>
          <option value="<=">&le;</option>
          <option value=">">&gt;</option>
          <option value=">=">&ge;</option>
          <option value="==">=</option>
        </select>
        <input type="number" step="any" value={state.val1} onChange={e => update({val1: e.target.value})} placeholder="Value" className="border border-slate-300 rounded p-1.5 w-20 text-sm outline-none focus:border-indigo-500" />
        
        <label className="flex items-center gap-1 text-xs text-slate-500 font-bold ml-1 cursor-pointer select-none">
          <input type="checkbox" checked={state.useAnd} onChange={e => update({useAnd: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
          AND
        </label>

        {state.useAnd && (
          <>
            <select value={state.op2} onChange={e => update({op2: e.target.value})} className="border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-indigo-500 bg-slate-50">
              <option value="">Op</option>
              <option value="<">&lt;</option>
              <option value="<=">&le;</option>
              <option value=">">&gt;</option>
              <option value=">=">&ge;</option>
              <option value="==">=</option>
            </select>
            <input type="number" step="any" value={state.val2} onChange={e => update({val2: e.target.value})} placeholder="Value" className="border border-slate-300 rounded p-1.5 w-20 text-sm outline-none focus:border-indigo-500" />
          </>
        )}
      </div>
    </div>
  );
};

function KPIFormFields({ formData, handleChange, categories = [] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">KPI No. <span className="text-red-500">*</span></label>
          <input type="text" name="kpi_no" required value={formData.kpi_no || ''} onChange={handleChange} placeholder="e.g. KPI-01" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">KPI Title <span className="text-red-500">*</span></label>
          <input type="text" name="title" required value={formData.title || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
          <select name="category" required value={formData.category || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none">
            <option value="">Select Category...</option>
            {categories.map(c => (
              <option key={c.id} value={c.value}>{c.value} — {c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Unit / Format</label>
          <input type="text" name="unit" value={formData.unit || ''} onChange={handleChange} placeholder="e.g. %, Ratio, Count" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
      </div>

      <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100">
        <h4 className="text-sm font-bold text-indigo-800 mb-4 flex items-center gap-2"><Calculator className="w-4 h-4" /> KPI Calculation Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Numerator Label</label>
            <input type="text" name="numerator_label" value={formData.numerator_label || ''} onChange={handleChange} placeholder="e.g. Total Graduates" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Denominator Label</label>
            <input type="text" name="denominator_label" value={formData.denominator_label || ''} onChange={handleChange} placeholder="e.g. Total Enrolled" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Description / Calculation Formula</label>
          <RichTextEditor value={formData.description || ''} onChange={(val) => handleChange({ target: { name: 'description', value: val } })} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <RubricConditionBuilder colorClass="text-emerald-700" label="Target Met (Green)" value={formData.rubric_green} onChange={v => handleChange({target: {name: 'rubric_green', value: v}})} />
        <RubricConditionBuilder colorClass="text-yellow-600" label="Near Target (Yellow)" value={formData.rubric_yellow} onChange={v => handleChange({target: {name: 'rubric_yellow', value: v}})} />
        <RubricConditionBuilder colorClass="text-orange-600" label="Below Target (Orange)" value={formData.rubric_orange} onChange={v => handleChange({target: {name: 'rubric_orange', value: v}})} />
        <RubricConditionBuilder colorClass="text-red-700" label="Critical (Red)" value={formData.rubric_red} onChange={v => handleChange({target: {name: 'rubric_red', value: v}})} />
      </div>
    </div>
  );
}

function NewKPIForm({ onSuccess, session, categories }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    kpi_no: '', title: '', category: '', description: '', 
    numerator_label: '', denominator_label: '', unit: '',
    rubric_green: '', rubric_yellow: '', rubric_orange: '', rubric_red: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...formData, reporter_email: session?.user?.email || 'admin@dmu.ac.ae' };
    
    try {
      const { error } = await supabase.from('obf_kpis').insert([payload]);
      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error(error);
      alert("Database error: " + (error.message || 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl">
      <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center">
        <BarChart3 className="w-6 h-6 text-indigo-600 mr-2" />
        <h3 className="text-lg font-semibold text-indigo-900">New KPI Identification</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        <KPIFormFields formData={formData} handleChange={handleChange} categories={categories} />
        <div className="flex justify-end pt-6">
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center shadow-md">
            {loading ? 'Submitting...' : <><CheckCircle className="w-5 h-5 mr-2" /> Add KPI to Framework</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- KPI Register (List View) ---
function KPIRegister({ isTechAdmin, permissions, categories }) {
  const [kpis, setKpis] = useState([]);
  const canEdit = isTechAdmin || (permissions && permissions.some(p => p.module_name === 'obf_kpis' && p.can_edit));
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingKPI, setEditingKPI] = useState(null);
  const [managingValuesFor, setManagingValuesFor] = useState(null);

  useEffect(() => { fetchKPIs(); }, []);

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('obf_kpis').select('*');
      if (error) throw error;
      setKpis(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredKPIs = kpis.filter(k => 
    k.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (k.kpi_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (k.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedKPIs = [...filteredKPIs].sort((a, b) => (a.kpi_no || '').localeCompare(b.kpi_no || '', undefined, { numeric: true }));

  // --- Excel Export ---
  const handleExportExcel = () => {
    const exportData = kpis.map(k => ({
      'KPI No.': k.kpi_no || '',
      'KPI Title': k.title || '',
      'Category': k.category || '',
      'Unit': k.unit || '',
      'Numerator Label': k.numerator_label || '',
      'Denominator Label': k.denominator_label || '',
      'No Risk (Green)': k.rubric_green || '',
      'Low Probability (Yellow)': k.rubric_yellow || '',
      'High Probability (Orange)': k.rubric_orange || '',
      'Incident (Red)': k.rubric_red || ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'OBF KPIs');
    XLSX.writeFile(wb, 'OBF_KPI_Framework.xlsx');
  };

  // --- Excel Import ---
  const fileInputRef = useRef(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState(null);
  const [importFileName, setImportFileName] = useState('');

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        if (rows.length === 0) { alert('No data found in the file.'); return; }
        const mapped = rows.map(r => ({
          kpi_no: r.kpi_no || r.KPI_No || '',
          title: r.title || r.Title || '',
          category: r.category || r.Category || '',
          unit: r.unit || r.Unit || '',
          numerator_label: r.numerator_label || r.Numerator_Label || '',
          denominator_label: r.denominator_label || r.Denominator_Label || '',
          rubric_green: r.rubric_green || r.Green || '',
          rubric_yellow: r.rubric_yellow || r.Yellow || '',
          rubric_orange: r.rubric_orange || r.Orange || '',
          rubric_red: r.rubric_red || r.Red || ''
        }));
        setPendingImportData(mapped);
        setImportFileName(file.name);
        setImportDialogOpen(true);
      } catch (err) {
        alert('Import error: ' + (err.message || 'Unknown'));
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const executeImport = async (mode) => {
    if (!pendingImportData) return;
    setImportDialogOpen(false);

    try {
      if (mode === 'replace') {
        await supabase.from('obf_kpis').delete().neq('id', 0);
        await supabase.from('obf_kpis').insert(pendingImportData);
      } else if (mode === 'update') {
        for (const item of pendingImportData) {
          if (item.kpi_no) {
            const existing = kpis.find(k => k.kpi_no === item.kpi_no);
            if (existing) await supabase.from('obf_kpis').update(item).eq('id', existing.id);
            else await supabase.from('obf_kpis').insert(item);
          } else {
            await supabase.from('obf_kpis').insert(item);
          }
        }
      } else {
        const existingNos = new Set(kpis.map(k => k.kpi_no).filter(Boolean));
        const newRecords = pendingImportData.filter(item => !item.kpi_no || !existingNos.has(item.kpi_no));
        if (newRecords.length > 0) await supabase.from('obf_kpis').insert(newRecords);
      }
      fetchKPIs();
      alert('Import completed.');
    } catch (err) {
      alert('Import error: ' + err.message);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
        <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-800">OBF KPIs</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search KPIs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-64 text-sm outline-none" />
            </div>
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors">
              <Download size={16} /> Export
            </button>
            {canEdit && (
              <>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                  <Upload size={16} /> Import
                </button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">No.</th>
                <th className="p-4 font-semibold">KPI Title</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold hidden md:table-cell">Unit</th>
                {canEdit && <th className="p-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Loading records...</td></tr>
              ) : sortedKPIs.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No KPIs found.</td></tr>
              ) : (
                sortedKPIs.map((kpi) => (
                  <tr key={kpi.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-600">{kpi.kpi_no || '-'}</td>
                    <td className="p-4"><p className="font-medium text-slate-800">{kpi.title}</p></td>
                    <td className="p-4 text-sm text-slate-600">{kpi.category}</td>
                    <td className="p-4 hidden md:table-cell text-sm text-slate-600">{kpi.unit || '-'}</td>
                    {canEdit && (
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => setManagingValuesFor(kpi)} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-colors" title="Manage Values"><ArrowUpRight size={18} /></button>
                        <button onClick={() => setEditingKPI(kpi)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Edit KPI"><Edit size={18} /></button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingKPI && <EditKPIModal kpi={editingKPI} onClose={() => setEditingKPI(null)} onRefresh={fetchKPIs} categories={categories} />}
      {managingValuesFor && <KPIValuesModal kpi={managingValuesFor} onClose={() => setManagingValuesFor(null)} />}

      <ImportModeDialog
        isOpen={importDialogOpen}
        fileName={importFileName}
        recordCount={pendingImportData?.length || 0}
        existingCount={kpis.length}
        uniqueFieldLabel="KPI No"
        onReplace={() => executeImport('replace')}
        onAppend={() => executeImport('append')}
        onUpdate={() => executeImport('update')}
        onCancel={() => { setImportDialogOpen(false); setPendingImportData(null); }}
      />
    </>
  );
}

// --- Modals ---
function EditKPIModal({ kpi, onClose, onRefresh, categories }) {
  const [formData, setFormData] = useState({ ...kpi });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      delete payload.id;
      const { error } = await supabase.from('obf_kpis').update(payload).eq('id', kpi.id);
      if (error) throw error;
      onRefresh();
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-slate-800">Edit KPI</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <KPIFormFields formData={formData} handleChange={(e) => setFormData({...formData, [e.target.name]: e.target.value})} categories={categories} />
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">{loading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function evaluateRubric(valStr, rubricStr) {
  if (!rubricStr || valStr === undefined || valStr === null || valStr === '') return false;
  const val = Number(valStr);
  if (isNaN(val)) return false;
  try {
    let expr = rubricStr.replace(/value/g, 'val');
    if (!expr.includes('val')) {
      expr = expr.split('&&').map(part => `val ${part.trim()}`).join(' && ');
    }
    const func = new Function('val', `return (${expr});`);
    return func(val);
  } catch(e) {
    return false;
  }
}

function getKPIStatus(kpi, value) {
  if (value === undefined || value === null || value === '') return { color: 'bg-slate-100', text: 'slate-600', label: 'No Data' };
  if (evaluateRubric(value, kpi.rubric_red)) return { color: 'bg-red-500', text: 'white', label: 'Critical' };
  if (evaluateRubric(value, kpi.rubric_orange)) return { color: 'bg-orange-500', text: 'white', label: 'Below Target' };
  if (evaluateRubric(value, kpi.rubric_yellow)) return { color: 'bg-yellow-400', text: 'yellow-900', label: 'Near Target' };
  if (evaluateRubric(value, kpi.rubric_green)) return { color: 'bg-emerald-500', text: 'white', label: 'Target Met' };
  return { color: 'bg-slate-200', text: 'slate-800', label: 'Uncategorized' };
}

function KPIValuesModal({ kpi, onClose }) {
  const [values, setValues] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [dbPrograms, setDbPrograms] = useState([]);
  const [formData, setFormData] = useState({ academic_year: '', program_name: 'Institution', numerator: '', denominator: '', value: '' });

  useEffect(() => {
    supabase.from('academic_years').select('*').order('sort_order').then(({data}) => {
      if(data) {
        setAcademicYears(data.map(y => y.label));
        if (data.length > 0) setFormData(f => ({...f, academic_year: data[0].label}));
      }
    });
    supabase.from('programs').select('name').eq('is_active', true).order('name').then(({data}) => {
      if(data) setDbPrograms(data);
    });
    fetchValues();
  }, []);

  const fetchValues = async () => {
    try {
      const { data } = await supabase.from('obf_kpi_values').select('*').eq('kpi_id', kpi.id).order('academic_year', { ascending: false });
      setValues(data || []);
    } catch(e) { console.error(e); }
  };

  const handleCalcValue = (num, den) => {
    if (!den || Number(den) === 0) return num;
    return (Number(num) / Number(den)) * (kpi.unit?.includes('%') ? 100 : 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const calculatedValue = formData.value !== '' ? Number(formData.value) : handleCalcValue(formData.numerator, formData.denominator);
    try {
      await supabase.from('obf_kpi_values').upsert([{
        kpi_id: kpi.id,
        academic_year: formData.academic_year,
        program_name: formData.program_name,
        numerator: formData.numerator ? Number(formData.numerator) : null,
        denominator: formData.denominator ? Number(formData.denominator) : null,
        value: Number(calculatedValue)
      }], { onConflict: 'kpi_id, academic_year, program_name' });
      fetchValues();
      setFormData({...formData, numerator: '', denominator: '', value: ''});
    } catch(e) {
      alert("Failed to save: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    await supabase.from('obf_kpi_values').delete().eq('id', id);
    fetchValues();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Manage KPI Values</h2>
            <p className="text-sm text-slate-500">{kpi.kpi_no}: {kpi.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form onSubmit={handleSubmit} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Academic Year</label>
                <select value={formData.academic_year} onChange={e => setFormData({...formData, academic_year: e.target.value})} className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Institution / Program</label>
                <select value={formData.program_name} onChange={e => setFormData({...formData, program_name: e.target.value})} className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  <option value="Institution">Institution</option>
                  {dbPrograms.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Direct Value (Optional)</label>
                <input type="number" step="any" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} placeholder="Override calculation" className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{kpi.numerator_label || 'Numerator'}</label>
                <input type="number" step="any" value={formData.numerator} onChange={e => setFormData({...formData, numerator: e.target.value})} className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{kpi.denominator_label || 'Denominator'}</label>
                <input type="number" step="any" value={formData.denominator} onChange={e => setFormData({...formData, denominator: e.target.value})} className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700">Add Value</button>
            </div>
          </form>

          <div>
            <h3 className="font-bold text-slate-800 mb-3 text-sm">Recorded Values</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-sm">
                    <th className="p-3 border-b">Year</th>
                    <th className="p-3 border-b">Scope</th>
                    <th className="p-3 border-b text-center">Num/Den</th>
                    <th className="p-3 border-b text-center">Final Value</th>
                    <th className="p-3 border-b">Status</th>
                    <th className="p-3 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {values.length === 0 ? (
                    <tr><td colSpan="6" className="p-4 text-center text-slate-500">No values recorded yet.</td></tr>
                  ) : values.map(v => {
                    const status = getKPIStatus(kpi, v.value);
                    return (
                      <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-700">{v.academic_year}</td>
                        <td className="p-3 text-slate-600">{v.program_name}</td>
                        <td className="p-3 text-center text-slate-500 text-xs">{v.numerator !== null ? v.numerator : '-'}{v.denominator ? ` / ${v.denominator}` : ''}</td>
                        <td className="p-3 text-center font-bold text-indigo-700">{v.value}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-[10px] rounded-full ${status.color} text-${status.text} font-bold`}>{status.label}</span>
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleDelete(v.id)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIReportsView({ initialYear }) {
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(initialYear || '');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('year');
  const [selectedKPIId, setSelectedKPIId] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [allKPIs, setAllKPIs] = useState([]);

  useEffect(() => {
    supabase.from('academic_years').select('*').order('sort_order').then(({data}) => {
      if(data) {
        const labels = data.map(y => y.label);
        setAcademicYears(labels);
        if (!initialYear && labels.length > 0) setSelectedYear(labels[0]);
      }
    });
    supabase.from('obf_kpis').select('id, kpi_no, title').then(({data}) => {
      if(data) setAllKPIs(data.sort((a,b) => (a.kpi_no||'').localeCompare(b.kpi_no||'', undefined, { numeric: true })));
    });
  }, [initialYear]);

  const fetchReport = async (year) => {
    setLoading(true);
    try {
      const { data: mappings } = await supabase.from('obf_kpi_year_mapping').select('kpi_id').eq('academic_year', year);
      const mappedIds = (mappings || []).map(m => m.kpi_id);
      
      const { data: kpis } = await supabase.from('obf_kpis').select('*');
      const { data: values } = await supabase.from('obf_kpi_values').select('*').eq('academic_year', year);
      
      const report = [];
      const targets = mappedIds.length > 0 ? kpis.filter(k => mappedIds.includes(k.id)) : kpis;

      targets.forEach(kpi => {
        const kpiVals = (values || []).filter(v => v.kpi_id === kpi.id);
        if (kpiVals.length > 0) {
          kpiVals.forEach(val => {
            report.push({ ...kpi, program_name: val.program_name, value: val.value, status: getKPIStatus(kpi, val.value) });
          });
        } else {
          report.push({ ...kpi, program_name: 'Institution', value: undefined, status: getKPIStatus(kpi, undefined) });
        }
      });
      setReportData(report);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchTrend = async (kpiId) => {
    setSelectedKPIId(kpiId);
    setLoading(true);
    try {
      const { data: kpi } = await supabase.from('obf_kpis').select('*').eq('id', kpiId).single();
      const { data: vals } = await supabase.from('obf_kpi_values').select('*').eq('kpi_id', kpiId).order('academic_year');
      
      const allProgNames = [...new Set((vals || []).map(v => v.program_name))];
      const programs = allProgNames.length > 0 ? allProgNames : ['Institution'];
      
      const trend = academicYears.map(yr => {
        const yearVals = (vals || []).filter(v => v.academic_year === yr);
        const progData = programs.map(prog => {
          const v = yearVals.find(x => x.program_name === prog);
          return { program: prog, value: v?.value, status: getKPIStatus(kpi, v?.value) };
        });
        return { year: yr, programs: progData };
      });
      setTrendData(trend);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (selectedYear && viewMode === 'year') fetchReport(selectedYear); }, [selectedYear, viewMode]);

  const filtered = reportData.filter(r => 
    (r.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.kpi_no || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedKPI = allKPIs.find(k => String(k.id) === String(selectedKPIId));

  return (
    <div className="h-full w-full flex flex-col">
      <div className="print:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-wrap gap-3">
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('year')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'year' ? 'bg-white shadow text-indigo-700' : 'text-slate-600'}`}>Yearly View</button>
            <button onClick={() => { setViewMode('trend'); if (!selectedKPIId && allKPIs.length > 0) fetchTrend(allKPIs[0].id); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'trend' ? 'bg-white shadow text-indigo-700' : 'text-slate-600'}`}>KPI Trend</button>
          </div>
          {viewMode === 'year' ? (
            <>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold">{academicYears.map(y => <option key={y}>{y}</option>)}</select>
              <input type="text" placeholder="Filter KPI..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 w-full sm:w-48" />
            </>
          ) : (
            <select value={selectedKPIId || ''} onChange={e => fetchTrend(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 min-w-[250px]">
              <option value="">Select KPI...</option>
              {allKPIs.map(k => <option key={k.id} value={k.id}>{k.kpi_no}: {k.title}</option>)}
            </select>
          )}
        </div>
        <div className="flex space-x-3">
          <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900"><Printer size={16} className="mr-2" /> PDF Export</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 print:border-none print:shadow-none print:p-0 flex-1 overflow-auto">
        <div className="text-center mb-8 pb-6 border-b border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Outcome Based Framework (OBF)</h1>
          <h2 className="text-xl font-semibold text-indigo-800">{viewMode === 'year' ? `Yearly Report — ${selectedYear}` : `Performance Trend — ${selectedKPI?.title || ''}`}</h2>
        </div>

        {loading ? <p className="text-center py-10">Loading Report...</p> : viewMode === 'year' ? (
          <div className="space-y-6">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-y border-slate-200">
                  <th className="p-3">No.</th>
                  <th className="p-3">KPI Title</th>
                  <th className="p-3">Scope</th>
                  <th className="p-3 text-center">Value</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-500">{r.kpi_no}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{r.title}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-tight">{r.category}</div>
                    </td>
                    <td className="p-3 text-slate-600">{r.program_name}</td>
                    <td className="p-3 text-center font-mono font-bold text-lg">{r.value != null ? `${r.value}${r.unit?.includes('%') ? '%' : ''}` : '-'}</td>
                    <td className="p-3 text-right">
                      <span className={`inline-block px-3 py-1 rounded text-[10px] font-bold text-white ${r.status.color}`}>{r.status.label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 font-bold text-slate-700">
                    <th className="p-3 text-left">Year</th>
                    {trendData[0]?.programs.map(p => <th key={p.program} className="p-3 text-center">{p.program}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trendData.map(row => (
                    <tr key={row.year}>
                      <td className="p-3 font-bold text-slate-700">{row.year}</td>
                      {row.programs.map(p => (
                        <td key={p.program} className="p-3 text-center">
                          <div className="font-mono font-bold text-lg">{p.value != null ? p.value : '-'}</div>
                          <div className={`text-[10px] font-bold ${p.status.color.replace('bg-', 'text-')}`}>{p.status.label}</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="h-[350px] w-full border border-slate-100 rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData.map(d => {
                  const pt = { year: d.year };
                  d.programs.forEach(p => { pt[p.program] = p.value; });
                  return pt;
                })}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {(trendData[0]?.programs || []).map((p, i) => (
                    <Line key={p.program} type="monotone" dataKey={p.program} stroke={['#6366f1', '#f59e0b', '#10b981', '#ef4444'][i % 4]} strokeWidth={3} dot={{ r: 4 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Admin Components ---
function CategoriesManager({ categories, onRefresh }) {
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newValue.trim() || !newLabel.trim()) return;
    setLoading(true);
    try {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order || 0)) : 0;
      await supabase.from('obf_categories').insert([{ value: newValue, label: newLabel, sort_order: maxOrder + 1 }]);
      setNewValue(''); setNewLabel(''); onRefresh();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleUpdate = async (id) => {
    if (!editValue.trim() || !editLabel.trim()) return;
    setLoading(true);
    try {
      await supabase.from('obf_categories').update({
        value: editValue.trim(),
        label: editLabel.trim()
      }).eq('id', id);
      setEditingId(null);
      onRefresh();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete category?')) {
      await supabase.from('obf_categories').delete().eq('id', id);
      onRefresh();
    }
  };

  const startEditing = (cat) => {
    setEditingId(cat.id);
    setEditValue(cat.value);
    setEditLabel(cat.label);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Tags className="w-5 h-5 text-indigo-600" /> KPI Categories</h3>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 mb-6">
          <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Code (e.g. ACAD)" className="flex-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Category Name" className="flex-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-1.5"><PlusCircle size={16}/> Add</button>
        </form>
        <div className="divide-y divide-slate-100 border rounded-lg overflow-hidden">
          {categories.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm italic">No categories defined yet.</div>
          ) : categories.map(cat => (
            <div key={cat.id} className="p-4 flex justify-between items-center group hover:bg-slate-50 transition-colors">
              {editingId === cat.id ? (
                <div className="flex gap-2 flex-1 mr-2">
                  <input value={editValue} onChange={e => setEditValue(e.target.value)} className="w-1/3 px-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
                  <input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="flex-1 px-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
                  <button onClick={() => handleUpdate(cat.id)} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-slate-500 px-3 py-1.5">Cancel</button>
                </div>
              ) : (
                <>
                  <div>
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs mr-3">{cat.value}</span> 
                    <span className="font-medium text-slate-700">{cat.label}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditing(cat)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Edit"><Edit size={16}/></button>
                    <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={16}/></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AcademicYearsManager({ years, onRefresh }) {
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const maxOrder = years.length > 0 ? Math.max(...years.map(y => y.sort_order || 0)) : 0;
    await supabase.from('academic_years').insert([{ label: newLabel, sort_order: maxOrder + 1 }]);
    setNewLabel(''); onRefresh();
  };

  const handleUpdate = async (id) => {
    if (!editLabel.trim()) return;
    try {
      await supabase.from('academic_years').update({ label: editLabel.trim() }).eq('id', id);
      setEditingId(null);
      onRefresh();
    } catch(e) { alert(e.message); }
  };

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Delete academic year "${label}"?`)) return;
    try {
      await supabase.from('academic_years').delete().eq('id', id);
      onRefresh();
    } catch(e) { alert(e.message); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-600" /> Academic Years</h3>
        <form onSubmit={handleAdd} className="flex gap-3 mb-6">
          <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. 2026-2027" className="flex-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-1.5"><PlusCircle size={16}/> Add Year</button>
        </form>
        <div className="space-y-2">
          {years.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm italic">No years defined yet.</div>
          ) : (
            years.map(y => (
              <div key={y.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:bg-slate-100 transition-colors">
                {editingId === y.id ? (
                  <div className="flex gap-2 flex-1 mr-2">
                    <input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="flex-1 px-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
                    <button onClick={() => handleUpdate(y.id)} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-sm text-slate-500 px-3 py-1.5">Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-slate-700">{y.label}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(y.id); setEditLabel(y.label); }} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg" title="Edit"><Edit size={16}/></button>
                      <button onClick={() => handleDelete(y.id, y.label)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg" title="Delete"><Trash2 size={16}/></button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function KPIYearMappingManager({ academicYears }) {
  const [kpis, setKpis] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [selectedYear, setSelectedYear] = useState(academicYears[0]?.label || '');

  useEffect(() => {
    supabase.from('obf_kpis').select('id, kpi_no, title').then(({data}) => setKpis(data || []));
  }, []);

  useEffect(() => {
    if (selectedYear) {
      supabase.from('obf_kpi_year_mapping').select('*').eq('academic_year', selectedYear).then(({data}) => setMappings(data || []));
    }
  }, [selectedYear]);

  const toggleMapping = async (kpiId) => {
    const isMapped = mappings.some(m => m.kpi_id === kpiId);
    if (isMapped) {
      await supabase.from('obf_kpi_year_mapping').delete().eq('kpi_id', kpiId).eq('academic_year', selectedYear);
    } else {
      await supabase.from('obf_kpi_year_mapping').insert([{ kpi_id: kpiId, academic_year: selectedYear }]);
    }
    supabase.from('obf_kpi_year_mapping').select('*').eq('academic_year', selectedYear).then(({data}) => setMappings(data || []));
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">KPI-Year Mapping</h3>
        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="mb-6 px-4 py-2 border rounded-lg outline-none">
          {academicYears.map(y => <option key={y.id} value={y.label}>{y.label}</option>)}
        </select>
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
          {kpis.map(k => (
            <label key={k.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${mappings.some(m => m.kpi_id === k.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white'}`}>
              <input type="checkbox" checked={mappings.some(m => m.kpi_id === k.id)} onChange={() => toggleMapping(k.id)} />
              <span className="font-bold text-slate-600 w-12">{k.kpi_no}</span>
              <span>{k.title}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
