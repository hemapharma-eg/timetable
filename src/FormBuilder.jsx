import React, { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, X, Search, Eye, Save, Copy, ChevronDown, ChevronRight,
  FileText, Layers, CheckCircle2, AlertCircle, GripVertical, Settings, Share2
} from 'lucide-react';
import { supabase } from './supabase';

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
  { value: 'currency', label: 'Currency', group: 'Formatted' },
  { value: 'hidden', label: 'Hidden Field', group: 'Special' },
  { value: 'header', label: 'Section Header', group: 'Display' },
  { value: 'paragraph', label: 'Instructions / Text', group: 'Display' },
  { value: 'calculated', label: 'Calculated Field', group: 'Special' }
];

const mapDbType = (dbType) => {
  if (!dbType) return 'text';
  const t = dbType.toLowerCase();
  if (t.includes('int') || t.includes('numeric') || t.includes('decimal') || t.includes('float') || t.includes('double')) return 'number';
  if (t.includes('bool')) return 'checkbox';
  if (t.includes('timestamp')) return 'datetime-local';
  if (t.includes('date')) return 'date';
  if (t.includes('time')) return 'time';
  return 'text';
};

export const FormBuilder = ({ deepLinkId }) => {
  // Schema state
  const [schema, setSchema] = useState([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState(null);

  // Saved forms
  const [savedForms, setSavedForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(true);

  // Builder state
  const [view, setView] = useState('list');
  const [editingFormId, setEditingFormId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formFields, setFormFields] = useState([]);
  const [expandedTables, setExpandedTables] = useState({});
  const [tableSearch, setTableSearch] = useState('');

  // Fill mode state
  const [fillFormConfig, setFillFormConfig] = useState(null);
  const [fillValues, setFillValues] = useState({});
  const [fillSubmitting, setFillSubmitting] = useState(false);
  const [fillError, setFillError] = useState(null);

  // Field editing
  const [editingFieldIdx, setEditingFieldIdx] = useState(null);

  // Cascade options cache
  const [cascadeCache, setCascadeCache] = useState({});

  // Share toast
  const [shareToast, setShareToast] = useState(false);

  // ─── Fetch ─────────────────────────────────────────────────────────────
  useEffect(() => { fetchSchema(); fetchForms(); }, []);

  useEffect(() => {
    if (deepLinkId && savedForms.length > 0) {
      const found = savedForms.find(f => f.id === deepLinkId);
      if (found) openFillMode(found);
    }
  }, [deepLinkId, savedForms]);

  const fetchSchema = async () => {
    setSchemaLoading(true); setSchemaError(null);
    try {
      const { data, error } = await supabase.rpc('get_schema_info');
      if (error) throw error;
      setSchema(data || []);
    } catch (err) {
      setSchemaError(err.message || 'Run the SQL migration first.');
    }
    setSchemaLoading(false);
  };

  const fetchForms = async () => {
    setFormsLoading(true);
    const { data } = await supabase.from('form_configs').select('*').order('updated_at', { ascending: false });
    setSavedForms(data || []);
    setFormsLoading(false);
  };

  const copyShareLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?view=form&id=${id}`);
    setShareToast(true); setTimeout(() => setShareToast(false), 2000);
  };

  const ShareToast = () => shareToast ? (
    <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"><CheckCircle2 size={16} /> Link copied!</div>
  ) : null;

  // ─── Schema helpers ────────────────────────────────────────────────────
  const HIDDEN_TABLES = ['form_configs', 'app_configs', 'report_configs'];
  const tables = [...new Set(schema.map(c => c.table_name))].filter(t => !HIDDEN_TABLES.includes(t)).sort();
  const filteredTables = tables.filter(t => t.toLowerCase().includes(tableSearch.toLowerCase()));
  const getTableColumns = (tableName) => schema.filter(c => c.table_name === tableName).sort((a, b) => a.ordinal_position - b.ordinal_position);
  const toggleTable = (t) => setExpandedTables(prev => ({ ...prev, [t]: !prev[t] }));

  // ─── Builder actions ───────────────────────────────────────────────────
  const newForm = () => { setFormName(''); setFormDesc(''); setFormFields([]); setEditingFormId(null); setEditingFieldIdx(null); setView('builder'); };

  const loadForm = (form) => { setFormName(form.name); setFormDesc(form.description || ''); setFormFields(form.config?.fields || []); setEditingFormId(form.id); setEditingFieldIdx(null); setView('builder'); };

  const addFieldFromSchema = (table, col) => {
    if (formFields.find(f => f.table === table && f.column === col.column_name)) return;
    setFormFields(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
      table, column: col.column_name,
      label: col.column_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      type: mapDbType(col.data_type),
      required: col.is_nullable === 'NO' && !col.column_default,
      placeholder: '', defaultValue: '', helpText: '',
      options: '', width: 'full', section: '',
      // Cascading dropdown
      parentField: '', lookupTable: '', lookupColumn: '', lookupLabel: '', filterColumn: '',
      // Calculated
      formula: '',
      // Currency
      currencySymbol: '$',
      // Paragraph / Header
      displayText: ''
    }]);
  };

  const addCustomField = () => {
    setFormFields(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
      table: '', column: '', label: 'Custom Field', type: 'text',
      required: false, placeholder: '', defaultValue: '', helpText: '',
      options: '', width: 'full', section: '',
      parentField: '', lookupTable: '', lookupColumn: '', lookupLabel: '', filterColumn: '',
      formula: '', currencySymbol: '$', displayText: ''
    }]);
  };

  const updateField = (idx, patch) => setFormFields(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));
  const removeField = (idx) => { setFormFields(prev => prev.filter((_, i) => i !== idx)); if (editingFieldIdx === idx) setEditingFieldIdx(null); };
  const moveField = (idx, dir) => { const arr = [...formFields]; const ni = idx + dir; if (ni < 0 || ni >= arr.length) return; [arr[idx], arr[ni]] = [arr[ni], arr[idx]]; setFormFields(arr); if (editingFieldIdx === idx) setEditingFieldIdx(ni); };

  const saveForm = async () => {
    if (!formName.trim()) return alert('Please name your form.');
    if (formFields.length === 0) return alert('Add at least one field.');
    const config = { fields: formFields };
    if (editingFormId) {
      await supabase.from('form_configs').update({ name: formName, description: formDesc, config, updated_at: new Date().toISOString() }).eq('id', editingFormId);
    } else {
      const { data } = await supabase.from('form_configs').insert({ name: formName, description: formDesc, config }).select().single();
      if (data) setEditingFormId(data.id);
    }
    fetchForms();
  };

  const duplicateForm = async (form) => { await supabase.from('form_configs').insert({ name: form.name + ' (Copy)', description: form.description, config: form.config }); fetchForms(); };
  const deleteForm = async (id) => { if (!confirm('Delete?')) return; await supabase.from('form_configs').delete().eq('id', id); setSavedForms(prev => prev.filter(f => f.id !== id)); if (editingFormId === id) setView('list'); };

  // ─── Cascade fetching ─────────────────────────────────────────────────
  const fetchCascadeOptions = async (field, parentValue) => {
    const cacheKey = `${field.lookupTable}:${field.lookupColumn}:${field.filterColumn}:${parentValue}`;
    if (cascadeCache[cacheKey]) return cascadeCache[cacheKey];
    let q = supabase.from(field.lookupTable).select(`${field.lookupColumn}, ${field.lookupLabel || field.lookupColumn}`);
    if (field.filterColumn && parentValue) {
      q = q.eq(field.filterColumn, parentValue);
    }
    const { data } = await q;
    const opts = data || [];
    setCascadeCache(prev => ({ ...prev, [cacheKey]: opts }));
    return opts;
  };

  // ─── Fill / Submit ─────────────────────────────────────────────────────
  const openFillMode = (form) => {
    setFillFormConfig(form);
    const initial = {};
    (form.config?.fields || []).forEach(f => { initial[f.id] = f.defaultValue || ''; });
    setFillValues(initial); setFillError(null); setCascadeCache({}); setView('fill');
  };

  const submitForm = async () => {
    if (!fillFormConfig) return;
    setFillSubmitting(true); setFillError(null);
    const fields = fillFormConfig.config?.fields || [];
    for (const f of fields) {
      if (f.required && !['header', 'paragraph', 'calculated'].includes(f.type) && !fillValues[f.id]?.toString().trim()) {
        setFillError(`"${f.label}" is required.`); setFillSubmitting(false); return;
      }
    }
    const tableData = {};
    fields.forEach(f => {
      if (!f.table || !f.column || ['header', 'paragraph', 'calculated'].includes(f.type)) return;
      if (!tableData[f.table]) tableData[f.table] = {};
      let val = fillValues[f.id] || null;
      if (f.type === 'multicheck' || f.type === 'listbox') {
        val = Array.isArray(val) ? val.join(', ') : val;
      }
      tableData[f.table][f.column] = val;
    });
    try {
      for (const [table, rowData] of Object.entries(tableData)) {
        const { error } = await supabase.from(table).insert(rowData);
        if (error) throw new Error(`Error inserting into ${table}: ${error.message}`);
      }
      setView('submitted');
    } catch (err) { setFillError(err.message); }
    setFillSubmitting(false);
  };

  // ─── Field Renderer ────────────────────────────────────────────────────
  const CascadeDropdown = ({ field }) => {
    const [opts, setOpts] = useState([]);
    const parentVal = field.parentField ? fillValues[field.parentField] : '';
    useEffect(() => {
      if (field.lookupTable) {
        fetchCascadeOptions(field, parentVal).then(setOpts);
      }
    }, [parentVal, field.lookupTable]);

    return (
      <select value={fillValues[field.id] || ''} onChange={e => setFillValues(prev => ({ ...prev, [field.id]: e.target.value }))}
        required={field.required} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm bg-white">
        <option value="">Select...</option>
        {opts.map((o, i) => {
          const val = o[field.lookupColumn] || '';
          const lbl = o[field.lookupLabel || field.lookupColumn] || val;
          return <option key={i} value={val}>{lbl}</option>;
        })}
      </select>
    );
  };

  const renderFieldInput = (field) => {
    const base = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm";
    const val = fillValues[field.id] || '';
    const onChange = (v) => setFillValues(prev => ({ ...prev, [field.id]: v }));

    switch (field.type) {
      case 'textarea':
        return <textarea value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} rows={3} className={base} />;
      case 'select':
        return (
          <select value={val} onChange={e => onChange(e.target.value)} className={base + ' bg-white'}>
            <option value="">Select...</option>
            {(field.options || '').split(',').filter(Boolean).map(o => <option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}
          </select>
        );
      case 'cascade':
        return <CascadeDropdown field={field} />;
      case 'radio':
        return (
          <div className="flex flex-wrap gap-3">
            {(field.options || '').split(',').filter(Boolean).map(o => (
              <label key={o.trim()} className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-700">
                <input type="radio" name={field.id} value={o.trim()} checked={val === o.trim()} onChange={e => onChange(e.target.value)} className="text-violet-600" />
                {o.trim()}
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={val === 'true' || val === true} onChange={e => onChange(e.target.checked.toString())} className="rounded border-slate-300 text-violet-600 w-5 h-5" />
            <span className="text-sm text-slate-600">{field.placeholder || 'Yes'}</span>
          </label>
        );
      case 'multicheck':
        const mcVals = Array.isArray(val) ? val : (val ? val.split(',').map(s => s.trim()) : []);
        return (
          <div className="flex flex-wrap gap-2">
            {(field.options || '').split(',').filter(Boolean).map(o => {
              const ot = o.trim();
              const checked = mcVals.includes(ot);
              return (
                <label key={ot} className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 hover:bg-violet-50">
                  <input type="checkbox" checked={checked} onChange={() => {
                    const next = checked ? mcVals.filter(v => v !== ot) : [...mcVals, ot];
                    onChange(next);
                  }} className="rounded border-slate-300 text-violet-600" />
                  {ot}
                </label>
              );
            })}
          </div>
        );
      case 'listbox':
        const lbVals = Array.isArray(val) ? val : (val ? val.split(',').map(s => s.trim()) : []);
        return (
          <select multiple value={lbVals} onChange={e => onChange([...e.target.selectedOptions].map(o => o.value))}
            className={base + ' bg-white min-h-[80px]'}>
            {(field.options || '').split(',').filter(Boolean).map(o => <option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}
          </select>
        );
      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{field.currencySymbol || '$'}</span>
            <input type="number" step="0.01" value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder}
              className={base + ' pl-7'} />
          </div>
        );
      case 'hidden':
        return <p className="text-xs text-slate-400 italic">Hidden field (value: {field.defaultValue || 'none'})</p>;
      case 'header':
        return null; // rendered by parent
      case 'paragraph':
        return <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">{field.displayText || field.placeholder}</p>;
      case 'calculated':
        const calcVal = computeFormula(field.formula);
        return <p className="text-sm font-medium text-violet-700 bg-violet-50 px-3 py-2 rounded-lg">{calcVal}</p>;
      case 'password':
        return <input type="password" value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className={base} />;
      default:
        return <input type={field.type || 'text'} value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className={base} />;
    }
  };

  const computeFormula = (formula) => {
    if (!formula) return '';
    try {
      let expr = formula;
      formFields.forEach(f => {
        const val = fillValues[f.id] || '0';
        expr = expr.replace(new RegExp(`\\{${f.label}\\}`, 'gi'), parseFloat(val) || 0);
      });
      return new Function('return ' + expr)();
    } catch { return 'Error'; }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Submitted
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'submitted') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center max-w-xl mx-auto mt-12">
        <CheckCircle2 size={56} className="mx-auto text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Submitted Successfully!</h2>
        <p className="text-slate-500 mb-6">The form data has been written to Supabase.</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => openFillMode(fillFormConfig)} className="px-4 py-2 text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg font-medium text-sm">Submit Another</button>
          <button onClick={() => setView('list')} className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-sm">← All Forms</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Fill Mode
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'fill') {
    const fields = fillFormConfig?.config?.fields || [];
    const sections = [...new Set(fields.map(f => f.section || ''))];
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
            <button onClick={() => setView('list')} className="text-violet-200 hover:text-white text-sm mb-2 block">← Back to Forms</button>
            <h2 className="text-2xl font-bold">{fillFormConfig?.name || 'Form'}</h2>
            {fillFormConfig?.description && <p className="text-violet-200 mt-1">{fillFormConfig.description}</p>}
          </div>
          <div className="p-8">
            {fillError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2 text-sm">
                <AlertCircle size={16} /> {fillError}
              </div>
            )}
            {sections.map(section => (
              <div key={section || '__default'}>
                {section && <h3 className="text-lg font-semibold text-slate-700 mb-3 mt-6 pb-2 border-b border-slate-200">{section}</h3>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {fields.filter(f => (f.section || '') === section).map(field => {
                    if (field.type === 'hidden') return <input key={field.id} type="hidden" value={field.defaultValue || ''} />;
                    if (field.type === 'header') return (
                      <div key={field.id} className="md:col-span-2 mt-4">
                        <h4 className="text-base font-bold text-slate-800 pb-1 border-b-2 border-violet-300">{field.label}</h4>
                        {field.displayText && <p className="text-xs text-slate-400 mt-1">{field.displayText}</p>}
                      </div>
                    );
                    return (
                      <div key={field.id} className={field.width === 'half' ? '' : 'md:col-span-2'}>
                        {field.type !== 'paragraph' && (
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                        )}
                        {field.helpText && <p className="text-xs text-slate-400 mb-1">{field.helpText}</p>}
                        {renderFieldInput(field)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setView('list')} className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={submitForm} disabled={fillSubmitting} className="px-6 py-2 text-white bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium disabled:opacity-50">
                {fillSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Saved Forms List
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[85vh]">
        <ShareToast />
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center"><FileText className="mr-2 text-violet-600" /> Form Builder</h2>
            <p className="text-sm text-slate-500 mt-1">Design forms that write directly to any Supabase table</p>
          </div>
          <button onClick={newForm} className="px-4 py-2 text-white bg-violet-600 hover:bg-violet-700 rounded-lg flex items-center text-sm font-medium shadow-sm">
            <Plus size={16} className="mr-1.5" /> New Form
          </button>
        </div>
        {schemaError && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5" /><div><strong>Schema not available:</strong> {schemaError}</div>
          </div>
        )}
        <div className="flex-1 overflow-auto p-6">
          {formsLoading ? <p className="text-center text-slate-400 py-8">Loading forms...</p>
          : savedForms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileText size={48} className="mb-4 opacity-40" />
              <p className="text-lg font-medium text-slate-500">No forms yet</p>
              <p className="text-sm mt-1">Click "New Form" to design your first data entry form</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedForms.map(form => {
                const fields = form.config?.fields || [];
                const formTables = [...new Set(fields.filter(f => f.table).map(f => f.table))];
                return (
                  <div key={form.id} className="group border border-slate-200 rounded-xl p-5 hover:border-violet-300 hover:shadow-md transition-all bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-slate-800 truncate pr-2">{form.name}</h3>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => copyShareLink(form.id)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Share2 size={14} /></button>
                        <button onClick={() => duplicateForm(form)} className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded"><Copy size={14} /></button>
                        <button onClick={() => deleteForm(form.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    {form.description && <p className="text-xs text-slate-400 mb-2 truncate">{form.description}</p>}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {formTables.map(t => <span key={t} className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-medium">{t}</span>)}
                      <span className="text-xs text-slate-400">{fields.length} field(s)</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => loadForm(form)} className="flex-1 px-3 py-2 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg flex items-center justify-center"><Pencil size={14} className="mr-1" /> Edit</button>
                      <button onClick={() => openFillMode(form)} className="flex-1 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center"><Eye size={14} className="mr-1" /> Fill</button>
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
  // RENDER: Builder / Designer
  // ═══════════════════════════════════════════════════════════════════════
  const ef = editingFieldIdx !== null ? formFields[editingFieldIdx] : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[85vh]">
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600">←</button>
          <div className="flex-1">
            <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Form Name..." className="text-xl font-bold text-slate-800 outline-none border-b-2 border-transparent focus:border-violet-400 bg-transparent w-full" />
            <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Description (optional)" className="text-sm text-slate-400 outline-none bg-transparent w-full mt-0.5" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { saveForm(); openFillMode({ name: formName, description: formDesc, config: { fields: formFields } }); }} disabled={formFields.length === 0}
            className="px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-sm font-medium disabled:opacity-40 flex items-center"><Eye size={16} className="mr-1" /> Preview</button>
          <button onClick={saveForm} className="px-4 py-2 text-white bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium shadow-sm flex items-center"><Save size={16} className="mr-1" /> Save</button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT: Table Picker */}
        <div className="w-64 border-r border-slate-200 flex flex-col bg-slate-50 flex-shrink-0">
          <div className="p-3 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Search tables..." value={tableSearch} onChange={e => setTableSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-violet-400" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {schemaLoading ? <p className="text-center text-slate-400 py-4 text-xs">Loading...</p>
            : schemaError ? <p className="text-center text-red-400 py-4 text-xs">Unavailable</p>
            : filteredTables.map(table => (
              <div key={table} className="mb-1">
                <button onClick={() => toggleTable(table)} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-white rounded">
                  {expandedTables[table] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Layers size={14} className="text-violet-500" />{table}
                </button>
                {expandedTables[table] && (
                  <div className="ml-7 space-y-0.5 pb-1">
                    {getTableColumns(table).map(col => {
                      const added = formFields.some(f => f.table === table && f.column === col.column_name);
                      return (
                        <button key={col.column_name} onClick={() => addFieldFromSchema(table, col)} disabled={added}
                          className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${added ? 'bg-violet-50 text-violet-500' : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'}`}>
                          <span className="truncate">{col.column_name}</span>
                          <span className="text-[10px] text-slate-400 ml-1">{col.data_type.slice(0, 8)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-slate-200">
            <button onClick={addCustomField} className="w-full px-3 py-2 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg flex items-center justify-center"><Plus size={14} className="mr-1" /> Custom Field</button>
          </div>
        </div>

        {/* CENTER: Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {formFields.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Layers size={48} className="mb-4 opacity-30" />
              <p className="text-lg font-medium text-slate-500">No fields yet</p>
              <p className="text-sm mt-1">Expand a table and click columns to add them</p>
            </div>
          ) : (
            <div className="space-y-2 max-w-2xl mx-auto">
              {formFields.map((field, idx) => (
                <div key={field.id} onClick={() => setEditingFieldIdx(idx)}
                  className={`bg-white border rounded-lg p-4 cursor-pointer group transition-all ${editingFieldIdx === idx ? 'border-violet-400 ring-2 ring-violet-100 shadow-sm' : 'border-slate-200 hover:border-violet-300'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <GripVertical size={14} className="text-slate-300" />
                      <span className="font-medium text-sm text-slate-800">{field.label}</span>
                      {field.required && <span className="text-red-500 text-[10px]">REQ</span>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={e => { e.stopPropagation(); moveField(idx, -1); }} className="p-1 text-slate-400 hover:text-slate-600 rounded">↑</button>
                      <button onClick={e => { e.stopPropagation(); moveField(idx, 1); }} className="p-1 text-slate-400 hover:text-slate-600 rounded">↓</button>
                      <button onClick={e => { e.stopPropagation(); removeField(idx); }} className="p-1 text-red-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    {field.table && <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">{field.table}.{field.column}</span>}
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded">{FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}</span>
                    {field.width === 'half' && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">½</span>}
                    {field.type === 'cascade' && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">cascade</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Properties Panel */}
        {ef && (
          <div className="w-80 border-l border-slate-200 bg-white flex-shrink-0 overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h4 className="font-semibold text-sm text-slate-700 flex items-center"><Settings size={14} className="mr-1.5" /> Field Settings</h4>
              <button onClick={() => setEditingFieldIdx(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              {/* Label */}
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Label</label>
                <input type="text" value={ef.label} onChange={e => updateField(editingFieldIdx, { label: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-violet-400" /></div>

              {/* Type */}
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Field Type</label>
                <select value={ef.type} onChange={e => updateField(editingFieldIdx, { type: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-violet-400 bg-white">
                  {(() => {
                    const groups = [...new Set(FIELD_TYPES.map(t => t.group))];
                    return groups.map(g => (
                      <optgroup key={g} label={g}>
                        {FIELD_TYPES.filter(t => t.group === g).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </optgroup>
                    ));
                  })()}
                </select>
              </div>

              {/* Placeholder */}
              {!['header', 'paragraph', 'hidden', 'calculated'].includes(ef.type) && (
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Placeholder</label>
                  <input type="text" value={ef.placeholder} onChange={e => updateField(editingFieldIdx, { placeholder: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-violet-400" /></div>
              )}

              {/* Default Value */}
              {!['header', 'paragraph'].includes(ef.type) && (
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Default Value</label>
                  <input type="text" value={ef.defaultValue} onChange={e => updateField(editingFieldIdx, { defaultValue: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-violet-400" /></div>
              )}

              {/* Help Text */}
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Help Text</label>
                <input type="text" value={ef.helpText} onChange={e => updateField(editingFieldIdx, { helpText: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-violet-400" /></div>

              {/* Display text for Header/Paragraph */}
              {['header', 'paragraph'].includes(ef.type) && (
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Display Text</label>
                  <textarea value={ef.displayText} onChange={e => updateField(editingFieldIdx, { displayText: e.target.value })} rows={3}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-violet-400" /></div>
              )}

              {/* Options for dropdown/radio/multicheck/listbox */}
              {['select', 'radio', 'multicheck', 'listbox'].includes(ef.type) && (
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Options (comma-separated)</label>
                  <textarea value={ef.options} onChange={e => updateField(editingFieldIdx, { options: e.target.value })} placeholder="Option 1, Option 2, ..." rows={2}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-violet-400" /></div>
              )}

              {/* CASCADING DROPDOWN settings */}
              {ef.type === 'cascade' && (
                <div className="bg-blue-50 rounded-lg p-3 space-y-2 border border-blue-200">
                  <p className="text-xs font-bold text-blue-700 uppercase">Cascade Settings</p>
                  <div><label className="block text-xs text-blue-600 mb-0.5">Lookup Table</label>
                    <select value={ef.lookupTable} onChange={e => updateField(editingFieldIdx, { lookupTable: e.target.value })} className="w-full px-2 py-1 border border-blue-300 rounded text-xs bg-white outline-none">
                      <option value="">Select table...</option>
                      {tables.map(t => <option key={t} value={t}>{t}</option>)}
                    </select></div>
                  {ef.lookupTable && (
                    <>
                      <div><label className="block text-xs text-blue-600 mb-0.5">Value Column</label>
                        <select value={ef.lookupColumn} onChange={e => updateField(editingFieldIdx, { lookupColumn: e.target.value })} className="w-full px-2 py-1 border border-blue-300 rounded text-xs bg-white outline-none">
                          <option value="">Select...</option>
                          {getTableColumns(ef.lookupTable).map(c => <option key={c.column_name} value={c.column_name}>{c.column_name}</option>)}
                        </select></div>
                      <div><label className="block text-xs text-blue-600 mb-0.5">Display Column</label>
                        <select value={ef.lookupLabel} onChange={e => updateField(editingFieldIdx, { lookupLabel: e.target.value })} className="w-full px-2 py-1 border border-blue-300 rounded text-xs bg-white outline-none">
                          <option value="">(same as value)</option>
                          {getTableColumns(ef.lookupTable).map(c => <option key={c.column_name} value={c.column_name}>{c.column_name}</option>)}
                        </select></div>
                      <div><label className="block text-xs text-blue-600 mb-0.5">Filter Column (filtered by parent)</label>
                        <select value={ef.filterColumn} onChange={e => updateField(editingFieldIdx, { filterColumn: e.target.value })} className="w-full px-2 py-1 border border-blue-300 rounded text-xs bg-white outline-none">
                          <option value="">(none - show all)</option>
                          {getTableColumns(ef.lookupTable).map(c => <option key={c.column_name} value={c.column_name}>{c.column_name}</option>)}
                        </select></div>
                      <div><label className="block text-xs text-blue-600 mb-0.5">Parent Field (controls filter)</label>
                        <select value={ef.parentField} onChange={e => updateField(editingFieldIdx, { parentField: e.target.value })} className="w-full px-2 py-1 border border-blue-300 rounded text-xs bg-white outline-none">
                          <option value="">(none)</option>
                          {formFields.filter(f => f.id !== ef.id).map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                        </select></div>
                    </>
                  )}
                </div>
              )}

              {/* Currency symbol */}
              {ef.type === 'currency' && (
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Currency Symbol</label>
                  <input type="text" value={ef.currencySymbol} onChange={e => updateField(editingFieldIdx, { currencySymbol: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-violet-400" /></div>
              )}

              {/* Calculated formula */}
              {ef.type === 'calculated' && (
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Formula</label>
                  <input type="text" value={ef.formula} onChange={e => updateField(editingFieldIdx, { formula: e.target.value })} placeholder="{Field A} + {Field B}" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-violet-400" />
                  <p className="text-[10px] text-slate-400 mt-1">Use {'{Field Label}'} to reference other fields</p></div>
              )}

              {/* Section / Width */}
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Section</label>
                <input type="text" value={ef.section} onChange={e => updateField(editingFieldIdx, { section: e.target.value })} placeholder="e.g. Personal Info" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-violet-400" /></div>

              <div><label className="block text-xs font-medium text-slate-500 mb-1">Width</label>
                <select value={ef.width} onChange={e => updateField(editingFieldIdx, { width: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-violet-400 bg-white">
                  <option value="full">Full Width</option>
                  <option value="half">Half Width</option>
                </select></div>

              {/* Required */}
              {!['header', 'paragraph', 'calculated'].includes(ef.type) && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={ef.required} onChange={e => updateField(editingFieldIdx, { required: e.target.checked })} className="rounded border-slate-300 text-violet-600" />
                  <span className="text-sm text-slate-700 font-medium">Required</span>
                </label>
              )}

              {/* Source info */}
              {ef.table && (
                <div className="pt-3 border-t border-slate-200 text-xs text-slate-400">
                  <p>Table: <span className="font-mono text-slate-600">{ef.table}</span></p>
                  <p>Column: <span className="font-mono text-slate-600">{ef.column}</span></p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
