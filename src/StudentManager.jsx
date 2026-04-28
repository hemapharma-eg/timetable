import React, { useState, useRef } from 'react';
import { Download, Upload, Plus, Pencil, Trash2, X, Search, GraduationCap } from 'lucide-react';

export const STUDENT_FIELDS = [
  // Basic & Contact Info
  { key: 'cohort', label: 'Cohort', group: 'Basic & Contact Info' },
  { key: 'sp_year', label: 'SP Year', group: 'Basic & Contact Info' },
  { key: 'id', label: 'ID', group: 'Basic & Contact Info' },
  { key: 'name', label: 'Name', group: 'Basic & Contact Info' },
  { key: 'program', label: 'Program', group: 'Basic & Contact Info' },
  { key: 'study_plan', label: 'Study Plan', group: 'Basic & Contact Info' },
  { key: 'ugpg', label: 'UG/PG', group: 'Basic & Contact Info' },
  { key: 'college', label: 'College', group: 'Basic & Contact Info' },
  { key: 'email', label: 'Official Email', group: 'Basic & Contact Info' },
  { key: 'role', label: 'System Role', group: 'Basic & Contact Info', type: 'select', options: [{value: "student", label: "Student"}, {value: "viewer", label: "Viewer"}] },
  { key: 'personal_email', label: 'Personal Email', group: 'Basic & Contact Info' },
  { key: 'phone', label: 'Phone', group: 'Basic & Contact Info' },
  { key: 'application_number', label: 'Application Number', group: 'Basic & Contact Info' },
  { key: 'student_phone', label: 'Student Phone', group: 'Basic & Contact Info' },

  // Demographics & Kin
  { key: 'nationality', label: 'Nationality', group: 'Demographics & Kin' },
  { key: 'place_of_birth', label: 'Place of Birth', group: 'Demographics & Kin' },
  { key: 'enroll_gender', label: 'Gender', group: 'Demographics & Kin', type: 'select', options: [{value: "Male", label: "Male"}, {value: "Female", label: "Female"}] },
  { key: 'enroll_marital_status', label: 'Marital Status', group: 'Demographics & Kin' },
  { key: 'enroll_city_name', label: 'City', group: 'Demographics & Kin' },
  { key: 'enroll_home_address', label: 'Home Address', group: 'Demographics & Kin' },
  { key: 'enroll_family_name', label: 'Family Name', group: 'Demographics & Kin' },
  { key: 'family_book_no', label: 'Family Book No.', group: 'Demographics & Kin' },
  { key: 'guardian_name', label: 'Guardian Name', group: 'Demographics & Kin' },
  { key: 'guardian_email', label: 'Guardian Email', group: 'Demographics & Kin' },
  { key: 'mother_mobile', label: 'Mother Mobile', group: 'Demographics & Kin' },
  { key: 'mother_email', label: 'Mother Email', group: 'Demographics & Kin' },
  { key: 'enroll_health_condition', label: 'Health Condition', group: 'Demographics & Kin' },
  { key: 'enroll_special_needs', label: 'Special Needs', group: 'Demographics & Kin' },

  // Enrollment & Academics
  { key: 'enroll_institution', label: 'Institution', group: 'Enrollment & Academics' },
  { key: 'enroll_academic_status', label: 'Academic Status', group: 'Enrollment & Academics' },
  { key: 'enroll_mode_of_study', label: 'Mode of Study', group: 'Enrollment & Academics' },
  { key: 'enroll_1st_academic_year', label: '1st Academic Year', group: 'Enrollment & Academics' },
  { key: 'enroll_area_of_study', label: 'Area of Study', group: 'Enrollment & Academics' },
  { key: 'enroll_major', label: 'Major', group: 'Enrollment & Academics' },
  { key: 'enroll_minor', label: 'Minor', group: 'Enrollment & Academics' },
  { key: 'enroll_progression', label: 'Progression', group: 'Enrollment & Academics' },
  { key: 'enroll_current_credits', label: 'Current Credits', group: 'Enrollment & Academics', type: 'number' },
  { key: 'enroll_total_credits', label: 'Total Credits', group: 'Enrollment & Academics', type: 'number' },
  { key: 'enroll_gpa_cumulative', label: 'Cumulative GPA', group: 'Enrollment & Academics', type: 'number', step: '0.01' },
  { key: 'enroll_transfer_credits', label: 'Transfer Credits', group: 'Enrollment & Academics', type: 'number' },
  { key: 'enroll_research', label: 'Research', group: 'Enrollment & Academics' },
  { key: 'enroll_outgoing', label: 'Outgoing', group: 'Enrollment & Academics' },
  { key: 'enroll_incoming', label: 'Incoming', group: 'Enrollment & Academics' },
  { key: 'enroll_exchange', label: 'Exchange', group: 'Enrollment & Academics' },
  { key: 'mentor_name', label: 'Mentor Name', group: 'Enrollment & Academics' },
  { key: 'mentor_email', label: 'Mentor Email', group: 'Enrollment & Academics' },

  // Application & Details
  { key: 'enroll_emirates_id', label: 'Emirates ID', group: 'Application & Details' },
  { key: 'emirates_id_expiry_date', label: 'EID Expiry Date', group: 'Application & Details', type: 'date' },
  { key: 'enroll_passport_no', label: 'Passport No.', group: 'Application & Details' },
  { key: 'passport_expiry_date', label: 'Passport Expiry Date', group: 'Application & Details', type: 'date' },
  { key: 'student_eid', label: 'Student EID', group: 'Application & Details' },
  { key: 'student_passport', label: 'Student Passport', group: 'Application & Details' },
  { key: 'app_application', label: 'App Application', group: 'Application & Details' },
  { key: 'app_admission', label: 'App Admission', group: 'Application & Details' },
  { key: 'app_passport', label: 'App Passport', group: 'Application & Details' },
  { key: 'app_country', label: 'App Country', group: 'Application & Details' },
  { key: 'enroll_missing_docs', label: 'Missing Docs', group: 'Application & Details' },
  { key: 'enroll_high_school', label: 'High School', group: 'Application & Details' },
  { key: 'hs_name', label: 'HS Name', group: 'Application & Details' },
  { key: 'diploma_year_hs', label: 'HS Diploma Year', group: 'Application & Details' },
  { key: 'enroll_12th_score', label: '12th Score', group: 'Application & Details' },
  { key: 'enroll_last_college', label: 'Last College', group: 'Application & Details' },
  { key: 'enroll_qualification', label: 'Qualification', group: 'Application & Details' },
  { key: 'count_qualifications', label: 'Count Qualifications', group: 'Application & Details' },
  { key: 'enroll_language_1', label: 'Language 1', group: 'Application & Details' },
  { key: 'enroll_language_2', label: 'Language 2', group: 'Application & Details' },

  // Scholarships & SOD
  { key: 'sod_accommodation', label: 'SOD Accommodation', group: 'Scholarships & SOD' },
  { key: 'sod_nationality', label: 'SOD Nationality', group: 'Scholarships & SOD' },
  { key: 'sod_international', label: 'SOD International', group: 'Scholarships & SOD' },
  { key: 'sod_instruction', label: 'SOD Instruction', group: 'Scholarships & SOD' },
  { key: 'sod_medical_condition', label: 'SOD Medical Condition', group: 'Scholarships & SOD' },
  { key: 'sch_scholarship_1', label: 'Scholarship 1', group: 'Scholarships & SOD' },
  { key: 'sch_scholarship_2', label: 'Scholarship 2', group: 'Scholarships & SOD' },
  { key: 'sch_scholarship_3', label: 'Scholarship 3', group: 'Scholarships & SOD' },
  { key: 'sch_scholarship_4', label: 'Scholarship 4', group: 'Scholarships & SOD' },
  { key: 'sch_scholarship_5', label: 'Scholarship 5', group: 'Scholarships & SOD' },
  { key: 'sch_scholarship_6', label: 'Scholarship 6', group: 'Scholarships & SOD' },
  { key: 'sch_academic_year', label: 'Sch Academic Year', group: 'Scholarships & SOD' },
  { key: 'comment_scholarship', label: 'Scholarship Comment', group: 'Scholarships & SOD' },
  { key: 'letter_scholarship', label: 'Scholarship Letter', group: 'Scholarships & SOD' },
  { key: 'enroll_al_eith_sponsor', label: 'Al Eith Sponsor', group: 'Scholarships & SOD' },

  // Graduation / Attrition
  { key: 'graduation_status', label: 'Graduation Status', group: 'Graduation / Attrition' },
  { key: 'grad_academic_year', label: 'Grad Academic Year', group: 'Graduation / Attrition' },
  { key: 'grad_master', label: 'Master Details', group: 'Graduation / Attrition' },
  { key: 'grad_phd_dissertation', label: 'PhD Dissertation', group: 'Graduation / Attrition' },
  { key: 'grad_total_credits', label: 'Grad Total Credits', group: 'Graduation / Attrition', type: 'number' },
  { key: 'grad_gpa_cumulative', label: 'Grad GPA Cumulative', group: 'Graduation / Attrition', type: 'number', step: '0.01' },
  { key: 'grad_submission_date', label: 'Grad Submission Date', group: 'Graduation / Attrition', type: 'date' },
  { key: 'graduation_clearance', label: 'Graduation Clearance', group: 'Graduation / Attrition' },
  { key: 'grad_workplace', label: 'Grad Workplace', group: 'Graduation / Attrition' },
  { key: 'attrition_academic', label: 'Attrition Academic', group: 'Graduation / Attrition' },
  { key: 'count_attrition', label: 'Attrition Count', group: 'Graduation / Attrition' },
  { key: 'attrition_reason', label: 'Attrition Reason', group: 'Graduation / Attrition' },
  { key: 'withdrawal_reason', label: 'Withdrawal Reason', group: 'Graduation / Attrition' },
  { key: 'attrition_clearance', label: 'Attrition Clearance', group: 'Graduation / Attrition' },
  { key: 'attrition_submission', label: 'Attrition Submission', group: 'Graduation / Attrition' }
];

