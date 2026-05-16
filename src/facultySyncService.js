/**
 * Faculty Sync Service
 * Fetches data from the DMU Faculty Google Sheet (public CSV export)
 * and syncs it into the Supabase faculty table.
 *
 * Sheet: https://docs.google.com/spreadsheets/d/1fzvoz7rqMbRqs5vhUQ06cc33JItrAqyPkg2NPeqRO10
 * Tab: Sheet1 (gid=0)
 * Sync frequency: every 12 hours (tracked via localStorage)
 */

import { supabase } from './supabase';

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1fzvoz7rqMbRqs5vhUQ06cc33JItrAqyPkg2NPeqRO10/export?format=csv&gid=0';

const LAST_SYNC_KEY = 'faculty_last_sync';
const SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Maps Google Sheet column headers → Supabase faculty table fields.
 * Only the columns that have a direct mapping are included.
 */
const COLUMN_MAP = {
  Faculty_Random_ID:          'faculty_random_id',
  Category:                   'category',
  ID:                         'employee_id',
  Name:                       'name',
  First_Name:                 'first_name',
  Last_Name:                  'last_name',
  College:                    'college',
  Dept:                       'dept',
  Email:                      'email',
  Active:                     'active',
  Admin_Role:                 'admin_role',
  Designation:                'designation',
  Administrative_Position:    'administrative_role',
  Emp_Employment_Status:      'emp_employment_status',
  Emp_Hire_Date:              'emp_hire_date',
  End_of_Service:             'end_of_service_date',
  Nationality:                'nationality',
  Scopus_ID:                  'scopus_id',
  Emp_Position_Title:         'emp_position_1',
  Emp_Position_Title_Other__: 'emp_position_2',
  Emp_Emirates_ID:            'emp_emirates_id',
  EID_Valid:                  'eid_valid',
  Emp_Missing_EID:            'emp_missing_docs',
  Emp_Gender:                 'emp_gender',
  Emp_Payroll:                'emp_payroll',
  Emp_Nationality:            'emp_national_id',
  Emp_DOB:                    'emp_dob',
  Emp_Campus:                 'emp_campus',
  Emp_Phone_Number:           'emp_phone_mobile',
  Emp_Last_Promotion_Date:    'emp_last_promotion',
  Emp_Qualification:          'emp_qualification_1',
  Emp_ORC_ID:                 'emp_orc_id',
  Emp_Years_of_experience:    'emp_years_of_experience',
  Certificate_Sub_ID:         'certificate_submitted',
  Hospital:                   'hospital',
  Hospital_Department:        'hospital_department',
  Specialty:                  'specialty',
};

/**
 * Parse CSV text into an array of objects.
 * Handles quoted fields with commas inside them.
 */
function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header row
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
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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
 * Convert a sheet row object into a Supabase faculty record.
 */
function mapRowToRecord(sheetRow) {
  const record = {};
  for (const [sheetCol, dbField] of Object.entries(COLUMN_MAP)) {
    const raw = sheetRow[sheetCol];
    if (raw !== undefined && raw !== '') {
      // Normalize Active field: TRUE/FALSE → Yes/No
      if (dbField === 'active') {
        record[dbField] = raw === 'TRUE' || raw === 'true' || raw === '1' ? 'Yes' : 'No';
      } else {
        record[dbField] = raw;
      }
    }
  }
  return record;
}

/**
 * Check if a sync is due (more than 12 hours since last sync).
 */
export function isSyncDue() {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  if (!lastSync) return true;
  return Date.now() - parseInt(lastSync, 10) > SYNC_INTERVAL_MS;
}

/**
 * Get the last sync time as a human-readable string.
 */
export function getLastSyncTime() {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  if (!lastSync) return 'Never';
  return new Date(parseInt(lastSync, 10)).toLocaleString();
}

/**
 * Main sync function: fetch Google Sheet → upsert into Supabase.
 * Returns { synced, errors }.
 */
export async function syncFacultyFromSheet() {
  try {
    // 1. Fetch CSV from Google Sheets
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
    }
    const csvText = await response.text();

    // 2. Parse CSV
    const sheetRows = parseCSV(csvText);
    if (sheetRows.length === 0) {
      throw new Error('No data found in the Google Sheet.');
    }

    // 3. Map rows to Supabase records
    const records = sheetRows
      .map(mapRowToRecord)
      .filter(r => r.name); // Must have a name

    if (records.length === 0) {
      throw new Error('No valid records found after mapping.');
    }

    // 4. Upsert into Supabase (match on employee_id)
    const { error } = await supabase
      .from('faculty')
      .upsert(records, { onConflict: 'employee_id', ignoreDuplicates: false });

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }

    // 5. Update last sync timestamp
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

    return { synced: records.length, errors: [] };
  } catch (err) {
    console.error('[Faculty Sync]', err);
    return { synced: 0, errors: [err.message] };
  }
}
