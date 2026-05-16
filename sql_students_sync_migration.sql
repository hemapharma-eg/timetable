-- SQL to support Google Sheet → Supabase students sync
-- Run this in your Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS)

-- 1. Add ALL mapped columns from the Google Sheet
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_random_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_year TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_semester TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS cohort TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sp_year TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS program TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS study_plan TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS ugpg TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS college TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS personal_email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS active TEXT; -- Status field from sheet
ALTER TABLE students ADD COLUMN IF NOT EXISTS registration_status TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS application_number TEXT;

-- Demographics
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_gender TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_student_dob TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_marital_status TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_city_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS place_of_birth TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS family_book_no TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_mobile TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_health_condition TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_special_needs TEXT;

-- Enrollment & Academics
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_institution TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_1st_academic_year TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_student_type TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_progression TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_area_of_study TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_major TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_minor TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_mode_of_study TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_current_credits TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_total_credits TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_gpa_cumulative TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_transfer_credits TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_research TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_outgoing TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_incoming TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mentor_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mentor_email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_employment_status TEXT;

-- Application & IDs
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_emirates_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emirates_id_expiry_date TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_passport_no TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS passport_expiry_date TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_eid TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_passport TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS app_application TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS app_admission TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS app_passport TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS app_country TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_missing_docs TEXT;

-- High School & Qualifications
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_high_school TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS hs_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS diploma_year_hs TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_12th_score TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_qualification TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_last_college TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_language_1 TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_language_2 TEXT;

-- Scholarships & SOD
ALTER TABLE students ADD COLUMN IF NOT EXISTS sod_accommodation TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sod_nationality TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sod_international TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sod_instruction TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sod_medical_condition TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sch_scholarship_1 TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sch_scholarship_2 TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sch_scholarship_3 TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sch_scholarship_4 TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sch_scholarship_5 TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sch_scholarship_6 TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sch_academic_year TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS comment_scholarship TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS letter_scholarship TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_al_eith_sponsor TEXT;

-- Graduation / Attrition
ALTER TABLE students ADD COLUMN IF NOT EXISTS graduation_status TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS grad_academic_year TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS grad_master TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS grad_phd_dissertation TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS grad_total_credits TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS grad_gpa_cumulative TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS grad_submission_date TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS graduation_clearance TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS grad_workplace TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS attrition_academic TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS count_attrition TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS attrition_reason TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS attrition_clearance TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS attrition_submission TEXT;

-- 2. Ensure 'id' has a UNIQUE constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'students_id_unique'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'students' AND constraint_type = 'PRIMARY KEY'
    ) THEN
      ALTER TABLE students ADD CONSTRAINT students_id_unique UNIQUE (id);
    END IF;
  END IF;
END
$$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_id ON students(id);
