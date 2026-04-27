import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, PlusCircle, List as ListIcon, 
  Search, AlertTriangle, CheckCircle, Clock,
  Activity, BookOpen, Stethoscope, Briefcase
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
    created_at: "2026-04-20T10:00:00Z"
  },
  {
    id: 2,
    Risk_Title: "Lab Equipment Failure During Exams",
    Category: "Clinical",
    Reporter_Email: "faculty@dmu.ac.ae",
    Risk_Causes: "Aging equipment in Lab 4.",
    Risk_Consequences_: "Disruption of practical exams, student complaints.",
    Existing_Internal_control_: "Annual maintenance contract.",
    Rubrics: "Medium",
    created_at: "2026-04-25T14:30:00Z"
  }
];

// Reusable Page Container to match Timetable styling
const PageContainer = ({ title, description, tabs, activeSubTab, setActiveSubTab, children }) => (
  <div className="flex h-full flex-col animate-in fade-in duration-300">
    <div className="mb-6 border-b border-slate-200 pb-0">
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
    <div className="flex-1 min-h-0 pb-8 overflow-auto px-1">
      {children}
    </div>
  </div>
);

export function RiskManagement({ session, userMeta }) {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'new_risk', label: 'Report a Risk' },
    { id: 'register', label: 'Risk Register' }
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
      {activeSubTab === 'register' && <RiskRegister />}
    </PageContainer>
  );
}

// --- Dashboard View ---
function DashboardView() {
  const [stats, setStats] = useState({ total: 0, high: 0, clinical: 0 });

  useEffect(() => {
    // Attempt to fetch from DB, fallback to mock data
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
        <StatCard 
          title="Total Risks Logged" 
          value={stats.total} 
          icon={<ListIcon className="text-blue-500 w-8 h-8" />} 
          bg="bg-blue-50" 
        />
        <StatCard 
          title="High/Critical Severity" 
          value={stats.high} 
          icon={<AlertTriangle className="text-red-500 w-8 h-8" />} 
          bg="bg-red-50" 
        />
        <StatCard 
          title="Clinical Risks" 
          value={stats.clinical} 
          icon={<Stethoscope className="text-emerald-500 w-8 h-8" />} 
          bg="bg-emerald-50" 
        />
      </div>

      {/* Information Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-slate-500" />
          Risk Management Policy Overview
        </h3>
        <p className="text-slate-600 mb-4 leading-relaxed">
          The Dubai Medical University Risk Management Plan ensures systematic identification, assessment, and mitigation of risks across Academic, Clinical, Operational, and Strategic domains. All faculty and staff are required to report identified risks using the framework below.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <h4 className="font-semibold text-slate-700 mb-2">Severity Rubric (Impact x Likelihood)</h4>
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
      <div className={`p-4 rounded-full ${bg}`}>
        {icon}
      </div>
    </div>
  );
}

// --- New Risk Form View ---
function NewRiskForm({ onSuccess, session }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    Risk_Title: '',
    Category: '',
    Risk_Causes: '',
    Risk_Consequences_: '',
    Existing_Internal_control_: '',
    Rubrics: 'Medium'
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = {
      ...formData,
      Reporter_Email: session?.user?.email || 'unknown@dmu.ac.ae'
    };

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Title <span className="text-red-500">*</span></label>
            <input 
              type="text" name="Risk_Title" required value={formData.Risk_Title} onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="Brief, clear description of the risk"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
            <select 
              name="Category" required value={formData.Category} onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
            >
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
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Causes</label>
            <textarea 
              name="Risk_Causes" rows="3" value={formData.Risk_Causes} onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="What events or vulnerabilities could trigger this risk?"
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Consequences</label>
            <textarea 
              name="Risk_Consequences_" rows="3" value={formData.Risk_Consequences_} onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="What is the impact on DMU if this risk materializes? (Financial, reputational, safety, etc.)"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Existing Internal Controls</label>
            <textarea 
              name="Existing_Internal_control_" rows="3" value={formData.Existing_Internal_control_} onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="What procedures, policies, or physical controls are currently in place to mitigate this?"
            ></textarea>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
             <label className="block text-sm font-semibold text-slate-700 mb-1">Severity / Rubric Level</label>
             <select 
              name="Rubrics" value={formData.Rubrics} onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
            >
              <option value="Low">Low (Routine)</option>
              <option value="Medium">Medium (Manageable)</option>
              <option value="High">High (Serious impact)</option>
              <option value="Critical">Critical (Immediate action)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button 
            type="submit" disabled={loading}
            className={`px-6 py-2.5 rounded-lg text-white font-medium flex items-center shadow-md transition-all ${
              loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
            }`}
          >
            {loading ? 'Submitting to Database...' : (
              <><CheckCircle className="w-5 h-5 mr-2" /> Submit Risk Assessment</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Risk Register (List View) ---
function RiskRegister() {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRisks();
  }, []);

  const fetchRisks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('risk_management_plan')
        .select('*');
        
      if (error) throw error;
      setRisks(data);
    } catch (err) {
      console.warn("Using mock data for Risk Register due to DB error:", err.message);
      setRisks(mockRisks);
    } finally {
      setLoading(false);
    }
  };

  const filteredRisks = risks.filter(r => 
    r.Risk_Title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.Category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityBadge = (level) => {
    switch(level) {
      case 'Critical': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">Critical</span>;
      case 'High': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 border border-orange-200">High</span>;
      case 'Medium': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">Medium</span>;
      case 'Low': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-200">Low</span>;
      default: return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{level}</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-800">Identified Risks</h3>
        
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search risks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-64 text-sm outline-none"
          />
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
              <th className="p-4 font-semibold hidden lg:table-cell">Date Logged</th>
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
                  <td className="p-4">
                    <p className="font-medium text-slate-800">{risk.Risk_Title}</p>
                    <p className="text-xs text-slate-500 md:hidden mt-1">{risk.Category}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell text-sm text-slate-600">{risk.Category}</td>
                  <td className="p-4">{getSeverityBadge(risk.Rubrics)}</td>
                  <td className="p-4 hidden md:table-cell text-sm text-slate-600">{risk.Reporter_Email}</td>
                  <td className="p-4 hidden lg:table-cell text-sm text-slate-500">
                    {new Date(risk.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
