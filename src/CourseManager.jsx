import React, { useState, useRef } from 'react';
import { Upload, Plus, Pencil, Trash2, X, Search, BookOpen, CheckSquare } from 'lucide-react';
import ImportModeDialog from './ImportModeDialog';

export const COURSE_FIELDS = [
  // General Info
  { key: 'code', label: 'Course Code', group: 'General Info' },
  { key: 'name', label: 'Course Name', group: 'General Info' },
  { key: 'course_crn', label: 'Course CRN', group: 'General Info' },
  { key: 'course_description', label: 'Course Description', group: 'General Info' },
  { key: 'college', label: 'College', group: 'General Info' },
  { key: 'program', label: 'Primary Program', group: 'General Info' },
  { key: 'course_program_1', label: 'Course Program 1', group: 'General Info' },
  { key: 'course_program_2', label: 'Course Program 2', group: 'General Info' },

  // Academic Structure
  { key: 'course_degree', label: 'Course Degree', group: 'Academic Structure' },
  { key: 'course_academic_level', label: 'Academic Level', group: 'Academic Structure' },
  { key: 'study_plan', label: 'Study Plan', group: 'Academic Structure' },
  { key: 'study_plan_year', label: 'Study Plan Year', group: 'Academic Structure' },
  { key: 'academic_year', label: 'Academic Year', group: 'Academic Structure' },
  { key: 'cohort', label: 'Cohort', group: 'Academic Structure' },
  { key: 'offered_in', label: 'Offered In', group: 'Academic Structure' },
  { key: 'course_mandatory', label: 'Mandatory?', group: 'Academic Structure', type: 'select', options: [{value: "Yes", label: "Yes"}, {value: "No", label: "No"}] },
  { key: 'course_credits', label: 'Course Credits', group: 'Academic Structure', type: 'number' },
  { key: 'credit_hours', label: 'Credit Hours', group: 'Academic Structure', type: 'number' },
  { key: 'course_contact_hours', label: 'Contact Hours', group: 'Academic Structure', type: 'number' },
  { key: 'course_theory', label: 'Theory Hours', group: 'Academic Structure', type: 'number' },
  { key: 'course_lab', label: 'Lab Hours', group: 'Academic Structure', type: 'number' },
  { key: 'course_mode', label: 'Course Mode', group: 'Academic Structure' },
  { key: 'course_grade', label: 'Course Grade', group: 'Academic Structure' },

  // Delivery & Assignments
  { key: 'course_faculty', label: 'Course Faculty', group: 'Delivery & Assignments' },
  { key: 'course_codev_1', label: 'Co-Developer 1', group: 'Delivery & Assignments' },
  { key: 'course_codev_2', label: 'Co-Developer 2', group: 'Delivery & Assignments' },
  { key: 'course_codel_1', label: 'Co-Delivery 1', group: 'Delivery & Assignments' },
  { key: 'course_codel_2', label: 'Co-Delivery 2', group: 'Delivery & Assignments' },
  { key: 'sections', label: 'Sections Count', group: 'Delivery & Assignments', type: 'number' },
  { key: 'student_number', label: 'Student Number Limit', group: 'Delivery & Assignments', type: 'number' },
  { key: 'course_eval_system', label: 'Evaluation System', group: 'Delivery & Assignments' },

  // Classification & Flags
  { key: 'ge', label: 'GE (Gen Ed)', group: 'Classification & Flags' },
  { key: 'basic_science', label: 'Basic Science', group: 'Classification & Flags' },
  { key: 'ems_flag', label: 'EMS Flag', group: 'Classification & Flags' },
  { key: 'elective', label: 'Elective', group: 'Classification & Flags', type: 'select', options: [{value: "Yes", label: "Yes"}, {value: "No", label: "No"}] },
  { key: 'type', label: 'Type', group: 'Classification & Flags' },
  { key: 'q_flag', label: 'Q Flag', group: 'Classification & Flags' }
];

