import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { BarChart3, PieChart, LineChart, Table as TableIcon, Layout, Plus, Trash2, X, Save, Filter, Hash, Type, Calendar } from 'lucide-react';

export function DashboardBuilder({ page, onSave, onCancel }) {
  const [tables, setTables] = useState([]);
  const [columns, setColumns] = useState([]);
  const [config, setConfig] = useState(page.configuration || {
    sourceTable: '',
    widgets: [],
    filters: []
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

  const addWidget = (type) => {
    const newWidget = {
      id: Date.now().toString(),
      type: type,
      title: 'New Widget',
      column: '',
      aggregation: 'count', // count, sum, avg
      width: 'full' // full, half
    };
    setConfig({ ...config, widgets: [...config.widgets, newWidget] });
  };

  const removeWidget = (id) => {
    setConfig({ ...config, widgets: config.widgets.filter(w => w.id !== id) });
  };

  const updateWidget = (id, updates) => {
    setConfig({
      ...config,
      widgets: config.widgets.map(w => w.id === id ? { ...w, ...updates } : w)
    });
  };

  const toggleFilter = (column) => {
    const current = [...(config.filters || [])];
    if (current.includes(column)) {
      setConfig({ ...config, filters: current.filter(f => f !== column) });
    } else {
      setConfig({ ...config, filters: [...current, column] });
    }
  };

  const handleSave = async () => {
    const { error } = await supabase.from('app_pages').update({ configuration: config }).eq('id', page.id);
    if (!error) onSave();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-2xl">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-emerald-600" size={24} /> Dashboard Builder: <span className="text-emerald-600">{page.name}</span>
            </h3>
            <p className="text-sm text-slate-500 mt-1">Design interactive reports and data visualizations</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar: Controls */}
          <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-8">
            <section>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Data Source</label>
              <select 
                value={config.sourceTable} 
                onChange={e => setConfig({ ...config, sourceTable: e.target.value, widgets: [], filters: [] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Table...</option>
                {tables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </section>

            {config.sourceTable && (
              <>
                <section>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Add Widgets</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addWidget('stat')} className="flex flex-col items-center gap-2 p-3 border border-slate-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all group">
                      <Hash size={20} className="text-slate-400 group-hover:text-emerald-600" />
                      <span className="text-[10px] font-bold text-slate-600">Stat Card</span>
                    </button>
                    <button onClick={() => addWidget('chart_bar')} className="flex flex-col items-center gap-2 p-3 border border-slate-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all group">
                      <BarChart3 size={20} className="text-slate-400 group-hover:text-emerald-600" />
                      <span className="text-[10px] font-bold text-slate-600">Bar Chart</span>
                    </button>
                    <button onClick={() => addWidget('chart_pie')} className="flex flex-col items-center gap-2 p-3 border border-slate-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all group">
                      <PieChart size={20} className="text-slate-400 group-hover:text-emerald-600" />
                      <span className="text-[10px] font-bold text-slate-600">Pie Chart</span>
                    </button>
                    <button onClick={() => addWidget('table')} className="flex flex-col items-center gap-2 p-3 border border-slate-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all group">
                      <TableIcon size={20} className="text-slate-400 group-hover:text-emerald-600" />
                      <span className="text-[10px] font-bold text-slate-600">Data Table</span>
                    </button>
                  </div>
                </section>

                <section>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Interactive Filters</label>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                    {columns.map(c => (
                      <label key={c.column_name} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={config.filters.includes(c.column_name)}
                          onChange={() => toggleFilter(c.column_name)}
                          className="rounded text-emerald-600" 
                        />
                        <span className="text-xs text-slate-700">{c.column_name}</span>
                      </label>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>

          {/* Main: Canvas */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50">
            {!config.sourceTable ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white">
                <TableIcon size={48} className="mb-4 opacity-10" />
                <p className="font-bold">Select a data source to begin building</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Filters Preview */}
                {config.filters.length > 0 && (
                  <div className="flex flex-wrap gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    {config.filters.map(f => (
                      <div key={f} className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">{f}</label>
                        <div className="h-8 w-32 bg-slate-50 border border-slate-200 rounded-md flex items-center px-2 text-[10px] text-slate-400">Filter Input</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Widgets Grid */}
                <div className="grid grid-cols-2 gap-6">
                  {config.widgets.map(w => (
                    <div key={w.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative group ${w.width === 'full' ? 'col-span-2' : 'col-span-1'}`}>
                      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <select 
                            value={w.width} 
                            onChange={e => updateWidget(w.id, { width: e.target.value })}
                            className="text-[10px] bg-slate-100 border-none rounded px-1"
                         >
                           <option value="half">Half</option>
                           <option value="full">Full</option>
                         </select>
                         <button onClick={() => removeWidget(w.id)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                      </div>

                      <div className="flex flex-col gap-4">
                        <input 
                          type="text" 
                          value={w.title}
                          onChange={e => updateWidget(w.id, { title: e.target.value })}
                          className="font-bold text-slate-800 border-none p-0 focus:ring-0 w-full"
                          placeholder="Widget Title"
                        />
                        
                        <div className="flex gap-4 items-end">
                           <div className="flex-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data Column</label>
                             <select 
                                value={w.column} 
                                onChange={e => updateWidget(w.id, { column: e.target.value })}
                                className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-slate-50"
                             >
                               <option value="">Select Column...</option>
                               {columns.map(c => <option key={c.column_name} value={c.column_name}>{c.column_name}</option>)}
                             </select>
                           </div>
                           {w.type === 'stat' && (
                             <div className="w-32">
                               <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Metric</label>
                               <select 
                                  value={w.aggregation} 
                                  onChange={e => updateWidget(w.id, { aggregation: e.target.value })}
                                  className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-slate-50"
                               >
                                 <option value="count">Count</option>
                                 <option value="sum">Sum</option>
                                 <option value="avg">Average</option>
                               </select>
                             </div>
                           )}
                        </div>

                        {/* Widget Preview Placeholder */}
                        <div className="h-32 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center">
                           {w.type === 'stat' && <Hash size={24} className="text-slate-300" />}
                           {w.type.startsWith('chart') && <BarChart3 size={24} className="text-slate-300" />}
                           {w.type === 'table' && <TableIcon size={24} className="text-slate-300" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {config.widgets.length === 0 && (
                   <div className="py-20 text-center text-slate-400 italic">
                      Add widgets from the sidebar to populate your dashboard
                   </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-200 flex justify-end gap-3 bg-white rounded-b-2xl">
          <button onClick={onCancel} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
          <button 
            onClick={handleSave}
            disabled={!config.sourceTable}
            className="flex items-center gap-2 px-10 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all disabled:opacity-30"
          >
            <Save size={18} /> Save Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
