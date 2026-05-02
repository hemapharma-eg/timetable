import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { Database, Plus, Trash2, Edit, Download, Upload, X, Table, Columns, Search, PlusCircle, Save, ShieldAlert } from 'lucide-react';
import * as XLSX from 'xlsx';
import ImportModeDialog from './ImportModeDialog';
import RichTextEditor from './RichTextEditor';

const CORE_TABLES = ['app_users','custom_roles','role_permissions','risk_year_mapping','risk_categories','academic_years','schema_migrations'];
const SYSTEM_TABLES = []; // Empty to show all tables
const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'text_long', label: 'Long Text' },
  { value: 'numeric', label: 'Number' },
  { value: 'boolean', label: 'Checkbox' },
  { value: 'timestamp with time zone', label: 'Date & Time' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multiselect' },
  { value: 'attachment', label: 'Attachment' },
  { value: 'random_id', label: 'Automatic Random ID' },
  { value: 'formula', label: 'Calculated Formula' },
];

export function DatabaseBuilder() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('records');
  const [searchTerm, setSearchTerm] = useState('');

  // Add column state
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('text');

  // Edit column state
  const [editingCol, setEditingCol] = useState(null);
  const [editColName, setEditColName] = useState('');
  const [editColMetadata, setEditColMetadata] = useState({ ui_type: '', options: '', formula: '' });
  const [showFormulaBuilder, setShowFormulaBuilder] = useState(false);

  // Create table state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableFields, setNewTableFields] = useState([{ name: '', type: 'text', isUnique: false, options: '', formula: '' }]);
  const excelCreateRef = useRef(null);

  // Import state
  const fileInputRef = useRef(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState(null);
  const [importFileName, setImportFileName] = useState('');
  const [pendingExcelData, setPendingExcelData] = useState(null);

  const fetchTables = async () => {
    try {
      const { data, error } = await supabase.rpc('get_public_tables');
      if (error) throw error;
      const filtered = (data || []).filter(t => !SYSTEM_TABLES.includes(t));
      setTables(filtered);
    } catch (e) {
      console.error('Failed to fetch tables:', e.message);
      setTables([]);
    }
  };

  const fetchColumns = async (tableName) => {
    try {
      const { data, error } = await supabase.rpc('get_table_columns', { p_table: tableName });
      if (error) throw error;
      setColumns(data || []);
    } catch (e) {
      console.error('Failed to fetch columns:', e.message);
      setColumns([]);
    }
  };

  const fetchRowCount = async (tableName) => {
    try {
      const { data } = await supabase.rpc('get_table_row_count', { p_table: tableName });
      setRowCount(data || 0);
    } catch { setRowCount(0); }
  };

  useEffect(() => { fetchTables(); }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchColumns(selectedTable);
      fetchRowCount(selectedTable);
      setActiveTab('schema');
    }
  }, [selectedTable]);

  // --- Add Column ---
  const handleAddColumn = async () => {
    if (!newColName.trim() || !selectedTable) return;
    const safeName = newColName.trim().replace(/\s+/g, '_').toLowerCase();
    try {
      setLoading(true);
      const { error } = await supabase.rpc('execute_ddl', {
        sql_text: `ALTER TABLE public."${selectedTable}" ADD COLUMN IF NOT EXISTS "${safeName}" ${newColType};`
      });
      if (error) throw error;
      setNewColName(''); setNewColType('text');
      await fetchColumns(selectedTable);
    } catch (e) { alert('Error adding column: ' + e.message); }
    finally { setLoading(false); }
  };

  // --- Rename & Update Metadata ---
  const handleUpdateColumn = async (oldName) => {
    if (!editColName.trim() || !selectedTable) return;
    const safeName = editColName.trim().replace(/\s+/g, '_').toLowerCase();
    try {
      setLoading(true);
      // 1. Rename if changed
      if (oldName !== safeName) {
        const { error: renameErr } = await supabase.rpc('execute_ddl', {
          sql_text: `ALTER TABLE public."${selectedTable}" RENAME COLUMN "${oldName}" TO "${safeName}";`
        });
        if (renameErr) throw renameErr;
      }
      // 2. Update comment/metadata
      const { error: commentErr } = await supabase.rpc('set_column_comment', {
        p_table: selectedTable,
        p_column: safeName,
        p_comment: JSON.stringify(editColMetadata)
      });
      if (commentErr) throw commentErr;

      setEditingCol(null);
      await fetchColumns(selectedTable);
    } catch (e) { alert('Error updating column: ' + e.message); }
    finally { setLoading(false); }
  };

  // --- Delete Column ---
  const handleDeleteColumn = async (colName) => {
    if (colName === 'id' || colName === 'created_at') { alert('Cannot delete system columns.'); return; }
    if (!confirm(`Delete column "${colName}" from "${selectedTable}"? This will permanently remove all data in this column.`)) return;
    try {
      setLoading(true);
      const { error } = await supabase.rpc('execute_ddl', {
        sql_text: `ALTER TABLE public."${selectedTable}" DROP COLUMN IF EXISTS "${colName}";`
      });
      if (error) throw error;
      await fetchColumns(selectedTable);
    } catch (e) { alert('Error deleting column: ' + e.message); }
    finally { setLoading(false); }
  };

  // --- Create Table ---
  const handleCreateTable = async () => {
    const tName = newTableName.trim().replace(/\s+/g, '_').toLowerCase();
    if (!tName) { alert('Enter a table name.'); return; }
    const validFields = newTableFields.filter(f => f.name.trim());
    if (validFields.length === 0) { alert('Add at least one field.'); return; }

    const fieldsDDL = validFields.map(f => {
      const fName = f.name.trim().replace(/\s+/g, '_').toLowerCase();
      let dbType = f.type;
      if (f.type === 'text_long') dbType = 'text';
      if (f.type === 'dropdown') dbType = 'text';
      if (f.type === 'multiselect') dbType = 'jsonb';
      if (f.type === 'attachment') dbType = 'jsonb';
      if (f.type === 'random_id') dbType = 'text';
      if (f.type === 'formula') dbType = 'numeric'; // Default formula to numeric for now

      let constraints = f.isUnique ? ' UNIQUE' : '';
      if (f.type === 'random_id') constraints += " DEFAULT (substring(md5(random()::text),1,8))";
      
      return `"${fName}" ${dbType}${constraints}`;
    }).join(', ');

    const sql = `
      CREATE TABLE IF NOT EXISTS public."${tName}" (
        id bigint generated by default as identity primary key,
        ${fieldsDDL},
        created_at timestamp with time zone default now()
      );
      ALTER TABLE public."${tName}" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Enable read for all on ${tName}" ON public."${tName}" FOR SELECT USING (true);
      CREATE POLICY "Enable insert for auth on ${tName}" ON public."${tName}" FOR INSERT WITH CHECK (auth.role() = 'authenticated');
      CREATE POLICY "Enable update for auth on ${tName}" ON public."${tName}" FOR UPDATE USING (auth.role() = 'authenticated');
      CREATE POLICY "Enable delete for auth on ${tName}" ON public."${tName}" FOR DELETE USING (auth.role() = 'authenticated');
    `;

    try {
      setLoading(true);
      const { error } = await supabase.rpc('execute_ddl', { sql_text: sql });
      if (error) throw error;

      // Set column comments for metadata
      for (const f of validFields) {
        const fName = f.name.trim().replace(/\s+/g, '_').toLowerCase();
        const metadata = { ui_type: f.type, options: f.options, formula: f.formula };
        await supabase.rpc('set_column_comment', { p_table: tName, p_column: fName, p_comment: JSON.stringify(metadata) });
      }

      setShowCreateForm(false);
      setNewTableName(''); setNewTableFields([{ name: '', type: 'text', isUnique: false, options: '', formula: '' }]);
      await fetchTables();
      setSelectedTable(tName);

      // If we have pending excel data, import it immediately (Append mode)
      if (pendingExcelData) {
        const { error: importErr } = await supabase.from(tName).insert(pendingExcelData);
        if (importErr) alert('Table created, but initial data import failed: ' + importErr.message);
        else alert(`Successfully created table "${tName}" and imported ${pendingExcelData.length} records.`);
        setPendingExcelData(null);
      }
    } catch (e) { alert('Error creating table: ' + e.message); }
    finally { setLoading(false); }
  };

  const handleExcelToTable = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        if (rows.length === 0) return;
        
        const headers = Object.keys(rows[0]);
        const suggestedFields = headers.map(h => ({
          name: h,
          type: 'text',
          isUnique: false,
          options: '',
          formula: ''
        }));
        
        setNewTableName(file.name.split('.')[0].replace(/\s+/g, '_').toLowerCase());
        setNewTableFields(suggestedFields);
        setPendingExcelData(rows); // Store for later import
        setShowCreateForm(true);
      } catch (err) { alert('Import error: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- Delete Table ---
  const handleDeleteTable = async () => {
    if (!selectedTable) return;
    if (!confirm(`DELETE TABLE "${selectedTable}"? This will permanently destroy all data. Type the table name to confirm.`)) return;
    const confirmed = prompt(`Type "${selectedTable}" to confirm deletion:`);
    if (confirmed !== selectedTable) { alert('Table name did not match. Cancelled.'); return; }
    try {
      setLoading(true);
      const { error } = await supabase.rpc('execute_ddl', { sql_text: `DROP TABLE IF EXISTS public."${selectedTable}" CASCADE;` });
      if (error) throw error;
      setSelectedTable(null); setColumns([]);
      await fetchTables();
    } catch (e) { alert('Error deleting table: ' + e.message); }
    finally { setLoading(false); }
  };

  // --- Export Template ---
  const handleExportTemplate = () => {
    if (!selectedTable || columns.length === 0) return;
    const headers = columns.filter(c => c.column_name !== 'id' && c.column_name !== 'created_at').map(c => c.column_name);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedTable);
    XLSX.writeFile(wb, `${selectedTable}_template.xlsx`);
  };

  // --- Export Data ---
  const handleExportData = async () => {
    if (!selectedTable) return;
    try {
      const { data, error } = await supabase.from(selectedTable).select('*');
      if (error) throw error;
      if (!data || data.length === 0) { alert('No data to export.'); return; }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, selectedTable);
      XLSX.writeFile(wb, `${selectedTable}_data.xlsx`);
    } catch (e) { alert('Export error: ' + e.message); }
  };

  // --- Import ---
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        if (rows.length === 0) { alert('No data found.'); return; }
        // Remove id and created_at from import
        const cleaned = rows.map(r => { const { id, created_at, ...rest } = r; return rest; });
        setPendingImportData(cleaned);
        setImportFileName(file.name);
        setImportDialogOpen(true);
      } catch (err) { alert('Import error: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const executeImport = async (mode) => {
    if (!pendingImportData || !selectedTable) return;
    setImportDialogOpen(false);
    try {
      if (mode === 'replace') {
        await supabase.from(selectedTable).delete().neq('id', 0);
        const { error } = await supabase.from(selectedTable).insert(pendingImportData);
        if (error) throw error;
        alert(`Replaced with ${pendingImportData.length} records.`);
      } else if (mode === 'update' || typeof mode === 'string') {
        const matchCol = typeof mode === 'string' ? mode : Object.keys(pendingImportData[0])[0];
        let updated = 0, inserted = 0;
        const { data: existing } = await supabase.from(selectedTable).select('*');
        for (const item of pendingImportData) {
          const match = (existing || []).find(e => e[matchCol] === item[matchCol]);
          if (match) {
            await supabase.from(selectedTable).update(item).eq('id', match.id);
            updated++;
          } else {
            await supabase.from(selectedTable).insert(item);
            inserted++;
          }
        }
        alert(`Updated ${updated}, inserted ${inserted} records.`);
      } else {
        // append
        const { error } = await supabase.from(selectedTable).insert(pendingImportData);
        if (error) throw error;
        alert(`Appended ${pendingImportData.length} records.`);
      }
      fetchRowCount(selectedTable);
    } catch (e) { alert('Import error: ' + e.message); }
    setPendingImportData(null);
  };

  const filteredTables = tables.filter(t => !searchTerm || t.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        {/* Left: Table List */}
        <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search tables..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm">
            <PlusCircle size={16} /> Create New Database
          </button>
          <button onClick={() => excelCreateRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm">
            <Upload size={16} /> Create from Excel
          </button>
          <input ref={excelCreateRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelToTable} />
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[500px] pr-1">
            {filteredTables.map(t => (
              <button key={t} onClick={() => setSelectedTable(t)}
                className={`text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 ${selectedTable === t ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Table size={14} className="flex-shrink-0" /> <span className="truncate">{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Table Detail */}
        <div className="flex-1 min-w-0">
          {showCreateForm ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><PlusCircle className="text-indigo-600" size={20} /> Create New Database</h3>
                <button onClick={() => setShowCreateForm(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={18} /></button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Table Name <span className="text-red-500">*</span></label>
                  <input type="text" value={newTableName} onChange={e => setNewTableName(e.target.value)} placeholder="e.g. publications"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                  <p className="text-xs text-slate-400 mt-1">Spaces will be converted to underscores. An 'id' and 'created_at' column are added automatically.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Fields</label>
                  <div className="space-y-2">
                    {newTableFields.map((f, i) => (
                      <div key={i} className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex gap-2 items-center">
                          <input type="text" value={f.name} onChange={e => { const nf = [...newTableFields]; nf[i].name = e.target.value; setNewTableFields(nf); }}
                            placeholder="Field name" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                          <select value={f.type} onChange={e => { const nf = [...newTableFields]; nf[i].type = e.target.value; setNewTableFields(nf); }}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                            {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                          </select>
                          <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={f.isUnique} onChange={e => { const nf = [...newTableFields]; nf[i].isUnique = e.target.checked; setNewTableFields(nf); }} /> Unique
                          </label>
                          {newTableFields.length > 1 && (
                            <button onClick={() => setNewTableFields(newTableFields.filter((_, j) => j !== i))} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                          )}
                        </div>
                        {(f.type === 'dropdown' || f.type === 'multiselect') && (
                          <input type="text" value={f.options} onChange={e => { const nf = [...newTableFields]; nf[i].options = e.target.value; setNewTableFields(nf); }}
                            placeholder="Options (comma separated)" className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500" />
                        )}
                        {f.type === 'formula' && (
                          <div className="flex flex-col gap-1">
                            <input type="text" value={f.formula} onChange={e => { const nf = [...newTableFields]; nf[i].formula = e.target.value; setNewTableFields(nf); }}
                              placeholder="Formula (e.g. {field1} + {field2})" className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500" />
                            <p className="text-[10px] text-slate-400">Use {'{field_name}'} for table fields. Support for simple math + lookups.</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setNewTableFields([...newTableFields, { name: '', type: 'text', isUnique: false, options: '', formula: '' }])}
                    className="mt-2 text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1"><Plus size={14} /> Add Field</button>
                </div>
                <button onClick={handleCreateTable} disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-sm">
                  <Save size={16} /> {loading ? 'Creating...' : 'Create Database'}
                </button>
              </div>
            </div>
          ) : selectedTable ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-bold text-slate-800">{selectedTable}</h2>
                    {CORE_TABLES.includes(selectedTable) && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200 group relative cursor-help">
                        <ShieldAlert size={12} /> SYSTEM PROTECTED
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[9px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-normal">
                          This is a core system table. Schema changes are disabled to protect application logic.
                        </div>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{columns.length} columns • {rowCount} rows</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    <button onClick={() => setActiveTab('records')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'records' ? 'bg-white shadow text-indigo-700' : 'text-slate-600'}`}>Records</button>
                    <button onClick={() => setActiveTab('data')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'data' ? 'bg-white shadow text-indigo-700' : 'text-slate-600'}`}>Import / Export</button>
                    <button onClick={() => setActiveTab('schema')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'schema' ? 'bg-white shadow text-indigo-700' : 'text-slate-600'}`}>Schema</button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'records' ? (
                  <RecordsView 
                    tableName={selectedTable} 
                    columns={columns} 
                    onUpdate={() => fetchRowCount(selectedTable)}
                  />
                ) : activeTab === 'schema' ? (
                  <div className={`space-y-6 ${CORE_TABLES.includes(selectedTable) ? 'pointer-events-none opacity-60' : ''}`}>
                    {CORE_TABLES.includes(selectedTable) && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                         <ShieldAlert size={16} /> Schema editing is disabled for system tables.
                      </div>
                    )}
                    {/* Add column form */}
                    <div className="flex gap-3 items-end p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">New Column Name</label>
                        <input type="text" value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="e.g. phone_number"
                          className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                        <select value={newColType} onChange={e => setNewColType(e.target.value)}
                          className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white">
                          {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                        </select>
                      </div>
                      <button onClick={handleAddColumn} disabled={loading} className="bg-indigo-600 text-white px-5 py-2 rounded font-medium text-sm hover:bg-indigo-700 h-[38px] flex items-center gap-1">
                        <Plus size={14} /> Add
                      </button>
                    </div>

                    {/* Column list */}
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 text-sm border-y border-slate-200">
                          <th className="p-3 font-semibold">Column Name</th>
                          <th className="p-3 font-semibold">Type</th>
                          <th className="p-3 font-semibold">Nullable</th>
                          <th className="p-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {columns.map(c => {
                          let metadata = { ui_type: c.data_type, options: '', formula: '' };
                          try { if (c.column_comment) metadata = JSON.parse(c.column_comment); } catch(e){}
                          
                          return (
                            <tr key={c.column_name} className="hover:bg-slate-50">
                              <td className="p-3">
                                {editingCol === c.column_name ? (
                                  <div className="flex flex-col gap-2">
                                    <input type="text" value={editColName} onChange={e => setEditColName(e.target.value)} className="px-2 py-1 border rounded text-sm w-full outline-none focus:border-indigo-500" />
                                    <div className="flex gap-2">
                                      <button onClick={() => handleUpdateColumn(c.column_name)} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">Save</button>
                                      <button onClick={() => setEditingCol(null)} className="text-xs text-slate-500 px-2 py-1">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className={`font-medium ${c.column_name === 'id' || c.column_name === 'created_at' ? 'text-slate-400' : 'text-slate-800'}`}>{c.column_name}</span>
                                )}
                              </td>
                              <td className="p-3">
                                {editingCol === c.column_name ? (
                                  <div className="flex flex-col gap-2">
                                    <select value={editColMetadata.ui_type} onChange={e => setEditColMetadata({...editColMetadata, ui_type: e.target.value})} className="px-2 py-1 border rounded text-xs">
                                      {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                                    </select>
                                    {(editColMetadata.ui_type === 'dropdown' || editColMetadata.ui_type === 'multiselect') && (
                                      <input type="text" value={editColMetadata.options} onChange={e => setEditColMetadata({...editColMetadata, options: e.target.value})} placeholder="Options..." className="px-2 py-1 border rounded text-xs" />
                                    )}
                                    {editColMetadata.ui_type === 'formula' && (
                                      <button onClick={() => setShowFormulaBuilder(true)} className="text-[10px] text-indigo-600 border border-indigo-200 rounded px-2 py-1">Edit Formula</button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="px-2 py-0.5 text-xs font-mono bg-slate-100 rounded text-slate-600 w-fit">{metadata.ui_type || c.data_type}</span>
                                    {metadata.formula && <span className="text-[10px] text-indigo-500 mt-1 truncate max-w-[150px]">{metadata.formula}</span>}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-sm text-slate-500">{c.is_nullable === 'YES' ? 'Yes' : 'No'}</td>
                              <td className="p-3 text-right">
                                {c.column_name !== 'id' && c.column_name !== 'created_at' && (
                                  <div className="flex justify-end gap-1">
                                    <button onClick={() => { 
                                      setEditingCol(c.column_name); 
                                      setEditColName(c.column_name);
                                      setEditColMetadata(metadata);
                                    }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Edit Schema & Metadata"><Edit size={15} /></button>
                                    <button onClick={() => handleDeleteColumn(c.column_name)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete"><Trash2 size={15} /></button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Danger zone */}
                    {!CORE_TABLES.includes(selectedTable) && (
                      <div className="mt-8 p-4 border border-red-200 rounded-xl bg-red-50/50">
                        <h4 className="text-sm font-bold text-red-700 mb-2">Danger Zone</h4>
                        <button onClick={handleDeleteTable} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Delete Entire Database</button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Import/Export Tab */
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button onClick={handleExportTemplate} className="p-5 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors text-center">
                        <Download className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <div className="font-semibold text-blue-800 text-sm">Export Template</div>
                        <p className="text-xs text-blue-500 mt-1">Empty Excel with column headers</p>
                      </button>
                      <button onClick={handleExportData} className="p-5 bg-emerald-50 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors text-center">
                        <Download className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                        <div className="font-semibold text-emerald-800 text-sm">Export Data</div>
                        <p className="text-xs text-emerald-500 mt-1">Download all {rowCount} records</p>
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="p-5 bg-amber-50 rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors text-center">
                        <Upload className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                        <div className="font-semibold text-amber-800 text-sm">Import Data</div>
                        <p className="text-xs text-amber-500 mt-1">Upload filled Excel file</p>
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="font-semibold text-slate-700 text-sm mb-2">Import Modes</h4>
                      <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                        <li><strong>Append:</strong> Add new records. Duplicates (matching first column) are skipped.</li>
                        <li><strong>Update:</strong> Match by first column — update existing, insert new.</li>
                        <li><strong>Replace:</strong> Delete ALL existing records, then insert imported data.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <div className="text-center">
                <Database className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium text-slate-500">Select a database or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ImportModeDialog
        isOpen={importDialogOpen}
        fileName={importFileName}
        recordCount={pendingImportData?.length || 0}
        existingCount={rowCount}
        onReplace={() => executeImport('replace')}
        onAppend={() => executeImport('append')}
        onUpdate={(matchCol) => executeImport(matchCol)}
        onCancel={() => { setImportDialogOpen(false); setPendingImportData(null); }}
        columns={columns.map(c => c.column_name).filter(n => n !== 'id' && n !== 'created_at')}
      />

      <FormulaBuilder
        isOpen={showFormulaBuilder}
        onClose={() => setShowFormulaBuilder(false)}
        onSave={(formula) => {
          if (editingCol) setEditColMetadata({...editColMetadata, formula});
          else {
             // Handle new field formula
             const nf = [...newTableFields];
             nf[nf.length-1].formula = formula;
             setNewTableFields(nf);
          }
          setShowFormulaBuilder(false);
        }}
        initialFormula={editingCol ? editColMetadata.formula : ''}
        tables={tables}
        currentTableColumns={columns.map(c => c.column_name)}
      />
    </div>
  );
}

function RecordsView({ tableName, columns, onUpdate }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false }).limit(100);
    if (!error) setData(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tableName]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (!error) { fetchData(); onUpdate(); }
  };

  const handleSave = async (rowData) => {
    const { id, created_at, ...payload } = rowData;
    let error;
    if (id) {
      ({ error } = await supabase.from(tableName).update(payload).eq('id', id));
    } else {
      ({ error } = await supabase.from(tableName).insert(payload));
    }
    if (!error) {
      setEditingRow(null);
      setShowModal(false);
      fetchData();
      onUpdate();
    } else {
      alert('Save failed: ' + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold text-slate-700">Recent Records (Last 100)</h4>
        <button onClick={() => { setEditingRow({}); setShowModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 shadow-sm">
          <Plus size={14} /> Add New Record
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <th className="p-3 font-semibold w-12 text-center">Edit</th>
              {columns.map(c => <th key={c.column_name} className="p-3 font-semibold whitespace-nowrap">{c.column_name}</th>)}
              <th className="p-3 font-semibold w-12 text-center">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.map(row => (
              <tr key={row.id} className="hover:bg-slate-50 group">
                <td className="p-3 text-center border-r border-slate-50">
                  <button onClick={() => { setEditingRow({...row}); setShowModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Edit"><Edit size={14} /></button>
                </td>
                {columns.map(c => (
                  <td key={c.column_name} className="p-3 whitespace-nowrap overflow-hidden max-w-[200px] truncate">
                    {String(row[c.column_name] ?? '')}
                  </td>
                ))}
                <td className="p-3 text-center border-l border-slate-50">
                  <button onClick={() => handleDelete(row.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="p-8 text-center text-slate-400 italic">No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <RecordDetailsModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
          onSave={handleSave} 
          rowData={editingRow} 
          columns={columns}
        />
      )}
    </div>
  );
}

function RecordDetailsModal({ isOpen, onClose, onSave, rowData, columns }) {
  const [formData, setFormData] = useState(rowData || {});
  const [activePage, setActivePage] = useState(0);
  
  const editableCols = columns.filter(c => c.column_name !== 'id' && c.column_name !== 'created_at');
  const PAGE_SIZE = 8;
  const pageCount = Math.ceil(editableCols.length / PAGE_SIZE);
  const currentFields = editableCols.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE);

  const renderInput = (col) => {
    let metadata = {};
    try { if (col.column_comment) metadata = JSON.parse(col.column_comment); } catch(e){}
    
    const uiType = metadata.ui_type || col.data_type;
    const value = formData[col.column_name];
    const onChange = (v) => setFormData({...formData, [col.column_name]: v});

    if (uiType === 'boolean') {
      return <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="rounded text-indigo-600 w-5 h-5" />;
    }
    if (uiType === 'dropdown') {
      const opts = (metadata.options || '').split(',').map(o => o.trim());
      return (
        <select value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Select...</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (uiType === 'text_long') {
      return <RichTextEditor value={value || ''} onChange={onChange} className="w-full" />;
    }
    if (uiType === 'numeric') {
      return <input type="number" value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />;
    }
    return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <h3 className="text-lg font-bold text-slate-800">{rowData.id ? 'Edit Record' : 'Add New Record'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={18} /></button>
        </div>

        {pageCount > 1 && (
          <div className="px-6 py-2 border-b border-slate-100 bg-white flex gap-2 overflow-x-auto no-scrollbar">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => setActivePage(i)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${activePage === i ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                Section {i + 1}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentFields.map(col => (
            <div key={col.column_name} className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">{col.column_name.replace(/_/g, ' ')}</label>
              {renderInput(col)}
            </div>
          ))}
          
          {activePage === pageCount - 1 && rowData.id && (
            <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400">
              <p>ID: {rowData.id}</p>
              <p>Created: {new Date(rowData.created_at).toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-between items-center">
          <div className="flex gap-2">
            {activePage > 0 && (
              <button onClick={() => setActivePage(p => p - 1)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Previous</button>
            )}
            {activePage < pageCount - 1 && (
              <button onClick={() => setActivePage(p => p + 1)} className="px-4 py-2 text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg transition-colors">Next Section</button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
            <button onClick={() => onSave(formData)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2">
              <Save size={16} /> Save Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormulaBuilder({ isOpen, onClose, onSave, initialFormula, tables, currentTableColumns }) {
  const [formula, setFormula] = useState(initialFormula || '');
  const [selectedTable, setSelectedTable] = useState('');
  const [tableCols, setTableCols] = useState([]);

  useEffect(() => { if (isOpen) setFormula(initialFormula || ''); }, [isOpen, initialFormula]);

  useEffect(() => {
    if (selectedTable) {
      supabase.rpc('get_table_columns', { p_table: selectedTable }).then(({data}) => {
        setTableCols((data || []).map(c => c.column_name));
      });
    }
  }, [selectedTable]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Visual Formula Builder</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-600 mb-2">Build Your Formula</label>
            <textarea
              value={formula}
              onChange={e => setFormula(e.target.value)}
              placeholder="e.g. {price} * {quantity}"
              className="w-full h-32 p-3 border border-slate-300 rounded-lg font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Current Table Fields</label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {currentTableColumns.map(c => (
                  <button key={c} onClick={() => setFormula(f => f + ` {${c}}`)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Cross-Table Lookup</label>
              <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 mb-2 bg-white">
                <option value="">Select Table...</option>
                {tables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {tableCols.map(c => (
                  <button key={c} onClick={() => setFormula(f => f + ` LOOKUP(${selectedTable}, ${c}, id, {id})`)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-[11px] text-slate-400 italic">
             <p>Use {'{field}'} for current table. Use LOOKUP(table, target_field, match_field, match_value) for other tables.</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={() => onSave(formula)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm">Save Formula</button>
        </div>
      </div>
    </div>
  );
}
