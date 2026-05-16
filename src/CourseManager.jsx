import React, { useState, useEffect } from 'react';
import { Search, BookOpen, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from './supabase';
import { syncCoursesFromSheet, isCourseSyncDue, getCourseLastSyncTime } from './courseSyncService';

export const COURSE_FIELDS = [
  // General Info
  { key: 'code', label: 'Course Code', group: 'General Info' },
  { key: 'name', label: 'Course Name', group: 'General Info' },
  { key: 'course_crn', label: 'Course CRN', group: 'General Info' },
  { key: 'course_description', label: 'Course Description', group: 'General Info' },
  { key: 'college', label: 'College', group: 'General Info' },
  { key: 'program', label: 'Primary Program', group: 'General Info' },
  { key: 'course_program_1', label: 'Course Program Name', group: 'General Info' },
  { key: 'course_random_id', label: 'Course Random ID', group: 'General Info' },

  // Academic Structure
  { key: 'course_degree', label: 'Course Degree', group: 'Academic Structure' },
  { key: 'course_academic_level', label: 'Academic Level', group: 'Academic Structure' },
  { key: 'study_plan', label: 'Study Plan', group: 'Academic Structure' },
  { key: 'study_plan_year', label: 'Study Plan Year', group: 'Academic Structure' },
  { key: 'academic_year', label: 'Academic Year', group: 'Academic Structure' },
  { key: 'cohort', label: 'Cohort', group: 'Academic Structure' },
  { key: 'offered_in', label: 'Offered In', group: 'Academic Structure' },
  { key: 'course_mandatory', label: 'Mandatory?', group: 'Academic Structure' },
  { key: 'course_credits', label: 'Course Credits', group: 'Academic Structure' },
  { key: 'credit_hours', label: 'Credit Hours', group: 'Academic Structure' },
  { key: 'course_contact_hours', label: 'Contact Hours', group: 'Academic Structure' },
  { key: 'course_theory', label: 'Theory Hours', group: 'Academic Structure' },
  { key: 'course_lab', label: 'Lab Hours', group: 'Academic Structure' },
  { key: 'course_mode', label: 'Course Mode', group: 'Academic Structure' },
  { key: 'course_grade', label: 'Course Grade', group: 'Academic Structure' },

  // Delivery & Assignments
  { key: 'course_faculty', label: 'Course Faculty', group: 'Delivery & Assignments' },
  { key: 'course_codev_1', label: 'Co-Developer 1', group: 'Delivery & Assignments' },
  { key: 'course_codel_1', label: 'Co-Delivery 1', group: 'Delivery & Assignments' },
  { key: 'sections', label: 'Sections Count', group: 'Delivery & Assignments' },
  { key: 'student_number', label: 'Student Number Limit', group: 'Delivery & Assignments' },
  { key: 'course_eval_system', label: 'Evaluation System', group: 'Delivery & Assignments' },

  // Classification & Flags
  { key: 'ge', label: 'GE (Gen Ed)', group: 'Classification & Flags' },
  { key: 'basic_science', label: 'Basic Science', group: 'Classification & Flags' },
  { key: 'ems_flag', label: 'EMS Flag', group: 'Classification & Flags' },
  { key: 'elective', label: 'Elective', group: 'Classification & Flags' },
  { key: 'type', label: 'Type', group: 'Classification & Flags' },
  { key: 'q_flag', label: 'Q Flag', group: 'Classification & Flags' }
];

export const CourseManager = ({ courses, setCourses, showSyncButton = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [syncState, setSyncState] = useState('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSync, setLastSync] = useState(getCourseLastSyncTime());

  // Auto-sync on mount if 12 hours have passed
  useEffect(() => {
    if (isCourseSyncDue()) {
      handleSync(true);
    }
  }, []);

  const filteredCourses = courses.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.course_crn || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSync = async (silent = false) => {
    if (syncState === 'syncing') return;
    setSyncState('syncing');
    if (!silent) setSyncMessage('Syncing from Google Sheet...');

    try {
      const result = await syncCoursesFromSheet();

      if (result.errors.length > 0) {
        setSyncState('error');
        setSyncMessage(`Sync failed: ${result.errors[0]}`);
        return;
      }

      const { data } = await supabase.from('courses').select('*').limit(5000);
      if (data) setCourses(data);

      setLastSync(getCourseLastSyncTime());
      setSyncState('success');
      setSyncMessage(`✓ Synced ${result.synced} course records from Google Sheet`);

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
            <BookOpen className="mr-2 text-indigo-600" /> Courses Database
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Synced from Google Sheet — {courses.length} total records
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
              placeholder="Search code or name..."
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
            href="https://docs.google.com/spreadsheets/d/1_1RV13-6fbaS7DwUPPswsE_xjxiuJ4nNcWvqftNmwe0/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-900"
          >
            DMU Courses Google Sheet
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
                <th className="p-3 pl-4 sticky left-0 bg-slate-100 z-10 w-96">Code & Name</th>
                <th className="p-3">CRN</th>
                <th className="p-3">Program</th>
                <th className="p-3">Credits</th>
                <th className="p-3">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.map((c, idx) => (
                <tr key={c.id || c.code || idx} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-3 pl-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                    <div className="font-medium text-slate-800">{c.code || '-'}</div>
                    <div className="text-sm text-slate-500 font-normal truncate max-w-xs">{c.name || 'Unnamed Course'}</div>
                  </td>
                  <td className="p-3 text-sm font-mono text-slate-600">{c.course_crn || '-'}</td>
                  <td className="p-3 text-sm text-slate-600">{c.program || c.college || '-'}</td>
                  <td className="p-3 text-sm font-semibold text-slate-600">
                    {c.course_credits || c.credit_hours || '-'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                      {c.course_mode || 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredCourses.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    {courses.length === 0
                      ? 'No course data yet — click "Sync from Sheet" to load data.'
                      : 'No courses found matching your search.'}
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
