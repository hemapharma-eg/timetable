import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, X, Search, Eye, Save, Copy,
  ChevronDown, ChevronRight, ChevronLeft, Layers, Settings, Download,
  LayoutGrid, RefreshCw, AlertCircle, Database, Share2, CheckCircle2,
  Filter, ArrowLeft, Maximize2
} from 'lucide-react';
import { supabase } from './supabase';

const PAGE_MODES = [
  { value: 'search_results_details', label: 'Search + Results + Details', desc: 'Full app with search form, results grid, and detail view' },
  { value: 'search_results', label: 'Search + Results', desc: 'Search form with results grid, no detail expand' },
  { value: 'results_details', label: 'Results + Details', desc: 'Results grid with click-to-expand detail view' },
  { value: 'results_only', label: 'Results Only', desc: 'Filtered results grid (can be filtered via URL parameters)' },
  { value: 'details_only', label: 'Details Only', desc: 'Single record view (requires URL parameter for record ID)' }
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text', group: 'Basic' },
  { value: 'number', label: 'Number', group: 'Basic' },
  { value: 'email', label: 'Email', group: 'Basic' },
  { value: 'tel', label: 'Phone', group: 'Basic' },
  { value: 'url', label: 'URL', group: 'Basic' },
  { value: 'password', label: 'Password', group: 'Basic' },
  { value: 'textarea', label: 'Text Area', group: 'Basic' },
  { value: 'date', label: 'Date', group: 'Date & Time' },
  { value: 'datetime-local', label: 'Date & Time', group: 'Date & Time' },
  { value: 'time', label: 'Time', group: 'Date & Time' },
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

const DebouncedInput = ({ value, onChange, delay = 5000, ...props }) => {
  const [localVal, setLocalVal] = useState(value || '');
  const timeoutRef = useRef(null);

  useEffect(() => {
    setLocalVal(value || '');
  }, [value]);

  const handleChange = (e) => {
    const v = e.target.value;
    setLocalVal(v);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChange(v);
    }, delay);
  };

  return <input value={localVal} onChange={handleChange} {...props} />;
};

