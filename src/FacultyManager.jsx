import React, { useState, useEffect } from 'react';
import { Search, User, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from './supabase';
import { fetchAll } from './supabaseUtils';
import { syncFacultyFromSheet, isSyncDue, getLastSyncTime } from './facultySyncService';

export const FACULTY_FIELDS = [
  { key: 'category', label: 'Category', group: 'Basic Info' },
  { key: 'employee_id', label: 'ID', group: 'Basic Info' },
  { key: 'name', label: 'Name', group: 'Basic Info' },
  { key: 'first_name', label: 'First Name', group: 'Basic Info' },
  { key: 'last_name', label: 'Last Name', group: 'Basic Info' },
  { key: 'college', label: 'College', group: 'Basic Info' },
  { key: 'dept', label: 'Dept', group: 'Basic Info' },
  { key: 'email', label: 'Email', group: 'Basic Info' },
  { key: 'admin_role', label: 'Admin Role', group: 'Basic Info' },
  { key: 'custom_role_id', label: 'Role', group: 'Basic Info', type: 'select', options: [] },

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

export const FacultyManager = ({ faculty, setFaculty, showSyncButton = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [syncState, setSyncState] = useState('idle'); // idle | syncing | success | error
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSync, setLastSync] = useState(getLastSyncTime());

  // Auto-sync on mount if 12 hours have passed
  useEffect(() => {
    if (isSyncDue()) {
      handleSync(true);
    }
  }, []);

  const filteredFaculty = faculty.filter(f =>
    (f.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSync = async (silent = false) => {
    if (syncState === 'syncing') return;
    setSyncState('syncing');
    if (!silent) setSyncMessage('Syncing from Google Sheet...');

    try {
      const result = await syncFacultyFromSheet();

      if (result.errors.length > 0) {
        setSyncState('error');
        setSyncMessage(`Sync failed: ${result.errors[0]}`);
        return;
      }

      // Refresh data from Supabase
      const data = await fetchAll('faculty');
      if (data) setFaculty(data);

      setLastSync(getLastSyncTime());
      setSyncState('success');
      setSyncMessage(`✓ Synced ${result.synced} records from Google Sheet`);

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setSyncState('idle');
        setSyncMessage('');
      }, 5000);
    } catch (err) {
      setSyncState('error');
      setSyncMessage(`Error: ${err.message}`);
    }
  };

  const syncButtonConfig = {
    idle: {
      label: 'Sync from Sheet',
      className: 'bg-indigo-600 text-white hover:bg-indigo-700',
      icon: RefreshCw,
    },
    syncing: {
      label: 'Syncing...',
      className: 'bg-indigo-400 text-white cursor-not-allowed',
      icon: RefreshCw,
    },
    success: {
      label: 'Synced!',
      className: 'bg-emerald-600 text-white',
      icon: CheckCircle,
    },
    error: {
      label: 'Retry Sync',
      className: 'bg-red-600 text-white hover:bg-red-700',
      icon: AlertCircle,
    },
  };

  const btn = syncButtonConfig[syncState];
  const BtnIcon = btn.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[85vh]">
      {/* Header Bar */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <User className="mr-2 text-indigo-600" /> Faculty & Staff
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Synced from Google Sheet — {faculty.length} total records
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
              placeholder="Search staff..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
            />
          </div>

          {/* Sync Button — only shown to admins */}
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
            href="https://docs.google.com/spreadsheets/d/1fzvoz7rqMbRqs5vhUQ06cc33JItrAqyPkg2NPeqRO10/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-900"
          >
            DMU Faculty Google Sheet
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
                <th className="p-3 pl-4 sticky left-0 bg-slate-100 z-10 w-64">Name / Email</th>
                <th className="p-3">ID</th>
                <th className="p-3">Category</th>
                <th className="p-3">Designation</th>
                <th className="p-3">College / Dept</th>
                <th className="p-3">Status</th>
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
                  <td className="p-3 text-sm text-slate-600">{f.category || '-'}</td>
                  <td className="p-3 text-sm text-slate-600">{f.designation || '-'}</td>
                  <td className="p-3 text-sm text-slate-600">
                    {f.college || f.dept ? `${f.college || ''}${f.dept ? ` / ${f.dept}` : ''}` : '-'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      f.active === 'Yes'
                        ? 'bg-emerald-100 text-emerald-700'
                        : f.active === 'No'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {f.active || 'Unknown'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredFaculty.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {faculty.length === 0
                      ? 'No faculty data yet — click "Sync from Sheet" to load data.'
                      : 'No faculty or staff members found matching your search.'}
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
