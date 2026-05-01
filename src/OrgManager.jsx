import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Edit, Trash2, CheckCircle, X, Plus, Eye, EyeOff } from 'lucide-react';

function ManagerWrapper({ title, columns, data, onAdd, onEdit, onToggleStatus, loading }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> Add New
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              {columns.map((col, i) => <th key={i} className="p-4 font-semibold">{col}</th>)}
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">No records found.</td></tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className={`transition-colors ${item.is_active ? 'hover:bg-slate-50' : 'bg-slate-50 opacity-75'}`}>
                  {columns.map((col, i) => (
                    <td key={i} className="p-4 text-slate-800 font-medium">
                      {col.toLowerCase() === 'status' ? (
                        <span className={`px-2 py-1 text-xs rounded-full font-bold ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      ) : (
                        item[col.toLowerCase().replace(' ', '_')] || '-'
                      )}
                    </td>
                  ))}
                  <td className="p-4 text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => onToggleStatus(item)} className={`p-2 rounded-lg transition-colors ${item.is_active ? 'text-slate-400 hover:bg-slate-100' : 'text-emerald-600 hover:bg-emerald-50'}`} title={item.is_active ? 'Deactivate' : 'Activate'}>
                      {item.is_active ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button onClick={() => onEdit(item)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Edit">
                      <Edit size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Modal({ title, onClose, onSubmit, children, loading }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6">
          <div className="space-y-4">
            {children}
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center">
              {loading ? 'Saving...' : <><CheckCircle size={18} className="mr-2" /> Save</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CollegesManager() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchColleges = async () => {
    setLoading(true);
    const { data } = await supabase.from('colleges').select('*').order('name');
    setColleges(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchColleges(); }, []);

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    setFormData(item ? { name: item.name } : { name: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSubmitting(true);
    try {
      if (editingItem) {
        await supabase.from('colleges').update({ name: formData.name.trim() }).eq('id', editingItem.id);
      } else {
        await supabase.from('colleges').insert([{ name: formData.name.trim() }]);
      }
      await fetchColleges();
      setIsModalOpen(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    if (!confirm(`Are you sure you want to ${item.is_active ? 'deactivate' : 'activate'} ${item.name}?`)) return;
    await supabase.from('colleges').update({ is_active: !item.is_active }).eq('id', item.id);
    fetchColleges();
  };

  return (
    <>
      <ManagerWrapper title="Manage Colleges" columns={['Name', 'Status']} data={colleges} onAdd={() => handleOpenModal()} onEdit={handleOpenModal} onToggleStatus={handleToggleStatus} loading={loading} />
      {isModalOpen && (
        <Modal title={editingItem ? 'Edit College' : 'Add New College'} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} loading={submitting}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">College Name *</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500" placeholder="e.g. College of Pharmacy" />
          </div>
        </Modal>
      )}
    </>
  );
}

export function ProgramsManager() {
  const [programs, setPrograms] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', college_id: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: cols } = await supabase.from('colleges').select('id, name').order('name');
    setColleges(cols || []);
    const { data: progs } = await supabase.from('programs').select('*, colleges(name)').order('name');
    setPrograms((progs || []).map(p => ({ ...p, college: p.colleges?.name })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    setFormData(item ? { name: item.name, college_id: item.college_id } : { name: '', college_id: colleges[0]?.id || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.college_id) return;
    setSubmitting(true);
    try {
      if (editingItem) {
        await supabase.from('programs').update({ name: formData.name.trim(), college_id: formData.college_id }).eq('id', editingItem.id);
      } else {
        await supabase.from('programs').insert([{ name: formData.name.trim(), college_id: formData.college_id }]);
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    if (!confirm(`Are you sure you want to ${item.is_active ? 'deactivate' : 'activate'} ${item.name}?`)) return;
    await supabase.from('programs').update({ is_active: !item.is_active }).eq('id', item.id);
    fetchData();
  };

  return (
    <>
      <ManagerWrapper title="Manage Programs" columns={['Name', 'College', 'Status']} data={programs} onAdd={() => handleOpenModal()} onEdit={handleOpenModal} onToggleStatus={handleToggleStatus} loading={loading} />
      {isModalOpen && (
        <Modal title={editingItem ? 'Edit Program' : 'Add New Program'} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} loading={submitting}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Program Name *</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500" placeholder="e.g. BSc Pharmacy" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mapped College *</label>
            <select required value={formData.college_id} onChange={e => setFormData({...formData, college_id: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 bg-white">
              <option value="">Select a college...</option>
              {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </Modal>
      )}
    </>
  );
}

export function CommitteesManager() {
  const [committees, setCommittees] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', college_id: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: cols } = await supabase.from('colleges').select('id, name').order('name');
    setColleges(cols || []);
    const { data: comms } = await supabase.from('committees').select('*, colleges(name)').order('name');
    setCommittees((comms || []).map(p => ({ ...p, college: p.colleges?.name })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    setFormData(item ? { name: item.name, college_id: item.college_id } : { name: '', college_id: colleges[0]?.id || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.college_id) return;
    setSubmitting(true);
    try {
      if (editingItem) {
        await supabase.from('committees').update({ name: formData.name.trim(), college_id: formData.college_id }).eq('id', editingItem.id);
      } else {
        await supabase.from('committees').insert([{ name: formData.name.trim(), college_id: formData.college_id }]);
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    if (!confirm(`Are you sure you want to ${item.is_active ? 'deactivate' : 'activate'} ${item.name}?`)) return;
    await supabase.from('committees').update({ is_active: !item.is_active }).eq('id', item.id);
    fetchData();
  };

  return (
    <>
      <ManagerWrapper title="Manage Committees" columns={['Name', 'College', 'Status']} data={committees} onAdd={() => handleOpenModal()} onEdit={handleOpenModal} onToggleStatus={handleToggleStatus} loading={loading} />
      {isModalOpen && (
        <Modal title={editingItem ? 'Edit Committee' : 'Add New Committee'} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} loading={submitting}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Committee Name *</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500" placeholder="e.g. Curriculum Committee" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mapped College *</label>
            <select required value={formData.college_id} onChange={e => setFormData({...formData, college_id: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 bg-white">
              <option value="">Select a college...</option>
              {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </Modal>
      )}
    </>
  );
}
