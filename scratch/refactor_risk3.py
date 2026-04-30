with open('src/RiskManagement.jsx', 'r') as f:
    content = f.read()

# 1. Mock data
content = content.replace(
    'Impact: 4,\n    Appetite: 10,',
    'risk_scope: "Institution", programs: "", rubric_green: "< 3", rubric_yellow: ">= 3 && value < 6", rubric_orange: ">= 6 && value < 8", rubric_red: ">= 8",'
)

content = content.replace('let mockKRIs = [];', 'let mockRiskValues = [];')
content = content.replace('let mockKRIValues = [];\nlet mockKRIRubrics = [];', '')

# 2. RiskFormFields
old_fields = """        <div>
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
        </div>"""

new_fields = """        <div>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <label className="block text-xs font-bold text-emerald-700 mb-1">No Risk (Green) <span className="text-red-500">*</span></label>
          <input type="text" name="rubric_green" required value={formData.rubric_green || ''} onChange={handleChange} placeholder="e.g. < 5" className="w-full px-3 py-2 border border-emerald-300 rounded-md outline-none text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-yellow-600 mb-1">Low Prob (Yellow) <span className="text-red-500">*</span></label>
          <input type="text" name="rubric_yellow" required value={formData.rubric_yellow || ''} onChange={handleChange} placeholder="e.g. >= 5 && < 10" className="w-full px-3 py-2 border border-yellow-300 rounded-md outline-none text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-orange-600 mb-1">High Prob (Orange) <span className="text-red-500">*</span></label>
          <input type="text" name="rubric_orange" required value={formData.rubric_orange || ''} onChange={handleChange} placeholder="e.g. >= 10 && < 15" className="w-full px-3 py-2 border border-orange-300 rounded-md outline-none text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-red-700 mb-1">Incident (Red) <span className="text-red-500">*</span></label>
          <input type="text" name="rubric_red" required value={formData.rubric_red || ''} onChange={handleChange} placeholder="e.g. >= 15" className="w-full px-3 py-2 border border-red-300 rounded-md outline-none text-sm" />
        </div>"""

content = content.replace(old_fields, new_fields)

# 3. Form States and submit
content = content.replace(
    "Impact: '', Appetite: '', Mitigating_Actions: ''",
    "risk_scope: 'Institution', programs: '', rubric_green: '', rubric_yellow: '', rubric_orange: '', rubric_red: '', Mitigating_Actions: ''"
)
content = content.replace(
    "payload.Impact = (payload.Impact === '' || payload.Impact == null) ? null : Number(payload.Impact);",
    ""
)
content = content.replace(
    "payload.Appetite = (payload.Appetite === '' || payload.Appetite == null) ? null : Number(payload.Appetite);",
    ""
)

# 4. Import / Export
content = content.replace(
    "Impact: r.Impact || '',\n      Appetite: r.Appetite || '',",
    "Scope: r.risk_scope || '', Programs: r.programs || '', Green: r.rubric_green || '', Yellow: r.rubric_yellow || '', Orange: r.rubric_orange || '', Red: r.rubric_red || '',"
)

content = content.replace(
    "Impact: r.Impact ? Number(r.Impact) : null,\n          Appetite: r.Appetite ? Number(r.Appetite) : null,",
    "risk_scope: r.Scope || r.risk_scope || 'Institution', programs: r.Programs || r.programs || '', rubric_green: r.Green || r.rubric_green || '', rubric_yellow: r.Yellow || r.rubric_yellow || '', rubric_orange: r.Orange || r.rubric_orange || '', rubric_red: r.Red || r.rubric_red || '',"
)

# 5. KRIManagementModal -> RiskValuesModal
content = content.replace(
    'managingKRIsFor && <KRIManagementModal risk={managingKRIsFor} onClose={() => setManagingKRIsFor(null)} />',
    'managingKRIsFor && <RiskValuesModal risk={managingKRIsFor} onClose={() => setManagingKRIsFor(null)} />'
)
content = content.replace('title="Manage KRIs"', 'title="Manage Values"')

# Replace the KRIManagementModal definition and RiskReportsView
kri_modal_start = content.find('function KRIManagementModal')
kri_modal_end = content.find('// --- Academic Years Manager')

new_modals_and_reports = """
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
\n"""

content = content[:kri_modal_start] + new_modals_and_reports + content[kri_modal_end:]

with open('src/RiskManagement.jsx', 'w') as f:
    f.write(content)

