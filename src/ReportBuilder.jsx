import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Plus, Pencil, Trash2, X, Search, Eye, Download,
  ChevronDown, ChevronUp, Filter, ArrowUpDown, Copy, Save, Share2, CheckCircle2,
  Database, Layers, RefreshCw
} from 'lucide-react';
import { supabase } from './supabase';

const FILTER_OPS = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'not_empty', label: 'Is not empty' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '>=' },
  { value: 'lte', label: '<=' }
];

const applyFilter = (value, op, filterVal) => {
  const v = (value || '').toString().toLowerCase();
  const f = (filterVal || '').toString().toLowerCase();
  switch (op) {
    case 'contains': return v.includes(f);
    case 'equals': return v === f;
    case 'starts_with': return v.startsWith(f);
    case 'ends_with': return v.endsWith(f);
    case 'not_empty': return v.length > 0;
    case 'is_empty': return v.length === 0;
    case 'gt': return parseFloat(value) > parseFloat(filterVal);
    case 'lt': return parseFloat(value) < parseFloat(filterVal);
    case 'gte': return parseFloat(value) >= parseFloat(filterVal);
    case 'lte': return parseFloat(value) <= parseFloat(filterVal);
    default: return true;
  }
};

export const ReportBuilder = ({ deepLinkId }) => {
  // Schema
  const [schema, setSchema] = useState([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState(null);

  // Saved reports
  const [savedReports, setSavedReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  // Builder state
  const [reportName, setReportName] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [filters, setFilters] = useState([]);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [groupByKey, setGroupByKey] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;
  const [editingReportId, setEditingReportId] = useState(null);

  // Live data
  const [liveData, setLiveData] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // UI
  const [view, setView] = useState('list');
  const [columnSearch, setColumnSearch] = useState('');
  const [shareToast, setShareToast] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // ─── Fetch schema & saved reports ─────────────────────────────────────
  useEffect(() => {
    fetchSchema();
    fetchReports();
  }, []);

  useEffect(() => {
    if (deepLinkId && savedReports.length > 0) {
      const found = savedReports.find(r => r.id === deepLinkId);
      if (found) {
        loadReport(found);
        setTimeout(() => setView('preview'), 100);
      }
    }
  }, [deepLinkId, savedReports]);

  // When data source changes, fetch live data
  useEffect(() => {
    if (dataSource) fetchLiveData(dataSource);
  }, [dataSource]);

  const fetchSchema = async () => {
    setSchemaLoading(true);
    setSchemaError(null);
    try {
      const { data, error } = await supabase.rpc('get_schema_info');
      if (error) throw error;
      setSchema(data || []);
    } catch (err) {
      setSchemaError(err.message || 'Run Section 8 of supabase_schema_update.sql first.');
    }
    setSchemaLoading(false);
  };

  const fetchReports = async () => {
    setReportsLoading(true);
    const { data } = await supabase.from('report_configs').select('*').order('updated_at', { ascending: false });
    if (data) setSavedReports(data);
    setReportsLoading(false);
  };

  const fetchLiveData = async (table) => {
    if (!table) return;
    setDataLoading(true);
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error('Data fetch error:', error.message);
      setLiveData([]);
    } else {
      setLiveData(data || []);
    }
    setDataLoading(false);
  };

  // ─── Schema helpers ────────────────────────────────────────────────────
  const HIDDEN_TABLES = ['form_configs', 'app_configs', 'report_configs'];
  const tables = [...new Set(schema.map(c => c.table_name))].filter(t => !HIDDEN_TABLES.includes(t)).sort();
  const filteredTables = tables.filter(t => t.toLowerCase().includes(tableSearch.toLowerCase()));

  const getTableColumns = (tableName) =>
    schema.filter(c => c.table_name === tableName).sort((a, b) => a.ordinal_position - b.ordinal_position);

  const currentColumns = dataSource ? getTableColumns(dataSource) : [];
  const columnNames = currentColumns.map(c => c.column_name);

  // ─── Share ────────────────────────────────────────────────────────────
  const copyShareLink = (id) => {
    const url = `${window.location.origin}${window.location.pathname}?view=report&id=${id}`;
    navigator.clipboard.writeText(url);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2000);
  };

  // ─── Actions ──────────────────────────────────────────────────────────
  const newReport = () => {
    setReportName('');
    setDataSource('');
    setSelectedColumns([]);
    setFilters([]);
    setSortKey('');
    setSortDir('asc');
    setGroupByKey('');
    setEditingReportId(null);
    setLiveData([]);
    setView('builder');
  };

  const loadReport = (report) => {
    const c = report.config || {};
    setReportName(report.name);
    setDataSource(c.dataSource || '');
    setSelectedColumns(c.columns || []);
    setFilters(c.filters || []);
    setSortKey(c.sortKey || '');
    setSortDir(c.sortDir || 'asc');
    setGroupByKey(c.groupByKey || '');
    setEditingReportId(report.id);
    setView('builder');
  };

  const saveCurrentReport = async () => {
    if (!reportName.trim()) return alert('Please name your report.');
    if (selectedColumns.length === 0) return alert('Pick at least one column.');

    const config = { dataSource, columns: selectedColumns, filters, sortKey, sortDir, groupByKey };
    if (editingReportId) {
      await supabase.from('report_configs').update({ name: reportName, config, updated_at: new Date().toISOString() }).eq('id', editingReportId);
    } else {
      const { data } = await supabase.from('report_configs').insert({ name: reportName, config }).select().single();
      if (data) setEditingReportId(data.id);
    }
    fetchReports();
  };

  const duplicateReport = async (report) => {
    await supabase.from('report_configs').insert({ name: report.name + ' (Copy)', config: report.config });
    fetchReports();
  };

  const deleteReport = async (id) => {
    if (!confirm('Delete this report permanently?')) return;
    await supabase.from('report_configs').delete().eq('id', id);
    setSavedReports(prev => prev.filter(r => r.id !== id));
    if (editingReportId === id) setView('list');
  };

  // ─── Column management ─────────────────────────────────────────────────
  const toggleColumn = (key) => {
    setSelectedColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const moveColumn = (idx, dir) => {
    const arr = [...selectedColumns];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setSelectedColumns(arr);
  };

  const addFilter = () => {
    setFilters(prev => [...prev, { field: selectedColumns[0] || columnNames[0] || '', op: 'contains', value: '' }]);
    setCurrentPage(1);
  };
  const updateFilter = (idx, patch) => {
    setFilters(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));
    setCurrentPage(1);
  };
  const removeFilter = (idx) => {
    setFilters(prev => prev.filter((_, i) => i !== idx));
    setCurrentPage(1);
  };

  // ─── Data computation ──────────────────────────────────────────────────
  const computeRows = () => {
    let data = [...liveData];
    filters.forEach(f => {
      data = data.filter(row => applyFilter(row[f.field], f.op, f.value));
    });
    if (sortKey) {
      data.sort((a, b) => {
        const av = (a[sortKey] || '').toString();
        const bv = (b[sortKey] || '').toString();
        const cmp = av.localeCompare(bv, undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return data;
  };

  const handleExportExcel = () => {
    if (typeof XLSX === 'undefined') { alert('Excel engine is still loading.'); return; }
    const rows = computeRows();
    const exportData = rows.map(r => {
      const obj = {};
      selectedColumns.forEach(k => { obj[prettyCol(k)] = r[k] ?? ''; });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportName || 'Report');
    XLSX.writeFile(wb, `${(reportName || 'report').replace(/\s+/g, '_')}.xlsx`);
  };

  const prettyCol = (col) => col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const filteredColumnsForPicker = currentColumns.filter(c =>
    c.column_name.toLowerCase().includes(columnSearch.toLowerCase())
  );

  const ShareToast = () => shareToast ? (
    <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
      <CheckCircle2 size={16} /> Link copied to clipboard!
    </div>
  ) : null;

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Saved Reports List
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[85vh]">
        <ShareToast />
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center">
              <FileSpreadsheet className="mr-2 text-violet-600" /> Report Builder
            </h2>
            <p className="text-sm text-slate-500 mt-1">Create custom reports from any Supabase table</p>
          </div>
          <button onClick={newReport} className="px-4 py-2 text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors flex items-center text-sm font-medium shadow-sm">
            <Plus size={16} className="mr-1.5" /> New Report
          </button>
        </div>

        {schemaError && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
            <Database size={16} className="mt-0.5" />
            <div><strong>Schema not available:</strong> {schemaError}</div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-6">
          {reportsLoading ? (
            <p className="text-center text-slate-400 py-8">Loading reports...</p>
          ) : savedReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileSpreadsheet size={48} className="mb-4 opacity-40" />
              <p className="text-lg font-medium text-slate-500">No reports yet</p>
              <p className="text-sm mt-1">Click "New Report" to build your first custom report</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedReports.map(report => {
                const rc = report.config || {};
                return (
                  <div key={report.id} className="group border border-slate-200 rounded-xl p-5 hover:border-violet-300 hover:shadow-md transition-all bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-slate-800 text-base truncate pr-2">{report.name}</h3>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => copyShareLink(report.id)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Copy share link"><Share2 size={14} /></button>
                        <button onClick={() => duplicateReport(report)} className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded"><Copy size={14} /></button>
                        <button onClick={() => deleteReport(report.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-mono">{rc.dataSource || '?'}</span>
                      <span className="text-xs text-slate-400">{(rc.columns || []).length} columns</span>
                      {(rc.filters || []).length > 0 && <span className="text-xs text-slate-400">· {rc.filters.length} filter(s)</span>}
                    </div>
                    <p className="text-xs text-slate-400 mb-4">Updated {new Date(report.updated_at).toLocaleDateString()}</p>
                    <div className="flex gap-2">
                      <button onClick={() => loadReport(report)} className="flex-1 px-3 py-2 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg flex items-center justify-center">
                        <Pencil size={14} className="mr-1.5" /> Edit
                      </button>
                      <button onClick={() => { loadReport(report); setTimeout(() => setView('preview'), 100); }} className="flex-1 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Eye size={14} className="mr-1.5" /> View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Report Preview
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'preview') {
    const rows = computeRows();
    const grouped = groupByKey ? {} : null;
    if (grouped !== null) {
      rows.forEach(r => {
        const gv = (r[groupByKey] ?? 'Ungrouped').toString();
        if (!grouped[gv]) grouped[gv] = [];
        grouped[gv].push(r);
      });
    }

    const renderTable = (data) => {
      // When rendering a single large table, apply pagination. If grouped, render all items per group to avoid confusing split UI.
      const isPaginated = !groupByKey && view === 'preview';
      const displayData = isPaginated ? data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : data;

      return (
        <div className="flex flex-col h-full w-full">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-medium">
                <th className="p-2 pl-4 w-12">#</th>
                {selectedColumns.map(k => <th key={k} className="p-2">{prettyCol(k)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayData.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2 pl-4 text-slate-400 font-mono text-xs">{isPaginated ? (currentPage - 1) * PAGE_SIZE + idx + 1 : idx + 1}</td>
                  {selectedColumns.map(k => (
                    <td key={k} className="p-2 text-slate-700 max-w-xs truncate">{row[k] !== null && row[k] !== undefined ? String(row[k]) : '-'}</td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={selectedColumns.length + 1} className="p-8 text-center text-slate-400">No records match your filters.</td></tr>
              )}
            </tbody>
          </table>
          
          {isPaginated && data.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 p-4 border-t border-slate-200 bg-white rounded-b-lg">
              <p className="text-xs text-slate-500">
                Showing <span className="font-medium">{(currentPage - 1) * PAGE_SIZE + 1}</span> to <span className="font-medium">{Math.min(currentPage * PAGE_SIZE, data.length)}</span> of <span className="font-medium">{data.length}</span> results
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50">Previous</button>
                {Array.from({ length: Math.min(5, Math.ceil(data.length / PAGE_SIZE)) }, (_, i) => {
                  let pNum = i + 1;
                  const totalPages = Math.ceil(data.length / PAGE_SIZE);
                  if (totalPages > 5 && currentPage > 3) pNum = currentPage - 3 + i + (currentPage > totalPages - 2 ? totalPages - currentPage - 2 : 0);
                  if (pNum > totalPages) return null;
                  return (
                    <button key={pNum} onClick={() => setCurrentPage(pNum)}
                      className={`px-2.5 py-1 text-xs border rounded ${currentPage === pNum ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {pNum}
                    </button>
                  );
                })}
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(data.length / PAGE_SIZE)))} disabled={currentPage * PAGE_SIZE >= data.length}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[85vh]">
        <ShareToast />
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{reportName || 'Untitled Report'}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {rows.length} records from <span className="font-mono text-violet-600">{dataSource}</span>
              {dataLoading && ' (refreshing...)'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchLiveData(dataSource)} className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg"><RefreshCw size={16} /></button>
            {editingReportId && (
              <button onClick={() => copyShareLink(editingReportId)} className="px-3 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center text-sm font-medium">
                <Share2 size={14} className="mr-1.5" /> Share
              </button>
            )}
            <button onClick={handleExportExcel} className="px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center text-sm font-medium">
              <Download size={16} className="mr-1.5" /> Export .xlsx
            </button>
            <button onClick={() => setView('builder')} className="px-3 py-2 text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg flex items-center text-sm font-medium">
              <Pencil size={14} className="mr-1.5" /> Edit
            </button>
            <button onClick={() => setView('list')} className="px-3 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium">← All Reports</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 p-4">
          {dataLoading ? (
            <p className="text-center text-slate-400 py-8">Loading data...</p>
          ) : grouped ? (
            Object.entries(grouped).map(([gv, gRows]) => (
              <div key={gv} className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 bg-violet-50 px-4 py-2 rounded-t-lg border border-violet-200 border-b-0">
                  {prettyCol(groupByKey)}: <span className="text-violet-700">{gv}</span>
                  <span className="text-xs font-normal text-slate-500 ml-2">({gRows.length})</span>
                </h3>
                <div className="bg-white border border-slate-200 rounded-b-lg overflow-x-auto">{renderTable(gRows)}</div>
              </div>
            ))
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-sm">{renderTable(rows)}</div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Report Builder / Editor
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600">←</button>
          <input type="text" value={reportName} onChange={e => setReportName(e.target.value)} placeholder="Untitled Report..."
            className="text-xl font-bold text-slate-800 outline-none border-b-2 border-transparent focus:border-violet-400 bg-transparent flex-1 max-w-md" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('preview')} disabled={selectedColumns.length === 0 || !dataSource}
            className="px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center text-sm font-medium disabled:opacity-40">
            <Eye size={16} className="mr-1.5" /> Preview
          </button>
          <button onClick={saveCurrentReport} className="px-4 py-2 text-white bg-violet-600 hover:bg-violet-700 rounded-lg flex items-center text-sm font-medium shadow-sm">
            <Save size={16} className="mr-1.5" /> Save Report
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 min-h-[500px]">
          {/* ─── Left: Table + Column Picker ─────────────────────────── */}
          <div className="border-r border-slate-200 flex flex-col overflow-hidden lg:col-span-1">
            {/* Table selector */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                <Database size={12} className="mr-1" /> Data Source
              </label>
              {schemaLoading ? (
                <p className="text-xs text-slate-400">Loading tables...</p>
              ) : schemaError ? (
                <p className="text-xs text-red-400">{schemaError}</p>
              ) : (
                <>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" placeholder="Search tables..." value={tableSearch} onChange={e => setTableSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-violet-400" />
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-0.5">
                    {filteredTables.map(t => (
                      <button key={t} onClick={() => { setDataSource(t); setSelectedColumns([]); setFilters([]); setSortKey(''); setGroupByKey(''); }}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-2 ${dataSource === t ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'}`}>
                        <Layers size={14} className={dataSource === t ? 'text-violet-200' : 'text-violet-400'} />
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Column picker */}
            {dataSource && (
              <>
                <div className="p-4 border-b border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Columns ({selectedColumns.length})</label>
                    <button onClick={() => setSelectedColumns(selectedColumns.length === columnNames.length ? [] : [...columnNames])}
                      className="text-xs text-violet-600 hover:text-violet-800 font-medium">
                      {selectedColumns.length === columnNames.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" placeholder="Filter columns..." value={columnSearch} onChange={e => setColumnSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-violet-400" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-0.5">
                  {filteredColumnsForPicker.map(col => (
                    <label key={col.column_name} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-violet-50 cursor-pointer transition-colors">
                      <input type="checkbox" checked={selectedColumns.includes(col.column_name)} onChange={() => toggleColumn(col.column_name)}
                        className="rounded border-slate-300 text-violet-600" />
                      <span className="text-sm text-slate-700 truncate">{col.column_name}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">{col.data_type.slice(0, 10)}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {!dataSource && (
              <div className="flex-1 flex items-center justify-center p-6 text-slate-400 text-sm text-center">
                Select a table above to start building your report
              </div>
            )}
          </div>

          {/* ─── Right: Column Order, Sorting, Filters ────────────────── */}
          <div className="flex flex-col overflow-hidden lg:col-span-2">
            {/* Column order */}
            <div className="p-4 border-b border-slate-200">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Column Order</label>
              {selectedColumns.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-2">Select columns from the left panel</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {selectedColumns.map((k, idx) => (
                    <div key={k} className="flex items-center bg-violet-50 text-violet-800 rounded-md px-2 py-1 text-xs font-medium border border-violet-200 group">
                      <button onClick={() => moveColumn(idx, -1)} className="p-0.5 hover:bg-violet-200 rounded mr-0.5 opacity-0 group-hover:opacity-100"><ChevronUp size={10} /></button>
                      <button onClick={() => moveColumn(idx, 1)} className="p-0.5 hover:bg-violet-200 rounded mr-1 opacity-0 group-hover:opacity-100"><ChevronDown size={10} /></button>
                      {prettyCol(k)}
                      <button onClick={() => toggleColumn(k)} className="ml-1.5 p-0.5 hover:bg-red-200 hover:text-red-700 rounded opacity-0 group-hover:opacity-100"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sorting & Grouping */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center"><ArrowUpDown size={12} className="mr-1" /> Sort By</label>
                <select value={sortKey} onChange={e => setSortKey(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-400 bg-white">
                  <option value="">None</option>
                  {selectedColumns.map(k => <option key={k} value={k}>{prettyCol(k)}</option>)}
                </select>
              </div>
              {sortKey && (
                <div className="min-w-[120px]">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Direction</label>
                  <select value={sortDir} onChange={e => setSortDir(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-400 bg-white">
                    <option value="asc">Ascending (A→Z)</option>
                    <option value="desc">Descending (Z→A)</option>
                  </select>
                </div>
              )}
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Group By</label>
                <select value={groupByKey} onChange={e => setGroupByKey(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-400 bg-white">
                  <option value="">None</option>
                  {selectedColumns.map(k => <option key={k} value={k}>{prettyCol(k)}</option>)}
                </select>
              </div>
            </div>

            {/* Filters */}
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center"><Filter size={12} className="mr-1" /> Filters</label>
                <button onClick={addFilter} disabled={selectedColumns.length === 0}
                  className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center disabled:opacity-40">
                  <Plus size={12} className="mr-0.5" /> Add Filter
                </button>
              </div>
              {filters.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center text-slate-400 text-sm">
                  No filters applied – showing all records
                </div>
              ) : (
                <div className="space-y-2">
                  {filters.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                      <select value={f.field} onChange={e => updateFilter(idx, { field: e.target.value })} className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none">
                        {columnNames.map(cn => <option key={cn} value={cn}>{prettyCol(cn)}</option>)}
                      </select>
                      <select value={f.op} onChange={e => updateFilter(idx, { op: e.target.value })} className="w-32 px-2 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none">
                        {FILTER_OPS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                      </select>
                      {!['not_empty', 'is_empty'].includes(f.op) && (
                        <input type="text" value={f.value} onChange={e => updateFilter(idx, { value: e.target.value })} placeholder="Value..."
                          className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-sm outline-none" />
                      )}
                      <button onClick={() => removeFilter(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              {dataSource && (
                <div className="mt-4 p-3 bg-violet-50 rounded-lg border border-violet-200 text-sm text-violet-700">
                  <strong>{computeRows().length}</strong> records match your filters from{' '}
                  <strong>{liveData.length}</strong> total <span className="font-mono">{dataSource}</span> records
                  {dataLoading && <span className="text-violet-400 ml-2">(loading...)</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
