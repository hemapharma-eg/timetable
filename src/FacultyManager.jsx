import React, { useState, useRef } from 'react';
import { Download, Upload, Plus, Pencil, Trash2, X, Search, User } from 'lucide-react';
import { supabase } from './supabase';

export const FACULTY_FIELDS = [
  { key: 'category', label: 'Category', group: 'Basic Info' },
  { key: 'employee_id', label: 'ID', group: 'Basic Info' },
  { key: 'name', label: 'Name', group: 'Basic Info' },
  { key: 'college', label: 'College', group: 'Basic Info' },
  { key: 'dept', label: 'Dept', group: 'Basic Info' },
  { key: 'email', label: 'Email', group: 'Basic Info' },
  { key: 'role', label: 'System Role', group: 'Basic Info', type: 'select', options: [{value: "faculty", label: "Faculty"}, {value: "academic_admin", label: "Academic Admin"}, {value: "technical_admin", label: "Technical Admin"}] },
  
  { key: 'active', label: 'Active', group: 'Employment', type: 'select', options: [{value: "Yes", label: "Yes"}, {value: "No", label: "No"}] },
  { key: 'designation', label: 'Designation', group: 'Employment' },
  { key: 'administrative_role', label: 'Administrative Role', group: 'Employment' },
  { key: 'emp_employment_status', label: 'Employment Status', group: 'Employment' },
  { key: 'emp_hire_date', label: 'Hire Date', group: 'Employment', type: 'date' },
  { key: 'end_of_service_date', label: 'End of Service Date', group: 'Employment', type: 'date' },
  { key: 'emp_position_1', label: 'Position 1', group: 'Employment' },
  { key: 'emp_position_2', label: 'Position 2', group: 'Employment' },
  { key: 'emp_payroll', label: 'Payroll', group: 'Employment' },
  { key: 'emp_campus', label: 'Campus', group: 'Employment' },
  { key: 'emp_last_promotion', label: 'Last Promotion', group: 'Employment', type: 'date' },
  { key: 'emp_years_of_experience', label: 'Years of Experience', group: 'Employment', type: 'number' },

  { key: 'nationality', label: 'Nationality', group: 'Demographics & IDs' },
  { key: 'emp_emirates_id', label: 'Emirates ID', group: 'Demographics & IDs' },
  { key: 'eid_valid', label: 'EID Valid Until', group: 'Demographics & IDs', type: 'date' },
  { key: 'emp_missing_docs', label: 'Missing Docs', group: 'Demographics & IDs' },
  { key: 'emp_gender', label: 'Gender', group: 'Demographics & IDs', type: 'select', options: [{value: "Male", label: "Male"}, {value: "Female", label: "Female"}] },
  { key: 'emp_national_id', label: 'National ID', group: 'Demographics & IDs' },
  { key: 'emp_dob', label: 'Date of Birth', group: 'Demographics & IDs', type: 'date' },
  { key: 'emp_phone_mobile', label: 'Mobile Phone', group: 'Demographics & IDs' },

  { key: 'scopus_id', label: 'Scopus ID', group: 'Academic' },
  { key: 'emp_orc_id', label: 'ORCID', group: 'Academic' },
  { key: 'emp_qualification_1', label: 'Qualification 1', group: 'Academic' },
  { key: 'emp_qualification_2', label: 'Qualification 2', group: 'Academic' },
  { key: 'emp_qualification_3', label: 'Qualification 3', group: 'Academic' },
  { key: 'emp_qualification_4', label: 'Qualification 4', group: 'Academic' },
  { key: 'emp_qualification_5', label: 'Qualification 5', group: 'Academic' },
  { key: 'emp_qualification_6', label: 'Qualification 6', group: 'Academic' },
  { key: 'emp_equivalency_1', label: 'Equivalency 1', group: 'Academic' },
  { key: 'emp_equivalency_2', label: 'Equivalency 2', group: 'Academic' },
  { key: 'certificate_submitted', label: 'Certificate Submitted', group: 'Academic' },

  { key: 'hospital', label: 'Hospital', group: 'Medical / Clinical' },
  { key: 'hospital_department', label: 'Hospital Department', group: 'Medical / Clinical' },
  { key: 'specialty', label: 'Specialty', group: 'Medical / Clinical' }
];

