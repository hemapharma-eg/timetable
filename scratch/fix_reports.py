with open('src/RiskManagement.jsx', 'r') as f:
    content = f.read()

# Find and replace RiskReportsView
start = content.find('function RiskReportsView(')
end = content.find('\nfunction CategoriesManager(')

new_view = '''function RiskReportsView({ initialYear }) {
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
'''

content = content[:start] + new_view + '\n' + content[end:]

with open('src/RiskManagement.jsx', 'w') as f:
    f.write(content)
print("Done")