export const StudentManager = ({ students, setStudents }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('Basic & Contact Info');
  
  const initialForm = STUDENT_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
  const [form, setForm] = useState(initialForm);
  const fileInputRef = useRef(null);

  const groups = [...new Set(STUDENT_FIELDS.map(f => f.group))];

  const filteredStudents = students.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadTemplate = () => {
    if (typeof XLSX === 'undefined') {
      alert('Excel engine is still loading. Please try again in a moment.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet([], { header: STUDENT_FIELDS.map(f => f.key) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `students_template.xlsx`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
      alert('Excel engine is still loading. Please try again in a moment.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
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
          STUDENT_FIELDS.forEach((f) => {
            const hIdx = headers.indexOf(f.key);
            if (hIdx >= 0 && row[hIdx] !== undefined) {
              item[f.key] = row[hIdx].toString().trim();
            }
          });
          
          // Allow override if they specifically imported an ID
          if (row[headers.indexOf('id')] !== undefined) {
             item.id = row[headers.indexOf('id')].toString().trim();
          }
          
          if (item.name) { // Only add if Name is present
            newItems.push(item);
          }
        }
        
        // Remove old duplicates before merging
        const newIds = newItems.map(n => n.id);
        setStudents(prev => [...prev.filter(p => !newIds.includes(p.id)), ...newItems]);
        e.target.value = ''; 
      } catch (err) {
        console.error(err);
        alert('Failed to parse Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const openForm = (student = null) => {
    if (student) {
      setForm({ ...initialForm, ...student });
      setEditingId(student.id);
    } else {
      setForm(initialForm);
      setEditingId(null);
    }
    setActiveTab('Basic & Contact Info');
    setIsModalOpen(true);
  };

  const saveForm = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("Name is required");

    if (editingId) {
      setStudents(students.map(s => s.id === editingId ? { ...s, ...form } : s));
    } else {
      // Create new with either a provided real ID or a generated safe ID
      setStudents([...students, { ...form, id: form.id || Date.now().toString() }]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[85vh]">
      {/* Header Bar */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <GraduationCap className="mr-2 text-indigo-600" /> Students Database
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage full academic and enrollment lifecycle ({students.length} total)</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search specific student..." 
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
                <th className="p-3 pl-4 sticky left-0 bg-slate-100 z-10 w-64">Name / ID</th>
                <th className="p-3">Program</th>
                <th className="p-3">Major</th>
                <th className="p-3">GPA</th>
                <th className="p-3">Mentor</th>
                <th className="p-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-3 pl-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                    <div className="font-medium text-slate-800">{s.name || 'Unnamed Student'}</div>
                    <div className="text-xs text-slate-500 font-mono">ID: {s.id || '-'}</div>
                  </td>
                  <td className="p-3 text-sm text-slate-600">{s.program || s.college || '-'}</td>
                  <td className="p-3 text-sm text-slate-600">{s.enroll_major || '-'}</td>
                  <td className="p-3 text-sm font-semibold">
                     {s.enroll_gpa_cumulative ? (
                       <span className={Number(s.enroll_gpa_cumulative) >= 3.0 ? 'text-emerald-600' : 'text-slate-600'}>
                         {s.enroll_gpa_cumulative}
                       </span>
                     ) : '-'}
                  </td>
                  <td className="p-3 text-sm text-slate-500">
                    {s.mentor_name || '-'}
                  </td>
                  <td className="p-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={() => openForm(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Pencil size={16} /></button>
                       <button onClick={() => setStudents(students.filter(x => x.id !== s.id))} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No students found in the database.
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
                {editingId ? 'Edit Student Record' : 'Enroll New Student'}
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
                <form id="studentForm" onSubmit={saveForm}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {STUDENT_FIELDS.filter(f => f.group === activeTab).map(field => (
                      <div key={field.key} className="space-y-1">
                        <label className="block text-sm font-medium text-slate-700 flex justify-between">
                          <span>{field.label} {field.key === 'name' && <span className="text-red-500">*</span>}</span>
                        </label>
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
                            step={field.step}
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
               <button type="submit" form="studentForm" className="px-6 py-2 font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                 Save Data
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
