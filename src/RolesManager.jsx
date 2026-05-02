import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Shield, Plus, Pencil, Trash2, Check, X, Search, ChevronDown, ChevronRight, Eye, Edit } from 'lucide-react';

export function RolesManager() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  
  const [isEditingRole, setIsEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });

  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [sectionFilter, setSectionFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({});

  const fetchRoles = async () => {
    const { data } = await supabase.from('custom_roles').select('*').order('created_at');
    if (data) {
      setRoles(data);
      if (!selectedRoleId && data.length > 0) setSelectedRoleId(data[0].id);
    }
  };

  const fetchPermissions = async () => {
    const { data } = await supabase.from('role_permissions').select('*');
    if (data) setPermissions(data);
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const saveRole = async (e) => {
    e.preventDefault();
    if (isEditingRole) {
      await supabase.from('custom_roles').update(roleForm).eq('id', isEditingRole);
    } else {
      await supabase.from('custom_roles').insert([roleForm]);
    }
    setRoleForm({ name: '', description: '' });
    setIsEditingRole(null);
    fetchRoles();
  };

  const deleteRole = async (id) => {
    if (!confirm('Are you sure? This will remove this role from all assigned staff.')) return;
    await supabase.from('custom_roles').delete().eq('id', id);
    if (selectedRoleId === id) setSelectedRoleId(null);
    fetchRoles();
  };

  const setPermissionLevel = async (role_id, module_name, level) => {
    // level: 'none' | 'view' | 'edit'
    const existing = permissions.find(p => p.role_id === role_id && p.module_name === module_name);
    const can_view = level === 'view' || level === 'edit';
    const can_edit = level === 'edit';
    
    if (existing) {
      if (level === 'none') {
        await supabase.from('role_permissions').delete().eq('id', existing.id);
      } else {
        await supabase.from('role_permissions').update({ can_view, can_edit }).eq('id', existing.id);
      }
    } else if (level !== 'none') {
      await supabase.from('role_permissions').insert([{ role_id, module_name, can_view, can_edit }]);
    }
    fetchPermissions();
  };

  const getPermLevel = (role_id, module_name) => {
    const perm = permissions.find(p => p.role_id === role_id && p.module_name === module_name);
    if (!perm || (!perm.can_view && !perm.can_edit)) return 'none';
    if (perm.can_edit) return 'edit';
    return 'view';
  };

  const MODULES = [
    { section: 'Risk Management', key: 'risk_dashboard', label: 'Dashboard' },
    { section: 'Risk Management', key: 'risk_new_risk', label: 'Report a Risk' },
    { section: 'Risk Management', key: 'risk_register', label: 'Risk Register' },
    { section: 'Risk Management', key: 'risk_reports', label: 'Yearly Reports' },
    { section: 'Databases', key: 'db_faculty', label: 'Faculty & Staff' },
    { section: 'Databases', key: 'db_students', label: 'Students' },
    { section: 'Databases', key: 'db_courses', label: 'Courses' },
    { section: 'Databases', key: 'db_colleges', label: 'Colleges' },
    { section: 'Databases', key: 'db_programs', label: 'Programs' },
    { section: 'Databases', key: 'db_committees', label: 'Committees' },
    { section: 'Administration', key: 'db_builder', label: 'Database Builder' },
    { section: 'Organization', key: 'org_structure', label: 'Org Structure' },
  ];

  const sections = [...new Set(MODULES.map(m => m.section))];

  const filteredModules = MODULES.filter(m => {
    if (sectionFilter !== 'All' && m.section !== sectionFilter) return false;
    if (searchTerm && !m.label.toLowerCase().includes(searchTerm.toLowerCase()) && !m.section.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredSections = [...new Set(filteredModules.map(m => m.section))];

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Bulk actions
  const bulkSetAll = async (level) => {
    if (!selectedRoleId) return;
    for (const m of filteredModules) {
      await setPermissionLevel(selectedRoleId, m.key, level);
    }
  };

  const bulkSetSection = async (section, level) => {
    if (!selectedRoleId) return;
    const sectionModules = filteredModules.filter(m => m.section === section);
    for (const m of sectionModules) {
      await setPermissionLevel(selectedRoleId, m.key, level);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <Shield className="mr-2 text-indigo-600" /> Manage Faculty & Staff Roles
        </h3>
        
        <form onSubmit={saveRole} className="flex gap-4 mb-6">
          <input type="text" placeholder="Role Name (e.g. Dean)" required value={roleForm.name} onChange={e => setRoleForm({...roleForm, name: e.target.value})} className="flex-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="text" placeholder="Description" value={roleForm.description} onChange={e => setRoleForm({...roleForm, description: e.target.value})} className="flex-2 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-1/2" />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center hover:bg-indigo-700">
            {isEditingRole ? 'Update' : <><Plus size={18} className="mr-1"/> Add Role</>}
          </button>
          {isEditingRole && <button type="button" onClick={() => { setIsEditingRole(null); setRoleForm({name:'', description:''}); }} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-200">Cancel</button>}
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-600 text-sm">
                <th className="p-3">Role Name</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="p-3 font-medium text-slate-800">{r.name}</td>
                  <td className="p-3 text-slate-500">{r.description}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => { setIsEditingRole(r.id); setRoleForm({ name: r.name, description: r.description || '' }); }} className="text-blue-500 hover:text-blue-700 mr-3"><Pencil size={16}/></button>
                    <button onClick={() => deleteRole(r.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
          Role Permissions
        </h3>
        {roles.length === 0 ? (
          <p className="text-slate-500 text-sm">No roles defined. Create a role first.</p>
        ) : (
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-64 flex-shrink-0">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Role to Manage</label>
              <div className="flex flex-col space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {roles.map(r => (
                  <button 
                    key={r.id} 
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${selectedRoleId === r.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner min-h-[300px]">
              {selectedRoleId ? (
                <>
                  <h4 className="text-md font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                    Permissions for: <span className="text-indigo-600">{roles.find(r => r.id === selectedRoleId)?.name}</span>
                  </h4>

                  {/* Filters & Search */}
                  <div className="flex flex-wrap gap-3 mb-5 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search pages..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <select
                      value={sectionFilter}
                      onChange={e => setSectionFilter(e.target.value)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="All">All Sections</option>
                      {sections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Global bulk actions */}
                  <div className="flex items-center gap-2 mb-5 p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-auto">Set All Visible Pages:</span>
                    <button onClick={() => bulkSetAll('none')} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors">No Access</button>
                    <button onClick={() => bulkSetAll('view')} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-1"><Eye size={12}/> View Only</button>
                    <button onClick={() => bulkSetAll('edit')} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center gap-1"><Edit size={12}/> View & Edit</button>
                  </div>

                  {/* Sections */}
                  <div className="space-y-4">
                    {filteredSections.map(section => {
                      const sectionModules = filteredModules.filter(m => m.section === section);
                      const isCollapsed = collapsedSections[section];
                      return (
                        <div key={section} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <button onClick={() => toggleSection(section)} className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider hover:text-slate-900">
                              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                              {section}
                              <span className="text-xs font-normal text-slate-400 lowercase tracking-normal">({sectionModules.length} pages)</span>
                            </button>
                            <div className="flex gap-1.5">
                              <button onClick={() => bulkSetSection(section, 'none')} className="px-2.5 py-1 text-[11px] font-semibold rounded border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors">None</button>
                              <button onClick={() => bulkSetSection(section, 'view')} className="px-2.5 py-1 text-[11px] font-semibold rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">All View</button>
                              <button onClick={() => bulkSetSection(section, 'edit')} className="px-2.5 py-1 text-[11px] font-semibold rounded border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors">All Edit</button>
                            </div>
                          </div>
                          {!isCollapsed && (
                            <div className="divide-y divide-slate-100">
                              {sectionModules.map(m => {
                                const level = getPermLevel(selectedRoleId, m.key);
                                return (
                                  <div key={m.key} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="font-medium text-sm text-slate-800">{m.label}</div>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => setPermissionLevel(selectedRoleId, m.key, 'none')}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${level === 'none' ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                                      >
                                        No Access
                                      </button>
                                      <button
                                        onClick={() => setPermissionLevel(selectedRoleId, m.key, 'view')}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all flex items-center gap-1 ${level === 'view' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-blue-50'}`}
                                      >
                                        <Eye size={12}/> View Only
                                      </button>
                                      <button
                                        onClick={() => setPermissionLevel(selectedRoleId, m.key, 'edit')}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all flex items-center gap-1 ${level === 'edit' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-emerald-50'}`}
                                      >
                                        <Edit size={12}/> View & Edit
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Select a role from the left to view and edit its permissions.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
