import re

with open('src/RiskManagement.jsx', 'r') as f:
    content = f.read()

# Replace KRIManagementModal call
content = content.replace(
    'managingKRIsFor && <KRIManagementModal risk={managingKRIsFor} onClose={() => setManagingKRIsFor(null)} />',
    'managingKRIsFor && <RiskValuesModal risk={managingKRIsFor} onClose={() => setManagingKRIsFor(null)} />'
)
content = content.replace('title="Manage KRIs"', 'title="Manage Values"')

# Strip KRIManagementModal
kri_modal_start = content.find('function KRIManagementModal')
kri_modal_end = content.find('function RiskReportsView')

new_values_modal = """
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
  }, [risk]);

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

"""

content = content[:kri_modal_start] + new_values_modal + content[kri_modal_end:]

# Rewrite RiskReportsView
reports_start = content.find('function RiskReportsView')
reports_end = content.find('// --- Academic Years Manager')

new_reports_view = """
function RiskReportsView({ initialYear }) {
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(initialYear || '2024-2025');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    supabase.from('academic_years').select('*').order('sort_order').then(({data}) => {
      if(data) {
        setAcademicYears(data.map(y => y.label));
        if (!initialYear && data.length > 0) setSelectedYear(data[0].label);
      }
    });
  }, [initialYear]);

  const fetchReport = async (year) => {
    setLoading(true);
    try {
      const { data: mappings } = await supabase.from('risk_year_mapping').select('risk_id').eq('academic_year', year);
      const mappedIds = (mappings || []).map(m => m.risk_id);
      if (mappedIds.length === 0) { setReportData([]); return; }

      const { data: risks } = await supabase.from('risk_management_plan').select('*').in('id', mappedIds);
      const { data: values } = await supabase.from('risk_values').select('*').eq('academic_year', year).in('risk_id', mappedIds);

      const report = [];
      (risks || []).forEach(risk => {
        const riskVals = (values || []).filter(v => v.risk_id === risk.id);
        if (risk.risk_scope === 'Program Level') {
          const programsList = (risk.programs || '').split(',').map(p => p.trim()).filter(Boolean);
          programsList.forEach(prog => {
            const valObj = riskVals.find(v => v.program_name === prog);
            const status = getRiskStatus(risk, valObj?.value);
            report.push({ ...risk, program_name: prog, value: valObj?.value, status });
          });
        } else {
          const valObj = riskVals.find(v => v.program_name === 'Institution');
          const status = getRiskStatus(risk, valObj?.value);
          report.push({ ...risk, program_name: 'Institution', value: valObj?.value, status });
        }
      });
      setReportData(report);
    } catch(e) {
      console.warn(e);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (selectedYear) fetchReport(selectedYear); }, [selectedYear]);

  const handleShare = async () => {
    const url = `${window.location.origin}?view=public_risk_report&year=${selectedYear}`;
    await navigator.clipboard.writeText(url);
    alert('Public report link copied to clipboard!');
  };

  const filtered = reportData.filter(r => {
    if (searchTerm && !(r.Risk_Title || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (statusFilter !== 'All' && r.status.label !== statusFilter) return false;
    return true;
  }).sort((a,b) => (a.Risk_No || '').localeCompare(b.Risk_No || '', undefined, { numeric: true }));

  const incidents = filtered.filter(r => r.status.label === 'Incident Risk').length;
  const highProb = filtered.filter(r => r.status.label === 'High Probability').length;
  const lowProb = filtered.filter(r => r.status.label === 'Low Probability').length;
  const noRisk = filtered.filter(r => r.status.label === 'No Risk').length;

  return (
    <div className="h-full min-h-[500px] w-full flex flex-col">
      <div className="print:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-wrap gap-3">
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-700">
            {academicYears.map(y => <option key={y}>{y}</option>)}
          </select>
          <input type="text" placeholder="Search title..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 w-full sm:w-48" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500">
            <option value="All">All Statuses</option>
            <option value="No Risk">No Risk (Green)</option>
            <option value="Low Probability">Low Probability (Yellow)</option>
            <option value="High Probability">High Probability (Orange)</option>
            <option value="Incident Risk">Incident Risk (Red)</option>
            <option value="Uncategorized">Uncategorized / No Data</option>
          </select>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleShare} className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors"><Share2 size={16} className="mr-2" /> Share URL</button>
          <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors"><Printer size={16} className="mr-2" /> Export PDF</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 print:border-none print:shadow-none print:p-0 flex-1 overflow-auto print:overflow-visible">
        <div className="text-center mb-8 pb-6 border-b border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">DMU QA Hub</h1>
          <h2 className="text-xl font-semibold text-indigo-800">Risk Management Report — {selectedYear}</h2>
        </div>

        {loading ? <p className="text-center py-10">Compiling report...</p> : reportData.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <h3 className="text-lg font-medium text-slate-800 mb-2">No Data Available or Permission Denied</h3>
            <p className="text-slate-500 max-w-md mx-auto">Either no risks have been mapped for this academic year, or your account lacks read access.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 print:grid-cols-5">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                <div className="text-2xl font-bold text-slate-800">{filtered.length}</div>
                <div className="text-xs font-bold uppercase text-slate-500 mt-1">Total Entries</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-center">
                <div className="text-2xl font-bold text-red-700">{incidents}</div>
                <div className="text-xs font-bold uppercase text-red-600 mt-1">Incident</div>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 text-center">
                <div className="text-2xl font-bold text-orange-700">{highProb}</div>
                <div className="text-xs font-bold uppercase text-orange-600 mt-1">High Prob</div>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 text-center">
                <div className="text-2xl font-bold text-yellow-700">{lowProb}</div>
                <div className="text-xs font-bold uppercase text-yellow-600 mt-1">Low Prob</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center">
                <div className="text-2xl font-bold text-emerald-700">{noRisk}</div>
                <div className="text-xs font-bold uppercase text-emerald-600 mt-1">No Risk</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Detailed Risk Register ({selectedYear})</h3>
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-y border-slate-200">
                    <th className="p-3">Risk No</th>
                    <th className="p-3 w-1/3">Title & Category</th>
                    <th className="p-3">Scope / Program</th>
                    <th className="p-3 text-center">Value</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r, i) => (
                    <tr key={`${r.id}-${r.program_name}-${i}`} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-600 align-top">{r.Risk_No}</td>
                      <td className="p-3 align-top">
                        <div className="font-bold text-slate-800 mb-1">{r.Risk_Title}</div>
                        <div className="text-xs text-slate-500">{r.Category} • Owner: {r.Risk_Owner || 'N/A'}</div>
                      </td>
                      <td className="p-3 align-top">
                        <div className="font-medium text-slate-700">{r.program_name}</div>
                        <div className="text-xs text-slate-400">{r.risk_scope}</div>
                      </td>
                      <td className="p-3 align-top text-center">
                        <span className="font-mono font-bold text-lg">{r.value !== undefined && r.value !== null ? r.value : '-'}</span>
                      </td>
                      <td className="p-3 align-top text-right">
                        <span className={`inline-block px-3 py-1.5 rounded text-xs font-bold ${r.status.color} text-${r.status.text} shadow-sm`}>
                          {r.status.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"""

content = content[:reports_start] + new_reports_view + content[reports_end:]

with open('src/RiskManagement.jsx', 'w') as f:
    f.write(content)

