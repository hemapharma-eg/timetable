import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useParams } from 'react-router-dom';
import { Search, Table, Eye, Filter, BarChart3, PieChart, LineChart, X, ArrowUpDown, ChevronLeft, ChevronRight, Hash, List } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, LineChart as ReLineChart, Line } from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function DynamicPage({ session, userMeta, permissions }) {
  const { pageId } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('app_pages').select('*').eq('id', pageId).single();
      if (!error) setPage(data);
      setLoading(false);
    };
    fetchPage();
  }, [pageId]);

  if (loading) return <div className="flex h-full items-center justify-center">Loading page...</div>;
  if (!page) return <div className="flex h-full items-center justify-center">Page not found</div>;

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{page.name}</h2>
        <p className="text-sm text-slate-500 uppercase tracking-wider font-bold mt-1">
          {page.type === 'app' ? 'Database Application' : 'Interactive Report'}
        </p>
      </div>

      <div className="flex-1 min-h-0">
        {page.type === 'app' ? (
          <AppView page={page} />
        ) : (
          <DashboardView page={page} />
        )}
      </div>
    </div>
  );
}

function AppView({ page }) {
  const config = page.configuration || {};
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerms, setSearchTerms] = useState({});
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    if (config.sourceTable) {
      supabase.rpc('get_table_columns', { p_table: config.sourceTable }).then(({ data }) => setColumns(data || []));
      fetchData();
    }
  }, [config.sourceTable]);

  const fetchData = async () => {
    if (!config.sourceTable) return;
    setLoading(true);
    let query = supabase.from(config.sourceTable).select('*');
    
    // Apply basic search
    Object.entries(searchTerms).forEach(([col, val]) => {
      if (val) query = query.ilike(col, `%${val}%`);
    });

    const { data, error } = await query.limit(100);
    if (!error) setData(data || []);
    setLoading(false);
  };

  if (!config.sourceTable) {
    return <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white">App source table not configured.</div>;
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Search Bar */}
      {config.searchFields?.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
          {config.searchFields.map(field => (
            <div key={field} className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{field.replace(/_/g, ' ')}</label>
              <input 
                type="text" 
                placeholder={`Search ${field}...`}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerms[field] || ''}
                onChange={e => setSearchTerms({...searchTerms, [field]: e.target.value})}
              />
            </div>
          ))}
          <button 
            onClick={fetchData}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 h-[38px]"
          >
            <Search size={16} /> Search
          </button>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="p-4 font-bold w-12 text-center">Details</th>
                {(config.resultColumns?.length > 0 ? config.resultColumns : columns.map(c => c.column_name).slice(0, 5)).map(col => (
                  <th key={col} className="p-4 font-bold whitespace-nowrap uppercase tracking-wider text-[11px]">{col.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => setSelectedRecord(row)}
                      className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                  {(config.resultColumns?.length > 0 ? config.resultColumns : columns.map(c => c.column_name).slice(0, 5)).map(col => (
                    <td key={col} className="p-4 truncate max-w-[200px] text-slate-600">{String(row[col] ?? '')}</td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && !loading && (
                <tr><td colSpan={10} className="p-12 text-center text-slate-400 italic">No records found matching your criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">Record Details</h3>
              <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(config.detailFields?.length > 0 ? config.detailFields : columns.map(c => c.column_name)).map(field => (
                  <div key={field} className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{field.replace(/_/g, ' ')}</label>
                    <div className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 min-h-[42px] break-words">
                      {String(selectedRecord[field] ?? '—')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button onClick={() => setSelectedRecord(null)} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardView({ page }) {
  const config = page.configuration || {};
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    if (config.sourceTable) fetchData();
  }, [config.sourceTable]);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from(config.sourceTable).select('*');
    
    Object.entries(filters).forEach(([col, val]) => {
      if (val) query = query.eq(col, val);
    });

    const { data, error } = await query.limit(500);
    if (!error) setData(data || []);
    setLoading(false);
  };

  const getAggregation = (widget) => {
    if (!widget.column || data.length === 0) return 0;
    const vals = data.map(d => Number(d[widget.column])).filter(v => !isNaN(v));
    
    if (widget.aggregation === 'sum') return vals.reduce((a, b) => a + b, 0);
    if (widget.aggregation === 'avg') return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : 0;
    return data.length; // Default to count
  };

  const getChartData = (widget) => {
    if (!widget.column) return [];
    const counts = {};
    data.forEach(d => {
      const val = d[widget.column] || 'Unknown';
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10);
  };

  if (!config.sourceTable) {
    return <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white">Report source table not configured.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Filters */}
      {config.filters?.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
          {config.filters.map(field => {
            const uniqueVals = [...new Set(data.map(d => d[field]))].filter(v => v !== null && v !== undefined).sort();
            return (
              <div key={field} className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{field.replace(/_/g, ' ')}</label>
                <select 
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                  value={filters[field] || ''}
                  onChange={e => {
                    const newFilters = {...filters, [field]: e.target.value};
                    setFilters(newFilters);
                    // In a real app, you'd trigger re-fetch or filter local data
                  }}
                >
                  <option value="">All</option>
                  {uniqueVals.map(v => <option key={String(v)} value={String(v)}>{String(v)}</option>)}
                </select>
              </div>
            );
          })}
          <button 
            onClick={fetchData}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 h-[38px]"
          >
            <Filter size={16} /> Filter
          </button>
        </div>
      )}

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {config.widgets?.map(widget => (
          <div key={widget.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col ${widget.width === 'full' ? 'lg:col-span-4 md:col-span-2' : (widget.type === 'stat' ? 'col-span-1' : 'lg:col-span-2 md:col-span-2')}`}>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">{widget.title}</h4>
            
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              {widget.type === 'stat' && (
                <div className="text-center">
                  <div className="text-4xl font-black text-slate-800">{getAggregation(widget)}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                    {widget.aggregation} of {widget.column || 'Records'}
                  </div>
                </div>
              )}

              {(widget.type === 'chart_bar' || widget.type === 'chart_pie') && (
                <div className="w-full h-full min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {widget.type === 'chart_bar' ? (
                      <BarChart data={getChartData(widget)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={10} tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <YAxis fontSize={10} tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                        <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : (
                      <RePieChart>
                        <Pie data={getChartData(widget)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                          {getChartData(widget).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}

              {widget.type === 'table' && (
                <div className="w-full h-full max-h-[300px] overflow-y-auto">
                   <table className="w-full text-left text-[11px]">
                      <thead className="sticky top-0 bg-white shadow-sm">
                        <tr className="text-slate-400 uppercase font-bold border-b border-slate-100">
                          {widget.column ? <th className="p-2">{widget.column}</th> : <th className="p-2">Columns</th>}
                          <th className="p-2 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {data.slice(0, 10).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 text-slate-600 font-medium">{String(row[widget.column] || '—')}</td>
                            <td className="p-2 text-right text-slate-400">{i + 1}</td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {(!config.widgets || config.widgets.length === 0) && (
        <div className="py-20 text-center text-slate-400 italic bg-white rounded-3xl border border-dashed border-slate-200 shadow-inner">
           No widgets configured for this dashboard.
        </div>
      )}
    </div>
  );
}
