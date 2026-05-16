/**
 * Course Sync Service
 * Fetches data from the DMU Course Google Sheet (public CSV export)
 * and syncs it into the Supabase `courses` table.
 *
 * Sheet: https://docs.google.com/spreadsheets/d/1_1RV13-6fbaS7DwUPPswsE_xjxiuJ4nNcWvqftNmwe0
 * Tab: Sheet1 (gid=0)
 * Sync frequency: every 12 hours (tracked via localStorage)
 */

import { supabase } from './supabase';

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1_1RV13-6fbaS7DwUPPswsE_xjxiuJ4nNcWvqftNmwe0/export?format=csv&gid=0';

const LAST_SYNC_KEY = 'courses_last_sync';
const SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Maps Google Sheet column headers → Supabase courses table fields.
 */
const COLUMN_MAP = {
  Course_Code:              'code',
  Course_Name:              'name',
  Course_CRN:               'course_crn',
  Course_desc:              'course_description',
  College:                  'college',
  Program:                  'program',
  Course_Program_Name:      'course_program_1',
  Study_Plan:               'study_plan',
  Study_Plan_Year:          'study_plan_year',
  Academic_Year:            'academic_year',
  Cohort:                   'cohort',
  Offered_in:               'offered_in',
  Course_mandatory:         'course_mandatory',
  Course_credit:            'course_credits',
  CREDIT_HOURS:             'credit_hours',
  Course_contact_hours:     'course_contact_hours',
  Course_Theory:            'course_theory',
  Course_lab:               'course_lab',
  Course_mode:              'course_mode',
  Course_Grade:             'course_grade',
  Course_Faculty_member:    'course_faculty',
  Course_CoDev:             'course_codev_1',
  Course_CoDeliver:         'course_codel_1',
  Sections:                 'sections',
  Student_Numbers:          'student_number',
  Course_eval_score:        'course_eval_system',
  GE:                       'ge',
  Basic_Science:            'basic_science',
  EMS_Flag:                 'ems_flag',
  Elective:                 'elective',
  Type:                     'type',
  Q:                        'q_flag',
  Course_Degree:            'course_degree',
  Course_Academic_Period:   'course_academic_level',
  Course_Random_ID:         'course_random_id',
};

/**
 * Parse CSV text into an array of objects.
 */
function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVRow(line);
    if (values.length === 0) continue;
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    rows.push(obj);
  }
  return rows;
}

/**
 * Parse a single CSV row, respecting quoted fields.
 */
function parseCSVRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Convert a sheet row to a Supabase courses record.
 */
function mapRowToRecord(sheetRow) {
  const record = {};
  for (const [sheetCol, dbField] of Object.entries(COLUMN_MAP)) {
    const raw = sheetRow[sheetCol];
    if (raw !== undefined && raw !== '') {
      record[dbField] = raw;
    }
  }
  // Ensure we have a unique ID for Supabase. Using Course_Code as the unique key if possible, 
  // but if the sheet has a Course_Random_ID we can use that as the primary sync key.
  // We'll use 'code' (Course_Code) for onConflict.
  return record;
}

/**
 * Check if a sync is due (more than 12 hours since last sync).
 */
export function isCourseSyncDue() {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  if (!lastSync) return true;
  return Date.now() - parseInt(lastSync, 10) > SYNC_INTERVAL_MS;
}

/**
 * Get the last sync time as a human-readable string.
 */
export function getCourseLastSyncTime() {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  if (!lastSync) return 'Never';
  return new Date(parseInt(lastSync, 10)).toLocaleString();
}

/**
 * Main sync function: fetch Google Sheet → upsert into Supabase courses table.
 */
export async function syncCoursesFromSheet() {
  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
    }
    const csvText = await response.text();

    const sheetRows = parseCSV(csvText);
    if (sheetRows.length === 0) {
      throw new Error('No data found in the Google Sheet.');
    }

    const rawRecords = sheetRows
      .map(mapRowToRecord)
      .filter(r => r.code && r.name); // Must have both code and name

    if (rawRecords.length === 0) {
      throw new Error('No valid records found after mapping.');
    }

    // De-duplicate: Keep only the last record for each unique 'code'
    // to prevent "ON CONFLICT DO UPDATE command cannot affect row a second time" error.
    const uniqueMap = new Map();
    rawRecords.forEach(r => uniqueMap.set(r.code, r));
    const records = Array.from(uniqueMap.values());

    // Upsert into Supabase.
    const { error } = await supabase
      .from('courses')
      .upsert(records, { onConflict: 'code', ignoreDuplicates: false });

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }

    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    return { synced: records.length, errors: [] };
  } catch (err) {
    console.error('[Course Sync]', err);
    return { synced: 0, errors: [err.message] };
  }
}
