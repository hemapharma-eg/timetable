import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet, Plus, Pencil, Trash2, X, Search, Eye, Download,
  ChevronDown, ChevronUp, Filter, ArrowUpDown, Copy, Save, Share2, CheckCircle2,
  Database, Layers, RefreshCw, Settings, Maximize2
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

const REPORT_MODES = [
  { value: 'report_only', label: 'Report Only', desc: 'Basic grid view' },
  { value: 'search_report', label: 'Search + Report', desc: 'End-user can filter with search panel' },
  { value: 'search_report_details', label: 'Search + Report + Details', desc: 'Search panel and clickable UI side-pane' },
  { value: 'report_details', label: 'Report + Details', desc: 'Basic grid with clickable sidebar' }
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text', group: 'Basic' },
  { value: 'number', label: 'Number', group: 'Basic' },
  { value: 'date', label: 'Date', group: 'Date & Time' },
  { value: 'select', label: 'Dropdown', group: 'Selection' },
  { value: 'cascade', label: 'Cascading Dropdown', group: 'Selection' },
  { value: 'radio', label: 'Radio Buttons', group: 'Selection' },
  { value: 'checkbox', label: 'Checkbox', group: 'Selection' },
  { value: 'multicheck', label: 'Multi-Select Checkboxes', group: 'Selection' },
  { value: 'listbox', label: 'Listbox (Multi-Select)', group: 'Selection' },
  { value: 'currency', label: 'Currency', group: 'Formatted' }
];