export const FacultyManager = ({ faculty, setFaculty }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('Basic Info');
  const [customRoles, setCustomRoles] = useState([]);
  
  useEffect(() => {
    supabase.from('custom_roles').select('*').then(({ data }) => setCustomRoles(data || []));
  }, []);

  const dynamicFields = [...FACULTY_FIELDS];
  // Add Custom Role field dynamically
  const roleFieldIndex = dynamicFields.findIndex(f => f.key === 'role');
  dynamicFields.splice(roleFieldIndex + 1, 0, {
    key: 'custom_role_id',
    label: 'Custom Staff Role (RBAC)',
    group: 'Basic Info',
    type: 'select',
    options: customRoles.map(cr => ({ value: cr.id, label: cr.name }))
  });

  const initialForm = dynamicFields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
  const [form, setForm] = useState(initialForm);
  const fileInputRef = useRef(null);

  const groups = [...new Set(dynamicFields.map(f => f.group))];

  const filteredFaculty = faculty.filter(f => 
    (f.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (f.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadTemplate = () => {
    if (typeof XLSX === 'undefined') {
      alert('Excel engine is still loading. Please try again in a moment.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet([], { header: FACULTY_FIELDS.map(f => f.key) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Faculty_Staff");
    XLSX.writeFile(wb, `faculty_staff_template.xlsx`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
      alert('Excel engine is still loading. Please try again in a moment.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length < 2) {
          alert('File is empty or missing data rows.');
          return;
        }

        const headers = data[0].map(h => h ? h.toString().trim() : '');
        const newItems = [];

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          
          let item = { id: Date.now().toString() + i };
          dynamicFields.forEach((f) => {
            const hIdx = headers.indexOf(f.key);
            if (hIdx >= 0 && row[hIdx] !== undefined) {
              item[f.key] = row[hIdx].toString().trim();
            }
          });
          
          if (item.name) { // Only add if Name is present
            newItems.push(item);
          }
        }
        // Insert into Supabase
        const dbItems = newItems.map(({ id, ...rest }) => rest);
        const { error } = await supabase.from('faculty').insert(dbItems);
        if (error) { alert('Import failed: ' + error.message); return; }
        const { data: refreshed } = await supabase.from('faculty').select('*');
        if (refreshed) setFaculty(refreshed);
        e.target.value = ''; 
      } catch (err) {
        console.error(err);
        alert('Failed to parse Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this employee?')) return;
    const { error } = await supabase.from('faculty').delete().eq('id', id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    setFaculty(faculty.filter(x => x.id !== id));
  };

  const openForm = (facultyMember = null) => {
    if (facultyMember) {
      setForm({ ...initialForm, ...facultyMember });
      setEditingId(facultyMember.id);
    } else {
      setForm(initialForm);
      setEditingId(null);
    }
    setActiveTab('Basic Info');
    setIsModalOpen(true);
  };

  const saveForm = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("Name is required");

    // Build the record object (exclude client-side 'id' for new inserts)
    const record = {};
    dynamicFields.forEach(f => {
      if (form[f.key] !== undefined && form[f.key] !== '') record[f.key] = form[f.key];
    });

    try {
      if (editingId) {
        const { error } = await supabase.from('faculty').update(record).eq('id', editingId);
        if (error) { alert('Save failed: ' + error.message); return; }
      } else {
        const { error } = await supabase.from('faculty').insert(record);
        if (error) { alert('Save failed: ' + error.message); return; }
      }
      // Refresh from database
      const { data } = await supabase.from('faculty').select('*');
      if (data) setFaculty(data);
    } catch (err) {
      alert('Error saving: ' + err.message);
      return;
    }
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[85vh]">
      {/* Header Bar */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <User className="mr-2 text-indigo-600" /> Faculty & Staff
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage all campus employees and their details ({faculty.length} total)</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search specific staff..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
            />
          </div>
          <button onClick={handleDownloadTemplate} className="px-3 py-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center text-sm font-medium">
            <Download size={16} className="mr-1.5" /> Template
          </button>
          <label className="px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center text-sm font-medium cursor-pointer">
            <Upload size={16} className="mr-1.5" /> Import
            <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          </label>
          <button onClick={() => openForm()} className="px-3 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center text-sm font-medium">
            <Plus size={16} className="mr-1.5" /> Add New
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-medium text-sm">
                <th className="p-3 pl-4 sticky left-0 bg-slate-100 z-10 w-64">Name / Email</th>
                <th className="p-3">ID</th>
                <th className="p-3">Designation</th>
                <th className="p-3">College / Dept</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFaculty.map(f => (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-3 pl-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                    <div className="font-medium text-slate-800">{f.name || 'Unnamed Employee'}</div>
                    <div className="text-xs text-slate-500">{f.email || 'No email'}</div>
                  </td>
                  <td className="p-3 text-sm text-slate-600 font-mono">{f.employee_id || '-'}</td>
                  <td className="p-3 text-sm text-slate-600">{f.designation || '-'}</td>
                  <td className="p-3 text-sm text-slate-600">
                    {f.college || f.dept ? `${f.college || ''} ${f.dept ? `/ ${f.dept}` : ''}` : '-'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${f.active === 'Yes' ? 'bg-emerald-100 text-emerald-700' : f.active === 'No' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                      {f.active || 'Unknown'}
                    </span>
                  </td>
                  <td className="p-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={() => openForm(f)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Pencil size={16} /></button>
                       <button onClick={() => handleDelete(f.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFaculty.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No faculty or staff members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Employee Details' : 'Add New Employee'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 min-h-0">
              {/* Sidebar Tabs */}
              <div className="w-full md:w-56 bg-slate-50 border-r border-slate-200 flex md:flex-col overflow-x-auto md:overflow-y-auto">
                {groups.map(group => (
                  <button 
                    key={group}
                    onClick={() => setActiveTab(group)}
                    className={`px-4 py-3 text-left font-medium text-sm transition-colors whitespace-nowrap ${activeTab === group ? 'bg-white text-indigo-700 border-l-4 border-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l-4 border-transparent'}`}
                  >
                    {group}
                  </button>
                ))}
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                <form id="facultyForm" onSubmit={saveForm}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {dynamicFields.filter(f => f.group === activeTab).map(field => (
                      <div key={field.key} className="space-y-1">
                        <label className="block text-sm font-medium text-slate-700">{field.label} {field.key === 'name' && <span className="text-red-500">*</span>}</label>
                        {field.type === 'select' ? (
                          <select 
                            value={form[field.key] || ''} 
                            onChange={e => setForm({...form, [field.key]: e.target.value})}
                            required={field.key === 'name'}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none block"
                          >
                            <option value="">Select...</option>
                            {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        ) : (
                          <input
                            type={field.type || 'text'}
                            value={form[field.key] || ''}
                            onChange={e => setForm({...form, [field.key]: e.target.value})}
                            required={field.key === 'name'}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none block"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </form>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
               <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                 Cancel
               </button>
               <button type="submit" form="facultyForm" className="px-6 py-2 font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                 Save Changes
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
