import React, { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, X, Search, Eye, Save, Copy,
  ChevronDown, ChevronRight, Layers, Settings, Download,
  LayoutGrid, RefreshCw, AlertCircle, Database
} from 'lucide-react';
import { supabase } from './supabase';

export const AppBuilder = () => {
  // Schema
  const [schema, setSchema] = useState([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState(null);

  // Saved apps
  const [savedApps, setSavedApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);

  // Builder state
  const [view, setView] = useState('list'); // 'list' | 'builder' | 'appview'
  const [editingAppId, setEditingAppId] = useState(null);
  const [appName, setAppName] = useState('');
  const [appDesc, setAppDesc] = useState('');
  const [appTable, setAppTable] = useState('');
  const [appColumns, setAppColumns] = useState([]);
  const [appSearchCol, setAppSearchCol] = useState('');
  const [appEnableCreate, setAppEnableCreate] = useState(true);
  const [appEnableEdit, setAppEnableEdit] = useState(true);
  const [appEnableDelete, setAppEnableDelete] = useState(true);

  // App View state
  const [liveData, setLiveData] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveSearch, setLiveSearch] = useState('');
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [liveConfig, setLiveConfig] = useState(null);
  const [liveError, setLiveError] = useState(null);

  // ─── Fetch schema and saved apps ────────────────────────────────────
  useEffect(() => {
    fetchSchema();
    fetchApps();
  }, []);

  const fetchSchema = async () => {
    setSchemaLoading(true);
    setSchemaError(null);
    try {
      const { data, error } = await supabase.rpc('get_schema_info');
      if (error) throw error;
      setSchema(data || []);
    } catch (err) {
      setSchemaError(err.message || 'Run Section 8 of the SQL migration first.');
    }
    setSchemaLoading(false);
  };

  const fetchApps = async () => {
    setAppsLoading(true);
    const { data } = await supabase.from('app_configs').select('*').order('updated_at', { ascending: false });
    setSavedApps(data || []);
    setAppsLoading(false);
  };

  // ─── Schema helpers ────────────────────────────────────────────────
  const tables = [...new Set(schema.map(c => c.table_name))].filter(t =>
    !['form_configs', 'app_configs'].includes(t)
  ).sort();

  const getTableColumns = (tableName) =>
    schema.filter(c => c.table_name === tableName).sort((a, b) => a.ordinal_position - b.ordinal_position);

  // ─── Builder actions ───────────────────────────────────────────────
  const newApp = () => {
    setAppName('');
    setAppDesc('');
    setAppTable('');
    setAppColumns([]);
    setAppSearchCol('');
    setAppEnableCreate(true);
    setAppEnableEdit(true);
    setAppEnableDelete(true);
    setEditingAppId(null);
    setView('builder');
  };

  const loadApp = (app) => {
    const c = app.config || {};
    setAppName(app.name);
    setAppDesc(app.description || '');
    setAppTable(c.table || '');
    setAppColumns(c.columns || []);
    setAppSearchCol(c.searchCol || '');
    setAppEnableCreate(c.enableCreate !== false);
    setAppEnableEdit(c.enableEdit !== false);
    setAppEnableDelete(c.enableDelete !== false);
    setEditingAppId(app.id);
    setView('builder');
  };

  const saveApp = async () => {
    if (!appName.trim()) return alert('Please name your app.');
    if (!appTable) return alert('Select a table.');
    if (appColumns.length === 0) return alert('Select at least one column.');

    const config = {
      table: appTable,
      columns: appColumns,
      searchCol: appSearchCol,
      enableCreate: appEnableCreate,
      enableEdit: appEnableEdit,
      enableDelete: appEnableDelete
    };

    if (editingAppId) {
      await supabase.from('app_configs').update({
        name: appName, description: appDesc, config, updated_at: new Date().toISOString()
      }).eq('id', editingAppId);
    } else {
      const { data } = await supabase.from('app_configs').insert({
        name: appName, description: appDesc, config
      }).select().single();
      if (data) setEditingAppId(data.id);
    }
    fetchApps();
  };

  const duplicateApp = async (app) => {
    await supabase.from('app_configs').insert({
      name: app.name + ' (Copy)', description: app.description, config: app.config
    });
    fetchApps();
  };

  const deleteApp = async (id) => {
    if (!confirm('Delete this app permanently?')) return;
    await supabase.from('app_configs').delete().eq('id', id);
    setSavedApps(prev => prev.filter(a => a.id !== id));
    if (editingAppId === id) setView('list');
  };

  // ─── App View (live CRUD) ──────────────────────────────────────────
  const openAppView = async (app) => {
    const c = app.config || {};
    setLiveConfig(app);
    setLiveSearch('');
    setEditRow(null);
    setIsCreating(false);
    setLiveError(null);
    setView('appview');
    await fetchLiveData(c.table);
  };

  const fetchLiveData = async (table) => {
    if (!table) return;
    setLiveLoading(true);
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      setLiveError(error.message);
      setLiveData([]);
    } else {
      setLiveData(data || []);
    }
    setLiveLoading(false);
  };

  const handleCreateRow = async () => {
    const c = liveConfig?.config || {};
    setLiveError(null);
    const { error } = await supabase.from(c.table).insert(editForm);
    if (error) { setLiveError(error.message); return; }
    setIsCreating(false);
    setEditForm({});
    await fetchLiveData(c.table);
  };

  const handleUpdateRow = async () => {
    const c = liveConfig?.config || {};
    setLiveError(null);
    const { error } = await supabase.from(c.table).update(editForm).eq('id', editRow);
    if (error) { setLiveError(error.message); return; }
    setEditRow(null);
    setEditForm({});
    await fetchLiveData(c.table);
  };

  const handleDeleteRow = async (id) => {
    if (!confirm('Delete this record?')) return;
    const c = liveConfig?.config || {};
    setLiveError(null);
    const { error } = await supabase.from(c.table).delete().eq('id', id);
    if (error) { setLiveError(error.message); return; }
    await fetchLiveData(c.table);
  };

  const handleExport = () => {
    if (typeof XLSX === 'undefined') return alert('Excel engine loading...');
    const c = liveConfig?.config || {};
    const exportData = filteredLiveData.map(r => {
      const obj = {};
      (c.columns || []).forEach(col => { obj[col] = r[col] || ''; });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, c.table || 'Data');
    XLSX.writeFile(wb, `${(c.table || 'export')}.xlsx`);
  };

  const c = liveConfig?.config || {};
  const filteredLiveData = liveData.filter(row => {
    if (!liveSearch) return true;
    const searchCol = c.searchCol;
    if (searchCol) return (row[searchCol] || '').toString().toLowerCase().includes(liveSearch.toLowerCase());
    return Object.values(row).some(v => (v || '').toString().toLowerCase().includes(liveSearch.toLowerCase()));
  });

  const toggleAppColumn = (col) => {
    setAppColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  // ═════════════════════════════════════════════════════════════════════
  // RENDER: App View (live CRUD)
  // ═════════════════════════════════════════════════════════════════════
  if (view === 'appview') {
    const cols = c.columns || [];
    const tableCols = getTableColumns(c.table);

    const startEdit = (row) => {
      setEditRow(row.id);
      const formData = {};
      cols.forEach(col => { formData[col] = row[col] || ''; });
      setEditForm(formData);
      setIsCreating(false);
    };

    const startCreate = () => {
      setIsCreating(true);
      setEditRow(null);
      const formData = {};
      cols.forEach(col => { formData[col] = ''; });
      setEditForm(formData);
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{liveConfig?.name || 'App'}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Table: <span className="font-mono text-violet-600">{c.table}</span> · {filteredLiveData.length} records
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Search..." value={liveSearch} onChange={e => setLiveSearch(e.target.value)}
                className="pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-400 w-48" />
            </div>
            <button onClick={() => fetchLiveData(c.table)} className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"><RefreshCw size={16} /></button>
            <button onClick={handleExport} className="px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-sm font-medium flex items-center">
              <Download size={14} className="mr-1" /> Export
            </button>
            {c.enableCreate && (
              <button onClick={startCreate} className="px-3 py-2 text-white bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium flex items-center">
                <Plus size={14} className="mr-1" /> New
              </button>
            )}
            <button onClick={() => setView('list')} className="px-3 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium">← Back</button>
          </div>
        </div>

        {liveError && (
          <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={14} /> {liveError}
          </div>
        )}

        {/* Create / Edit Modal */}
        {(isCreating || editRow) && (
          <div className="mx-5 mt-3 p-5 bg-violet-50 border border-violet-200 rounded-xl">
            <h3 className="text-sm font-bold text-violet-800 mb-3">{isCreating ? 'Create New Record' : 'Edit Record'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {cols.filter(col => col !== 'id' && col !== 'created_at' && col !== 'updated_at').map(col => (
                <div key={col}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</label>
                  <input type="text" value={editForm[col] || ''} onChange={e => setEditForm(prev => ({ ...prev, [col]: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-violet-400" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setIsCreating(false); setEditRow(null); setEditForm({}); }} className="px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={isCreating ? handleCreateRow : handleUpdateRow} className="px-4 py-1.5 text-sm text-white bg-violet-600 hover:bg-violet-700 rounded-lg font-medium">
                {isCreating ? 'Create' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Data Grid */}
        <div className="flex-1 overflow-auto p-5">
          {liveLoading ? (
            <p className="text-center text-slate-400 py-8">Loading data...</p>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-medium">
                    <th className="p-2 pl-4 w-12">#</th>
                    {cols.map(col => (
                      <th key={col} className="p-2">{col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</th>
                    ))}
                    {(c.enableEdit || c.enableDelete) && <th className="p-2 text-right pr-4">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLiveData.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 pl-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      {cols.map(col => (
                        <td key={col} className="p-2 text-slate-700 max-w-xs truncate">{row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}</td>
                      ))}
                      {(c.enableEdit || c.enableDelete) && (
                        <td className="p-2 text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            {c.enableEdit && <button onClick={() => startEdit(row)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14} /></button>}
                            {c.enableDelete && <button onClick={() => handleDeleteRow(row.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredLiveData.length === 0 && (
                    <tr><td colSpan={cols.length + 2} className="p-8 text-center text-slate-400">No records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // RENDER: App Builder / Designer
  // ═════════════════════════════════════════════════════════════════════
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
            <button onClick={() => { saveApp().then(() => { const cfg = { name: appName, description: appDesc, config: { table: appTable, columns: appColumns, searchCol: appSearchCol, enableCreate: appEnableCreate, enableEdit: appEnableEdit, enableDelete: appEnableDelete } }; openAppView(cfg); }); }}
              disabled={!appTable || appColumns.length === 0}
              className="px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-sm font-medium disabled:opacity-40 flex items-center">
              <Eye size={16} className="mr-1" /> Launch
            </button>
            <button onClick={saveApp} className="px-4 py-2 text-white bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium shadow-sm flex items-center">
              <Save size={16} className="mr-1" /> Save
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Table Selection */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center"><Database size={16} className="mr-1.5 text-violet-500" /> Data Source</h3>
              <select value={appTable} onChange={e => { setAppTable(e.target.value); setAppColumns([]); setAppSearchCol(''); }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">Select a Supabase table...</option>
                {tables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Column Selection */}
            {appTable && (
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center"><Layers size={16} className="mr-1.5 text-violet-500" /> Columns ({appColumns.length} selected)</h3>
                  <button onClick={() => setAppColumns(appColumns.length === currentTableCols.length ? [] : currentTableCols.map(c => c.column_name))}
                    className="text-xs text-violet-600 hover:text-violet-800 font-medium">
                    {appColumns.length === currentTableCols.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {currentTableCols.map(col => (
                    <label key={col.column_name} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white cursor-pointer transition-colors">
                      <input type="checkbox" checked={appColumns.includes(col.column_name)} onChange={() => toggleAppColumn(col.column_name)}
                        className="rounded border-slate-300 text-violet-600" />
                      <span className="text-sm text-slate-700 truncate">{col.column_name}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">{col.data_type.slice(0, 8)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Settings */}
            {appTable && appColumns.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center"><Settings size={16} className="mr-1.5 text-violet-500" /> Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Search Column</label>
                    <select value={appSearchCol} onChange={e => setAppSearchCol(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none">
                      <option value="">All columns (general search)</option>
                      {appColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={appEnableCreate} onChange={e => setAppEnableCreate(e.target.checked)} className="rounded border-slate-300 text-violet-600" />
                      <span className="text-sm text-slate-700">Allow Create</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={appEnableEdit} onChange={e => setAppEnableEdit(e.target.checked)} className="rounded border-slate-300 text-violet-600" />
                      <span className="text-sm text-slate-700">Allow Edit</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={appEnableDelete} onChange={e => setAppEnableDelete(e.target.checked)} className="rounded border-slate-300 text-violet-600" />
                      <span className="text-sm text-slate-700">Allow Delete</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Card */}
            {appTable && appColumns.length > 0 && (
              <div className="bg-violet-50 rounded-xl p-5 border border-violet-200 text-sm text-violet-700">
                <strong>Ready to launch!</strong> This app will show a live data grid for{' '}
                <span className="font-mono">{appTable}</span> with {appColumns.length} columns,{' '}
                {appEnableCreate ? 'create, ' : ''}{appEnableEdit ? 'edit, ' : ''}{appEnableDelete ? 'delete, ' : ''}
                and Excel export capabilities.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // RENDER: Saved Apps List
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[85vh]">
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <LayoutGrid className="mr-2 text-violet-600" /> App Builder
          </h2>
          <p className="text-sm text-slate-500 mt-1">Create live CRUD mini-apps for any Supabase table</p>
        </div>
        <button onClick={newApp} className="px-4 py-2 text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors flex items-center text-sm font-medium shadow-sm">
          <Plus size={16} className="mr-1.5" /> New App
        </button>
      </div>

      {schemaError && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div><strong>Schema not available:</strong> {schemaError}<br />Please run Section 8 of <code>supabase_schema_update.sql</code>.</div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {appsLoading ? (
          <p className="text-center text-slate-400 py-8">Loading apps...</p>
        ) : savedApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <LayoutGrid size={48} className="mb-4 opacity-40" />
            <p className="text-lg font-medium text-slate-500">No apps yet</p>
            <p className="text-sm mt-1">Click "New App" to build your first CRUD interface</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedApps.map(app => {
              const ac = app.config || {};
              return (
                <div key={app.id} className="group border border-slate-200 rounded-xl p-5 hover:border-violet-300 hover:shadow-md transition-all bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-800 truncate pr-2">{app.name}</h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => duplicateApp(app)} className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded"><Copy size={14} /></button>
                      <button onClick={() => deleteApp(app.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {app.description && <p className="text-xs text-slate-400 mb-2 truncate">{app.description}</p>}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-mono">{ac.table || '?'}</span>
                    <span className="text-xs text-slate-400">{(ac.columns || []).length} cols</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => loadApp(app)} className="flex-1 px-3 py-2 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg flex items-center justify-center">
                      <Pencil size={14} className="mr-1" /> Edit
                    </button>
                    <button onClick={() => openAppView(app)} className="flex-1 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Eye size={14} className="mr-1" /> Open
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
};