const SEARCH_TYPES = [
  { value: 'contains', label: 'Contains' },
  { value: 'exact', label: 'Exact Match' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'dropdown', label: 'Auto-discover Dropdown' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' }
];

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
  
  // App-style Search & Details configuration
  const [reportMode, setReportMode] = useState('report_only');
  const [reportSearchFields, setReportSearchFields] = useState([]);
  const [reportDetailColumns, setReportDetailColumns] = useState([]);
  const [expandedSearchField, setExpandedSearchField] = useState(null);

  // App-style Interactive State
  const [searchFormValues, setSearchFormValues] = useState({});
  const [appliedSearchValues, setAppliedSearchValues] = useState({});
  const [searchApplied, setSearchApplied] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [distinctValues, setDistinctValues] = useState({});
  const [cascadeCache, setCascadeCache] = useState({});
  const [liveConfig, setLiveConfig] = useState(null);
  
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
    setReportMode('report_only');
    setReportSearchFields([]);
    setReportDetailColumns([]);
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
    setReportMode(c.mode || 'report_only');
    setReportSearchFields(c.searchFields || []);
    setReportDetailColumns(c.detailColumns || []);
    setEditingReportId(report.id);
    setLiveConfig(c);
    setSearchFormValues({});
    setAppliedSearchValues({});
    setSearchApplied(false);
    setSelectedRow(null);
    // Fetch distinct values for dropdown search fields
    const sFields = c.searchFields || [];
    const dropdownFields = sFields.filter(sf => sf.searchType === 'dropdown');
    if (dropdownFields.length > 0 && c.dataSource) {
      (async () => {
        const dvs = {};
        for (const sf of dropdownFields) {
          const { data } = await supabase.from(c.dataSource).select(sf.column);
          if (data) dvs[sf.column] = [...new Set(data.map(r => r[sf.column]).filter(Boolean))].sort();
        }
        setDistinctValues(dvs);
      })();
    }
    setView('builder');
  };

  const saveCurrentReport = async () => {
    if (!reportName.trim()) return alert('Please name your report.');
    if (selectedColumns.length === 0) return alert('Pick at least one column.');

    const config = { dataSource, columns: selectedColumns, filters, sortKey, sortDir, groupByKey, mode: reportMode, searchFields: reportSearchFields, detailColumns: reportDetailColumns };
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
  const computedRows = useMemo(() => {
    let data = [...liveData];

    // 1. Apply Creator-defined Hardcoded Filters
    filters.forEach(f => {
      data = data.filter(row => applyFilter(row[f.field], f.op, f.value));
    });

    // 2. Apply End-User Interactive Search Panel Filters
    if (searchApplied) {
      Object.entries(appliedSearchValues).forEach(([col, val]) => {
        if (val === undefined || val === null || val === '') return;
        const sf = (reportSearchFields || []).find(s => s.column === col);
        const sType = sf?.searchType || 'contains';
        data = data.filter(row => {
          const rvRaw = row[col];
          const rv = (rvRaw || '').toString().toLowerCase();

          // Array filtering (for listbox/multicheck)
          if (Array.isArray(val)) {
            if (val.length === 0) return true;
            return val.some(v => rv.includes(v.toString().toLowerCase()));
          }

          const fv = val.toString().toLowerCase();

          // Number / Date filtering
          if (sType === 'greater_than') return parseFloat(rvRaw) > parseFloat(val) || new Date(rvRaw) > new Date(val);
          if (sType === 'less_than') return parseFloat(rvRaw) < parseFloat(val) || new Date(rvRaw) < new Date(val);

          // Boolean checkbox
          if (typeof val === 'boolean') {
            return val ? (rvRaw === true || fv === 'true' || rv === 'true' || rv === '1' || rv === 'yes') : true;
          }

          switch (sType) {
            case 'exact': case 'dropdown': return rv === fv;
            case 'starts_with': return rv.startsWith(fv);
            default: return rv.includes(fv);
          }
        });
      });
    }
    if (sortKey) {
      data.sort((a, b) => {
        const av = (a[sortKey] || '').toString();
        const bv = (b[sortKey] || '').toString();
        const cmp = av.localeCompare(bv, undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return data;
  }, [liveData, filters, searchApplied, appliedSearchValues, reportSearchFields, sortKey, sortDir]);

  const handleExportExcel = () => {
    if (typeof XLSX === 'undefined') { alert('Excel engine is still loading.'); return; }
    const rows = computedRows;
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

  const renderShareToast = () => shareToast ? (
    <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
      <CheckCircle2 size={16} /> Link copied to clipboard!
    </div>
  ) : null;

  // ─── End-User Interactive Controls ─────────────────────────────────────
  const resetSearch = () => { setSearchFormValues({}); setAppliedSearchValues({}); setSearchApplied(false); setCurrentPage(1); };
  const applySearch = () => { setAppliedSearchValues(searchFormValues); setSearchApplied(true); setCurrentPage(1); };

  const fetchCascadeOptions = async (field, parentValue) => {
    const cacheKey = `${field.lookupTable}:${field.lookupColumn}:${field.filterColumn}:${parentValue}`;
    if (cascadeCache[cacheKey]) return cascadeCache[cacheKey];
    let q = supabase.from(field.lookupTable).select(`${field.lookupColumn}, ${field.lookupLabel || field.lookupColumn}`);
    if (field.filterColumn && parentValue) q = q.eq(field.filterColumn, parentValue);
    const { data } = await q;
    const opts = data || [];
    setCascadeCache(prev => ({ ...prev, [cacheKey]: opts }));
    return opts;
  };

  const renderSearchField = (sf) => {
    const val = searchFormValues[sf.column];
    
    // Dropdown discovery
    if (sf.searchType === 'dropdown') {
      return (
        <select value={val || ''} onChange={e => setSearchFormValues(prev => ({ ...prev, [sf.column]: e.target.value }))}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-violet-400">
          <option value="">All</option>
          {(distinctValues[sf.column] || []).map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      );
    }
    
    // Custom lookups
    if ((sf.fieldType === 'select' || sf.fieldType === 'radio' || sf.fieldType === 'listbox' || sf.fieldType === 'multicheck') && sf.lookupTable) {
      const opts = cascadeCache[`${sf.lookupTable}:${sf.lookupColumn}:undefined:undefined`] || [];
      if (opts.length === 0) fetchCascadeOptions(sf, null);
      if (sf.fieldType === 'radio') {
        return (
          <div className="flex flex-wrap gap-3 mt-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="radio" checked={!val} onChange={() => { const ny = {...searchFormValues}; delete ny[sf.column]; setSearchFormValues(ny); }} className="text-violet-600 focus:ring-violet-500" />
              <span className="text-sm text-slate-700">All</span>
            </label>
            {opts.map(o => (
              <label key={o[sf.lookupColumn]} className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" checked={val === o[sf.lookupColumn]} onChange={() => setSearchFormValues(prev => ({ ...prev, [sf.column]: o[sf.lookupColumn] }))} className="text-violet-600 focus:ring-violet-500" />
                <span className="text-sm text-slate-700">{o[sf.lookupLabel || sf.lookupColumn]}</span>
              </label>
            ))}
          </div>
        );
      }
      if (sf.fieldType === 'multicheck') {
        const arrVal = Array.isArray(val) ? val : [];
        return (
          <div className="flex flex-col gap-1 mt-1 max-h-40 overflow-y-auto">
            {opts.map(o => (
              <label key={o[sf.lookupColumn]} className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={arrVal.includes(o[sf.lookupColumn])} 
                  onChange={e => {
                    const newArr = e.target.checked ? [...arrVal, o[sf.lookupColumn]] : arrVal.filter(v => v !== o[sf.lookupColumn]);
                    setSearchFormValues(prev => ({ ...prev, [sf.column]: newArr.length ? newArr : undefined }));
                  }} className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500" />
                <span className="text-sm text-slate-700">{o[sf.lookupLabel || sf.lookupColumn]}</span>
              </label>
            ))}
          </div>
        );
      }
      return (
        <select value={val || (sf.fieldType === 'listbox' ? [] : '')} 
          onChange={e => {
            if (sf.fieldType === 'listbox') {
              const arr = Array.from(e.target.selectedOptions, opt => opt.value);
              setSearchFormValues(prev => ({ ...prev, [sf.column]: arr.length ? arr : undefined }));
            } else {
              setSearchFormValues(prev => ({ ...prev, [sf.column]: e.target.value }));
            }
          }}
          multiple={sf.fieldType === 'listbox'}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-violet-400">
          {sf.fieldType !== 'listbox' && <option value="">All</option>}
          {opts.map(o => <option key={o[sf.lookupColumn]} value={o[sf.lookupColumn]}>{o[sf.lookupLabel || sf.lookupColumn]}</option>)}
        </select>
      );
    }
    
    // Cascade
    if (sf.fieldType === 'cascade') {
      const parentVal = searchFormValues[sf.parentField];
      const opts = (parentVal && cascadeCache[`${sf.lookupTable}:${sf.lookupColumn}:${sf.filterColumn}:${parentVal}`]) || [];
      if (parentVal && opts.length === 0) fetchCascadeOptions(sf, parentVal);
      return (
        <select value={val || ''} onChange={e => setSearchFormValues(prev => ({ ...prev, [sf.column]: e.target.value }))} disabled={!parentVal}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-50 disabled:bg-slate-50">
          <option value="">{parentVal ? 'Select...' : 'Select parent first...'}</option>
          {opts.map(o => <option key={o[sf.lookupColumn]} value={o[sf.lookupColumn]}>{o[sf.lookupLabel || sf.lookupColumn]}</option>)}
        </select>
      );
    }
    
    // Custom options
    if ((sf.fieldType === 'select' || sf.fieldType === 'radio' || sf.fieldType === 'listbox' || sf.fieldType === 'multicheck') && sf.options) {
      const opts = sf.options.split(',').map(s => s.trim());
      if (sf.fieldType === 'radio') {
        return (
          <div className="flex flex-wrap gap-3 mt-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="radio" checked={!val} onChange={() => { const ny = {...searchFormValues}; delete ny[sf.column]; setSearchFormValues(ny); }} className="text-violet-600 focus:ring-violet-500" />
              <span className="text-sm text-slate-700">All</span>
            </label>
            {opts.map(o => (
              <label key={o} className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" checked={val === o} onChange={() => setSearchFormValues(prev => ({ ...prev, [sf.column]: o }))} className="text-violet-600 focus:ring-violet-500" />
                <span className="text-sm text-slate-700">{o}</span>
              </label>
            ))}
          </div>
        );
      }
      if (sf.fieldType === 'multicheck') {
        const arrVal = Array.isArray(val) ? val : [];
        return (
          <div className="flex flex-col gap-1 mt-1 max-h-40 overflow-y-auto">
            {opts.map(o => (
              <label key={o} className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={arrVal.includes(o)} 
                  onChange={e => {
                    const newArr = e.target.checked ? [...arrVal, o] : arrVal.filter(v => v !== o);
                    setSearchFormValues(prev => ({ ...prev, [sf.column]: newArr.length ? newArr : undefined }));
                  }} className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500" />
                <span className="text-sm text-slate-700">{o}</span>
              </label>
            ))}
          </div>
        );
      }
      return (
        <select value={val || (sf.fieldType === 'listbox' ? [] : '')} 
          onChange={e => {
            if (sf.fieldType === 'listbox') {
              const arr = Array.from(e.target.selectedOptions, opt => opt.value);
              setSearchFormValues(prev => ({ ...prev, [sf.column]: arr.length ? arr : undefined }));
            } else {
              setSearchFormValues(prev => ({ ...prev, [sf.column]: e.target.value }));
            }
          }}
          multiple={sf.fieldType === 'listbox'}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-violet-400">
          {sf.fieldType !== 'listbox' && <option value="">All</option>}
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    
    // Default Inputs
    const inputType = sf.fieldType === 'date' ? 'date' : sf.fieldType === 'number' || sf.fieldType === 'currency' ? 'number' : 'text';
    return (
      <input type={inputType} value={val || ''} onChange={e => setSearchFormValues(prev => ({ ...prev, [sf.column]: e.target.value }))}
        placeholder={`${sf.searchType === 'exact' ? 'Exact match' : 'Contains'}...`}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-400" />
    );
  };

  const renderSearchSection = () => {
    if (!reportMode.includes('search') || reportSearchFields.length === 0) return null;
    return (
      <div className="mx-5 my-4 p-5 bg-gradient-to-r from-slate-50 to-violet-50 border border-slate-200 rounded-xl">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center"><Search size={14} className="mr-1.5 text-violet-500" /> Report Search</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {reportSearchFields.map(sf => (
            <div key={sf.column}>
              <label className="block text-xs font-medium text-slate-500 mb-1">{prettyCol(sf.column)}</label>
              {renderSearchField(sf)}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={applySearch} className="px-4 py-2 text-white bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium flex items-center"><Search size={14} className="mr-1" /> Search Report</button>
          <button onClick={resetSearch} className="px-4 py-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-sm font-medium">Reset</button>
        </div>
      </div>
    );
  };

  const renderDetailSection = (row) => {
    if (!row) return null;
    const detailCols = reportDetailColumns.length > 0 ? reportDetailColumns : selectedColumns;
    return (
      <div className="bg-white border-l border-slate-200 overflow-y-auto">
        <div className="p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex justify-between items-center sticky top-0 z-10">
          <h3 className="font-bold text-sm">Row Details</h3>
          <button onClick={() => setSelectedRow(null)} className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs"><X size={12} /></button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {detailCols.map(col => (
            <div key={col} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{prettyCol(col)}</p>
              <p className="text-sm text-slate-800 font-medium break-words">{row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300 italic">empty</span>}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Saved Reports List
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[85vh]">
        {renderShareToast()}
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
    const rows = computedRows;
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
                <tr key={row.id || idx} onClick={() => { if (reportMode.includes('details')) setSelectedRow(row); }} className={`hover:bg-slate-50 transition-colors ${reportMode.includes('details') ? 'cursor-pointer' : ''} ${selectedRow?.id === row.id ? 'bg-violet-50' : ''}`}>
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
        {renderShareToast()}
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

        {renderSearchSection()}

        <div className={`flex-1 overflow-hidden flex ${reportMode.includes('details') && selectedRow ? 'flex-row' : 'flex-col'}`}>
          <div className={`overflow-auto bg-slate-50 p-4 ${reportMode.includes('details') && selectedRow ? 'w-1/2' : 'flex-1'}`}>
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
          {reportMode.includes('details') && selectedRow && (
            <div className="w-1/2 min-w-[320px] overflow-y-auto">
              {renderDetailSection(selectedRow)}
            </div>
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
            {/* Filter Output Status */}
            <div className="px-4 pb-4">
              {dataSource && (
                <div className="p-3 bg-violet-50 rounded-lg border border-violet-200 text-sm text-violet-700">
                  <strong>{computedRows.length}</strong> records match your filters from{' '}
                  <strong>{liveData.length}</strong> total <span className="font-mono">{dataSource}</span> records
                  {dataLoading && <span className="text-violet-400 ml-2">(loading...)</span>}
                </div>
              )}
            </div>

            {/* General Mode Selection */}
            <div className="p-4 border-t border-slate-200">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Interactive Features</label>
              <select value={reportMode} onChange={e => setReportMode(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-violet-400">
                {REPORT_MODES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">{REPORT_MODES.find(m => m.value === reportMode)?.desc}</p>
            </div>

            {/* End User Search Fields */}
            {reportMode.includes('search') && (
              <div className="p-4 border-t border-slate-200 bg-blue-50/50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center"><Search size={12} className="mr-1" /> End-User Search Fields</h3>
                  <button onClick={() => setReportSearchFields(prev => [...prev, { column: columnNames[0] || '', searchType: 'contains', fieldType: 'text' }])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"><Plus size={12} className="mr-0.5" /> Add</button>
                </div>
                {reportSearchFields.length === 0 ? (
                  <p className="text-xs text-blue-400 italic">No search fields configured. The user will only see the report.</p>
                ) : (
                  <div className="space-y-2">
                    {reportSearchFields.map((sf, idx) => (
                      <div key={idx} className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                        <div className="flex items-center gap-2 p-2">
                          <select value={sf.column} onChange={e => { const arr = [...reportSearchFields]; arr[idx] = { ...sf, column: e.target.value }; setReportSearchFields(arr); }}
                            className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none">
                            {columnNames.map(cn => <option key={cn} value={cn}>{cn}</option>)}
                          </select>
                          <select value={sf.searchType} onChange={e => { const arr = [...reportSearchFields]; arr[idx] = { ...sf, searchType: e.target.value }; setReportSearchFields(arr); }}
                            className="w-32 px-2 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none">
                            {SEARCH_TYPES.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
                          </select>
                          <button onClick={() => setExpandedSearchField(expandedSearchField === idx ? null : idx)} 
                            className={`p-1.5 rounded ${expandedSearchField === idx ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
                            <Settings size={14} />
                          </button>
                          <button onClick={() => setReportSearchFields(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><X size={14} /></button>
                        </div>
                        
                        {/* Expanded Settings area for Caspio-style options */}
                        {expandedSearchField === idx && (
                          <div className="p-3 border-t border-slate-100 bg-slate-50 space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Input Field Type</label>
                              <select value={sf.fieldType || 'text'} onChange={e => { const arr = [...reportSearchFields]; arr[idx] = { ...sf, fieldType: e.target.value }; setReportSearchFields(arr); }}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none">
                                {Array.from(new Set(FIELD_TYPES.map(f => f.group))).map(group => (
                                  <optgroup key={group} label={group}>
                                    {FIELD_TYPES.filter(f => f.group === group).map(f => (
                                      <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>
                            
                            {(sf.fieldType === 'select' || sf.fieldType === 'cascade' || sf.fieldType === 'radio' || sf.fieldType === 'listbox') && sf.searchType !== 'dropdown' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lookup Table</label>
                                  <select value={sf.lookupTable || ''} onChange={e => { const arr = [...reportSearchFields]; arr[idx] = { ...sf, lookupTable: e.target.value }; setReportSearchFields(arr); }}
                                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none">
                                    <option value="">-- Custom Values --</option>
                                    {tables.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </div>
                                {sf.lookupTable && (
                                  <>
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">Value Column</label>
                                      <input type="text" value={sf.lookupColumn || ''} onChange={e => { const arr = [...reportSearchFields]; arr[idx] = { ...sf, lookupColumn: e.target.value }; setReportSearchFields(arr); }}
                                        placeholder="e.id" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none" />
                                    </div>
                                    <div className="col-span-2">
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">Display Column (Optional)</label>
                                      <input type="text" value={sf.lookupLabel || ''} onChange={e => { const arr = [...reportSearchFields]; arr[idx] = { ...sf, lookupLabel: e.target.value }; setReportSearchFields(arr); }}
                                        placeholder="e.name" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none" />
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            
                            {sf.fieldType === 'cascade' && sf.lookupTable && (
                              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                                <div className="col-span-2"><p className="text-xs text-blue-600 font-medium mb-1">Cascading Logic</p></div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Parent Field</label>
                                  <select value={sf.parentField || ''} onChange={e => { const arr = [...reportSearchFields]; arr[idx] = { ...sf, parentField: e.target.value }; setReportSearchFields(arr); }}
                                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none">
                                    <option value="">-- Select Parent --</option>
                                    {reportSearchFields.filter((_, i) => i !== idx).map(f => (
                                      <option key={f.column} value={f.column}>{f.column}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Matches Lookup Column</label>
                                  <input type="text" value={sf.filterColumn || ''} onChange={e => { const arr = [...reportSearchFields]; arr[idx] = { ...sf, filterColumn: e.target.value }; setReportSearchFields(arr); }}
                                    placeholder="e.g. department_id" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none" />
                                </div>
                              </div>
                            )}
                            
                            {(!sf.lookupTable) && (sf.fieldType === 'select' || sf.fieldType === 'radio' || sf.fieldType === 'listbox') && sf.searchType !== 'dropdown' && (
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Custom Options (comma separated)</label>
                                <input type="text" value={sf.options || ''} onChange={e => { const arr = [...reportSearchFields]; arr[idx] = { ...sf, options: e.target.value }; setReportSearchFields(arr); }}
                                  placeholder="Option 1, Option 2, Option 3" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* End User Detail Columns */}
            {reportMode.includes('details') && (
              <div className="p-4 border-t border-slate-200 bg-emerald-50/50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center"><Maximize2 size={12} className="mr-1" /> End-User Detail Pane Columns</h3>
                  <button onClick={() => setReportDetailColumns(reportDetailColumns.length === columnNames.length ? [] : [...columnNames])}
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center">
                    {reportDetailColumns.length === columnNames.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                 <div className="flex flex-wrap gap-2">
                  {columnNames.map(col => (
                    <label key={col} className="flex items-center gap-1.5 py-1 px-2 rounded-md bg-white border border-slate-200 hover:border-emerald-300 cursor-pointer text-xs group">
                      <input type="checkbox" checked={reportDetailColumns.includes(col)} onChange={() => setReportDetailColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])}
                        className="rounded-sm border-slate-300 text-emerald-600" />
                      <span className="text-slate-700">{prettyCol(col)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
