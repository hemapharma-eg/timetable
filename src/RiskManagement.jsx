import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, PlusCircle, List as ListIcon, 
  Search, AlertTriangle, CheckCircle, Clock,
  Activity, BookOpen, Stethoscope, Briefcase,
  Edit, Trash2, X, Target, Download, Share2, Printer
} from 'lucide-react';
import { supabase } from './supabase';

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

export function RiskManagement({ session, userMeta, isTechAdmin }) {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'new_risk', label: 'Report a Risk' },
    { id: 'register', label: 'Risk Register' },
    { id: 'reports', label: 'Yearly Reports' }
  ];

  return (
    <PageContainer
      title="Risk Management"
      description="Identify, assess, and mitigate risks across Academic, Clinical, Operational, and Strategic domains."
      tabs={tabs}
      activeSubTab={activeSubTab}
      setActiveSubTab={setActiveSubTab}
    >
      {activeSubTab === 'dashboard' && <DashboardView />}
      {activeSubTab === 'new_risk' && <NewRiskForm onSuccess={() => setActiveSubTab('register')} session={session} />}
      {activeSubTab === 'register' && <RiskRegister isTechAdmin={isTechAdmin} />}
      {activeSubTab === 'reports' && <RiskReportsView />}
    </PageContainer>
  );
}

