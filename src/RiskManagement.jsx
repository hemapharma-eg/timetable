import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, PlusCircle, List as ListIcon, 
  Search, AlertTriangle, CheckCircle, Clock,
  Activity, BookOpen, Stethoscope, Briefcase,
  Edit, Trash2, X, Target, Download, Share2, Printer, Tags, Upload
} from 'lucide-react';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';
import { createRoot } from 'react-dom/client';
import RichTextEditor from './RichTextEditor';
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

// ============================================================================
// MOCK DATA (Fallback for UI Preview)
// ============================================================================
let mockRisks = [
  {
    id: 1,
    Risk_Title: "Data Privacy Breach in Student Records",
    Category: "Compliance",
    Reporter_Email: "admin@dmu.ac.ae",
    Risk_Causes: "Outdated software patches in the main CMS.",
    Risk_Consequences_: "Potential leak of sensitive student data, regulatory fines.",
    Existing_Internal_control_: "Monthly IT security audits.",
    Rubrics: "High",
    Risk_Owner: "IT Director",
    Risk_Reporter: "System Admin",
    risk_scope: "Institution", programs: "", rubric_green: "< 3", rubric_yellow: ">= 3 && value < 6", rubric_orange: ">= 6 && value < 8", rubric_red: ">= 8",
    Mitigating_Actions: "Implement auto-patching.",
    created_at: "2026-04-20T10:00:00Z"
  }
];

let mockRiskValues = [];


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

export function RiskManagement({ session, userMeta, isTechAdmin, allowedSubTabs, permissions }) {
  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (isTechAdmin) return 'dashboard';
    if (allowedSubTabs && allowedSubTabs.length > 0) return allowedSubTabs[0];
    return 'dashboard';
  });
  const [categories, setCategories] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('risk_categories').select('*').order('sort_order');
      if (error) throw error;
      setCategories(data || []);
    } catch (e) {
      console.warn('Using fallback categories:', e.message);
      setCategories([
        { id: '1', value: 'C01', label: 'Academic & Research', sort_order: 1 },
        { id: '2', value: 'C02', label: 'Clinical Operations', sort_order: 2 },
        { id: '3', value: 'C03', label: 'Compliance & Legal', sort_order: 3 },
        { id: '4', value: 'C04', label: 'Financial', sort_order: 4 },
        { id: '5', value: 'C05', label: 'IT & Cybersecurity', sort_order: 5 },
        { id: '6', value: 'C06', label: 'Operational / Facilities', sort_order: 6 },
        { id: '7', value: 'C07', label: 'Strategic', sort_order: 7 },
      ]);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase.from('academic_years').select('*').order('sort_order');
      if (error) throw error;
      setAcademicYears(data || []);
    } catch (e) {
      setAcademicYears([{ id:'1',label:'2023-2024',sort_order:1 },{ id:'2',label:'2024-2025',sort_order:2 },{ id:'3',label:'2025-2026',sort_order:3 }]);
    }
  };

  useEffect(() => { fetchCategories(); fetchAcademicYears(); }, []);

  const allTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'new_risk', label: 'Report a Risk' },
    { id: 'register', label: 'Risk Register' },
    { id: 'reports', label: 'Yearly Reports' },
    ...(isTechAdmin ? [
      { id: 'categories', label: 'Manage Categories' },
      { id: 'years', label: 'Academic Years' },
      { id: 'mapping', label: 'Risk-Year Mapping' }
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
      title="Risk Management"
      description="Identify, assess, and mitigate risks across Academic, Clinical, Operational, and Strategic domains."
      tabs={tabs}
      activeSubTab={activeSubTab}
      setActiveSubTab={setActiveSubTab}
    >
      {activeSubTab === 'dashboard' && <DashboardView categories={categories} />}
      {activeSubTab === 'new_risk' && <NewRiskForm onSuccess={() => setActiveSubTab('register')} session={session} categories={categories} />}
      {activeSubTab === 'register' && <RiskRegister isTechAdmin={isTechAdmin} permissions={permissions} categories={categories} />}
      {(activeSubTab === 'reports' || (!isTechAdmin && tabs.length === 1 && tabs[0].id === 'reports')) && <ErrorBoundary><RiskReportsView /></ErrorBoundary>}
      {activeSubTab === 'categories' && isTechAdmin && <CategoriesManager categories={categories} onRefresh={fetchCategories} />}
      {activeSubTab === 'years' && isTechAdmin && <AcademicYearsManager years={academicYears} onRefresh={fetchAcademicYears} />}
      {activeSubTab === 'mapping' && isTechAdmin && <RiskYearMappingManager academicYears={academicYears} />}
    </PageContainer>
  );
}

