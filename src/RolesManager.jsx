import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Shield, Plus, Pencil, Trash2, Check, X } from 'lucide-react';

export function RolesManager() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  
  const [isEditingRole, setIsEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });

  const fetchRoles = async () => {
    const { data } = await supabase.from('custom_roles').select('*').order('created_at');
    if (data) setRoles(data);
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
    { key: 'risk_management_reports', label: 'Risk Management (Reports Only)' },
    { key: 'risk_management_full', label: 'Risk Management (Full Access)' },
    { key: 'databases', label: 'Databases (Faculty/Students)' }
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

      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          Role Permissions Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="p-3 border-r font-semibold text-slate-700">Role</th>
                {MODULES.map(m => (
                  <th key={m.key} className="p-3 border-r font-semibold text-slate-700 text-center">{m.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-medium border-r bg-slate-50">{r.name}</td>
                  {MODULES.map(m => {
                    const perm = permissions.find(p => p.role_id === r.id && p.module_name === m.key) || {};
                    return (
                      <td key={m.key} className="p-3 border-r text-center align-middle">
                        <div className="flex flex-col items-center gap-2 text-sm">
                          <label className="flex items-center cursor-pointer text-slate-600">
                            <input type="checkbox" className="mr-1.5" checked={perm.can_view || false} onChange={() => togglePermission(r.id, m.key, 'can_view', perm.can_view)} />
                            View
                          </label>
                          <label className="flex items-center cursor-pointer text-slate-600">
                            <input type="checkbox" className="mr-1.5" checked={perm.can_edit || false} onChange={() => togglePermission(r.id, m.key, 'can_edit', perm.can_edit)} />
                            Edit
                          </label>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
