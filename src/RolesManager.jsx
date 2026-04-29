import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Shield, Plus, Pencil, Trash2, Check, X } from 'lucide-react';

export function RolesManager() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  
  const [isEditingRole, setIsEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });

  const [selectedRoleId, setSelectedRoleId] = useState(null);

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

  const togglePermission = async (role_id, module_name, field, currentValue) => {
    const existing = permissions.find(p => p.role_id === role_id && p.module_name === module_name);
    if (existing) {
      await supabase.from('role_permissions').update({ [field]: !currentValue }).eq('id', existing.id);
    } else {
      await supabase.from('role_permissions').insert([{
        role_id, module_name, [field]: true
      }]);
    }
    fetchPermissions();
  };

  const MODULES = [
    { section: 'Risk Management Plan', key: 'risk_dashboard', label: 'Dashboard' },
    { section: 'Risk Management Plan', key: 'risk_new_risk', label: 'Log New Risk' },
    { section: 'Risk Management Plan', key: 'risk_register', label: 'Risk Register' },
    { section: 'Risk Management Plan', key: 'risk_reports', label: 'Yearly Reports' },
    { section: 'Databases', key: 'db_faculty', label: 'Faculty & Staff' },
    { section: 'Databases', key: 'db_students', label: 'Students' },
    { section: 'Databases', key: 'db_courses', label: 'Courses' }
  ];

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
                  <div className="space-y-6">
                    {Array.from(new Set(MODULES.map(m => m.section))).map(section => (
                      <div key={section}>
                        <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200">{section}</h5>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {MODULES.filter(m => m.section === section).map(m => {
                            const perm = permissions.find(p => p.role_id === selectedRoleId && p.module_name === m.key) || {};
                            return (
                              <div key={m.key} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-colors">
                                <div className="font-medium text-slate-800 mb-3">{m.label}</div>
                                <div className="flex items-center gap-6 pt-2 border-t border-slate-100">
                                  <label className="flex items-center cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                                    <input type="checkbox" className="mr-2 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" checked={perm.can_view || false} onChange={() => togglePermission(selectedRoleId, m.key, 'can_view', perm.can_view)} />
                                    View Access
                                  </label>
                                  <label className="flex items-center cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                                    <input type="checkbox" className="mr-2 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" checked={perm.can_edit || false} onChange={() => togglePermission(selectedRoleId, m.key, 'can_edit', perm.can_edit)} />
                                    Edit Access
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
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
