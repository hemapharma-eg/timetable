import React, { useState, useEffect } from 'react';
import { Search, GraduationCap, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from './supabase';
import { syncStudentsFromSheet, isStudentSyncDue, getStudentLastSyncTime } from './studentSyncService';

export const STUDENT_FIELDS = [
  // Basic & Contact Info
  { key: 'student_random_id', label: 'Student Random ID', group: 'Basic & Contact Info' },
  { key: 'current_year', label: 'Current Year', group: 'Basic & Contact Info' },
  { key: 'current_semester', label: 'Current Semester', group: 'Basic & Contact Info' },
  { key: 'cohort', label: 'Cohort', group: 'Basic & Contact Info' },
  { key: 'sp_year', label: 'SP Year', group: 'Basic & Contact Info' },
  { key: 'id', label: 'ID', group: 'Basic & Contact Info' },
  { key: 'name', label: 'Name', group: 'Basic & Contact Info' },
  { key: 'program', label: 'Program', group: 'Basic & Contact Info' },
  { key: 'study_plan', label: 'Study Plan', group: 'Basic & Contact Info' },
  { key: 'ugpg', label: 'UG/PG', group: 'Basic & Contact Info' },
  { key: 'college', label: 'College', group: 'Basic & Contact Info' },
  { key: 'email', label: 'Official Email', group: 'Basic & Contact Info' },
  { key: 'personal_email', label: 'Personal Email', group: 'Basic & Contact Info' },
  { key: 'active', label: 'Active', group: 'Basic & Contact Info' },
  { key: 'registration_status', label: 'Registration Status', group: 'Basic & Contact Info' },
  { key: 'phone', label: 'Phone', group: 'Basic & Contact Info' },
  { key: 'application_number', label: 'Application Number', group: 'Basic & Contact Info' },
  { key: 'student_phone', label: 'Student Phone', group: 'Basic & Contact Info' },

  // Demographics & Kin
  { key: 'nationality', label: 'Nationality', group: 'Demographics & Kin' },
  { key: 'place_of_birth', label: 'Place of Birth', group: 'Demographics & Kin' },
  { key: 'enroll_gender', label: 'Gender', group: 'Demographics & Kin' },
  { key: 'enroll_marital_status', label: 'Marital Status', group: 'Demographics & Kin' },
  { key: 'enroll_city_name', label: 'City / Emirate', group: 'Demographics & Kin' },
  { key: 'enroll_home_address', label: 'Home Address', group: 'Demographics & Kin' },
  { key: 'enroll_family_name', label: 'Family Name', group: 'Demographics & Kin' },
  { key: 'family_book_no', label: 'Family Book No.', group: 'Demographics & Kin' },
  { key: 'guardian_email', label: 'Guardian Email', group: 'Demographics & Kin' },
  { key: 'mother_mobile', label: 'Mother Mobile', group: 'Demographics & Kin' },
  { key: 'mother_email', label: 'Mother Email', group: 'Demographics & Kin' },
  { key: 'enroll_health_condition', label: 'Health Condition', group: 'Demographics & Kin' },
  { key: 'enroll_special_needs', label: 'Special Needs', group: 'Demographics & Kin' },
  { key: 'enroll_student_dob', label: 'Date of Birth', group: 'Demographics & Kin' },

  // Enrollment & Academics
  { key: 'enroll_institution', label: 'Institution', group: 'Enrollment & Academics' },
  { key: 'enroll_student_type', label: 'Student Type', group: 'Enrollment & Academics' },
  { key: 'enroll_area_of_study', label: 'Area of Study', group: 'Enrollment & Academics' },
  { key: 'enroll_major', label: 'Major', group: 'Enrollment & Academics' },
  { key: 'enroll_minor', label: 'Minor', group: 'Enrollment & Academics' },
  { key: 'enroll_progression', label: 'Progression / Level', group: 'Enrollment & Academics' },
  { key: 'enroll_mode_of_study', label: 'Mode of Study', group: 'Enrollment & Academics' },
  { key: 'enroll_employment_status', label: 'Employment Status', group: 'Enrollment & Academics' },
  { key: 'enroll_current_credits', label: 'Current Credits', group: 'Enrollment & Academics' },
  { key: 'enroll_total_credits', label: 'Total Credits', group: 'Enrollment & Academics' },
  { key: 'enroll_gpa_cumulative', label: 'Cumulative GPA', group: 'Enrollment & Academics' },
  { key: 'enroll_transfer_credits', label: 'Transfer Credits', group: 'Enrollment & Academics' },
  { key: 'enroll_research', label: 'Research Topic', group: 'Enrollment & Academics' },
  { key: 'enroll_outgoing', label: 'Outgoing Exchange', group: 'Enrollment & Academics' },
  { key: 'enroll_incoming', label: 'Incoming Exchange', group: 'Enrollment & Academics' },
  { key: 'mentor_name', label: 'Mentor Name', group: 'Enrollment & Academics' },
  { key: 'mentor_email', label: 'Mentor Email', group: 'Enrollment & Academics' },
  { key: 'enroll_1st_academic_year', label: '1st Academic Year', group: 'Enrollment & Academics' },

  // Application & Details
  { key: 'enroll_emirates_id', label: 'Emirates ID', group: 'Application & Details' },
  { key: 'emirates_id_expiry_date', label: 'EID Expiry Date', group: 'Application & Details' },
  { key: 'enroll_passport_no', label: 'Passport No.', group: 'Application & Details' },
  { key: 'passport_expiry_date', label: 'Passport Expiry Date', group: 'Application & Details' },
  { key: 'student_eid', label: 'Student EID', group: 'Application & Details' },
  { key: 'student_passport', label: 'Student Passport', group: 'Application & Details' },
  { key: 'app_application', label: 'App Application', group: 'Application & Details' },
  { key: 'app_admission', label: 'App Admission', group: 'Application & Details' },
  { key: 'app_passport', label: 'App Passport', group: 'Application & Details' },
  { key: 'app_country', label: 'App Country', group: 'Application & Details' },
  { key: 'enroll_missing_docs', label: 'Missing Docs', group: 'Application & Details' },
  { key: 'enroll_high_school', label: 'High School Country', group: 'Application & Details' },
  { key: 'hs_name', label: 'HS Name', group: 'Application & Details' },
  { key: 'diploma_year_hs', label: 'HS Diploma Year', group: 'Application & Details' },
  { key: 'enroll_12th_score', label: '12th Score', group: 'Application & Details' },
  { key: 'enroll_last_college', label: 'Last College', group: 'Application & Details' },
  { key: 'enroll_qualification', label: 'Qualification', group: 'Application & Details' },
  { key: 'enroll_language_1', label: 'Language Test Name', group: 'Application & Details' },
  { key: 'enroll_language_2', label: 'Language Test Score', group: 'Application & Details' },

  // Scholarships & SOD
  { key: 'sod_accommodation', label: 'SOD Accommodation', group: 'Scholarships & SOD' },
  { key: 'sod_nationality', label: 'SOD National Award', group: 'Scholarships & SOD' },
  { key: 'sod_international', label: 'SOD International Award', group: 'Scholarships & SOD' },
  { key: 'sod_instruction', label: 'SOD Instruction', group: 'Scholarships & SOD' },
  { key: 'sod_medical_condition', label: 'SOD Medical Condition', group: 'Scholarships & SOD' },
  { key: 'sch_scholarship_1', label: 'Scholarship Type', group: 'Scholarships & SOD' },
  { key: 'sch_scholarship_2', label: 'Scholarship Provider Type', group: 'Scholarships & SOD' },
  { key: 'sch_scholarship_3', label: 'Scholarship Provider Name', group: 'Scholarships & SOD' },
  { key: 'sch_scholarship_4', label: 'Scholarship Value', group: 'Scholarships & SOD' },
  { key: 'sch_scholarship_5', label: 'Scholarship Amount', group: 'Scholarships & SOD' },
  { key: 'sch_scholarship_6', label: 'Scholarship Duration', group: 'Scholarships & SOD' },
  { key: 'sch_academic_year', label: 'Sch Academic Year', group: 'Scholarships & SOD' },
  { key: 'comment_scholarship', label: 'Scholarship Comment', group: 'Scholarships & SOD' },
  { key: 'letter_scholarship', label: 'Scholarship Letter', group: 'Scholarships & SOD' },
  { key: 'enroll_al_eith_sponsor', label: 'Al Ethbara Sponsor', group: 'Scholarships & SOD' },

  // Graduation / Attrition
  { key: 'graduation_status', label: 'Graduation Status', group: 'Graduation / Attrition' },
  { key: 'grad_academic_year', label: 'Grad Academic Year', group: 'Graduation / Attrition' },
  { key: 'grad_master', label: 'Master Thesis Title', group: 'Graduation / Attrition' },
  { key: 'grad_phd_dissertation', label: 'PhD Dissertation Title', group: 'Graduation / Attrition' },
  { key: 'grad_total_credits', label: 'Grad Total Credits', group: 'Graduation / Attrition' },
  { key: 'grad_gpa_cumulative', label: 'Grad GPA Cumulative', group: 'Graduation / Attrition' },
  { key: 'grad_submission_date', label: 'Grad Submission Date', group: 'Graduation / Attrition' },
  { key: 'graduation_clearance', label: 'Graduation Clearance', group: 'Graduation / Attrition' },
  { key: 'grad_workplace', label: 'Grad Workplace', group: 'Graduation / Attrition' },
  { key: 'attrition_academic', label: 'Attrition Academic Period', group: 'Graduation / Attrition' },
  { key: 'count_attrition', label: 'Attrition Category', group: 'Graduation / Attrition' },
  { key: 'attrition_reason', label: 'Attrition Reason', group: 'Graduation / Attrition' },
  { key: 'withdrawal_reason', label: 'Withdrawal / Break Form', group: 'Graduation / Attrition' },
  { key: 'attrition_clearance', label: 'Attrition Clearance', group: 'Graduation / Attrition' },
  { key: 'attrition_submission', label: 'Attrition Submission Date', group: 'Graduation / Attrition' },
];

export const StudentManager = ({ students, setStudents, showSyncButton = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [syncState, setSyncState] = useState('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSync, setLastSync] = useState(getStudentLastSyncTime());

  // Auto-sync on mount if 12 hours have passed
  useEffect(() => {
    if (isStudentSyncDue()) {
      handleSync(true);
    }
  }, []);

  const filteredStudents = students.filter(s =>
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSync = async (silent = false) => {
    if (syncState === 'syncing') return;
    setSyncState('syncing');
    if (!silent) setSyncMessage('Syncing from Google Sheet...');

    try {
      const result = await syncStudentsFromSheet();

      if (result.errors.length > 0) {
        setSyncState('error');
        setSyncMessage(`Sync failed: ${result.errors[0]}`);
        return;
      }

      const { data } = await supabase.from('students').select('*').limit(5000);
      if (data) setStudents(data);

      setLastSync(getStudentLastSyncTime());
      setSyncState('success');
      setSyncMessage(`✓ Synced ${result.synced} student records from Google Sheet`);

      setTimeout(() => { setSyncState('idle'); setSyncMessage(''); }, 5000);
    } catch (err) {
      setSyncState('error');
      setSyncMessage(`Error: ${err.message}`);
    }
  };

  const syncButtonConfig = {
    idle:    { label: 'Sync from Sheet', className: 'bg-indigo-600 text-white hover:bg-indigo-700', icon: RefreshCw },
    syncing: { label: 'Syncing...', className: 'bg-indigo-400 text-white cursor-not-allowed', icon: RefreshCw },
    success: { label: 'Synced!', className: 'bg-emerald-600 text-white', icon: CheckCircle },
    error:   { label: 'Retry Sync', className: 'bg-red-600 text-white hover:bg-red-700', icon: AlertCircle },
  };

  const btn = syncButtonConfig[syncState];
  const BtnIcon = btn.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[85vh]">
      {/* Header Bar */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <GraduationCap className="mr-2 text-indigo-600" /> Students Database
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Synced from Google Sheet — {students.length} total records
          </p>
          {lastSync !== 'Never' && (
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <Clock size={11} /> Last synced: {lastSync}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
            />
          </div>

          {/* Sync Button — admin only */}
          {showSyncButton && (
            <button
              onClick={() => handleSync(false)}
              disabled={syncState === 'syncing'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-colors ${btn.className}`}
            >
              <BtnIcon size={16} className={syncState === 'syncing' ? 'animate-spin' : ''} />
              {btn.label}
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMessage && (
        <div className={`px-6 py-2.5 text-sm font-medium flex items-center gap-2 ${
          syncState === 'error'
            ? 'bg-red-50 text-red-700 border-b border-red-100'
            : syncState === 'success'
            ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100'
            : 'bg-indigo-50 text-indigo-700 border-b border-indigo-100'
        }`}>
          {syncState === 'syncing' && <RefreshCw size={14} className="animate-spin" />}
          {syncState === 'success' && <CheckCircle size={14} />}
          {syncState === 'error' && <AlertCircle size={14} />}
          {syncMessage}
        </div>
      )}

      {/* Read-Only Info Banner */}
      <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
        <span className="text-xs text-amber-700 font-medium">
          📋 This database is read-only. To make changes, edit the{' '}
          <a
            href="https://docs.google.com/spreadsheets/d/1l4uR3QGrPIGRCex1QHe71u0Nbs0IWhm0barRIFwJH84/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-900"
          >
            DMU Students Google Sheet
          </a>
          {' '}and click Sync.
        </span>
      </div>

      {/* Main Data Table */}
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-medium text-sm">
                <th className="p-3 pl-4 sticky left-0 bg-slate-100 z-10 w-64">Name / ID</th>
                <th className="p-3">Program</th>
                <th className="p-3">College</th>
                <th className="p-3">Major</th>
                <th className="p-3">GPA</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s, idx) => (
                <tr key={s.id || idx} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-3 pl-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                    <div className="font-medium text-slate-800">{s.name || 'Unnamed Student'}</div>
                    <div className="text-xs text-slate-500 font-mono">ID: {s.id || '-'}</div>
                    <div className="text-xs text-slate-400">{s.email || ''}</div>
                  </td>
                  <td className="p-3 text-sm text-slate-600">{s.program || '-'}</td>
                  <td className="p-3 text-sm text-slate-600">{s.college || '-'}</td>
                  <td className="p-3 text-sm text-slate-600">{s.enroll_major || '-'}</td>
                  <td className="p-3 text-sm font-semibold">
                    {s.enroll_gpa_cumulative ? (
                      <span className={Number(s.enroll_gpa_cumulative) >= 3.0 ? 'text-emerald-600' : 'text-slate-600'}>
                        {Number(s.enroll_gpa_cumulative).toFixed(2)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      s.active === 'Yes'
                        ? 'bg-emerald-100 text-emerald-700'
                        : s.active === 'No'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {s.registration_status || s.active || 'Unknown'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {students.length === 0
                      ? 'No student data yet — click "Sync from Sheet" to load data.'
                      : 'No students found matching your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
