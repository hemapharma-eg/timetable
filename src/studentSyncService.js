/**
 * Student Sync Service
 * Fetches data from the DMU Student Google Sheet (public CSV export)
 * and syncs it into the Supabase `students` table.
 *
 * Sheet: https://docs.google.com/spreadsheets/d/1l4uR3QGrPIGRCex1QHe71u0Nbs0IWhm0barRIFwJH84
 * Tab: Sheet1 (gid=0)
 * Sync frequency: every 12 hours (tracked via localStorage)
 */

import { supabase } from './supabase';

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1l4uR3QGrPIGRCex1QHe71u0Nbs0IWhm0barRIFwJH84/export?format=csv&gid=0';

const LAST_SYNC_KEY = 'students_last_sync';
const SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Maps Google Sheet column headers → Supabase students table fields.
 */
const COLUMN_MAP = {
  Student_Random_ID:                'student_random_id',
  Current_Year:                     'current_year',
  Current_Semester:                 'current_semester',
  Cohort:                           'cohort',
  SP_Year:                          'sp_year',
  ID:                               'id',
  Name:                             'name',
  Program:                          'program',
  Study_Plan:                       'study_plan',
  UGPG:                             'ugpg',
  College:                          'college',
  Email_ID:                         'email',
  Personal_Email:                   'personal_email',
  Active_CHEDS:                     'active',
  Registration_Status:              'registration_status',
  Phone:                            'phone',
  Application_ID:                   'application_number',

  // Demographics
  Enroll_Gender:                    'enroll_gender',
  Enroll_Student_DOB:               'enroll_student_dob',
  Enroll_Marital_Status:            'enroll_marital_status',
  Enroll_Nationality:               'nationality',
  Enroll_Home_Emirate:              'enroll_city_name',
  Place_of_Birth_in_English:        'place_of_birth',
  Enroll_Student_Mobile_Number:     'student_phone',
  Enroll_Family_Book_Number:        'family_book_no',
  Guardian_Mobile:                  'phone',
  Guardian_Email:                   'guardian_email',
  Mother_Mobile:                    'mother_mobile',
  Mother_Email:                     'mother_email',
  Enroll_Health_Fitness_Certificat: 'enroll_health_condition',
  Enroll_Special_Needs:             'enroll_special_needs',
  Enroll_Student_Campus:            'enroll_city_name',

  // Enrollment & Academics
  Enroll_Institution_Name:          'enroll_institution',
  Enroll_Academic_Period:           'enroll_1st_academic_year',
  Enroll_Student_Type:              'enroll_student_type',
  Enroll_Student_Level:             'enroll_progression',
  Enroll_Area_of_Specialization:    'enroll_area_of_study',
  Enroll_Student_Major:             'enroll_major',
  Enroll_Minor:                     'enroll_minor',
  Enroll_Mode_of_Study:             'enroll_mode_of_study',
  Enroll_Current_Registered_Credit: 'enroll_current_credits',
  Enroll_Total_Credits_Cumulated:   'enroll_total_credits',
  Enroll_GPA_Cumulative:            'enroll_gpa_cumulative',
  Enroll_Transfer_Credits_Cumulati: 'enroll_transfer_credits',
  Enroll_Research_Topic:            'enroll_research',
  Enroll_Outgoing_Exchange_Indicat: 'enroll_outgoing',
  Enroll_Incoming_Exchange_Indicat: 'enroll_incoming',
  Mentor_Name:                      'mentor_name',
  Mentor_Email:                     'mentor_email',
  Enroll_Employment_Status:         'enroll_employment_status',

  // Application & IDs
  Enroll_Emirates_ID:               'enroll_emirates_id',
  Emirates_ID_Expiry_Date:          'emirates_id_expiry_date',
  Enroll_Passport_Number:           'enroll_passport_no',
  Passport_Expiry_Date:             'passport_expiry_date',
  Student_EID:                      'student_eid',
  Student_Passport:                 'student_passport',
  App_Applicant_ID:                 'app_application',
  App_Admission_Offered:            'app_admission',
  App_Passport_Unified_Number:      'app_passport',
  App_Country:                      'app_country',
  Enroll_Missing_EID:               'enroll_missing_docs',

  // High School & Qualifications
  Enroll_High_School_Country:       'enroll_high_school',
  HS_Name:                          'hs_name',
  Enroll_Completion_Year_HSC:       'diploma_year_hs',
  Enroll_High_School_Score:         'enroll_12th_score',
  Enroll_Last_completed_HE_Degree:  'enroll_qualification',
  Enroll_Qualifying_institution_Na: 'enroll_last_college',
  Enroll_Language_Test_Name:        'enroll_language_1',
  Enroll_Language_Test_Score:       'enroll_language_2',

  // Scholarships & SOD
  SOD_Accomodation_type:            'sod_accommodation',
  SOD_National_Award_Participated:  'sod_nationality',
  SOD_INTERNATIONAL_Award_particip: 'sod_international',
  SOD_Instructional_assitive_techn: 'sod_instruction',
  SOD_Medical_assitive_devices:     'sod_medical_condition',
  Sch_Scholarship_Type:             'sch_scholarship_1',
  Sch_Scholarship_Provider_Type:    'sch_scholarship_2',
  Sch_Scholarship_Provider_Name:    'sch_scholarship_3',
  Sch_Scholarship_Value:            'sch_scholarship_4',
  Sch_Scholarship_Amount:           'sch_scholarship_5',
  Sch_Scholarship_Duration:         'sch_scholarship_6',
  Sch_Academic_Period:              'sch_academic_year',
  Comment_Scholarships:             'comment_scholarship',
  Letter_Scholarships:              'letter_scholarship',
  Enroll_Al_Ethbara:                'enroll_al_eith_sponsor',

  // Graduation / Attrition
  Submission:                       'graduation_status',
  Grad_Academic_Period:             'grad_academic_year',
  Grad_Master_Thesis_Title:         'grad_master',
  Grad_PhD_Dissertation_Title:      'grad_phd_dissertation',
  Grad_Total_Credits_Cumulated:     'grad_total_credits',
  Grad_GPA_Cumulative:              'grad_gpa_cumulative',
  Grad_Submission_Term:             'grad_submission_date',
  Graduation_Clearance_Form:        'graduation_clearance',
  Grad_Workplacement:               'grad_workplace',
  Attrition_Academic_Period:        'attrition_academic',
  Attrition_Category:               'count_attrition',
  Attrition_Reason:                 'attrition_reason',
  Withdrawal_Break_Form:            'withdrawal_reason',
  Attrition_Clearance_Form:         'attrition_clearance',
  Attrition_Submission_Date:        'attrition_submission',
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
 * Convert a sheet row to a Supabase students record.
 */
function mapRowToRecord(sheetRow) {
  const record = {};
  for (const [sheetCol, dbField] of Object.entries(COLUMN_MAP)) {
    const raw = sheetRow[sheetCol];
    if (raw !== undefined && raw !== '') {
      if (dbField === 'active') {
        record[dbField] = raw === 'Yes' || raw === 'TRUE' || raw === 'true' ? 'Yes' : 'No';
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
export function isStudentSyncDue() {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  if (!lastSync) return true;
  return Date.now() - parseInt(lastSync, 10) > SYNC_INTERVAL_MS;
}

/**
 * Get the last sync time as a human-readable string.
 */
export function getStudentLastSyncTime() {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  if (!lastSync) return 'Never';
  return new Date(parseInt(lastSync, 10)).toLocaleString();
}

/**
 * Main sync function: fetch Google Sheet → upsert into Supabase students table.
 */
export async function syncStudentsFromSheet() {
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
      .filter(r => r.name); // Must have a name

    if (rawRecords.length === 0) {
      throw new Error('No valid records found after mapping.');
    }

    // De-duplicate: Keep only the last record for each unique 'id'
    const uniqueMap = new Map();
    rawRecords.forEach(r => {
      if (r.id) uniqueMap.set(r.id, r);
    });
    const records = Array.from(uniqueMap.values());

    const { error } = await supabase
      .from('students')
      .upsert(records, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }

    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    return { synced: records.length, errors: [] };
  } catch (err) {
    console.error('[Student Sync]', err);
    return { synced: 0, errors: [err.message] };
  }
}
