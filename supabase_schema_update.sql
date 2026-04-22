-- DMU Timetable Migration Script
-- Run this script in your Supabase SQL Editor.

-- 1. Add email to Faculty
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS email text;

-- 2. Drop "Subjects" linkages (Since courses handle them)
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_subject_id_fkey;
ALTER TABLE public.activities DROP COLUMN IF EXISTS subject_id;

ALTER TABLE public.constraints DROP CONSTRAINT IF EXISTS constraints_subject_id_fkey;
ALTER TABLE public.constraints DROP COLUMN IF EXISTS subject_id;

ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_subject_id_fkey;
ALTER TABLE public.schedules DROP COLUMN IF EXISTS subject_id;

-- Now it is safe to drop the subjects table if you wish
DROP TABLE IF EXISTS public.subjects CASCADE;

-- 3. Update Courses to include constraints requested
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS program text;

-- 4. Create Students Table
CREATE TABLE IF NOT EXISTS public.students (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text,
  group_id uuid REFERENCES public.student_groups(id),
  created_at timestamptz default now()
);

-- Note: The id column is set to text because the user requested to "import the student id", 
-- meaning IDs might be custom strings rather than auto-generated UUIDs.

-- 5. CMS Upgrade: Add Comprehensive Faculty Fields
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS employee_id text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS dept text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS active text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS designation text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS administrative_role text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_employment_status text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_hire_date text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS end_of_service_date text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS nationality text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS scopus_id text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_position_1 text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_position_2 text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_emirates_id text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS eid_valid text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_missing_docs text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_gender text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_payroll text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_national_id text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_dob text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_campus text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_phone_mobile text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_last_promotion text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_qualification_1 text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_qualification_2 text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_qualification_3 text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_qualification_4 text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_qualification_5 text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_qualification_6 text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_equivalency_1 text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_equivalency_2 text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_orc_id text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS emp_years_of_experience text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS certificate_submitted text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS hospital text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS hospital_department text;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS specialty text;
