import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Layout, Plus, Trash2, Edit, Save, X, ChevronDown, ChevronUp, GripVertical, FileText, BarChart3, Settings } from 'lucide-react';
import { AppBuilder } from './AppBuilder';
import { DashboardBuilder } from './DashboardBuilder';

export function NavigationBuilder() {
  const [sections, setSections] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editingPage, setEditingPage] = useState(null);
  const [configuringPage, setConfiguringPage] = useState(null);
  const [newSectionName, setNewSectionName] = useState('');
  
  const fetchData = async () => {
    setLoading(true);
    const { data: secData } = await supabase.from('app_sections').select('*').order('order_index');
    const { data: pageData } = await supabase.from('app_pages').select('*').order('order_index');
    setSections(secData || []);
    setPages(pageData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addSection = async () => {
    if (!newSectionName.trim()) return;
    const { error } = await supabase.from('app_sections').insert([{ 
      name: newSectionName.trim(), 
      order_index: sections.length 
    }]);
    if (!error) {
      setNewSectionName('');
      fetchData();
    }
  };

  const deleteSection = async (id) => {
    if (!confirm('Are you sure? This will delete all pages in this section.')) return;
    const { error } = await supabase.from('app_sections').delete().eq('id', id);
    if (!error) fetchData();
  };

  const addPage = async (sectionId) => {
    const { data, error } = await supabase.from('app_pages').insert([{
      section_id: sectionId,
      name: 'New Page',
      type: 'app',
      configuration: {},
      order_index: pages.filter(p => p.section_id === sectionId).length
    }]).select();
    if (!error && data) {
      setEditingPage(data[0]);
      fetchData();
    }
  };

  const deletePage = async (id) => {
    if (!confirm('Are you sure?')) return;
    const { error } = await supabase.from('app_pages').delete().eq('id', id);
    if (!error) fetchData();
  };

  const updateSection = async (section) => {
    const { error } = await supabase.from('app_sections').update({ name: section.name }).eq('id', section.id);
    if (!error) setEditingSection(null);
    fetchData();
  };

  const updatePage = async (page) => {
    const { error } = await supabase.from('app_pages').update({ 
      name: page.name, 
      type: page.type 
    }).eq('id', page.id);
    if (!error) setEditingPage(null);
    fetchData();
  };

  const moveSection = async (id, direction) => {
    const index = sections.findIndex(s => s.id === id);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const otherSection = sections[newIndex];
    
    await supabase.from('app_sections').update({ order_index: otherSection.order_index }).eq('id', id);
    await supabase.from('app_sections').update({ order_index: sections[index].order_index }).eq('id', otherSection.id);
    fetchData();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Layout className="text-indigo-600" size={20} /> Navigation Builder
          </h3>
          <p className="text-xs text-slate-500 mt-1">Manage sidebar sections and custom pages</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="New Section Name..." 
            value={newSectionName}
            onChange={e => setNewSectionName(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-48"
          />
          <button 
            onClick={addSection}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all"
          >
            <Plus size={16} /> Add Section
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {sections.map((section, idx) => (
          <div key={section.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveSection(section.id, 'up')} className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30" disabled={idx === 0}><ChevronUp size={14}/></button>
                  <button onClick={() => moveSection(section.id, 'down')} className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30" disabled={idx === sections.length - 1}><ChevronDown size={14}/></button>
                </div>
                {editingSection?.id === section.id ? (
                  <div className="flex items-center gap-2">
                    <input 
                      autoFocus
                      type="text" 
                      value={editingSection.name}
                      onChange={e => setEditingSection({...editingSection, name: e.target.value})}
                      className="px-2 py-1 border border-indigo-300 rounded text-sm font-bold outline-none ring-2 ring-indigo-500/20"
                    />
                    <button onClick={() => updateSection(editingSection)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Save size={16}/></button>
                    <button onClick={() => setEditingSection(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded"><X size={16}/></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h4 className="font-bold text-slate-700 uppercase tracking-wider">{section.name}</h4>
                    <button onClick={() => setEditingSection(section)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-1 transition-all"><Edit size={14}/></button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => addPage(section.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors"
                >
                  <Plus size={14} /> Add Page
                </button>
                <button onClick={() => deleteSection(section.id)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {pages.filter(p => p.section_id === section.id).map(page => (
                <div key={page.id} className="px-6 py-4 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <GripVertical className="text-slate-300" size={16} />
                    {editingPage?.id === page.id ? (
                      <div className="flex items-center gap-3">
                        <input 
                          autoFocus
                          type="text" 
                          value={editingPage.name}
                          onChange={e => setEditingPage({...editingPage, name: e.target.value})}
                          className="px-2 py-1 border border-indigo-300 rounded text-sm outline-none ring-2 ring-indigo-500/20 w-48"
                        />
                        <select 
                          value={editingPage.type}
                          onChange={e => setEditingPage({...editingPage, type: e.target.value})}
                          className="px-2 py-1 border border-slate-300 rounded text-xs outline-none bg-white"
                        >
                          <option value="app">Application (Search/Results)</option>
                          <option value="report">Report (Dashboard)</option>
                        </select>
                        <button onClick={() => updatePage(editingPage)} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded"><Save size={16}/></button>
                        <button onClick={() => setEditingPage(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded"><X size={16}/></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {page.type === 'app' ? <FileText size={16} className="text-blue-500" /> : <BarChart3 size={16} className="text-emerald-500" />}
                        <span className="text-sm font-medium text-slate-700">{page.name}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">{page.type}</span>
                        <button onClick={() => setEditingPage(page)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-1 transition-all"><Edit size={14}/></button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                      onClick={() => setConfiguringPage(page)}
                    >
                      <Settings size={14} /> Configure Builder
                    </button>
                    <button onClick={() => deletePage(page.id)} className="text-red-300 hover:text-red-500 p-1.5 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
              {pages.filter(p => p.section_id === section.id).length === 0 && (
                <div className="px-6 py-8 text-center text-slate-400 text-sm italic">
                  No pages in this section yet.
                </div>
              )}
            </div>
          </div>
        ))}
        {sections.length === 0 && !loading && (
          <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300 text-slate-400">
            <Layout size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium">No sections created yet. Start by adding one above.</p>
          </div>
        )}
      </div>

      {configuringPage && configuringPage.type === 'app' && (
        <AppBuilder 
          page={configuringPage} 
          onSave={() => { setConfiguringPage(null); fetchData(); }}
          onCancel={() => setConfiguringPage(null)}
        />
      )}

      {configuringPage && configuringPage.type === 'report' && (
        <DashboardBuilder 
          page={configuringPage} 
          onSave={() => { setConfiguringPage(null); fetchData(); }}
          onCancel={() => setConfiguringPage(null)}
        />
      )}
    </div>
  );
}