export const AppBuilder = ({ deepLinkId, urlFilters }) => {
  // Schema
  const [schema, setSchema] = useState([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState(null);

  // Saved apps
  const [savedApps, setSavedApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);

  // Builder state
  const [view, setView] = useState('list');
  const [editingAppId, setEditingAppId] = useState(null);
  const [appName, setAppName] = useState('');
  const [appDesc, setAppDesc] = useState('');
  const [appTable, setAppTable] = useState('');
  const [appColumns, setAppColumns] = useState([]);
  const [appSearchCol, setAppSearchCol] = useState('');
  const [appEnableCreate, setAppEnableCreate] = useState(true);
  const [appEnableEdit, setAppEnableEdit] = useState(true);
  const [appEnableDelete, setAppEnableDelete] = useState(true);
  const [appMode, setAppMode] = useState('search_results_details');
  const [appSearchFields, setAppSearchFields] = useState([]); // [{column, searchType}]
  const [appDetailColumns, setAppDetailColumns] = useState([]);

  // App View state
  const [liveData, setLiveData] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveSearch, setLiveSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef(null);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [liveConfig, setLiveConfig] = useState(null);
  const [liveError, setLiveError] = useState(null);
  const [expandedSearchField, setExpandedSearchField] = useState(null);

  // Search form values
  const [searchFormValues, setSearchFormValues] = useState({});
  const [appliedSearchValues, setAppliedSearchValues] = useState({});
  const [searchApplied, setSearchApplied] = useState(false);
  const [distinctValues, setDistinctValues] = useState({});
  const [cascadeCache, setCascadeCache] = useState({});

  // Detail view
  const [selectedRow, setSelectedRow] = useState(null);

  // Toast
  const [shareToast, setShareToast] = useState(false);

  // Debounce search input (Debouncing is now handled perfectly by DebouncedInput UI)
  const handleSearchChange = (val) => {
    setLiveSearch(val);
    setDebouncedSearch(val);
  };

  // ─── Fetch ────────────────────────────────────────────────────────────
  useEffect(() => { fetchSchema(); fetchApps(); }, []);

  useEffect(() => {
    if (deepLinkId && savedApps.length > 0) {
      const found = savedApps.find(a => a.id === deepLinkId);
      if (found) openAppView(found);
    }
  }, [deepLinkId, savedApps]);

  const fetchSchema = async () => {
    setSchemaLoading(true); setSchemaError(null);
    try {
      const { data, error } = await supabase.rpc('get_schema_info');
      if (error) throw error; setSchema(data || []);
    } catch (err) { setSchemaError(err.message); }
    setSchemaLoading(false);
  };

  const fetchApps = async () => {
    setAppsLoading(true);
    const { data } = await supabase.from('app_configs').select('*').order('updated_at', { ascending: false });
    setSavedApps(data || []); setAppsLoading(false);
  };

  const copyShareLink = (id, extraParams = '') => {
    const url = `${window.location.origin}${window.location.pathname}?view=app&id=${id}${extraParams}`;
    navigator.clipboard.writeText(url);
    setShareToast(true); setTimeout(() => setShareToast(false), 2000);
  };

  const ShareToast = () => shareToast ? (
    <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"><CheckCircle2 size={16} /> Link copied!</div>
  ) : null;

  // ─── Schema helpers ────────────────────────────────────────────────────
  const HIDDEN_TABLES = ['form_configs', 'app_configs', 'report_configs'];
  const tables = [...new Set(schema.map(c => c.table_name))].filter(t => !HIDDEN_TABLES.includes(t)).sort();
  const getTableColumns = (tableName) => schema.filter(c => c.table_name === tableName).sort((a, b) => a.ordinal_position - b.ordinal_position);
  const prettyCol = (col) => col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // ─── Builder actions ───────────────────────────────────────────────────
  const newApp = () => { setAppName(''); setAppDesc(''); setAppTable(''); setAppColumns([]); setAppSearchCol(''); setAppEnableCreate(true); setAppEnableEdit(true); setAppEnableDelete(true); setAppMode('search_results_details'); setAppSearchFields([]); setAppDetailColumns([]); setEditingAppId(null); setView('builder'); };

  const loadApp = (app) => {
    const c = app.config || {};
    setAppName(app.name); setAppDesc(app.description || '');
    setAppTable(c.table || ''); setAppColumns(c.columns || []);
    setAppSearchCol(c.searchCol || '');
    setAppEnableCreate(c.enableCreate !== false); setAppEnableEdit(c.enableEdit !== false); setAppEnableDelete(c.enableDelete !== false);
    setAppMode(c.mode || 'search_results_details');
    setAppSearchFields(c.searchFields || []);
    setAppDetailColumns(c.detailColumns || []);
    setEditingAppId(app.id); setView('builder');
  };

  const saveApp = async () => {
    if (!appName.trim()) return alert('Name your app.');
    if (!appTable) return alert('Select a table.');
    if (appColumns.length === 0) return alert('Select columns.');
    const config = {
      table: appTable, columns: appColumns, searchCol: appSearchCol,
      enableCreate: appEnableCreate, enableEdit: appEnableEdit, enableDelete: appEnableDelete,
      mode: appMode, searchFields: appSearchFields, detailColumns: appDetailColumns
    };
    if (editingAppId) {
      await supabase.from('app_configs').update({ name: appName, description: appDesc, config, updated_at: new Date().toISOString() }).eq('id', editingAppId);
    } else {
      const { data } = await supabase.from('app_configs').insert({ name: appName, description: appDesc, config }).select().single();
      if (data) setEditingAppId(data.id);
    }
    fetchApps();
  };

  const duplicateApp = async (app) => { await supabase.from('app_configs').insert({ name: app.name + ' (Copy)', description: app.description, config: app.config }); fetchApps(); };
  const deleteApp = async (id) => { if (!confirm('Delete?')) return; await supabase.from('app_configs').delete().eq('id', id); setSavedApps(prev => prev.filter(a => a.id !== id)); if (editingAppId === id) setView('list'); };

  // ─── App View ──────────────────────────────────────────────────────────
  const openAppView = async (app) => {
    const c = app.config || {};
    setLiveConfig(app); setLiveSearch(''); setEditRow(null); setIsCreating(false); setLiveError(null);
    setSelectedRow(null); setSearchFormValues({}); setSearchApplied(false);
    setView('appview');
    await fetchLiveData(c.table);
    // Fetch distinct values for dropdown search fields
    const sFields = c.searchFields || [];
    const dropdownFields = sFields.filter(sf => sf.searchType === 'dropdown');
    if (dropdownFields.length > 0) {
      const dvs = {};
      for (const sf of dropdownFields) {
        const { data } = await supabase.from(c.table).select(sf.column);
        if (data) dvs[sf.column] = [...new Set(data.map(r => r[sf.column]).filter(Boolean))].sort();
      }
      setDistinctValues(dvs);
    }
    // Apply URL filters
    if (urlFilters && Object.keys(urlFilters).length > 0) {
      setSearchFormValues(urlFilters);
      setSearchApplied(true);
    }
  };

  const fetchLiveData = async (table) => {
    if (!table) return;
    setLiveLoading(true);
    const { data, error } = await supabase.from(table).select('*');
    if (error) { setLiveError(error.message); setLiveData([]); }
    else setLiveData(data || []);
    setLiveLoading(false);
  };

  const handleCreateRow = async () => { const c = liveConfig?.config || {}; setLiveError(null); const { error } = await supabase.from(c.table).insert(editForm); if (error) { setLiveError(error.message); return; } setIsCreating(false); setEditForm({}); await fetchLiveData(c.table); };
  const handleUpdateRow = async () => { const c = liveConfig?.config || {}; setLiveError(null); const { error } = await supabase.from(c.table).update(editForm).eq('id', editRow); if (error) { setLiveError(error.message); return; } setEditRow(null); setEditForm({}); await fetchLiveData(c.table); };
  const handleDeleteRow = async (id) => { if (!confirm('Delete?')) return; const c = liveConfig?.config || {}; const { error } = await supabase.from(c.table).delete().eq('id', id); if (error) { setLiveError(error.message); return; } await fetchLiveData(c.table); if (selectedRow?.id === id) setSelectedRow(null); };

  const handleExport = () => {
    if (typeof XLSX === 'undefined') return alert('Excel engine loading...');
    const c = liveConfig?.config || {};
    const exportData = filteredData.map(r => { const obj = {}; (c.columns || []).forEach(col => { obj[prettyCol(col)] = r[col] ?? ''; }); return obj; });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, c.table || 'Data');
    XLSX.writeFile(wb, `${(c.table || 'export')}.xlsx`);
  };

  const toggleAppColumn = (col) => setAppColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  // ─── Filtering ─────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    const c = liveConfig?.config || {};
    let data = [...liveData];
    const mode = c.mode || 'search_results_details';
    const hasSearch = mode.includes('search');

    // Apply search form filters
    if (searchApplied || urlFilters) {
      const activeFilters = { ...appliedSearchValues, ...(urlFilters || {}) };
      Object.entries(activeFilters).forEach(([col, val]) => {
        if (!val) return;
        const sf = (c.searchFields || []).find(s => s.column === col);
        const sType = sf?.searchType || 'contains';
        data = data.filter(row => {
          const rvRaw = row[col];
          const rv = (rvRaw || '').toString().toLowerCase();

          // Array filtering (for listbox/multicheck)
          if (Array.isArray(val)) {
            if (val.length === 0) return true;
            // For listbox/multicheck, if the DB value is a string of comma separated items, 
            // we check if ANY of the selected val array items are included in rv
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

    // Quick-search on top
    if (debouncedSearch) {
      const searchCol = c.searchCol;
      data = data.filter(row => {
        if (searchCol) return (row[searchCol] || '').toString().toLowerCase().includes(debouncedSearch.toLowerCase());
        return Object.values(row).some(v => (v || '').toString().toLowerCase().includes(debouncedSearch.toLowerCase()));
      });
    }
    return data;
  }, [liveConfig, liveData, searchApplied, appliedSearchValues, urlFilters, debouncedSearch]);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: App View (Live)
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'appview') {
    const c = liveConfig?.config || {};
    const cols = c.columns || [];
    const mode = c.mode || 'search_results_details';
    const hasSearch = mode.includes('search');
    const hasResults = mode.includes('results');
    const hasDetails = mode.includes('details');
    const searchFields = c.searchFields || [];
    const detailCols = c.detailColumns?.length ? c.detailColumns : cols;
    const tableCols = getTableColumns(c.table);
    // Replace local let/const with the global filteredData we defined above

    // For details_only mode with URL param
    const detailsOnlyRow = mode === 'details_only' && urlFilters?.record
      ? liveData.find(r => r.id?.toString() === urlFilters.record) : null;

    const startEdit = (row) => { setEditRow(row.id); const fd = {}; cols.forEach(col => { fd[col] = row[col] || ''; }); setEditForm(fd); setIsCreating(false); };
    const startCreate = () => { setIsCreating(true); setEditRow(null); const fd = {}; cols.forEach(col => { fd[col] = ''; }); setEditForm(fd); };

    const resetSearch = () => { setSearchFormValues({}); setAppliedSearchValues({}); setSearchApplied(false); };
    const applySearch = () => { setAppliedSearchValues(searchFormValues); setSearchApplied(true); };

    // ── Cascade fetching ──
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
      
      // Handle Auto-discover Dropdown (Original simple logic)
      if (sf.searchType === 'dropdown') {
        return (
          <select value={val || ''} onChange={e => setSearchFormValues(prev => ({ ...prev, [sf.column]: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-violet-400">
            <option value="">All</option>
            {(distinctValues[sf.column] || []).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        );
      }

      // Handle custom Lookup Tables for Dropdowns
      if ((sf.fieldType === 'select' || sf.fieldType === 'radio' || sf.fieldType === 'listbox' || sf.fieldType === 'multicheck') && sf.lookupTable) {
        // We use cascade logic without a parent for standard lookups
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

      // Handle Cascading Dropdowns
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

      // Handle Custom Options Lists (comma separated)
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

      // Handle Boolean Checkbox
      if (sf.fieldType === 'checkbox') {
        return (
          <label className="flex items-center space-x-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={!!val} onChange={e => setSearchFormValues(prev => ({ ...prev, [sf.column]: e.target.checked }))} className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500" />
            <span className="text-sm text-slate-700">Checked only</span>
          </label>
        );
      }

      // Handle Default Dates / Numbers / Text
      const inputType = sf.fieldType === 'date' ? 'date' : sf.fieldType === 'number' || sf.fieldType === 'currency' ? 'number' : 'text';
      return (
        <DebouncedInput type={inputType} value={val || ''} onChange={v => setSearchFormValues(prev => ({ ...prev, [sf.column]: v }))}
          placeholder={`${sf.searchType === 'exact' ? 'Exact match' : sf.searchType === 'starts_with' ? 'Starts with' : sf.searchType === 'greater_than' ? '> greater than' : sf.searchType === 'less_than' ? '< less than' : 'Contains'}...`}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-400" />
      );
    };

    // ── Search Section ──
    const SearchSection = () => {
      if (!hasSearch || searchFields.length === 0) return null;
      return (
        <div className="mx-5 mt-4 p-5 bg-gradient-to-r from-slate-50 to-violet-50 border border-slate-200 rounded-xl">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center"><Search size={14} className="mr-1.5 text-violet-500" /> Search</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {searchFields.map(sf => (
              <div key={sf.column}>
                <label className="block text-xs font-medium text-slate-500 mb-1">{prettyCol(sf.column)}</label>
                {renderSearchField(sf)}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={applySearch} className="px-4 py-2 text-white bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium flex items-center"><Search size={14} className="mr-1" /> Search</button>
            <button onClick={resetSearch} className="px-4 py-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-sm font-medium">Reset</button>
          </div>
        </div>
      );
    };

    // ── Detail Section ──
    const DetailSection = ({ row }) => {
      if (!row) return null;
      return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex justify-between items-center">
            <h3 className="font-bold text-sm">Record Details</h3>
            <div className="flex gap-1">
              {c.enableEdit && <button onClick={() => startEdit(row)} className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs"><Pencil size={12} className="inline mr-1" />Edit</button>}
              {mode !== 'details_only' && <button onClick={() => setSelectedRow(null)} className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs"><X size={12} /></button>}
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
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

    // ── Details Only Mode ──
    if (mode === 'details_only') {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[85vh]">
          <ShareToast />
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-800">{liveConfig?.name}</h2>
              <p className="text-sm text-slate-500">Details view · <span className="font-mono text-violet-600">{c.table}</span></p>
            </div>
            <button onClick={() => setView('list')} className="px-3 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium">← Back</button>
          </div>
          <div className="flex-1 overflow-auto p-5">
            {liveLoading ? <p className="text-center text-slate-400 py-8">Loading...</p>
            : detailsOnlyRow ? <DetailSection row={detailsOnlyRow} />
            : (
              <div className="text-center py-12 text-slate-400">
                <p className="text-lg font-medium mb-2">No record specified</p>
                <p className="text-sm">Share this app with <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">?record=ID</code> parameter</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── Main App View ──
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[85vh]">
        <ShareToast />
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{liveConfig?.name || 'App'}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              <span className="font-mono text-violet-600">{c.table}</span> · {filteredData.length} records
              <span className="text-xs ml-2 px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full">{PAGE_MODES.find(m => m.value === mode)?.label}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!hasSearch && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <DebouncedInput type="text" placeholder="Quick search..." value={liveSearch} onChange={v => handleSearchChange(v)}
                  className="pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-400 w-48" />
              </div>
            )}
            <button onClick={() => fetchLiveData(c.table)} className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg"><RefreshCw size={16} /></button>
            <button onClick={handleExport} className="px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-sm font-medium flex items-center"><Download size={14} className="mr-1" /> Export</button>
            {c.enableCreate && <button onClick={startCreate} className="px-3 py-2 text-white bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium flex items-center"><Plus size={14} className="mr-1" /> New</button>}
            <button onClick={() => setView('list')} className="px-3 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium">← Back</button>
          </div>
        </div>

        {liveError && (
          <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2"><AlertCircle size={14} /> {liveError}</div>
        )}

        {/* Search section */}
        <SearchSection />

        {/* Create/Edit Modal */}
        {(isCreating || editRow) && (
          <div className="mx-5 mt-3 p-5 bg-violet-50 border border-violet-200 rounded-xl">
            <h3 className="text-sm font-bold text-violet-800 mb-3">{isCreating ? 'Create New Record' : 'Edit Record'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {cols.filter(col => !['id', 'created_at', 'updated_at'].includes(col)).map(col => (
                <div key={col}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{prettyCol(col)}</label>
                  <input type="text" value={editForm[col] || ''} onChange={e => setEditForm(prev => ({ ...prev, [col]: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-violet-400" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setIsCreating(false); setEditRow(null); setEditForm({}); }} className="px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={isCreating ? handleCreateRow : handleUpdateRow} className="px-4 py-1.5 text-sm text-white bg-violet-600 hover:bg-violet-700 rounded-lg font-medium">{isCreating ? 'Create' : 'Save'}</button>
            </div>
          </div>
        )}

        {/* splitview: results + detail or just results */}
        <div className={`flex-1 overflow-auto ${hasDetails && selectedRow ? 'flex gap-0' : 'p-5'}`}>
          {/* Results grid */}
          {hasResults && (
            <div className={`${hasDetails && selectedRow ? 'w-1/2 overflow-auto border-r border-slate-200 p-5' : 'w-full'}`}>
              {liveLoading ? <p className="text-center text-slate-400 py-8">Loading...</p> : (
                <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
                  <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-medium">
                        <th className="p-2 pl-4 w-12">#</th>
                        {cols.map(col => <th key={col} className="p-2">{prettyCol(col)}</th>)}
                        {(c.enableEdit || c.enableDelete || hasDetails) && <th className="p-2 text-right pr-4">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredData.map((row, idx) => (
                        <tr key={row.id || idx}
                          className={`transition-colors cursor-pointer ${selectedRow?.id === row.id ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
                          onClick={() => hasDetails && setSelectedRow(row)}>
                          <td className="p-2 pl-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                          {cols.map(col => <td key={col} className="p-2 text-slate-700 max-w-xs truncate">{row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}</td>)}
                          {(c.enableEdit || c.enableDelete || hasDetails) && (
                            <td className="p-2 text-right pr-4">
                              <div className="flex items-center justify-end gap-1">
                                {hasDetails && <button onClick={e => { e.stopPropagation(); setSelectedRow(row); }} className="p-1 text-violet-600 hover:bg-violet-50 rounded"><Maximize2 size={14} /></button>}
                                {c.enableEdit && <button onClick={e => { e.stopPropagation(); startEdit(row); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14} /></button>}
                                {c.enableDelete && <button onClick={e => { e.stopPropagation(); handleDeleteRow(row.id); }} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                      {filteredData.length === 0 && <tr><td colSpan={cols.length + 2} className="p-8 text-center text-slate-400">No records found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Detail panel */}
          {hasDetails && selectedRow && hasResults && (
            <div className="w-1/2 overflow-auto p-5">
              <DetailSection row={selectedRow} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: App Builder / Designer
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'builder') {
    const currentTableCols = appTable ? getTableColumns(appTable) : [];

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600">←</button>
            <div className="flex-1">
              <input type="text" value={appName} onChange={e => setAppName(e.target.value)} placeholder="App Name..." className="text-xl font-bold text-slate-800 outline-none border-b-2 border-transparent focus:border-violet-400 bg-transparent w-full" />
              <input type="text" value={appDesc} onChange={e => setAppDesc(e.target.value)} placeholder="Description (optional)" className="text-sm text-slate-400 outline-none bg-transparent w-full mt-0.5" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { saveApp().then(() => openAppView({ name: appName, description: appDesc, config: { table: appTable, columns: appColumns, searchCol: appSearchCol, enableCreate: appEnableCreate, enableEdit: appEnableEdit, enableDelete: appEnableDelete, mode: appMode, searchFields: appSearchFields, detailColumns: appDetailColumns } })); }}
              disabled={!appTable || appColumns.length === 0} className="px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-sm font-medium disabled:opacity-40 flex items-center"><Eye size={16} className="mr-1" /> Launch</button>
            <button onClick={saveApp} className="px-4 py-2 text-white bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium shadow-sm flex items-center"><Save size={16} className="mr-1" /> Save</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Page Mode */}
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-5 border border-violet-200">
              <h3 className="text-sm font-bold text-violet-800 mb-3 flex items-center"><LayoutGrid size={16} className="mr-1.5" /> Page Mode</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {PAGE_MODES.map(m => (
                  <button key={m.value} onClick={() => setAppMode(m.value)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${appMode === m.value ? 'border-violet-500 bg-white shadow-sm' : 'border-transparent bg-white/60 hover:bg-white hover:border-violet-200'}`}>
                    <p className={`text-sm font-semibold ${appMode === m.value ? 'text-violet-700' : 'text-slate-700'}`}>{m.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center"><Database size={16} className="mr-1.5 text-violet-500" /> Data Source</h3>
              <select value={appTable} onChange={e => { setAppTable(e.target.value); setAppColumns([]); setAppSearchCol(''); setAppSearchFields([]); setAppDetailColumns([]); }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">Select a Supabase table...</option>
                {tables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Columns */}
            {appTable && (
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center"><Layers size={16} className="mr-1.5 text-violet-500" /> Result Columns ({appColumns.length})</h3>
                  <button onClick={() => setAppColumns(appColumns.length === currentTableCols.length ? [] : currentTableCols.map(c => c.column_name))} className="text-xs text-violet-600 hover:text-violet-800 font-medium">
                    {appColumns.length === currentTableCols.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {currentTableCols.map(col => (
                    <label key={col.column_name} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white cursor-pointer">
                      <input type="checkbox" checked={appColumns.includes(col.column_name)} onChange={() => toggleAppColumn(col.column_name)} className="rounded border-slate-300 text-violet-600" />
                      <span className="text-sm text-slate-700 truncate">{col.column_name}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">{col.data_type.slice(0, 8)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Search Fields — only if mode includes search */}
            {appTable && appMode.includes('search') && (
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-blue-700 flex items-center"><Search size={16} className="mr-1.5" /> Search Fields</h3>
                  <button onClick={() => setAppSearchFields(prev => [...prev, { column: currentTableCols[0]?.column_name || '', searchType: 'contains', fieldType: 'text' }])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"><Plus size={12} className="mr-0.5" /> Add</button>
                </div>
                {appSearchFields.length === 0 ? (
                  <p className="text-xs text-blue-400 italic">No search fields configured. Add columns to create the search form.</p>
                ) : (
                  <div className="space-y-2">
                    {appSearchFields.map((sf, idx) => (
                      <div key={idx} className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                        <div className="flex items-center gap-2 p-2">
                          <select value={sf.column} onChange={e => { const arr = [...appSearchFields]; arr[idx] = { ...sf, column: e.target.value }; setAppSearchFields(arr); }}
                            className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none">
                            {currentTableCols.map(c => <option key={c.column_name} value={c.column_name}>{c.column_name}</option>)}
                          </select>
                          <select value={sf.searchType} onChange={e => { const arr = [...appSearchFields]; arr[idx] = { ...sf, searchType: e.target.value }; setAppSearchFields(arr); }}
                            className="w-32 px-2 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none">
                            {SEARCH_TYPES.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
                          </select>
                          <button onClick={() => setExpandedSearchField(expandedSearchField === idx ? null : idx)} 
                            className={`p-1.5 rounded ${expandedSearchField === idx ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
                            <Settings size={14} />
                          </button>
                          <button onClick={() => setAppSearchFields(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><X size={14} /></button>
                        </div>
                        
                        {/* Expanded Settings area for Caspio-style options */}
                        {expandedSearchField === idx && (
                          <div className="p-3 border-t border-slate-100 bg-slate-50 space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Input Field Type</label>
                              <select value={sf.fieldType || 'text'} onChange={e => { const arr = [...appSearchFields]; arr[idx] = { ...sf, fieldType: e.target.value }; setAppSearchFields(arr); }}
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
                                  <select value={sf.lookupTable || ''} onChange={e => { const arr = [...appSearchFields]; arr[idx] = { ...sf, lookupTable: e.target.value }; setAppSearchFields(arr); }}
                                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none">
                                    <option value="">-- Custom Values --</option>
                                    {tables.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </div>
                                {sf.lookupTable && (
                                  <>
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">Value Column</label>
                                      <input type="text" value={sf.lookupColumn || ''} onChange={e => { const arr = [...appSearchFields]; arr[idx] = { ...sf, lookupColumn: e.target.value }; setAppSearchFields(arr); }}
                                        placeholder="e.id" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none" />
                                    </div>
                                    <div className="col-span-2">
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">Display Column (Optional)</label>
                                      <input type="text" value={sf.lookupLabel || ''} onChange={e => { const arr = [...appSearchFields]; arr[idx] = { ...sf, lookupLabel: e.target.value }; setAppSearchFields(arr); }}
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
                                  <select value={sf.parentField || ''} onChange={e => { const arr = [...appSearchFields]; arr[idx] = { ...sf, parentField: e.target.value }; setAppSearchFields(arr); }}
                                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none">
                                    <option value="">-- Select Parent --</option>
                                    {appSearchFields.filter((_, i) => i !== idx).map(f => (
                                      <option key={f.column} value={f.column}>{f.column}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Matches Lookup Column</label>
                                  <input type="text" value={sf.filterColumn || ''} onChange={e => { const arr = [...appSearchFields]; arr[idx] = { ...sf, filterColumn: e.target.value }; setAppSearchFields(arr); }}
                                    placeholder="e.g. department_id" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none" />
                                </div>
                              </div>
                            )}
                            
                            {(!sf.lookupTable) && (sf.fieldType === 'select' || sf.fieldType === 'radio' || sf.fieldType === 'listbox') && sf.searchType !== 'dropdown' && (
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Custom Options (comma separated)</label>
                                <input type="text" value={sf.options || ''} onChange={e => { const arr = [...appSearchFields]; arr[idx] = { ...sf, options: e.target.value }; setAppSearchFields(arr); }}
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

            {/* Detail Columns — only if mode includes details */}
            {appTable && appMode.includes('details') && (
              <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-emerald-700 flex items-center"><Maximize2 size={16} className="mr-1.5" /> Detail View Columns</h3>
                  <button onClick={() => setAppDetailColumns(appDetailColumns.length === currentTableCols.length ? [] : currentTableCols.map(c => c.column_name))}
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">
                    {appDetailColumns.length === currentTableCols.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <p className="text-xs text-emerald-500 mb-2">Select which columns appear when viewing a record's details. Empty = show all result columns.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {currentTableCols.map(col => (
                    <label key={col.column_name} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white cursor-pointer">
                      <input type="checkbox" checked={appDetailColumns.includes(col.column_name)} onChange={() => setAppDetailColumns(prev => prev.includes(col.column_name) ? prev.filter(c => c !== col.column_name) : [...prev, col.column_name])}
                        className="rounded border-slate-300 text-emerald-600" />
                      <span className="text-sm text-slate-700 truncate">{col.column_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Settings */}
            {appTable && appColumns.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center"><Settings size={16} className="mr-1.5 text-violet-500" /> Permissions & Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Quick Search Column</label>
                    <select value={appSearchCol} onChange={e => setAppSearchCol(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none">
                      <option value="">All columns</option>
                      {appColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={appEnableCreate} onChange={e => setAppEnableCreate(e.target.checked)} className="rounded border-slate-300 text-violet-600" /><span className="text-sm text-slate-700">Allow Create</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={appEnableEdit} onChange={e => setAppEnableEdit(e.target.checked)} className="rounded border-slate-300 text-violet-600" /><span className="text-sm text-slate-700">Allow Edit</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={appEnableDelete} onChange={e => setAppEnableDelete(e.target.checked)} className="rounded border-slate-300 text-violet-600" /><span className="text-sm text-slate-700">Allow Delete</span></label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Saved Apps List
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[85vh]">
      <ShareToast />
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center"><LayoutGrid className="mr-2 text-violet-600" /> App Builder</h2>
          <p className="text-sm text-slate-500 mt-1">Create live CRUD apps with search, results and details sections</p>
        </div>
        <button onClick={newApp} className="px-4 py-2 text-white bg-violet-600 hover:bg-violet-700 rounded-lg flex items-center text-sm font-medium shadow-sm"><Plus size={16} className="mr-1.5" /> New App</button>
      </div>
      {schemaError && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5" /><div><strong>Schema not available:</strong> {schemaError}</div>
        </div>
      )}
      <div className="flex-1 overflow-auto p-6">
        {appsLoading ? <p className="text-center text-slate-400 py-8">Loading...</p>
        : savedApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <LayoutGrid size={48} className="mb-4 opacity-40" /><p className="text-lg font-medium text-slate-500">No apps yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedApps.map(app => {
              const ac = app.config || {};
              const modeLabel = PAGE_MODES.find(m => m.value === ac.mode)?.label || 'Standard';
              return (
                <div key={app.id} className="group border border-slate-200 rounded-xl p-5 hover:border-violet-300 hover:shadow-md transition-all bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-800 truncate pr-2">{app.name}</h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => copyShareLink(app.id)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Share2 size={14} /></button>
                      <button onClick={() => duplicateApp(app)} className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded"><Copy size={14} /></button>
                      <button onClick={() => deleteApp(app.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {app.description && <p className="text-xs text-slate-400 mb-2 truncate">{app.description}</p>}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-mono">{ac.table || '?'}</span>
                    <span className="text-xs text-slate-400">{(ac.columns || []).length} cols</span>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-medium">{modeLabel}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => loadApp(app)} className="flex-1 px-3 py-2 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg flex items-center justify-center"><Pencil size={14} className="mr-1" /> Edit</button>
                    <button onClick={() => openAppView(app)} className="flex-1 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center"><Eye size={14} className="mr-1" /> Open</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
