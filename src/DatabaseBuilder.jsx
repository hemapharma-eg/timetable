import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { Database, Plus, Trash2, Edit, Download, Upload, X, Table, Columns, Search, PlusCircle, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import ImportModeDialog from './ImportModeDialog';

const SYSTEM_TABLES = ['app_users','custom_roles','role_permissions','risk_year_mapping','risk_values','risk_categories','academic_years','schema_migrations'];
const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'bigint', label: 'Number (Integer)' },
  { value: 'numeric', label: 'Number (Decimal)' },
  { value: 'boolean', label: 'Yes/No (Boolean)' },
  { value: 'date', label: 'Date' },
  { value: 'timestamp with time zone', label: 'Date & Time' },
];

export function DatabaseBuilder() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('schema');
  const [searchTerm, setSearchTerm] = useState('');

  // Add column state
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('text');

  // Edit column state
  const [editingCol, setEditingCol] = useState(null);
  const [editColName, setEditColName] = useState('');

  // Create table state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableFields, setNewTableFields] = useState([{ name: '', type: 'text' }]);

  // Import state
  const fileInputRef = useRef(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState(null);
  const [importFileName, setImportFileName] = useState('');

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

  // --- Rename Column ---
  const handleRenameColumn = async (oldName) => {
    if (!editColName.trim() || !selectedTable) return;
    const safeName = editColName.trim().replace(/\s+/g, '_').toLowerCase();
    try {
      setLoading(true);
      const { error } = await supabase.rpc('execute_ddl', {
        sql_text: `ALTER TABLE public."${selectedTable}" RENAME COLUMN "${oldName}" TO "${safeName}";`
      });
      if (error) throw error;
      setEditingCol(null); setEditColName('');
      await fetchColumns(selectedTable);
    } catch (e) { alert('Error renaming column: ' + e.message); }
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
      return `"${fName}" ${f.type}`;
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
      setShowCreateForm(false);
      setNewTableName(''); setNewTableFields([{ name: '', type: 'text' }]);
      await fetchTables();
      setSelectedTable(tName);
    } catch (e) { alert('Error creating table: ' + e.message); }
    finally { setLoading(false); }
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
      } else if (mode === 'update') {
        let updated = 0, inserted = 0;
        // Try to match on first column as unique key
        const firstCol = Object.keys(pendingImportData[0])[0];
        const { data: existing } = await supabase.from(selectedTable).select('*');
        for (const item of pendingImportData) {
          const match = (existing || []).find(e => e[firstCol] === item[firstCol]);
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
                      <div key={i} className="flex gap-2 items-center">
                        <input type="text" value={f.name} onChange={e => { const nf = [...newTableFields]; nf[i].name = e.target.value; setNewTableFields(nf); }}
                          placeholder="Field name" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        <select value={f.type} onChange={e => { const nf = [...newTableFields]; nf[i].type = e.target.value; setNewTableFields(nf); }}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                          {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                        </select>
                        {newTableFields.length > 1 && (
                          <button onClick={() => setNewTableFields(newTableFields.filter((_, j) => j !== i))} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setNewTableFields([...newTableFields, { name: '', type: 'text' }])}
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
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedTable}</h3>
                  <p className="text-xs text-slate-400">{columns.length} columns • {rowCount} rows</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    <button onClick={() => setActiveTab('schema')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'schema' ? 'bg-white shadow text-indigo-700' : 'text-slate-600'}`}>Schema</button>
                    <button onClick={() => setActiveTab('data')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'data' ? 'bg-white shadow text-indigo-700' : 'text-slate-600'}`}>Import / Export</button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'schema' ? (
                  <div className="space-y-6">
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
                        {columns.map(c => (
                          <tr key={c.column_name} className="hover:bg-slate-50">
                            <td className="p-3">
                              {editingCol === c.column_name ? (
                                <div className="flex gap-2">
                                  <input type="text" value={editColName} onChange={e => setEditColName(e.target.value)} className="px-2 py-1 border rounded text-sm w-40 outline-none focus:border-indigo-500" />
                                  <button onClick={() => handleRenameColumn(c.column_name)} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">Save</button>
                                  <button onClick={() => setEditingCol(null)} className="text-xs text-slate-500 px-2 py-1">Cancel</button>
                                </div>
                              ) : (
                                <span className={`font-medium ${c.column_name === 'id' || c.column_name === 'created_at' ? 'text-slate-400' : 'text-slate-800'}`}>{c.column_name}</span>
                              )}
                            </td>
                            <td className="p-3"><span className="px-2 py-0.5 text-xs font-mono bg-slate-100 rounded text-slate-600">{c.data_type}</span></td>
                            <td className="p-3 text-sm text-slate-500">{c.is_nullable === 'YES' ? 'Yes' : 'No'}</td>
                            <td className="p-3 text-right">
                              {c.column_name !== 'id' && c.column_name !== 'created_at' && (
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => { setEditingCol(c.column_name); setEditColName(c.column_name); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Rename"><Edit size={15} /></button>
                                  <button onClick={() => handleDeleteColumn(c.column_name)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete"><Trash2 size={15} /></button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Danger zone */}
                    <div className="mt-8 p-4 border border-red-200 rounded-xl bg-red-50/50">
                      <h4 className="text-sm font-bold text-red-700 mb-2">Danger Zone</h4>
                      <button onClick={handleDeleteTable} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Delete Entire Database</button>
                    </div>
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
        uniqueFieldLabel="First Column"
        onReplace={() => executeImport('replace')}
        onAppend={() => executeImport('append')}
        onUpdate={() => executeImport('update')}
        onCancel={() => { setImportDialogOpen(false); setPendingImportData(null); }}
      />
    </div>
  );
}
