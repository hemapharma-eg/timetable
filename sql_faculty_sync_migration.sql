-- SQL to support Google Sheet → Supabase faculty sync
-- Run this in your Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS)

-- 1. Add new columns from the Google Sheet that may not exist yet
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS faculty_random_id TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS admin_role TEXT;

-- Position / Role columns
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_position_1 TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_position_2 TEXT;

-- Employment columns (may already exist under different names)
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_hire_date TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_employment_status TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_last_promotion TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_years_of_experience TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS end_of_service_date TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_payroll TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_campus TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS administrative_role TEXT;

-- Demographics & ID columns
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_emirates_id TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS eid_valid TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_missing_docs TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_gender TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_national_id TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_dob TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_phone_mobile TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS nationality TEXT;

-- Academic columns
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS scopus_id TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_orc_id TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_qualification_1 TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_qualification_2 TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_qualification_3 TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_qualification_4 TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_qualification_5 TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_qualification_6 TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_equivalency_1 TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS emp_equivalency_2 TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS certificate_submitted TEXT;

-- Medical / Clinical columns
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS hospital TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS hospital_department TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS specialty TEXT;

-- 2. Ensure employee_id has a UNIQUE constraint (required for upsert onConflict)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'faculty_employee_id_unique'
  ) THEN
    ALTER TABLE faculty ADD CONSTRAINT faculty_employee_id_unique UNIQUE (employee_id);
  END IF;
END
$$;

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_faculty_email ON faculty(email);
CREATE INDEX IF NOT EXISTS idx_faculty_employee_id ON faculty(employee_id);