// --- Dashboard View ---
function DashboardView({ categories }) {
  const [stats, setStats] = useState({ total: 0, high: 0, clinical: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.from('risk_management_plan').select('*');
        if (error) throw error;
        setStats({
          total: data.length,
          high: data.filter(r => r.Rubrics === 'High' || r.Rubrics === 'Critical').length,
          clinical: data.filter(r => r.Category === 'Clinical').length
        });
      } catch (err) {
        console.warn("Using mock data for Risk stats due to DB error:", err.message);
        setStats({
          total: mockRisks.length,
          high: mockRisks.filter(r => r.Rubrics === 'High' || r.Rubrics === 'Critical').length,
          clinical: mockRisks.filter(r => r.Category === 'Clinical').length
        });
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Risks Logged" value={stats.total} icon={<ListIcon className="text-blue-500 w-8 h-8" />} bg="bg-blue-50" />
        <StatCard title="High/Critical Risks" value={stats.high} icon={<AlertTriangle className="text-red-500 w-8 h-8" />} bg="bg-red-50" />
      </div>

      {/* Information Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-slate-500" />
          Risk Management Policy Overview
        </h3>
        <p className="text-slate-600 mb-4 leading-relaxed">
          The DMU QA Hub Risk Management Plan ensures systematic identification, assessment, and mitigation of risks.
        </p>
        <div className="grid grid-cols-1 gap-4 mt-6">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <h4 className="font-semibold text-slate-700 mb-2">Primary Categories</h4>
            <ul className="text-sm text-slate-600 space-y-1 list-disc pl-4">
              {categories.length > 0 ? categories.map(c => (
                <li key={c.id}>{c.label}</li>
              )) : (
                <>
                  <li>Academic & Research</li>
                  <li>Clinical & Patient Safety</li>
                  <li>Financial & Strategic</li>
                  <li>Compliance & Legal</li>
                  <li>IT & Data Security</li>
                </>
              )}
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
      // Remove 'value ' or 'val ' if present
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
      <label className={`block text-xs font-bold ${colorClass}`}>{label} <span className="text-red-500">*</span></label>
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

function RiskFormFields({ formData, handleChange, categories = [] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Risk No.</label>
          <select name="Risk_No" value={formData.Risk_No || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none">
            <option value="">Select...</option>
            {Array.from({length:30},(_,i)=>{ const v=`R${String(i+1).padStart(2,'0')}`; return <option key={v} value={v}>{v}</option>; })}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Title <span className="text-red-500">*</span></label>
          <input type="text" name="Risk_Title" required value={formData.Risk_Title || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
          <select name="Category" required value={formData.Category || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none">
            <option value="">Select Category...</option>
            {categories.map(c => (
              <option key={c.id} value={c.value}>{c.value} — {c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Owner</label>
          <input type="text" name="Risk_Owner" value={formData.Risk_Owner || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Scope <span className="text-red-500">*</span></label>
          <select name="risk_scope" required value={formData.risk_scope || 'Institution'} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none">
            <option value="Institution">Institution</option>
            <option value="Program Level">Program Level</option>
          </select>
        </div>
        {formData.risk_scope === 'Program Level' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Programs (comma separated) <span className="text-red-500">*</span></label>
            <input type="text" name="programs" required value={formData.programs || ''} onChange={handleChange} placeholder="e.g. BSc Pharmacy, MSc Pharmacy" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <RubricConditionBuilder colorClass="text-emerald-700" label="No Risk (Green)" value={formData.rubric_green} onChange={v => handleChange({target: {name: 'rubric_green', value: v}})} />
        <RubricConditionBuilder colorClass="text-yellow-600" label="Low Prob (Yellow)" value={formData.rubric_yellow} onChange={v => handleChange({target: {name: 'rubric_yellow', value: v}})} />
        <RubricConditionBuilder colorClass="text-orange-600" label="High Prob (Orange)" value={formData.rubric_orange} onChange={v => handleChange({target: {name: 'rubric_orange', value: v}})} />
        <RubricConditionBuilder colorClass="text-red-700" label="Incident (Red)" value={formData.rubric_red} onChange={v => handleChange({target: {name: 'rubric_red', value: v}})} />
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Mitigating Actions</label>
          <RichTextEditor value={formData.Mitigating_Actions || ''} onChange={(val) => handleChange({ target: { name: 'Mitigating_Actions', value: val } })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Causes</label>
          <RichTextEditor value={formData.Risk_Causes || ''} onChange={(val) => handleChange({ target: { name: 'Risk_Causes', value: val } })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Consequences</label>
          <RichTextEditor value={formData.Risk_Consequences_ || ''} onChange={(val) => handleChange({ target: { name: 'Risk_Consequences_', value: val } })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Existing Internal Controls</label>
          <RichTextEditor value={formData.Existing_Internal_control_ || ''} onChange={(val) => handleChange({ target: { name: 'Existing_Internal_control_', value: val } })} />
        </div>
      </div>
    </div>
  );
}

function NewRiskForm({ onSuccess, session, categories }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    Risk_No: '', Risk_Title: '', Category: '', Risk_Causes: '', 
    Risk_Consequences_: '', Existing_Internal_control_: '',
    Risk_Owner: '', risk_scope: 'Institution', programs: '', rubric_green: '', rubric_yellow: '', rubric_orange: '', rubric_red: '', Mitigating_Actions: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...formData, Reporter_Email: session?.user?.email || 'unknown@dmu.ac.ae' };
    
    // Strictly cast to numbers to prevent Supabase type mismatches
    
    

    try {
      const { data, error } = await supabase.from('risk_management_plan').insert([payload]).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Insert failed silently (0 rows returned). This is usually an RLS policy issue.");
      onSuccess();
    } catch (error) {
      console.error(error);
      alert("Database error: " + (error.message || 'Unknown') + "\n\nSaving to local preview instead. Please ensure columns exist and RLS policies allow inserts.");
      mockRisks.unshift({ ...payload, id: Date.now(), created_at: new Date().toISOString() });
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl">
      <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center">
        <ShieldAlert className="w-6 h-6 text-indigo-600 mr-2" />
        <h3 className="text-lg font-semibold text-indigo-900">Risk Identification Form</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        <RiskFormFields formData={formData} handleChange={handleChange} categories={categories} />
        <div className="flex justify-end pt-6">
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center shadow-md">
            {loading ? 'Submitting...' : <><CheckCircle className="w-5 h-5 mr-2" /> Submit Risk Assessment</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Risk Register (List View) ---
function RiskRegister({ isTechAdmin, permissions, categories }) {
  const [risks, setRisks] = useState([]);
  const canEdit = isTechAdmin || (permissions && permissions.some(p => p.module_name === 'risk_register' && p.can_edit));
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingRisk, setEditingRisk] = useState(null);
  const [managingKRIsFor, setManagingKRIsFor] = useState(null);

  useEffect(() => { fetchRisks(); }, []);

  const fetchRisks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('risk_management_plan').select('*');
      if (error) throw error;
      setRisks(data);
    } catch (err) {
      setRisks(mockRisks);
    } finally {
      setLoading(false);
    }
  };

  const filteredRisks = risks.filter(r => r.Risk_Title.toLowerCase().includes(searchTerm.toLowerCase()) || (r.Category || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const sortedRisks = [...filteredRisks].sort((a, b) => (a.Risk_No || '').localeCompare(b.Risk_No || '', undefined, { numeric: true }));

  // --- Excel Export ---
  const handleExportExcel = () => {
    const exportData = risks.map(r => ({
      Risk_No: r.Risk_No || '',
      Risk_Title: r.Risk_Title || '',
      Category: r.Category || '',
      Risk_Owner: r.Risk_Owner || '',
      Scope: r.risk_scope || '', Programs: r.programs || '', Green: r.rubric_green || '', Yellow: r.rubric_yellow || '', Orange: r.rubric_orange || '', Red: r.rubric_red || '',
      Risk_Causes: r.Risk_Causes || '',
      Risk_Consequences: r.Risk_Consequences_ || '',
      Existing_Controls: r.Existing_Internal_control_ || '',
      Mitigating_Actions: r.Mitigating_Actions || ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Risk Register');
    XLSX.writeFile(wb, 'Risk_Management_Plan.xlsx');
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
          Risk_No: r.Risk_No || r['Risk No'] || '',
          Risk_Title: r.Risk_Title || r['Risk Title'] || '',
          Category: r.Category || '',
          Risk_Owner: r.Risk_Owner || r['Risk Owner'] || '',
          risk_scope: r.Scope || r.risk_scope || 'Institution', programs: r.Programs || r.programs || '', rubric_green: r.Green || r.rubric_green || '', rubric_yellow: r.Yellow || r.rubric_yellow || '', rubric_orange: r.Orange || r.rubric_orange || '', rubric_red: r.Red || r.rubric_red || '',
          Risk_Causes: r.Risk_Causes || r['Risk Causes'] || '',
          Risk_Consequences_: r.Risk_Consequences || r.Risk_Consequences_ || '',
          Existing_Internal_control_: r.Existing_Controls || r.Existing_Internal_control_ || '',
          Mitigating_Actions: r.Mitigating_Actions || r['Mitigating Actions'] || ''
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
        const { error: delErr } = await supabase.from('risk_management_plan').delete().neq('id', 0);
        if (delErr) { alert('Failed to clear existing records: ' + delErr.message); return; }
        const { error } = await supabase.from('risk_management_plan').insert(pendingImportData);
        if (error) throw error;
        alert(`Imported ${pendingImportData.length} records.`);
      } else if (mode === 'update') {
        let updatedCount = 0;
        let insertedCount = 0;
        for (const item of pendingImportData) {
          if (item.Risk_No) {
            const existing = risks.find(r => r.Risk_No === item.Risk_No);
            if (existing) {
              await supabase.from('risk_management_plan').update(item).eq('id', existing.id);
              updatedCount++;
            } else {
              await supabase.from('risk_management_plan').insert(item);
              insertedCount++;
            }
          } else {
            await supabase.from('risk_management_plan').insert(item);
            insertedCount++;
          }
        }
        alert(`Updated ${updatedCount} existing records and inserted ${insertedCount} new records.`);
      } else {
        const existingIds = new Set(risks.map(r => r.Risk_No).filter(Boolean));
        const newRecords = [];
        const rejectedRecords = [];
        pendingImportData.forEach(item => {
          if (item.Risk_No && existingIds.has(item.Risk_No)) {
            rejectedRecords.push(item);
          } else {
            newRecords.push(item);
            if (item.Risk_No) existingIds.add(item.Risk_No);
          }
        });
        
        if (newRecords.length > 0) {
          const { error } = await supabase.from('risk_management_plan').insert(newRecords);
          if (error) throw error;
        }
        
        if (rejectedRecords.length > 0) {
          alert(`Imported ${newRecords.length} new records.\nRejected ${rejectedRecords.length} duplicate records.`);
        } else {
          alert(`Successfully imported all ${newRecords.length} records.`);
        }
      }
      fetchRisks();
    } catch (err) {
      alert('Import error: ' + err.message);
    }
    setPendingImportData(null);
    setImportFileName('');
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
        <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-800">Identified Risks</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search risks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-64 text-sm outline-none" />
            </div>
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors" title="Export to Excel">
                  <Download size={16} /> Export
                </button>
            {canEdit && (
              <>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors" title="Import from Excel">
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
                <th className="p-4 font-semibold">Risk Title</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold hidden md:table-cell">Owner</th>
                {canEdit && <th className="p-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Loading records...</td></tr>
              ) : sortedRisks.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No risks found.</td></tr>
              ) : (
                sortedRisks.map((risk) => (
                  <tr key={risk.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-600">{risk.Risk_No || '-'}</td>
                    <td className="p-4"><p className="font-medium text-slate-800">{risk.Risk_Title}</p></td>
                    <td className="p-4 hidden md:table-cell text-sm text-slate-600">{risk.Category}</td>
                    <td className="p-4 hidden md:table-cell text-sm text-slate-600">{risk.Risk_Owner || '-'}</td>
                    {canEdit && (
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => setManagingKRIsFor(risk)} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-colors" title="Manage Values"><Target size={18} /></button>
                        <button onClick={() => setEditingRisk(risk)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Edit Risk"><Edit size={18} /></button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingRisk && <EditRiskModal risk={editingRisk} onClose={() => setEditingRisk(null)} onRefresh={fetchRisks} categories={categories} />}
      {managingKRIsFor && <RiskValuesModal risk={managingKRIsFor} onClose={() => setManagingKRIsFor(null)} />}

      <ImportModeDialog
        isOpen={importDialogOpen}
        fileName={importFileName}
        recordCount={pendingImportData?.length || 0}
        existingCount={risks.length}
        uniqueFieldLabel="Risk_No"
        onReplace={() => executeImport('replace')}
        onAppend={() => executeImport('append')}
        onUpdate={() => executeImport('update')}
        onCancel={() => { setImportDialogOpen(false); setPendingImportData(null); }}
      />
    </>
  );
}

// --- Admin Modals ---
function EditRiskModal({ risk, onClose, onRefresh, categories }) {
  const [formData, setFormData] = useState({ ...risk });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      delete payload.id; // Prevent updating the primary key directly
      
      // Strictly cast to numbers to prevent Supabase type mismatches
      
      

      const { data, error } = await supabase.from('risk_management_plan').update(payload).eq('id', risk.id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(`Update failed silently for ID ${risk.id}. The record might not exist or RLS blocked the update.`);
      
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert("DB Error: " + (err.message || 'Unknown') + "\n\nUpdating locally. Please ensure columns exist and RLS allows updates.");
      const mockRisk = mockRisks.find(r => r.id === risk.id);
      if (mockRisk) Object.assign(mockRisk, formData);
      onRefresh();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-slate-800">Edit Risk</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <RiskFormFields formData={formData} handleChange={(e) => setFormData({...formData, [e.target.name]: e.target.value})} categories={categories} />
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
    let expr = rubricStr;
    if (!expr.includes('value') && !expr.includes('val')) {
      expr = `val ${expr}`;
    } else {
      expr = expr.replace(/value/g, 'val');
    }
    const func = new Function('val', `return (${expr});`);
    return func(val);
  } catch(e) {
    return false;
  }
}

function getRiskStatus(risk, value) {
  if (value === undefined || value === null || value === '') return { color: 'bg-slate-100', text: 'slate-600', label: 'No Data' };
  if (evaluateRubric(value, risk.rubric_red)) return { color: 'bg-red-500', text: 'white', label: 'Incident Risk' };
  if (evaluateRubric(value, risk.rubric_orange)) return { color: 'bg-orange-500', text: 'white', label: 'High Probability' };
  if (evaluateRubric(value, risk.rubric_yellow)) return { color: 'bg-yellow-400', text: 'yellow-900', label: 'Low Probability' };
  if (evaluateRubric(value, risk.rubric_green)) return { color: 'bg-emerald-500', text: 'white', label: 'No Risk' };
  return { color: 'bg-slate-200', text: 'slate-800', label: 'Uncategorized' };
}

function RiskValuesModal({ risk, onClose }) {
  const [values, setValues] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [formData, setFormData] = useState({ academic_year: '', program_name: '', value: '' });

  useEffect(() => {
    supabase.from('academic_years').select('*').order('sort_order').then(({data}) => {
      if(data) {
        setAcademicYears(data.map(y => y.label));
        if (data.length > 0) setFormData(f => ({...f, academic_year: data[0].label}));
      }
    });
    fetchValues();
  }, []);

  const fetchValues = async () => {
    try {
      const { data } = await supabase.from('risk_values').select('*').eq('risk_id', risk.id).order('academic_year', { ascending: false });
      setValues(data || []);
    } catch(e) {
      setValues(mockRiskValues.filter(v => v.risk_id === risk.id));
    }
  };

  const programsList = (risk.programs || '').split(',').map(p => p.trim()).filter(Boolean);

  useEffect(() => {
    if (risk.risk_scope === 'Institution') setFormData(f => ({...f, program_name: 'Institution'}));
    else if (programsList.length > 0 && !formData.program_name) setFormData(f => ({...f, program_name: programsList[0]}));
  }, [risk, programsList.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.academic_year || !formData.program_name || formData.value === '') return;
    try {
      await supabase.from('risk_values').upsert([{
        risk_id: risk.id,
        academic_year: formData.academic_year,
        program_name: formData.program_name,
        value: Number(formData.value)
      }], { onConflict: 'risk_id, academic_year, program_name' });
      fetchValues();
      setFormData({...formData, value: ''});
    } catch(e) {
      alert("Failed to save: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    await supabase.from('risk_values').delete().eq('id', id);
    fetchValues();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Manage Risk Values</h2>
            <p className="text-sm text-slate-500 truncate max-w-md">{risk.Risk_No}: {risk.Risk_Title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form onSubmit={handleSubmit} className="flex gap-3 items-end p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Academic Year</label>
              <select value={formData.academic_year} onChange={e => setFormData({...formData, academic_year: e.target.value})} className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500">
                {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {risk.risk_scope === 'Program Level' ? (
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Program</label>
                <select value={formData.program_name} onChange={e => setFormData({...formData, program_name: e.target.value})} className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  {programsList.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            ) : (
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Scope</label>
                <input type="text" readOnly value="Institution" className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-500" />
              </div>
            )}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Value (Numeric)</label>
              <input type="number" step="any" required value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
            <button type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded font-medium text-sm hover:bg-indigo-700 h-[38px]">Add</button>
          </form>

          <div>
            <h3 className="font-bold text-slate-800 mb-3 text-sm">Recorded Values</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-sm">
                  <th className="p-2 border-b">Year</th>
                  <th className="p-2 border-b">Program / Scope</th>
                  <th className="p-2 border-b">Value</th>
                  <th className="p-2 border-b">Status</th>
                  <th className="p-2 border-b text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {values.length === 0 ? (
                  <tr><td colSpan="5" className="p-4 text-center text-slate-500">No values recorded yet.</td></tr>
                ) : values.map(v => {
                  const status = getRiskStatus(risk, v.value);
                  return (
                    <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="p-2 font-medium text-slate-700">{v.academic_year}</td>
                      <td className="p-2 text-slate-600">{v.program_name}</td>
                      <td className="p-2 font-bold">{v.value}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${status.color} text-${status.text} font-bold`}>{status.label}</span>
                      </td>
                      <td className="p-2 text-right">
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
  );
}

function RiskReportsView({ initialYear }) {
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(initialYear || '');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('year');
  const [selectedRiskId, setSelectedRiskId] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [allRisks, setAllRisks] = useState([]);

  useEffect(() => {
    supabase.from('academic_years').select('*').order('sort_order').then(({data}) => {
      if(data) {
        const labels = data.map(y => y.label);
        setAcademicYears(labels);
        if (!initialYear && labels.length > 0) setSelectedYear(labels[0]);
      }
    });
    supabase.from('risk_management_plan').select('id, Risk_No, Risk_Title').then(({data}) => {
      if(data) setAllRisks(data.sort((a,b) => (a.Risk_No||'').localeCompare(b.Risk_No||'', undefined, { numeric: true })));
    });
  }, [initialYear]);

  const fetchReport = async (year) => {
    setLoading(true);
    try {
      const { data: mappings } = await supabase.from('risk_year_mapping').select('risk_id').eq('academic_year', year);
      const mappedIds = (mappings || []).map(m => m.risk_id);
      if (mappedIds.length === 0) { setReportData([]); setLoading(false); return; }
      const { data: risks } = await supabase.from('risk_management_plan').select('*').in('id', mappedIds);
      const { data: values } = await supabase.from('risk_values').select('*').eq('academic_year', year).in('risk_id', mappedIds);
      const report = [];
      (risks || []).forEach(risk => {
        const riskVals = (values || []).filter(v => v.risk_id === risk.id);
        if (risk.risk_scope === 'Program Level') {
          (risk.programs || '').split(',').map(p => p.trim()).filter(Boolean).forEach(prog => {
            const valObj = riskVals.find(v => v.program_name === prog);
            report.push({ ...risk, program_name: prog, value: valObj?.value, status: getRiskStatus(risk, valObj?.value) });
          });
        } else {
          const valObj = riskVals.find(v => v.program_name === 'Institution');
          report.push({ ...risk, program_name: 'Institution', value: valObj?.value, status: getRiskStatus(risk, valObj?.value) });
        }
      });
      setReportData(report);
    } catch(e) { console.warn(e); setReportData([]); }
    finally { setLoading(false); }
  };

  const fetchTrend = async (riskId) => {
    setSelectedRiskId(riskId);
    setLoading(true);
    try {
      const { data: risk } = await supabase.from('risk_management_plan').select('*').eq('id', riskId).single();
      const { data: vals } = await supabase.from('risk_values').select('*').eq('risk_id', riskId).order('academic_year');
      if (!risk) { setTrendData([]); return; }
      const programs = risk.risk_scope === 'Program Level'
        ? (risk.programs || '').split(',').map(p => p.trim()).filter(Boolean)
        : ['Institution'];
      const trend = academicYears.map(yr => {
        const yearVals = (vals || []).filter(v => v.academic_year === yr);
        const progData = programs.map(prog => {
          const v = yearVals.find(x => x.program_name === prog);
          return { program: prog, value: v?.value, status: getRiskStatus(risk, v?.value) };
        });
        return { year: yr, programs: progData };
      });
      setTrendData(trend);
    } catch(e) { console.warn(e); setTrendData([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (selectedYear && viewMode === 'year') fetchReport(selectedYear); }, [selectedYear, viewMode]);

  const handleShare = async () => {
    const url = `${window.location.origin}?view=public_risk_report&year=${selectedYear}`;
    await navigator.clipboard.writeText(url); alert('Public report link copied!');
  };

  const filtered = reportData.filter(r => {
    if (searchTerm && !(r.Risk_Title || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (statusFilter !== 'All' && r.status.label !== statusFilter) return false;
    return true;
  }).sort((a,b) => (a.Risk_No || '').localeCompare(b.Risk_No || '', undefined, { numeric: true }));

  const counts = { incident: filtered.filter(r => r.status.label === 'Incident Risk').length, high: filtered.filter(r => r.status.label === 'High Probability').length, low: filtered.filter(r => r.status.label === 'Low Probability').length, none: filtered.filter(r => r.status.label === 'No Risk').length };
  const selectedRisk = allRisks.find(r => String(r.id) === String(selectedRiskId));

  const statusColors = { 'No Risk': 'bg-emerald-500', 'Low Probability': 'bg-yellow-400', 'High Probability': 'bg-orange-500', 'Incident Risk': 'bg-red-500', 'No Data': 'bg-slate-200', 'Uncategorized': 'bg-slate-300' };

  return (
    <div className="h-full min-h-[500px] w-full flex flex-col">
      <div className="print:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-wrap gap-3">
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('year')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'year' ? 'bg-white shadow text-indigo-700' : 'text-slate-600'}`}>Year View</button>
            <button onClick={() => { setViewMode('trend'); if (!selectedRiskId && allRisks.length > 0) fetchTrend(allRisks[0].id); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'trend' ? 'bg-white shadow text-indigo-700' : 'text-slate-600'}`}>Risk Trend</button>
          </div>
          {viewMode === 'year' && (<>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold">{academicYears.map(y => <option key={y}>{y}</option>)}</select>
            <input type="text" placeholder="Search title..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 w-full sm:w-48" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500">
              <option value="All">All Statuses</option><option value="No Risk">No Risk</option><option value="Low Probability">Low Probability</option><option value="High Probability">High Probability</option><option value="Incident Risk">Incident Risk</option>
            </select>
          </>)}
          {viewMode === 'trend' && (
            <select value={selectedRiskId || ''} onChange={e => fetchTrend(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 min-w-[250px]">
              <option value="">Select Risk...</option>
              {allRisks.map(r => <option key={r.id} value={r.id}>{r.Risk_No ? `${r.Risk_No}: ` : ''}{r.Risk_Title}</option>)}
            </select>
          )}
        </div>
        <div className="flex space-x-3">
          <button onClick={handleShare} className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100"><Share2 size={16} className="mr-2" /> Share</button>
          <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900"><Printer size={16} className="mr-2" /> PDF</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 print:border-none print:shadow-none print:p-0 flex-1 overflow-auto">
        <div className="text-center mb-8 pb-6 border-b border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">DMU QA Hub</h1>
          <h2 className="text-xl font-semibold text-indigo-800">{viewMode === 'year' ? `Risk Management Report — ${selectedYear}` : `Risk Trend — ${selectedRisk?.Risk_Title || ''}`}</h2>
        </div>

        {loading ? <p className="text-center py-10">Loading...</p> : viewMode === 'year' ? (
          reportData.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <h3 className="text-lg font-medium text-slate-800 mb-2">No Data Available</h3>
              <p className="text-slate-500 max-w-md mx-auto">No risks mapped for this year or missing permissions.</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border text-center"><div className="text-2xl font-bold">{filtered.length}</div><div className="text-xs font-bold uppercase text-slate-500 mt-1">Total</div></div>
                <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-center"><div className="text-2xl font-bold text-red-700">{counts.incident}</div><div className="text-xs font-bold uppercase text-red-600 mt-1">Incident</div></div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 text-center"><div className="text-2xl font-bold text-orange-700">{counts.high}</div><div className="text-xs font-bold uppercase text-orange-600 mt-1">High</div></div>
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 text-center"><div className="text-2xl font-bold text-yellow-700">{counts.low}</div><div className="text-xs font-bold uppercase text-yellow-600 mt-1">Low</div></div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center"><div className="text-2xl font-bold text-emerald-700">{counts.none}</div><div className="text-xs font-bold uppercase text-emerald-600 mt-1">No Risk</div></div>
              </div>
              <table className="w-full text-left text-sm border-collapse">
                <thead><tr className="bg-slate-100 text-slate-700 font-semibold border-y border-slate-200">
                  <th className="p-3">Risk No</th><th className="p-3 w-1/3">Title & Category</th><th className="p-3">Scope / Program</th><th className="p-3 text-center">Value</th><th className="p-3 text-right">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r, i) => (
                    <tr key={`${r.id}-${r.program_name}-${i}`} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-600">{r.Risk_No}</td>
                      <td className="p-3"><div className="font-bold text-slate-800 mb-1">{r.Risk_Title}</div><div className="text-xs text-slate-500">{r.Category} • {r.Risk_Owner || 'N/A'}</div></td>
                      <td className="p-3"><div className="font-medium">{r.program_name}</div><div className="text-xs text-slate-400">{r.risk_scope}</div></td>
                      <td className="p-3 text-center font-mono font-bold text-lg">{r.value != null ? r.value : '-'}</td>
                      <td className="p-3 text-right"><span className={`inline-block px-3 py-1.5 rounded text-xs font-bold text-white ${r.status.color} shadow-sm`}>{r.status.label}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Trend View */
          !selectedRiskId ? <p className="text-center py-10 text-slate-500">Select a risk to view its trend.</p> : trendData.length === 0 ? <p className="text-center py-10 text-slate-500">No trend data available.</p> : (
            <div className="space-y-6">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-slate-100 border-y border-slate-200 font-semibold text-slate-700">
                  <th className="p-3 text-left">Academic Year</th>
                  {trendData[0]?.programs.map(p => <th key={p.program} className="p-3 text-center">{p.program}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {trendData.map(row => (
                    <tr key={row.year} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-700">{row.year}</td>
                      {row.programs.map(p => (
                        <td key={p.program} className="p-3 text-center">
                          <div className="font-mono font-bold text-lg mb-1">{p.value != null ? p.value : '-'}</div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white ${statusColors[p.status.label] || 'bg-slate-300'}`}>{p.status.label}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border border-slate-200 rounded-xl p-6">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Visual Trend</h3>
                {trendData[0]?.programs.map(prog => (
                  <div key={prog.program} className="mb-4">
                    <div className="text-xs font-bold text-slate-500 mb-2">{prog.program}</div>
                    <div className="flex items-end gap-2 h-24">
                      {trendData.map(row => {
                        const p = row.programs.find(x => x.program === prog.program);
                        const val = p?.value != null ? Number(p.value) : 0;
                        const maxVal = Math.max(...trendData.map(r => { const x = r.programs.find(y => y.program === prog.program); return x?.value != null ? Number(x.value) : 0; }), 1);
                        const pct = Math.max((val / maxVal) * 100, 5);
                        return (
                          <div key={row.year} className="flex-1 flex flex-col items-center gap-1">
                            <div className="text-[10px] font-bold text-slate-500">{val || '-'}</div>
                            <div className={`w-full rounded-t ${statusColors[p?.status?.label] || 'bg-slate-300'}`} style={{ height: `${pct}%` }} />
                            <div className="text-[9px] text-slate-400 truncate w-full text-center">{row.year.split('-')[0]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}


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
      const { error } = await supabase.from('risk_categories').insert([{
        value: newValue.trim(),
        label: newLabel.trim(),
        sort_order: maxOrder + 1
      }]);
      if (error) throw error;
      setNewValue('');
      setNewLabel('');
      onRefresh();
    } catch (err) {
      alert('Error adding category: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editValue.trim() || !editLabel.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('risk_categories').update({
        value: editValue.trim(),
        label: editLabel.trim()
      }).eq('id', id);
      if (error) throw error;
      setEditingId(null);
      onRefresh();
    } catch (err) {
      alert('Error updating category: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Delete category "${label}"? Existing risks using this category will keep their value but it will no longer appear in the dropdown.`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('risk_categories').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      alert('Error deleting category: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveUp = async (index) => {
    if (index === 0) return;
    const current = categories[index];
    const above = categories[index - 1];
    try {
      await supabase.from('risk_categories').update({ sort_order: above.sort_order }).eq('id', current.id);
      await supabase.from('risk_categories').update({ sort_order: current.sort_order }).eq('id', above.id);
      onRefresh();
    } catch (err) {
      alert('Error reordering: ' + err.message);
    }
  };

  const handleMoveDown = async (index) => {
    if (index === categories.length - 1) return;
    const current = categories[index];
    const below = categories[index + 1];
    try {
      await supabase.from('risk_categories').update({ sort_order: below.sort_order }).eq('id', current.id);
      await supabase.from('risk_categories').update({ sort_order: current.sort_order }).eq('id', below.id);
      onRefresh();
    } catch (err) {
      alert('Error reordering: ' + err.message);
    }
  };

  const startEditing = (cat) => {
    setEditingId(cat.id);
    setEditValue(cat.value);
    setEditLabel(cat.label);
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Add New Category */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center">
          <Tags className="w-5 h-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-indigo-900">Add New Category</h3>
        </div>
        <form onSubmit={handleAdd} className="p-6 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Short Key <span className="text-slate-400">(stored value)</span></label>
            <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="e.g. HR" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Display Label</label>
            <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Human Resources" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-1.5 whitespace-nowrap shadow-sm">
            <PlusCircle size={16} /> Add
          </button>
        </form>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Existing Categories</h3>
          <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">{categories.length} total</span>
        </div>
        <div className="divide-y divide-slate-100">
          {categories.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No categories defined yet. Add one above.</div>
          ) : (
            categories.map((cat, index) => (
              <div key={cat.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors group">
                {editingId === cat.id ? (
                  <>
                    <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} className="flex-1 px-3 py-1.5 border border-indigo-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="text" value={editLabel} onChange={e => setEditLabel(e.target.value)} className="flex-1 px-3 py-1.5 border border-indigo-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <div className="flex gap-1.5">
                      <button onClick={() => handleUpdate(cat.id)} disabled={loading} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-100">Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className="text-sm font-semibold text-slate-800">{cat.label}</span>
                      <span className="text-xs text-slate-400 font-mono">key: {cat.value}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30" title="Move up">↑</button>
                      <button onClick={() => handleMoveDown(index)} disabled={index === categories.length - 1} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30" title="Move down">↓</button>
                      <button onClick={() => startEditing(cat)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Edit"><Edit size={15} /></button>
                      <button onClick={() => handleDelete(cat.id, cat.label)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete"><Trash2 size={15} /></button>
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

// --- Academic Years Manager (Admin Only) ---
function AcademicYearsManager({ years, onRefresh }) {
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const maxOrder = years.length > 0 ? Math.max(...years.map(y => y.sort_order || 0)) : 0;
    try {
      await supabase.from('academic_years').insert([{ label: newLabel.trim(), sort_order: maxOrder + 1 }]);
      setNewLabel('');
      onRefresh();
    } catch(e) { alert(e.message); }
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
        <h3 className="text-lg font-bold text-slate-800 mb-4">Manage Academic Years</h3>
        <form onSubmit={handleAdd} className="flex gap-3 mb-6">
          <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. 2026-2027" className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Add Year</button>
        </form>
        <div className="space-y-2">
          {years.map(y => (
            <div key={y.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
              {editingId === y.id ? (
                <div className="flex gap-2 flex-1 mr-2">
                  <input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="flex-1 px-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
                  <button onClick={() => handleUpdate(y.id)} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-slate-500 px-3 py-1.5">Cancel</button>
                </div>
              ) : (
                <>
                  <span className="font-semibold text-slate-800">{y.label}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingId(y.id); setEditLabel(y.label); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit size={15} /></button>
                    <button onClick={() => handleDelete(y.id, y.label)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
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

// --- Risk-Year Mapping Manager (Admin Only) ---
function RiskYearMappingManager({ academicYears }) {
  const [risks, setRisks] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [selectedYear, setSelectedYear] = useState(academicYears[0]?.label || '2024-2025');

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchMappings(); }, [selectedYear]);

  const fetchData = async () => {
    try {
      const { data } = await supabase.from('risk_management_plan').select('id, Risk_No, Risk_Title');
      setRisks((data || []).sort((a,b) => (a.Risk_No||'').localeCompare(b.Risk_No||'', undefined, { numeric: true })));
    } catch(e) { setRisks([]); }
  };

  const fetchMappings = async () => {
    try {
      const { data } = await supabase.from('risk_year_mapping').select('*').eq('academic_year', selectedYear);
      setMappings(data || []);
    } catch(e) { setMappings([]); }
  };

  const isMapped = (riskId) => mappings.some(m => m.risk_id === riskId);

  const toggleMapping = async (riskId) => {
    if (isMapped(riskId)) {
      await supabase.from('risk_year_mapping').delete().eq('risk_id', riskId).eq('academic_year', selectedYear);
    } else {
      await supabase.from('risk_year_mapping').insert([{ risk_id: riskId, academic_year: selectedYear }]);
    }
    fetchMappings();
  };

  const selectAll = async () => {
    const unmapped = risks.filter(r => !isMapped(r.id));
    if (unmapped.length === 0) return;
    await supabase.from('risk_year_mapping').insert(unmapped.map(r => ({ risk_id: r.id, academic_year: selectedYear })));
    fetchMappings();
  };

  const deselectAll = async () => {
    await supabase.from('risk_year_mapping').delete().eq('academic_year', selectedYear);
    fetchMappings();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-2">Risk-Year Mapping</h3>
        <p className="text-sm text-slate-500 mb-4">Select which risks are active for each academic year.</p>
        
        <div className="flex items-center gap-4 mb-6">
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
            {academicYears.map(y => <option key={y.id} value={y.label}>{y.label}</option>)}
          </select>
          <button onClick={selectAll} className="text-sm px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100">Select All</button>
          <button onClick={deselectAll} className="text-sm px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100">Deselect All</button>
          <span className="text-sm text-slate-500">{mappings.length}/{risks.length} mapped</span>
        </div>

        <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
          {risks.map(r => (
            <label key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isMapped(r.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
              <input type="checkbox" checked={isMapped(r.id)} onChange={() => toggleMapping(r.id)} className="w-4 h-4 text-indigo-600 rounded" />
              <span className="font-bold text-slate-600 text-sm w-12">{r.Risk_No || '—'}</span>
              <span className="text-sm text-slate-800">{r.Risk_Title}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Public View ---
export function PublicRiskReport({ year }) {
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex justify-between items-center print:hidden">
          <div className="flex items-center text-indigo-700 font-bold text-xl"><ShieldAlert className="mr-2"/> DMU QA Hub Public Portal</div>
          <button onClick={() => window.print()} className="px-4 py-2 bg-white text-slate-700 font-medium rounded-lg shadow-sm hover:shadow transition-shadow flex items-center border border-slate-200"><Printer size={16} className="mr-2"/> Print Report</button>
        </div>
        <RiskReportsView initialYear={year} />
      </div>
    </div>
  );
}
