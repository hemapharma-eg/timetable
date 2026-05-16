-- SQL to support Google Sheet → Supabase students sync
-- Run this in your Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS)

-- 1. Add new columns from the Google Sheet that may not exist yet
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_random_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_year TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_semester TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS registration_status TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_student_dob TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enroll_student_type TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emirates_id_expiry_date TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS passport_expiry_date TEXT;

-- Application & IDs
ALTER TABLE students ADD COLUMN IF NOT EXISTS app_application TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS app_admission TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS app_passport TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS app_country TEXT;

-- Scholarships & SOD
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

-- 2. Ensure 'id' has a UNIQUE constraint (required for upsert onConflict)
-- If 'id' is already the Primary Key, this might not be needed, but we'll ensure it just in case.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'students_id_unique'
  ) THEN
    -- Only add if it's not already a PK or unique
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'students' AND constraint_type = 'PRIMARY KEY'
    ) THEN
      ALTER TABLE students ADD CONSTRAINT students_id_unique UNIQUE (id);
    END IF;
  END IF;
END
$$;

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_id ON students(id);
