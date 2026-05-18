import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Search, Table, Eye, Save, X, ChevronRight, ChevronLeft, Layout, Columns, CheckSquare, List } from 'lucide-react';

export function AppBuilder({ page, onSave, onCancel }) {
  const [step, setStep] = useState(1);
  const [tables, setTables] = useState([]);
  const [columns, setColumns] = useState([]);
  const [config, setConfig] = useState(page.configuration || {
    sourceTable: '',
    searchFields: [],
    resultColumns: [],
    detailFields: []
  });

  useEffect(() => {
    supabase.rpc('get_public_tables').then(({ data }) => setTables(data || []));
  }, []);

  useEffect(() => {
    if (config.sourceTable) {
      supabase.rpc('get_table_columns', { p_table: config.sourceTable }).then(({ data }) => {
        setColumns(data || []);
      });
    }
  }, [config.sourceTable]);

  const toggleField = (type, field) => {
    const current = [...(config[type] || [])];
    if (current.includes(field)) {
      setConfig({ ...config, [type]: current.filter(f => f !== field) });
    } else {
      setConfig({ ...config, [type]: [...current, field] });
    }
  };

  const handleSave = async () => {
    const { error } = await supabase.from('app_pages').update({ configuration: config }).eq('id', page.id);
    if (!error) onSave();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Layout className="text-indigo-600" size={24} /> App Builder: <span className="text-indigo-600">{page.name}</span>
            </h3>
            <p className="text-sm text-slate-500 mt-1">Configure how your database application looks and behaves</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {/* Stepper */}
        <div className="px-8 py-4 bg-white border-b border-slate-100 flex items-center gap-4">
          {[
            { id: 1, label: 'Source', icon: Table },
            { id: 2, label: 'Search', icon: Search },
            { id: 3, label: 'Results', icon: List },
            { id: 4, label: 'Details', icon: Eye },
          ].map((s, i) => (
            <React.Fragment key={s.id}>
              <div 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${step === s.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : (step > s.id ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400')}`}
              >
                <s.icon size={16} /> {s.label}
              </div>
              {i < 3 && <div className={`h-0.5 w-8 ${step > s.id + 1 ? 'bg-emerald-200' : 'bg-slate-100'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <label className="block text-sm font-bold text-indigo-900 mb-4 uppercase tracking-widest">Select Source Table</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tables.map(t => (
                    <button 
                      key={t}
                      onClick={() => setConfig({ ...config, sourceTable: t })}
                      className={`text-left px-4 py-4 rounded-xl border-2 transition-all flex items-center gap-3 ${config.sourceTable === t ? 'bg-white border-indigo-600 text-indigo-700 shadow-md scale-[1.02]' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                    >
                      <Table size={18} className={config.sourceTable === t ? 'text-indigo-600' : 'text-slate-400'} />
                      <span className="font-bold truncate">{t}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step > 1 && !config.sourceTable && (
            <div className="text-center py-12">
              <p className="text-red-500 font-bold">Please select a source table first.</p>
              <button onClick={() => setStep(1)} className="mt-4 text-indigo-600 underline">Back to Step 1</button>
            </div>
          )}

          {step === 2 && config.sourceTable && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <p className="text-slate-600">Select which fields should be available for searching.</p>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {columns.map(c => (
                   <label key={c.column_name} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${config.searchFields.includes(c.column_name) ? 'bg-blue-50 border-blue-600' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                     <input 
                       type="checkbox" 
                       className="w-5 h-5 rounded text-blue-600"
                       checked={config.searchFields.includes(c.column_name)}
                       onChange={() => toggleField('searchFields', c.column_name)}
                     />
                     <div className="flex flex-col">
                       <span className="font-bold text-slate-800 text-sm">{c.column_name}</span>
                       <span className="text-[10px] text-slate-400 font-mono uppercase">{c.data_type}</span>
                     </div>
                   </label>
                 ))}
               </div>
            </div>
          )}

          {step === 3 && config.sourceTable && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <p className="text-slate-600">Select which columns should be displayed in the results table.</p>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {columns.map(c => (
                   <label key={c.column_name} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${config.resultColumns.includes(c.column_name) ? 'bg-emerald-50 border-emerald-600' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                     <input 
                       type="checkbox" 
                       className="w-5 h-5 rounded text-emerald-600"
                       checked={config.resultColumns.includes(c.column_name)}
                       onChange={() => toggleField('resultColumns', c.column_name)}
                     />
                     <div className="flex flex-col">
                       <span className="font-bold text-slate-800 text-sm">{c.column_name}</span>
                       <span className="text-[10px] text-slate-400 font-mono uppercase">{c.data_type}</span>
                     </div>
                   </label>
                 ))}
               </div>
            </div>
          )}

          {step === 4 && config.sourceTable && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <p className="text-slate-600">Select which fields should be shown in the record details view.</p>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {columns.map(c => (
                   <label key={c.column_name} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${config.detailFields.includes(c.column_name) ? 'bg-amber-50 border-amber-600' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                     <input 
                       type="checkbox" 
                       className="w-5 h-5 rounded text-amber-600"
                       checked={config.detailFields.includes(c.column_name)}
                       onChange={() => toggleField('detailFields', c.column_name)}
                     />
                     <div className="flex flex-col">
                       <span className="font-bold text-slate-800 text-sm">{c.column_name}</span>
                       <span className="text-[10px] text-slate-400 font-mono uppercase">{c.data_type}</span>
                     </div>
                   </label>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 flex justify-between bg-slate-50/50 rounded-b-2xl">
          <button 
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-all disabled:opacity-30"
          >
            <ChevronLeft size={18} /> Back
          </button>
          
          <div className="flex gap-3">
            {step < 4 ? (
              <button 
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
              >
                Next Step <ChevronRight size={18} />
              </button>
            ) : (
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-10 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
              >
                <Save size={18} /> Save Application
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
