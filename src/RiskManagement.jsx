import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, PlusCircle, List as ListIcon, 
  Search, AlertTriangle, CheckCircle, Clock,
  Activity, BookOpen, Stethoscope, Briefcase,
  Edit, Trash2, X, Target, Download, Share2, Printer, Tags, Upload
} from 'lucide-react';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';

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
    Impact: 4,
    Appetite: 10,
    Mitigating_Actions: "Implement auto-patching.",
    created_at: "2026-04-20T10:00:00Z"
  }
];

let mockKRIs = [];
let mockKRIValues = [];
let mockKRIRubrics = [];

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
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
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
      {activeSubTab === 'reports' && <RiskReportsView academicYears={academicYears} />}
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
          <label className="block text-sm font-semibold text-slate-700 mb-1">Impact (Numeric)</label>
          <input type="number" name="Impact" value={formData.Impact || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Appetite (Numeric)</label>
          <input type="number" name="Appetite" value={formData.Appetite || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Mitigating Actions</label>
          <textarea name="Mitigating_Actions" rows="3" value={formData.Mitigating_Actions || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"></textarea>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Causes</label>
          <textarea name="Risk_Causes" rows="3" value={formData.Risk_Causes || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"></textarea>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Consequences</label>
          <textarea name="Risk_Consequences_" rows="3" value={formData.Risk_Consequences_ || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"></textarea>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Existing Internal Controls</label>
          <textarea name="Existing_Internal_control_" rows="3" value={formData.Existing_Internal_control_ || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"></textarea>
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
    Risk_Owner: '', Impact: '', Appetite: '', Mitigating_Actions: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...formData, Reporter_Email: session?.user?.email || 'unknown@dmu.ac.ae' };
    
    // Strictly cast to numbers to prevent Supabase type mismatches
    payload.Impact = (payload.Impact === '' || payload.Impact == null) ? null : Number(payload.Impact);
    payload.Appetite = (payload.Appetite === '' || payload.Appetite == null) ? null : Number(payload.Appetite);

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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this risk?")) return;
    try {
      const { error } = await supabase.from('risk_management_plan').delete().eq('id', id);
      if (error) throw error;
      setRisks(risks.filter(r => r.id !== id));
    } catch(err) {
      alert("Failed to delete from DB, updating local state.");
      setRisks(risks.filter(r => r.id !== id));
      mockRisks = mockRisks.filter(r => r.id !== id);
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
      Impact: r.Impact || '',
      Appetite: r.Appetite || '',
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
          Impact: r.Impact ? Number(r.Impact) : null,
          Appetite: r.Appetite ? Number(r.Appetite) : null,
          Risk_Causes: r.Risk_Causes || r['Risk Causes'] || '',
          Risk_Consequences_: r.Risk_Consequences || r.Risk_Consequences_ || '',
          Existing_Internal_control_: r.Existing_Controls || r.Existing_Internal_control_ || '',
          Mitigating_Actions: r.Mitigating_Actions || r['Mitigating Actions'] || ''
        }));
        if (!window.confirm(`Import ${mapped.length} risks from Excel? This will ADD them to the existing register.`)) return;
        const { error } = await supabase.from('risk_management_plan').insert(mapped);
        if (error) throw error;
        alert(`Successfully imported ${mapped.length} risks!`);
        fetchRisks();
      } catch (err) {
        alert('Import error: ' + (err.message || 'Unknown'));
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
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
            {canEdit && (
              <>
                <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors" title="Export to Excel">
                  <Download size={16} /> Export
                </button>
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
                        <button onClick={() => setManagingKRIsFor(risk)} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-colors" title="Manage KRIs"><Target size={18} /></button>
                        <button onClick={() => setEditingRisk(risk)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Edit Risk"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(risk.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete Risk"><Trash2 size={18} /></button>
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
      {managingKRIsFor && <KRIManagementModal risk={managingKRIsFor} onClose={() => setManagingKRIsFor(null)} />}
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
      payload.Impact = (payload.Impact === '' || payload.Impact == null) ? null : Number(payload.Impact);
      payload.Appetite = (payload.Appetite === '' || payload.Appetite == null) ? null : Number(payload.Appetite);

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

function KRIManagementModal({ risk, onClose }) {
  const [kris, setKris] = useState([]);
  const [newKriName, setNewKriName] = useState('');
  const [values, setValues] = useState([]);
  const [rubrics, setRubrics] = useState([]);
  const [newValData, setNewValData] = useState({ kri_id: '', academic_year: '2024-2025', indicator_value: '' });

  useEffect(() => { fetchKRIs(); }, [risk.id]);

  const fetchKRIs = async () => {
    try {
      const { data: kData, error: kErr } = await supabase.from('risk_kris').select('*').eq('risk_id', risk.id);
      if (kErr) throw kErr;
      setKris(kData);
      
      if (kData.length > 0) {
        const kriIds = kData.map(k => k.id);
        const { data: vData, error: vErr } = await supabase.from('risk_kri_values').select('*').in('kri_id', kriIds);
        if (!vErr) setValues(vData);

        const { data: rData, error: rErr } = await supabase.from('kri_rubrics').select('*').in('kri_id', kriIds);
        if (!rErr) setRubrics(rData);
      }
    } catch (e) {
      setKris(mockKRIs.filter(k => k.risk_id === risk.id));
      setValues(mockKRIValues.filter(v => mockKRIs.find(k => k.id === v.kri_id && k.risk_id === risk.id)));
      setRubrics(mockKRIRubrics.filter(r => mockKRIs.find(k => k.id === r.kri_id && k.risk_id === risk.id)));
    }
  };

  const handleAddKRI = async (e) => {
    e.preventDefault();
    if (!newKriName.trim()) return;
    try {
      const payload = { risk_id: risk.id, indicator_name: newKriName };
      const { error } = await supabase.from('risk_kris').insert([payload]);
      if (error) throw error;
      setNewKriName('');
      fetchKRIs();
    } catch(e) {
      mockKRIs.push({ id: Date.now(), risk_id: risk.id, indicator_name: newKriName });
      setNewKriName('');
      fetchKRIs();
    }
  };

  // --- Rubric state for structured input per KRI ---
  const [rubricForms, setRubricForms] = useState({});
  const getRubricForm = (kri_id) => rubricForms[kri_id] || { mode: 'single', op: '>', val1: '', val2: '', op2: '>', likelihood: '' };
  const setRubricForm = (kri_id, patch) => setRubricForms(prev => ({ ...prev, [kri_id]: { ...getRubricForm(kri_id), ...patch } }));

  const buildRubricValue = (form) => {
    if (form.mode === 'range') {
      return `${form.val1}${form.op}value${form.op2}${form.val2}`;
    }
    if (form.op === '=') return form.val1;
    return `${form.op}${form.val1}`;
  };

  const formatRubricDisplay = (rv) => {
    // Range pattern: 5>value>3
    const rangeMatch = rv.match(/^(-?[\d.]+)(>=?|<=?)value(>=?|<=?)(-?[\d.]+)$/);
    if (rangeMatch) return `${rangeMatch[1]} ${rangeMatch[2]} value ${rangeMatch[3]} ${rangeMatch[4]}`;
    if (rv.startsWith('>=')) return `value ≥ ${rv.slice(2)}`;
    if (rv.startsWith('<=')) return `value ≤ ${rv.slice(2)}`;
    if (rv.startsWith('>')) return `value > ${rv.slice(1)}`;
    if (rv.startsWith('<')) return `value < ${rv.slice(1)}`;
    return `value = ${rv}`;
  };

  const handleAddRubric = async (kri_id) => {
    const form = getRubricForm(kri_id);
    if (!form.val1 || !form.likelihood || (form.mode === 'range' && !form.val2)) return;
    const rVal = buildRubricValue(form);
    try {
      const payload = { kri_id, rubric_value: rVal, likelihood: Number(form.likelihood) };
      const { error } = await supabase.from('kri_rubrics').insert([payload]);
      if (error) throw error;
      fetchKRIs();
    } catch(e) {
      mockKRIRubrics.push({ id: Date.now(), kri_id, rubric_value: rVal, likelihood: Number(form.likelihood) });
      fetchKRIs();
    }
    setRubricForm(kri_id, { val1: '', val2: '', likelihood: '' });
  };

  const handleDeleteRubric = async (id) => {
    try {
      await supabase.from('kri_rubrics').delete().eq('id', id);
      fetchKRIs();
    } catch(e) {
      const idx = mockKRIRubrics.findIndex(r => r.id === id);
      if (idx !== -1) mockKRIRubrics.splice(idx, 1);
      fetchKRIs();
    }
  };

  const handleEditKRIName = async (kriId, newName) => {
    if (!newName.trim()) return;
    try {
      await supabase.from('risk_kris').update({ indicator_name: newName }).eq('id', kriId);
      fetchKRIs();
    } catch(e) { console.warn(e); }
  };

  const handleEditRubric = async (rubricId, newVal, newLikelihood) => {
    try {
      await supabase.from('kri_rubrics').update({ rubric_value: newVal, likelihood: Number(newLikelihood) }).eq('id', rubricId);
      fetchKRIs();
    } catch(e) { console.warn(e); }
  };

  const handleMoveRubric = async (kriId, idx, direction) => {
    const kriRubs = rubrics.filter(r => r.kri_id === kriId).sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === kriRubs.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const a = kriRubs[idx], b = kriRubs[swapIdx];
    try {
      await supabase.from('kri_rubrics').update({ sort_order: b.sort_order || swapIdx }).eq('id', a.id);
      await supabase.from('kri_rubrics').update({ sort_order: a.sort_order || idx }).eq('id', b.id);
      fetchKRIs();
    } catch(e) { console.warn(e); }
  };

  const [editingKriId, setEditingKriId] = useState(null);
  const [editKriName, setEditKriName] = useState('');
  const [editingRubricId, setEditingRubricId] = useState(null);
  const [editRubricData, setEditRubricData] = useState({ val: '', likelihood: '' });

  const handleAddValue = async (e) => {
    e.preventDefault();
    if (!newValData.kri_id || !newValData.indicator_value) return;
    try {
      const { error } = await supabase.from('risk_kri_values').upsert([{
        kri_id: newValData.kri_id,
        academic_year: newValData.academic_year,
        indicator_value: newValData.indicator_value
      }], { onConflict: 'kri_id, academic_year' });
      if (error) throw error;
      setNewValData({ ...newValData, indicator_value: '' });
      fetchKRIs();
    } catch(e) {
      const existingIdx = mockKRIValues.findIndex(v => v.kri_id === newValData.kri_id && v.academic_year === newValData.academic_year);
      if (existingIdx >= 0) mockKRIValues[existingIdx].indicator_value = newValData.indicator_value;
      else mockKRIValues.push({ id: Date.now(), ...newValData });
      fetchKRIs();
    }
  };

  const handleDeleteKRI = async (id) => {
    try {
      await supabase.from('risk_kris').delete().eq('id', id);
      fetchKRIs();
    } catch(e) {
      const idx = mockKRIs.findIndex(k => k.id === id);
      if(idx !== -1) mockKRIs.splice(idx, 1);
      fetchKRIs();
    }
  }

  const opSelect = "text-xs border border-slate-300 rounded px-1.5 py-1.5 bg-white outline-none focus:border-indigo-500 font-mono font-bold text-indigo-700 w-14 text-center";

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Key Risk Indicators (KRIs)</h2>
            <p className="text-sm text-slate-500 truncate max-w-md">{risk.Risk_Title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Add KRI */}
          <section>
            <h3 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wider">Define Indicators</h3>
            <form onSubmit={handleAddKRI} className="flex gap-2">
              <input type="text" value={newKriName} onChange={e => setNewKriName(e.target.value)} placeholder="e.g. Number of delayed incident reports" className="flex-1 border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900">Add KRI</button>
            </form>
            <div className="mt-4 space-y-4">
              {kris.map(kri => {
                const form = getRubricForm(kri.id);
                const kriRubs = rubrics.filter(r => r.kri_id === kri.id).sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
                return (
                <div key={kri.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    {editingKriId === kri.id ? (
                      <div className="flex gap-2 flex-1 mr-2">
                        <input type="text" value={editKriName} onChange={e => setEditKriName(e.target.value)} className="flex-1 text-sm border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500" />
                        <button onClick={() => { handleEditKRIName(kri.id, editKriName); setEditingKriId(null); }} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">Save</button>
                        <button onClick={() => setEditingKriId(null)} className="text-xs text-slate-500 px-2 py-1">Cancel</button>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-slate-800 cursor-pointer hover:text-indigo-600" onClick={() => { setEditingKriId(kri.id); setEditKriName(kri.indicator_name); }}>{kri.indicator_name} <Edit size={12} className="inline ml-1 text-slate-400" /></span>
                    )}
                    <button onClick={() => handleDeleteKRI(kri.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                  </div>
                  
                  <div className="pl-4 border-l-2 border-indigo-200">
                    <h4 className="text-xs font-semibold text-slate-600 mb-2">Rubric Rules</h4>
                    {kriRubs.map((r, rIdx) => (
                      <div key={r.id} className="flex gap-2 items-center mb-1.5">
                        {editingRubricId === r.id ? (
                          <>
                            <input value={editRubricData.val} onChange={e => setEditRubricData({...editRubricData, val: e.target.value})} className="text-xs border px-2 py-1 rounded w-28" />
                            <input type="number" value={editRubricData.likelihood} onChange={e => setEditRubricData({...editRubricData, likelihood: e.target.value})} className="text-xs border px-2 py-1 rounded w-16" />
                            <button onClick={() => { handleEditRubric(r.id, editRubricData.val, editRubricData.likelihood); setEditingRubricId(null); }} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded">Save</button>
                            <button onClick={() => setEditingRubricId(null)} className="text-[10px] text-slate-400">Cancel</button>
                          </>
                        ) : (
                          <>
                            <span className="text-xs bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md font-medium text-indigo-800 cursor-pointer hover:bg-indigo-100" onClick={() => { setEditingRubricId(r.id); setEditRubricData({ val: r.rubric_value, likelihood: r.likelihood }); }}>{formatRubricDisplay(r.rubric_value)}</span>
                            <span className="text-xs text-slate-400">→</span>
                            <span className="text-xs bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-bold text-amber-800">Likelihood: {r.likelihood}</span>
                            <button onClick={() => handleMoveRubric(kri.id, rIdx, 'up')} disabled={rIdx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs">↑</button>
                            <button onClick={() => handleMoveRubric(kri.id, rIdx, 'down')} disabled={rIdx === kriRubs.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs">↓</button>
                            <button onClick={() => handleDeleteRubric(r.id)} className="text-red-400 hover:text-red-600 ml-1"><X size={14}/></button>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {/* Structured rubric add form */}
                    <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase">Mode:</label>
                        <button type="button" onClick={() => setRubricForm(kri.id, { mode: 'single' })} className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition-colors ${form.mode === 'single' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Single Condition</button>
                        <button type="button" onClick={() => setRubricForm(kri.id, { mode: 'range' })} className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition-colors ${form.mode === 'range' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Range</button>
                      </div>

                      {form.mode === 'single' ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-500 font-medium">value</span>
                          <select value={form.op} onChange={e => setRubricForm(kri.id, { op: e.target.value })} className={opSelect}>
                            <option value=">">{'>'}</option>
                            <option value=">=">{'>='}</option>
                            <option value="<">{'<'}</option>
                            <option value="<=">{'<='}</option>
                            <option value="=">{'='}</option>
                          </select>
                          <input type="number" step="any" value={form.val1} onChange={e => setRubricForm(kri.id, { val1: e.target.value })} placeholder="Number" className="text-xs border border-slate-300 px-2 py-1.5 rounded w-20 outline-none focus:border-indigo-500" />
                          <span className="text-xs text-slate-400 mx-1">→</span>
                          <input type="number" step="any" value={form.likelihood} onChange={e => setRubricForm(kri.id, { likelihood: e.target.value })} placeholder="Likelihood" className="text-xs border border-slate-300 px-2 py-1.5 rounded w-24 outline-none focus:border-indigo-500" />
                          <button type="button" onClick={() => handleAddRubric(kri.id)} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded font-semibold hover:bg-indigo-700">Add</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input type="number" step="any" value={form.val1} onChange={e => setRubricForm(kri.id, { val1: e.target.value })} placeholder="Upper" className="text-xs border border-slate-300 px-2 py-1.5 rounded w-20 outline-none focus:border-indigo-500" />
                          <select value={form.op} onChange={e => setRubricForm(kri.id, { op: e.target.value })} className={opSelect}>
                            <option value=">">{'>'}</option>
                            <option value=">=">{'>='}</option>
                          </select>
                          <span className="text-xs text-slate-500 font-medium">value</span>
                          <select value={form.op2} onChange={e => setRubricForm(kri.id, { op2: e.target.value })} className={opSelect}>
                            <option value=">">{'>'}</option>
                            <option value=">=">{'>='}</option>
                          </select>
                          <input type="number" step="any" value={form.val2} onChange={e => setRubricForm(kri.id, { val2: e.target.value })} placeholder="Lower" className="text-xs border border-slate-300 px-2 py-1.5 rounded w-20 outline-none focus:border-indigo-500" />
                          <span className="text-xs text-slate-400 mx-1">→</span>
                          <input type="number" step="any" value={form.likelihood} onChange={e => setRubricForm(kri.id, { likelihood: e.target.value })} placeholder="Likelihood" className="text-xs border border-slate-300 px-2 py-1.5 rounded w-24 outline-none focus:border-indigo-500" />
                          <button type="button" onClick={() => handleAddRubric(kri.id)} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded font-semibold hover:bg-indigo-700">Add</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )})}
              {kris.length === 0 && <p className="text-sm text-slate-400">No KRIs defined yet.</p>}
            </div>
          </section>

          {/* Add Values */}
          {kris.length > 0 && (
            <section className="border-t border-slate-100 pt-6">
              <h3 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wider">Record KRI Values</h3>
              <form onSubmit={handleAddValue} className="flex gap-2 flex-wrap items-end mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-indigo-900 mb-1">Select KRI</label>
                  <select required value={newValData.kri_id} onChange={e => setNewValData({...newValData, kri_id: e.target.value})} className="w-full border-none rounded-lg px-3 py-2 text-sm">
                    <option value="">-- Choose --</option>
                    {kris.map(k => <option key={k.id} value={k.id}>{k.indicator_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1">Academic Year</label>
                  <select required value={newValData.academic_year} onChange={e => setNewValData({...newValData, academic_year: e.target.value})} className="w-32 border-none rounded-lg px-3 py-2 text-sm">
                    <option>2023-2024</option>
                    <option>2024-2025</option>
                    <option>2025-2026</option>
                  </select>
                </div>
                <div className="w-32">
                  <label className="block text-xs font-semibold text-indigo-900 mb-1">Value</label>
                  <input required type="text" value={newValData.indicator_value} onChange={e => setNewValData({...newValData, indicator_value: e.target.value})} placeholder="e.g. 5%" className="w-full border-none rounded-lg px-3 py-2 text-sm" />
                </div>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Save</button>
              </form>

              <div className="space-y-4">
                {kris.map(kri => {
                  const kriVals = values.filter(v => v.kri_id === kri.id).sort((a,b) => a.academic_year.localeCompare(b.academic_year));
                  if (kriVals.length === 0) return null;
                  return (
                    <div key={kri.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-sm font-semibold text-slate-700">{kri.indicator_name}</div>
                      <div className="p-3 flex gap-4 overflow-x-auto">
                        {kriVals.map(val => {
                          const likelihood = getLikelihoodForKRI(val.indicator_value, kri.id, rubrics);
                          const impact = Number(risk.Impact) || 0;
                          const appetite = Number(risk.Appetite) || 0;
                          const residual = likelihood * impact;
                          const accepted = residual <= appetite;
                          return (
                          <div key={val.id} className="text-center px-4 border-r last:border-0 border-slate-200 min-w-[120px]">
                            <div className="text-xs text-slate-500 font-medium mb-1">{val.academic_year}</div>
                            <div className="font-bold text-indigo-600 text-lg mb-2">{val.indicator_value}</div>
                            <div className="text-[10px] text-slate-500 mb-1">Likelihood: <span className="font-bold text-slate-700">{likelihood}</span></div>
                            <div className="text-[10px] text-slate-500 mb-1">Residual: <span className="font-bold text-slate-700">{residual}</span></div>
                            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-1 ${accepted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {accepted ? 'Accepted' : 'Not Accepted'}
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// Function to match value against rubrics
function getLikelihoodForKRI(value, kId, allRubrics) {
  const kRubrics = allRubrics.filter(r => r.kri_id === kId);
  if (!kRubrics || kRubrics.length === 0) return 0;
  
  const valNum = Number(value);
  if (!isNaN(valNum)) {
    for (const r of kRubrics) {
       const rv = r.rubric_value.trim();
       // Range pattern: upper{op}value{op2}lower e.g. 5>value>3 or 5>=value>=3
       const rangeMatch = rv.match(/^(-?[\d.]+)(>=?|<=?)value(>=?|<=?)(-?[\d.]+)$/);
       if (rangeMatch) {
         const upper = Number(rangeMatch[1]);
         const op1 = rangeMatch[2];
         const op2 = rangeMatch[3];
         const lower = Number(rangeMatch[4]);
         const upperOk = op1 === '>=' ? valNum <= upper : valNum < upper;
         const lowerOk = op2 === '>=' ? valNum >= lower : valNum > lower;
         if (upperOk && lowerOk) return Number(r.likelihood);
         continue;
       }
       // Single operators
       if (rv.startsWith('>=')) { if (valNum >= Number(rv.slice(2))) return Number(r.likelihood); }
       else if (rv.startsWith('<=')) { if (valNum <= Number(rv.slice(2))) return Number(r.likelihood); }
       else if (rv.startsWith('>')) { if (valNum > Number(rv.slice(1))) return Number(r.likelihood); }
       else if (rv.startsWith('<')) { if (valNum < Number(rv.slice(1))) return Number(r.likelihood); }
       else if (rv.includes('-')) {
          const [min, max] = rv.split('-');
          if (valNum >= Number(min) && valNum <= Number(max)) return Number(r.likelihood);
       } else if (Number(rv) === valNum) {
          return Number(r.likelihood);
       }
    }
  }
  const match = kRubrics.find(r => r.rubric_value.toLowerCase() === String(value).toLowerCase());
  if (match) return Number(match.likelihood);
  return 0; // Default if no match
}

// --- Categories Manager (Admin Only) ---
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

// --- Reports ---
export function RiskReportsView({ initialYear, academicYears: yearsFromProp }) {
  const defaultYears = ['2023-2024', '2024-2025', '2025-2026'];
  const academicYears = (yearsFromProp && yearsFromProp.length > 0) ? yearsFromProp.map(y => y.label) : defaultYears;
  const [selectedYear, setSelectedYear] = useState(initialYear || academicYears[academicYears.length - 1] || '2024-2025');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('year'); // 'year' or 'trend'
  const [selectedRiskId, setSelectedRiskId] = useState(null);
  const [trendData, setTrendData] = useState([]);

  const assembleData = (rData, kData, vData, rubData, year) => {
    return rData.map(risk => {
      let maxLikelihood = 0;
      const riskKRIs = kData.filter(k => k.risk_id === risk.id).map(kri => {
        const val = vData.find(v => v.kri_id === kri.id);
        const kriValue = val ? val.indicator_value : 'Not Set';
        let likelihood = 0;
        if (kriValue !== 'Not Set') likelihood = getLikelihoodForKRI(kriValue, kri.id, rubData);
        if (likelihood > maxLikelihood) maxLikelihood = likelihood;
        return { name: kri.indicator_name, value: kriValue, likelihood };
      });
      const impact = Number(risk.Impact) || 0;
      const appetite = Number(risk.Appetite) || 0;
      const residualRating = maxLikelihood * impact;
      return { ...risk, kris: riskKRIs, calculated_likelihood: maxLikelihood, residual_rating: residualRating, appetite };
    });
  };

  const fetchReport = async (year) => {
    setLoading(true);
    try {
      const { data: rData, error: rErr } = await supabase.from('risk_management_plan').select('*');
      const { data: kData, error: kErr } = await supabase.from('risk_kris').select('*');
      const { data: vData, error: vErr } = await supabase.from('risk_kri_values').select('*').eq('academic_year', year);
      const { data: rubData } = await supabase.from('kri_rubrics').select('*');
      const { data: mapData } = await supabase.from('risk_year_mapping').select('risk_id').eq('academic_year', year);
      if (rErr || kErr || vErr) throw new Error("DB Error");
      // If mappings exist for this year, filter risks; else show all
      const mappedIds = (mapData || []).map(m => m.risk_id);
      const filteredRisks = mappedIds.length > 0 ? rData.filter(r => mappedIds.includes(r.id)) : rData;
      setReportData(assembleData(filteredRisks, kData, vData, rubData || [], year));
    } catch(e) {
      setReportData(assembleData(mockRisks, mockKRIs, mockKRIValues.filter(v => v.academic_year === year), mockKRIRubrics, year));
    } finally { setLoading(false); }
  };

  const fetchTrend = async (riskId) => {
    setLoading(true);
    try {
      const { data: rData } = await supabase.from('risk_management_plan').select('*').eq('id', riskId).single();
      const { data: kData } = await supabase.from('risk_kris').select('*').eq('risk_id', riskId);
      const { data: allVals } = await supabase.from('risk_kri_values').select('*').in('kri_id', (kData || []).map(k => k.id));
      const { data: rubData } = await supabase.from('kri_rubrics').select('*').in('kri_id', (kData || []).map(k => k.id));
      const trend = academicYears.map(yr => {
        const yearVals = (allVals || []).filter(v => v.academic_year === yr);
        let maxL = 0;
        const kris = (kData || []).map(kri => {
          const val = yearVals.find(v => v.kri_id === kri.id);
          const kriValue = val ? val.indicator_value : 'Not Set';
          let l = kriValue !== 'Not Set' ? getLikelihoodForKRI(kriValue, kri.id, rubData || []) : 0;
          if (l > maxL) maxL = l;
          return { name: kri.indicator_name, value: kriValue, likelihood: l };
        });
        const impact = Number(rData?.Impact) || 0;
        const appetite = Number(rData?.Appetite) || 0;
        return { year: yr, likelihood: maxL, residual: maxL * impact, appetite, impact, kris };
      });
      setTrendData(trend);
      setSelectedRiskId(riskId);
    } catch(e) { console.warn(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (viewMode === 'year') fetchReport(selectedYear); }, [selectedYear, viewMode]);

  const handleShare = async () => {
    const url = `${window.location.origin}?view=public_risk_report&year=${selectedYear}`;
    await navigator.clipboard.writeText(url);
    alert('Public report link copied to clipboard!');
  };

  const filtered = reportData.filter(r => {
    if (searchTerm && !r.Risk_Title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (statusFilter === 'Accepted' && r.residual_rating > r.appetite) return false;
    if (statusFilter === 'Not Accepted' && r.residual_rating <= r.appetite) return false;
    return true;
  }).sort((a,b) => (a.Risk_No || '').localeCompare(b.Risk_No || '', undefined, { numeric: true }));

  const maxResidual = Math.max(...filtered.map(r => r.residual_rating), 1);
  const accepted = filtered.filter(r => r.residual_rating <= r.appetite).length;
  const notAccepted = filtered.filter(r => r.residual_rating > r.appetite).length;
  const selectedRisk = reportData.find(r => r.id === selectedRiskId);

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="print:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-wrap gap-3">
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('year')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'year' ? 'bg-white shadow text-indigo-700' : 'text-slate-600'}`}>Year View</button>
            <button onClick={() => { setViewMode('trend'); if (!selectedRiskId && reportData.length > 0) fetchTrend(reportData[0].id); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'trend' ? 'bg-white shadow text-indigo-700' : 'text-slate-600'}`}>Risk Trend</button>
          </div>
          {viewMode === 'year' && (
            <>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500">
                {academicYears.map(y => <option key={y}>{y}</option>)}
              </select>
              <input type="text" placeholder="Search title..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 w-full sm:w-48" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500">
                <option value="All">All Statuses</option>
                <option value="Accepted">Accepted Only</option>
                <option value="Not Accepted">Not Accepted Only</option>
              </select>
            </>
          )}
          {viewMode === 'trend' && (
            <select value={selectedRiskId || ''} onChange={(e) => fetchTrend(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 min-w-[250px]">
              <option value="">Select Risk...</option>
              {[...reportData].sort((a,b) => (a.Risk_No||'').localeCompare(b.Risk_No||'', undefined, { numeric: true })).map(r => <option key={r.id} value={r.id}>{r.Risk_No ? `${r.Risk_No}: ` : ''}{r.Risk_Title}</option>)}
            </select>
          )}
        </div>
        <div className="flex space-x-3">
          <button onClick={handleShare} className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors"><Share2 size={16} className="mr-2" /> Share URL</button>
          <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors"><Printer size={16} className="mr-2" /> Export PDF</button>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 print:border-none print:shadow-none print:p-0 flex-1 overflow-auto print:overflow-visible">
        <div className="text-center mb-8 pb-6 border-b border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">DMU QA Hub</h1>
          <h2 className="text-xl font-semibold text-indigo-800">
            {viewMode === 'year' ? `Risk Management Report — ${selectedYear}` : `Risk Trend Analysis — ${selectedRisk?.Risk_Title || ''}`}
          </h2>
        </div>

        {loading ? <p className="text-center py-10">Compiling report...</p> : viewMode === 'year' ? (
          <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-center">
                <div className="text-3xl font-bold text-slate-800">{filtered.length}</div>
                <div className="text-sm text-slate-500 mt-1">Total Risks</div>
              </div>
              <div className="bg-green-50 rounded-xl p-5 border border-green-200 text-center">
                <div className="text-3xl font-bold text-green-700">{accepted}</div>
                <div className="text-sm text-green-600 mt-1">Accepted</div>
              </div>
              <div className="bg-red-50 rounded-xl p-5 border border-red-200 text-center">
                <div className="text-3xl font-bold text-red-700">{notAccepted}</div>
                <div className="text-sm text-red-600 mt-1">Not Accepted</div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="border border-slate-200 rounded-xl p-6">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Residual Rating vs Appetite</h3>
              <div className="space-y-3">
                {filtered.map(r => (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className="w-20 text-xs font-bold text-slate-600 text-right truncate flex-shrink-0">{r.Risk_No || '—'}</div>
                    <div className="flex-1 flex items-center gap-1 h-6">
                      <div className={`h-full rounded-r-md transition-all ${r.residual_rating > r.appetite ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${Math.max((r.residual_rating / maxResidual) * 100, 2)}%`, minWidth: '4px' }} />
                      <span className="text-[10px] font-bold text-slate-500">{r.residual_rating}</span>
                      <div className="relative" style={{ left: `${Math.max((r.appetite / maxResidual) * 100, 0) - 50}%` }}>
                        <span className="text-[10px] text-amber-600 font-bold">|{r.appetite}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-6 mt-4 text-[10px] text-slate-500 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400 inline-block"/> Accepted</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block"/> Not Accepted</span>
                <span className="flex items-center gap-1"><span className="text-amber-600 font-bold">|</span> Appetite Threshold</span>
              </div>
            </div>

            {/* Summary Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600">No.</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Risk Title</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-center">Impact</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-center">Likelihood</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-center">Residual</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-center">Appetite</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-bold text-slate-600">{r.Risk_No || '-'}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{r.Risk_Title}</td>
                      <td className="px-4 py-2.5 text-center">{r.Impact || 0}</td>
                      <td className="px-4 py-2.5 text-center">{r.calculated_likelihood}</td>
                      <td className="px-4 py-2.5 text-center font-bold">{r.residual_rating}</td>
                      <td className="px-4 py-2.5 text-center">{r.appetite}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.residual_rating > r.appetite ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{r.residual_rating > r.appetite ? 'Not Accepted' : 'Accepted'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detailed Cards */}
            {filtered.map(risk => (
              <div key={risk.id} className="break-inside-avoid border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 print:bg-slate-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{risk.Risk_No ? `${risk.Risk_No}: ` : ''}{risk.Risk_Title}</h3>
                      <div className="text-sm text-slate-500 mt-1 flex gap-4">
                        <span><strong className="text-slate-700">Owner:</strong> {risk.Risk_Owner || 'N/A'}</span>
                        <span><strong className="text-slate-700">Category:</strong> {risk.Category}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                       <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm">Impact: {risk.Impact || 0}</span>
                       <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm">Likelihood: {risk.calculated_likelihood}</span>
                       <span className={`px-3 py-1 border rounded-lg text-xs font-bold shadow-sm print:shadow-none ${risk.residual_rating > risk.appetite ? 'bg-red-100 text-red-800 border-red-300' : 'bg-green-100 text-green-800 border-green-300'}`}>
                         Residual: {risk.residual_rating} ({risk.residual_rating > risk.appetite ? 'Not Accepted' : 'Accepted'})
                       </span>
                       <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm">Appetite: {risk.appetite}</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Causes & Consequences</h4>
                    <p className="text-sm text-slate-700 mb-3"><span className="font-semibold text-slate-900">Causes:</span> {risk.Risk_Causes || 'N/A'}</p>
                    <p className="text-sm text-slate-700"><span className="font-semibold text-slate-900">Impact:</span> {risk.Risk_Consequences_ || 'N/A'}</p>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Mitigating Actions</h4>
                    <p className="text-sm text-slate-700">{risk.Mitigating_Actions || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Controls & Indicators</h4>
                    <p className="text-sm text-slate-700 mb-4"><span className="font-semibold text-slate-900">Controls:</span> {risk.Existing_Internal_control_ || 'N/A'}</p>
                    {risk.kris.length > 0 ? (
                      <table className="w-full text-left text-sm border border-slate-200 rounded-lg overflow-hidden print:border-collapse">
                        <thead className="bg-slate-50"><tr><th className="px-3 py-2 font-semibold">KRI</th><th className="px-3 py-2 font-semibold w-24 text-center">Value</th><th className="px-3 py-2 font-semibold w-24 text-center">Likelihood</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {risk.kris.map((kri, i) => (<tr key={i}><td className="px-3 py-2">{kri.name}</td><td className="px-3 py-2 text-center font-bold text-indigo-700">{kri.value}</td><td className="px-3 py-2 text-center font-bold text-slate-600">{kri.likelihood}</td></tr>))}
                        </tbody>
                      </table>
                    ) : <p className="text-xs text-slate-400 italic">No KRIs defined for this risk.</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ========== TREND VIEW ========== */
          <div className="space-y-8">
            {!selectedRiskId ? <p className="text-center text-slate-400 py-10">Select a risk above to view its trend.</p> : (
              <>
                {/* Trend Bar Chart */}
                <div className="border border-slate-200 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Residual Rating Trend</h3>
                  <div className="flex items-end gap-6 justify-center h-48">
                    {trendData.map(t => {
                      const maxH = Math.max(...trendData.map(x => x.residual), t.appetite, 1);
                      const barH = Math.max((t.residual / maxH) * 100, 4);
                      const appH = (t.appetite / maxH) * 100;
                      return (
                        <div key={t.year} className="flex flex-col items-center gap-1 flex-1 max-w-[120px]">
                          <div className="relative w-full flex items-end justify-center" style={{ height: '160px' }}>
                            <div className={`w-12 rounded-t-lg transition-all ${t.residual > t.appetite ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ height: `${barH}%` }} />
                            <div className="absolute w-full border-t-2 border-dashed border-amber-400" style={{ bottom: `${appH}%` }}>
                              <span className="absolute -top-4 right-0 text-[9px] text-amber-600 font-bold">App:{t.appetite}</span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-600">{t.residual}</span>
                          <span className="text-[10px] text-slate-500">{t.year}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Trend Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-600">Academic Year</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-center">Impact</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-center">Likelihood</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-center">Residual</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-center">Appetite</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trendData.map(t => (
                        <tr key={t.year}>
                          <td className="px-4 py-2.5 font-medium">{t.year}</td>
                          <td className="px-4 py-2.5 text-center">{t.impact}</td>
                          <td className="px-4 py-2.5 text-center">{t.likelihood}</td>
                          <td className="px-4 py-2.5 text-center font-bold">{t.residual}</td>
                          <td className="px-4 py-2.5 text-center">{t.appetite}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.residual > t.appetite ? 'bg-red-100 text-red-700' : t.residual === 0 ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'}`}>
                              {t.residual === 0 ? 'No Data' : t.residual > t.appetite ? 'Not Accepted' : 'Accepted'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* KRI Details per year */}
                {trendData.filter(t => t.kris.length > 0).map(t => (
                  <div key={t.year} className="border border-slate-200 rounded-xl overflow-hidden break-inside-avoid">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-semibold text-sm text-slate-700">{t.year} — KRI Details</div>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-slate-100"><th className="px-4 py-2 text-left font-semibold text-slate-600">Indicator</th><th className="px-4 py-2 text-center font-semibold text-slate-600">Value</th><th className="px-4 py-2 text-center font-semibold text-slate-600">Likelihood</th></tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {t.kris.map((k,i) => (<tr key={i}><td className="px-4 py-2">{k.name}</td><td className="px-4 py-2 text-center font-bold text-indigo-700">{k.value}</td><td className="px-4 py-2 text-center font-bold">{k.likelihood}</td></tr>))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
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