export const CourseManager = ({ courses, setCourses, isReadOnly = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('General Info');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState(null);
  const [importFileName, setImportFileName] = useState('');
  
  const initialForm = COURSE_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
  const [form, setForm] = useState(initialForm);
  const fileInputRef = useRef(null);

  const groups = [...new Set(COURSE_FIELDS.map(f => f.group))];

  const filteredCourses = courses.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.course_crn || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allVisibleSelected = filteredCourses.length > 0 && filteredCourses.every(c => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;
  const toggleSelect = (id) => { setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const toggleSelectAll = () => { if (allVisibleSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(filteredCourses.map(c => c.id))); };
  const handleBulkDelete = () => { if (!confirm(`Delete ${selectedIds.size} selected record(s)?`)) return; setCourses(courses.filter(x => !selectedIds.has(x.id))); setSelectedIds(new Set()); };


  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') { alert('Excel engine is still loading.'); return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (data.length < 2) { alert('File is empty or missing data rows.'); return; }
        const headers = data[0].map(h => h ? h.toString().trim() : '');
        const newItems = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i]; if (!row || row.length === 0) continue;
          let item = { id: Date.now().toString() + i };
          COURSE_FIELDS.forEach((f) => { const hIdx = headers.indexOf(f.key); if (hIdx >= 0 && row[hIdx] !== undefined) item[f.key] = row[hIdx].toString().trim(); });
          if (row[headers.indexOf('id')] !== undefined) item.id = row[headers.indexOf('id')].toString().trim();
          if (item.name || item.code) newItems.push(item);
        }
        if (newItems.length === 0) { alert('No valid records found.'); return; }
        setPendingImportData(newItems); setImportFileName(file.name); setImportDialogOpen(true);
        e.target.value = '';
      } catch (err) { console.error(err); alert('Failed to parse Excel file.'); }
    };
    reader.readAsBinaryString(file);
  };

  const executeImport = (mode) => {
    if (!pendingImportData) return;
    setImportDialogOpen(false);
    if (mode === 'replace') {
      setCourses([...pendingImportData]);
      alert(`Imported ${pendingImportData.length} records.`);
    } else if (mode === 'update') {
      let updatedCount = 0;
      let insertedCount = 0;
      setCourses(prev => {
        const next = [...prev];
        pendingImportData.forEach(item => {
          const idx = next.findIndex(c => c.code && item.code && c.code === item.code);
          if (idx >= 0) {
            next[idx] = { ...next[idx], ...item };
            updatedCount++;
          } else {
            next.push(item);
            insertedCount++;
          }
        });
        return next;
      });
      alert(`Updated ${updatedCount} existing records and inserted ${insertedCount} new records.`);
    } else {
      const existingCodes = new Set(courses.map(c => c.code).filter(Boolean));
      const newRecords = [];
      const rejectedRecords = [];
      pendingImportData.forEach(item => {
        if (item.code && existingCodes.has(item.code)) {
          rejectedRecords.push(item);
        } else {
          newRecords.push(item);
          if (item.code) existingCodes.add(item.code);
        }
      });
      
      setCourses(prev => [...prev, ...newRecords]);
      
      if (rejectedRecords.length > 0) {
        alert(`Imported ${newRecords.length} new records.\nRejected ${rejectedRecords.length} duplicate records.`);
      } else {
        alert(`Successfully imported all ${newRecords.length} records.`);
      }
    }
    setPendingImportData(null); setImportFileName('');
  };

  const openForm = (course = null) => {
    if (course) {
      setForm({ ...initialForm, ...course });
      setEditingId(course.id);
    } else {
      setForm(initialForm);
      setEditingId(null);
    }
    setActiveTab('General Info');
    setIsModalOpen(true);
  };

  const saveForm = (e) => {
    e.preventDefault();
    if (!form.name.trim() && !form.code.trim()) return alert("Code or Name is required");

    if (editingId) {
      setCourses(courses.map(c => c.id === editingId ? { ...c, ...form } : c));
    } else {
      setCourses([...courses, { ...form, id: form.id || Date.now().toString() }]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[85vh]">
      {/* Header Bar */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <BookOpen className="mr-2 text-indigo-600" /> Courses Database
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage academic modules and syllabi parameters ({courses.length} total)</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search code or name..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
            />
          </div>
          {!isReadOnly && (
            <>
              <label className="px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center text-sm font-medium cursor-pointer">
                <Upload size={16} className="mr-1.5" /> Import
                <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              </label>
              <button onClick={() => openForm()} className="px-3 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center text-sm font-medium">
                <Plus size={16} className="mr-1.5" /> Add Course
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {!isReadOnly && someSelected && (
        <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between">
          <span className="text-sm font-medium text-indigo-800 flex items-center gap-2"><CheckSquare size={16} />{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5"><Trash2 size={14} /> Delete Selected</button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Clear</button>
          </div>
        </div>
      )}

      {/* Main Data Table */}
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-medium text-sm">
                {!isReadOnly && <th className="p-3 pl-4 w-10"><input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" /></th>}
                <th className={`p-3 ${isReadOnly ? 'pl-4' : ''} sticky left-0 bg-slate-100 z-10`}>Code & Name</th>
                <th className="p-3">CRN</th>
                <th className="p-3">Program</th>
                <th className="p-3">Credits</th>
                {!isReadOnly && <th className="p-3 text-right pr-4">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.map(c => (
                <tr key={c.id} className={`hover:bg-slate-50 transition-colors group ${selectedIds.has(c.id) ? 'bg-indigo-50/50' : ''}`}>
                  {!isReadOnly && <td className="p-3 pl-4"><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" /></td>}
                  <td className="p-3 pl-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 w-96">
                    <div className="font-medium text-slate-800">{c.code || '-'}</div>
                    <div className="text-sm text-slate-500 font-normal truncate max-w-xs">{c.name || 'Unnamed Course'}</div>
                  </td>
                  <td className="p-3 text-sm font-mono text-slate-600">{c.course_crn || '-'}</td>
                  <td className="p-3 text-sm text-slate-600">{c.program || c.college || '-'}</td>
                  <td className="p-3 text-sm font-semibold text-slate-600">
                     {c.course_credits || c.credit_hours || '-'}
                  </td>
                  {!isReadOnly && (
                    <td className="p-3 pr-4 text-right hover:z-20">
                      <div className="flex items-center justify-end gap-2">
                         <button onClick={() => openForm(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Pencil size={16} /></button>
                         <button onClick={() => setCourses(courses.filter(x => x.id !== c.id))} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredCourses.length === 0 && (
                <tr>
                  <td colSpan={isReadOnly ? 5 : 7} className="p-8 text-center text-slate-500">
                    No courses found in the database.
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
                {editingId ? 'Edit Course Settings' : 'Add New Course'}
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
                <form id="courseForm" onSubmit={saveForm}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {COURSE_FIELDS.filter(f => f.group === activeTab).map(field => (
                      <div key={field.key} className="space-y-1">
                        <label className="block text-sm font-medium text-slate-700 flex justify-between">
                          <span>{field.label} {(field.key === 'name' || field.key === 'code') && <span className="text-red-500">*</span>}</span>
                        </label>
                        {field.type === 'select' ? (
                          <select 
                            value={form[field.key] || ''} 
                            onChange={e => setForm({...form, [field.key]: e.target.value})}
                            required={field.key === 'name' || field.key === 'code'}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none block"
                          >
                            <option value="">Select...</option>
                            {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        ) : (
                          <input
                            type={field.type || 'text'}
                            step={field.step}
                            value={form[field.key] || ''}
                            onChange={e => setForm({...form, [field.key]: e.target.value})}
                            required={field.key === 'name' || field.key === 'code'}
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
               <button type="submit" form="courseForm" className="px-6 py-2 font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                 Save Details
               </button>
            </div>
          </div>
        </div>
      )}

      <ImportModeDialog
        isOpen={importDialogOpen}
        fileName={importFileName}
        recordCount={pendingImportData?.length || 0}
        existingCount={courses.length}
        uniqueFieldLabel="Course Code"
        onReplace={() => executeImport('replace')}
        onAppend={() => executeImport('append')}
        onUpdate={() => executeImport('update')}
        onCancel={() => { setImportDialogOpen(false); setPendingImportData(null); }}
      />
    </div>
  );
};