// --- Dashboard View ---
function DashboardView() {
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
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Risks Logged" value={stats.total} icon={<ListIcon className="text-blue-500 w-8 h-8" />} bg="bg-blue-50" />
        <StatCard title="High/Critical Severity" value={stats.high} icon={<AlertTriangle className="text-red-500 w-8 h-8" />} bg="bg-red-50" />
        <StatCard title="Clinical Risks" value={stats.clinical} icon={<Stethoscope className="text-emerald-500 w-8 h-8" />} bg="bg-emerald-50" />
      </div>

      {/* Information Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-slate-500" />
          Risk Management Policy Overview
        </h3>
        <p className="text-slate-600 mb-4 leading-relaxed">
          The DMU QA Hub Risk Management Plan ensures systematic identification, assessment, and mitigation of risks. All faculty and staff are required to report identified risks using the framework below.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <h4 className="font-semibold text-slate-700 mb-2">Severity Rubric</h4>
            <ul className="text-sm text-slate-600 space-y-1 list-disc pl-4">
              <li><span className="font-medium text-red-600">Critical:</span> Immediate action required. Board level visibility.</li>
              <li><span className="font-medium text-orange-500">High:</span> Senior management attention needed.</li>
              <li><span className="font-medium text-yellow-600">Medium:</span> Manageable through standard controls.</li>
              <li><span className="font-medium text-green-600">Low:</span> Routine monitoring required.</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <h4 className="font-semibold text-slate-700 mb-2">Primary Categories</h4>
            <ul className="text-sm text-slate-600 space-y-1 list-disc pl-4">
              <li>Academic & Research</li>
              <li>Clinical & Patient Safety</li>
              <li>Financial & Strategic</li>
              <li>Compliance & Legal</li>
              <li>IT & Data Security</li>
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
function RiskFormFields({ formData, handleChange }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Title <span className="text-red-500">*</span></label>
          <input type="text" name="Risk_Title" required value={formData.Risk_Title || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
          <select name="Category" required value={formData.Category || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none">
            <option value="">Select Category...</option>
            <option value="Academic">Academic & Research</option>
            <option value="Clinical">Clinical Operations</option>
            <option value="Compliance">Compliance & Legal</option>
            <option value="Financial">Financial</option>
            <option value="IT">IT & Cybersecurity</option>
            <option value="Operational">Operational / Facilities</option>
            <option value="Strategic">Strategic</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Owner</label>
          <input type="text" name="Risk_Owner" value={formData.Risk_Owner || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Reporter</label>
          <input type="text" name="Risk_Reporter" value={formData.Risk_Reporter || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
        <div>
           <label className="block text-sm font-semibold text-slate-700 mb-1">Severity / Rubric Level</label>
           <select name="Rubrics" value={formData.Rubrics || 'Medium'} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none">
            <option value="Low">Low (Routine)</option>
            <option value="Medium">Medium (Manageable)</option>
            <option value="High">High (Serious impact)</option>
            <option value="Critical">Critical (Immediate action)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function NewRiskForm({ onSuccess, session }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    Risk_Title: '', Category: '', Risk_Causes: '', 
    Risk_Consequences_: '', Existing_Internal_control_: '', Rubrics: 'Medium',
    Risk_Owner: '', Risk_Reporter: '', Impact: '', Appetite: '', Mitigating_Actions: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...formData, Reporter_Email: session?.user?.email || 'unknown@dmu.ac.ae' };
    try {
      const { error } = await supabase.from('risk_management_plan').insert([payload]);
      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error(error);
      alert("Database error. Saving to mock array instead.");
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
        <RiskFormFields formData={formData} handleChange={handleChange} />
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
function RiskRegister({ isTechAdmin }) {
  const [risks, setRisks] = useState([]);
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

  const filteredRisks = risks.filter(r => r.Risk_Title.toLowerCase().includes(searchTerm.toLowerCase()) || r.Category.toLowerCase().includes(searchTerm.toLowerCase()));

  const getSeverityBadge = (level) => {
    switch(level) {
      case 'Critical': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">Critical</span>;
      case 'High': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">High</span>;
      case 'Medium': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Medium</span>;
      case 'Low': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Low</span>;
      default: return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{level}</span>;
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
        <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-800">Identified Risks</h3>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search risks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-64 text-sm outline-none" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">Risk Title</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Severity</th>
                <th className="p-4 font-semibold hidden md:table-cell">Reporter</th>
                {isTechAdmin && <th className="p-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Loading records...</td></tr>
              ) : filteredRisks.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No risks found.</td></tr>
              ) : (
                filteredRisks.map((risk) => (
                  <tr key={risk.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4"><p className="font-medium text-slate-800">{risk.Risk_Title}</p></td>
                    <td className="p-4 hidden md:table-cell text-sm text-slate-600">{risk.Category}</td>
                    <td className="p-4">{getSeverityBadge(risk.Rubrics)}</td>
                    <td className="p-4 hidden md:table-cell text-sm text-slate-600">{risk.Reporter_Email}</td>
                    {isTechAdmin && (
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

      {editingRisk && <EditRiskModal risk={editingRisk} onClose={() => setEditingRisk(null)} onRefresh={fetchRisks} />}
      {managingKRIsFor && <KRIManagementModal risk={managingKRIsFor} onClose={() => setManagingKRIsFor(null)} />}
    </>
  );
}

// --- Admin Modals ---
function EditRiskModal({ risk, onClose, onRefresh }) {
  const [formData, setFormData] = useState({ ...risk });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('risk_management_plan').update(formData).eq('id', risk.id);
      if (error) throw error;
      onRefresh();
      onClose();
    } catch (err) {
      alert("DB Error, updating locally.");
      Object.assign(mockRisks.find(r => r.id === risk.id), formData);
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
          <RiskFormFields formData={formData} handleChange={(e) => setFormData({...formData, [e.target.name]: e.target.value})} />
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

  const handleAddRubric = async (kri_id) => {
    const rVal = document.getElementById(`rubric_val_${kri_id}`).value;
    const rLike = document.getElementById(`rubric_like_${kri_id}`).value;
    if (!rVal || !rLike) return;
    
    try {
      const payload = { kri_id, rubric_value: rVal, likelihood: Number(rLike) };
      const { error } = await supabase.from('kri_rubrics').insert([payload]);
      if (error) throw error;
      fetchKRIs();
    } catch(e) {
      mockKRIRubrics.push({ id: Date.now(), kri_id, rubric_value: rVal, likelihood: Number(rLike) });
      fetchKRIs();
    }
    document.getElementById(`rubric_val_${kri_id}`).value = '';
    document.getElementById(`rubric_like_${kri_id}`).value = '';
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
              {kris.map(kri => (
                <div key={kri.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-800">{kri.indicator_name}</span>
                    <button onClick={() => handleDeleteKRI(kri.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                  </div>
                  
                  <div className="mt-2 pl-4 border-l-2 border-indigo-200">
                    <h4 className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">Rubric <span className="font-normal text-slate-400">(Value {"->"} Likelihood)</span></h4>
                    {rubrics.filter(r => r.kri_id === kri.id).map(r => (
                      <div key={r.id} className="flex gap-2 items-center mb-1">
                        <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded">Value: <strong className="text-indigo-700">{r.rubric_value}</strong></span>
                        <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded">Likelihood: <strong className="text-indigo-700">{r.likelihood}</strong></span>
                        <button onClick={() => handleDeleteRubric(r.id)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2 items-center">
                      <input type="text" id={`rubric_val_${kri.id}`} placeholder="e.g. > 5, or exact string" className="text-xs border border-slate-300 px-2 py-1.5 rounded w-40 outline-none focus:border-indigo-500" />
                      <input type="number" id={`rubric_like_${kri.id}`} placeholder="Likelihood" className="text-xs border border-slate-300 px-2 py-1.5 rounded w-24 outline-none focus:border-indigo-500" />
                      <button onClick={() => handleAddRubric(kri.id)} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded font-semibold hover:bg-indigo-200">Add Rubric</button>
                    </div>
                  </div>
                </div>
              ))}
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
                        {kriVals.map(val => (
                          <div key={val.id} className="text-center px-4 border-r last:border-0 border-slate-200">
                            <div className="text-xs text-slate-500 font-medium mb-1">{val.academic_year}</div>
                            <div className="font-bold text-indigo-600 text-lg">{val.indicator_value}</div>
                          </div>
                        ))}
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

// --- Reports ---
export function RiskReportsView({ initialYear }) {
  const [selectedYear, setSelectedYear] = useState(initialYear || '2024-2025');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  const assembleData = (rData, kData, vData, rubData, year) => {
    return rData.map(risk => {
      let maxLikelihood = 0;
      const riskKRIs = kData.filter(k => k.risk_id === risk.id).map(kri => {
        const val = vData.find(v => v.kri_id === kri.id);
        const kriValue = val ? val.indicator_value : 'Not Set';
        let likelihood = 0;
        if (kriValue !== 'Not Set') {
          likelihood = getLikelihoodForKRI(kriValue, kri.id, rubData);
        }
        if (likelihood > maxLikelihood) maxLikelihood = likelihood;
        return { name: kri.indicator_name, value: kriValue, likelihood };
      });
      
      const impact = Number(risk.Impact) || 0;
      const appetite = Number(risk.Appetite) || 0;
      const residualRating = maxLikelihood * impact;
      
      return { 
        ...risk, 
        kris: riskKRIs,
        calculated_likelihood: maxLikelihood,
        residual_rating: residualRating,
        appetite: appetite
      };
    });
  };

  const fetchReport = async (year) => {
    setLoading(true);
    try {
      const { data: rData, error: rErr } = await supabase.from('risk_management_plan').select('*');
      const { data: kData, error: kErr } = await supabase.from('risk_kris').select('*');
      const { data: vData, error: vErr } = await supabase.from('risk_kri_values').select('*').eq('academic_year', year);
      const { data: rubData, error: rubErr } = await supabase.from('kri_rubrics').select('*');
      
      if (rErr || kErr || vErr) throw new Error("DB Error");

      setReportData(assembleData(rData, kData, vData, rubData || [], year));
    } catch(e) {
      setReportData(assembleData(mockRisks, mockKRIs, mockKRIValues.filter(v => v.academic_year === year), mockKRIRubrics, year));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(selectedYear); }, [selectedYear]);

  const handleShare = async () => {
    const url = `${window.location.origin}?view=public_risk_report&year=${selectedYear}`;
    await navigator.clipboard.writeText(url);
    alert('Public report link copied to clipboard!');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Print-hidden controls */}
      <div className="print:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <label className="font-semibold text-slate-700">Academic Year:</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500">
            <option>2023-2024</option>
            <option>2024-2025</option>
            <option>2025-2026</option>
          </select>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleShare} className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors"><Share2 size={16} className="mr-2" /> Share URL</button>
          <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors"><Printer size={16} className="mr-2" /> Export PDF</button>
        </div>
      </div>

      {/* Printable Report Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 print:border-none print:shadow-none print:p-0 flex-1 overflow-auto print:overflow-visible">
        <div className="text-center mb-8 pb-6 border-b border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">DMU QA Hub</h1>
          <h2 className="text-xl font-semibold text-indigo-800">Risk Management Report & Key Risk Indicators</h2>
          <p className="text-slate-500 font-medium mt-2">Academic Year: {selectedYear}</p>
        </div>

        {loading ? <p className="text-center py-10">Compiling report...</p> : (
          <div className="space-y-8">
            {reportData.map(risk => (
              <div key={risk.id} className="break-inside-avoid border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 print:bg-slate-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{risk.Risk_Title}</h3>
                      <div className="text-sm text-slate-500 mt-1 flex gap-4">
                        <span><strong className="text-slate-700">Owner:</strong> {risk.Risk_Owner || 'N/A'}</span>
                        <span><strong className="text-slate-700">Reporter:</strong> {risk.Risk_Reporter || 'N/A'}</span>
                        <span><strong className="text-slate-700">Category:</strong> {risk.Category}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 items-center">
                       <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm">Impact: {risk.Impact || 0}</span>
                       <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm">Likelihood: {risk.calculated_likelihood}</span>
                       <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm">Appetite: {risk.appetite}</span>
                       <span className={`px-3 py-1 border rounded-lg text-xs font-bold shadow-sm print:shadow-none ${risk.residual_rating > risk.appetite ? 'bg-red-100 text-red-800 border-red-300' : 'bg-green-100 text-green-800 border-green-300'}`}>
                         Residual: {risk.residual_rating} ({risk.residual_rating > risk.appetite ? 'Not Accepted' : 'Accepted'})
                       </span>
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
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Key Risk Indicator</th>
                            <th className="px-3 py-2 font-semibold w-24 text-center">Value</th>
                            <th className="px-3 py-2 font-semibold w-24 text-center">Likelihood</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {risk.kris.map((kri, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2">{kri.name}</td>
                              <td className="px-3 py-2 text-center font-bold text-indigo-700">{kri.value}</td>
                              <td className="px-3 py-2 text-center font-bold text-slate-600">{kri.likelihood}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <p className="text-xs text-slate-400 italic">No KRIs defined for this risk.</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
