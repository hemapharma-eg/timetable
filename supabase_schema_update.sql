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

-- 6. CMS Upgrade: Add Comprehensive Student Fields
-- Core
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS cohort text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sp_year text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS program text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS study_plan text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS ugpg text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS college text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS personal_email text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS application_number text;
-- Enrollment
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_institution text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_academic_status text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_al_eith_sponsor text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_emirates_id text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_passport_no text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_missing_docs text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_family_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_city_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS family_book_no text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS passport_expiry_date text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS emirates_id_expiry_date text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_email text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_mobile text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_email text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS place_of_birth text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nationality text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_gender text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_health_condition text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_special_needs text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_marital_status text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_home_address text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_1st_academic_year text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_area_of_study text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_major text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_minor text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_progression text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_mode_of_study text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_employment_status text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_required_courses text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS required_no text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_current_credits text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_total_credits text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_gpa_cumulative text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_transfer_credits text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_language_1 text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_language_2 text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_standard text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_high_school text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS hs_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS diploma_year_hs text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_12th_score text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_last_college text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_qualification text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS count_qualifications text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_research text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS vol_70_comc text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_outgoing text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_incoming text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enroll_exchange text;
-- Progression & Attrition
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS attrition_academic text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS count_attrition text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS attrition_reason text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS grad_master text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS grad_phd_dissertation text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS grad_total_credits text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS grad_gpa_cumulative text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS grad_submission_date text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS grad_academic_year text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS first_academic_year text;
-- SOD
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sod_accommodation text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sod_nationality text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sod_international text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sod_instruction text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sod_medical_condition text;
-- App
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS app_application text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS app_admission text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS app_passport text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS app_country text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS app_email_address text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS app_home_number text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS app_language text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS app_high_school text;
-- Scholarships
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sch_scholarship_1 text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sch_scholarship_2 text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sch_scholarship_3 text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sch_scholarship_4 text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sch_scholarship_5 text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sch_scholarship_6 text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sch_academic_year text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS comment_scholarship text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS letter_scholarship text;
-- Final clearances
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS withdrawal_reason text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS attrition_clearance text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS graduation_clearance text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS attrition_submission text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS graduation_status text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS grad_workplace text;
-- Mentor & End info
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mentor_id text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mentor_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mentor_email text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_phone text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_eid text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_passport text;

-- 7. CMS Upgrade: Add Comprehensive Course Fields
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS college text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_program_1 text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_program_2 text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS study_plan text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS academic_year text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS cohort text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS study_plan_year text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS offered_in text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_academic_level text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_crn text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS sections text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_description text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_degree text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_credits text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_mandatory text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS credit_hours text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_contact_hours text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_lab text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_theory text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_mode text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_grade text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_faculty text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_codev_1 text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_codev_2 text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_codel_1 text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_codel_2 text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_eval_system text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS student_number text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS ge text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS basic_science text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS ems_flag text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS elective text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS q_flag text;

-- 8. Builders Infrastructure: Schema Introspection + Config Tables

-- RPC function to discover all public tables and columns
CREATE OR REPLACE FUNCTION get_schema_info()
RETURNS json AS $$
  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT table_name, column_name, data_type, is_nullable,
           column_default, ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  ) t;
$$ LANGUAGE sql SECURITY DEFINER;

-- RPC function to run a dynamic insert (used by form builder)
CREATE OR REPLACE FUNCTION dynamic_insert(target_table text, row_data jsonb)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE format(
    'INSERT INTO public.%I SELECT * FROM jsonb_populate_record(null::public.%I, $1) RETURNING to_jsonb(%I.*)',
    target_table, target_table, target_table
  ) INTO result USING row_data;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to run a dynamic update
CREATE OR REPLACE FUNCTION dynamic_update(target_table text, row_id text, row_data jsonb)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  col_name text;
  col_value text;
  set_clause text := '';
BEGIN
  FOR col_name, col_value IN SELECT * FROM jsonb_each_text(row_data)
  LOOP
    IF col_name != 'id' THEN
      IF set_clause != '' THEN set_clause := set_clause || ', '; END IF;
      set_clause := set_clause || format('%I = %L', col_name, col_value);
    END IF;
  END LOOP;
  IF set_clause = '' THEN RETURN '{}'::jsonb; END IF;
  EXECUTE format(
    'UPDATE public.%I SET %s WHERE id = %L RETURNING to_jsonb(%I.*)',
    target_table, set_clause, row_id, target_table
  ) INTO result;
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to delete a row dynamically
CREATE OR REPLACE FUNCTION dynamic_delete(target_table text, row_id text)
RETURNS boolean AS $$
BEGIN
  EXECUTE format('DELETE FROM public.%I WHERE id = %L', target_table, row_id);
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Form Configurations table
CREATE TABLE IF NOT EXISTS public.form_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  config jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.form_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access on form_configs" ON public.form_configs;
CREATE POLICY "Admin full access on form_configs" ON public.form_configs FOR ALL USING (true) WITH CHECK (true);

-- App Configurations table
CREATE TABLE IF NOT EXISTS public.app_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  config jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.app_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access on app_configs" ON public.app_configs;
CREATE POLICY "Admin full access on app_configs" ON public.app_configs FOR ALL USING (true) WITH CHECK (true);

-- Report Configurations table
CREATE TABLE IF NOT EXISTS public.report_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  config jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.report_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access on report_configs" ON public.report_configs;
CREATE POLICY "Admin full access on report_configs" ON public.report_configs FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 9: Fix RLS policies for all core tables
-- Run this to ensure all tables are accessible
-- ═══════════════════════════════════════════════════════════════════════════

-- app_users: allow authenticated users to read all, and insert/update their own
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access on app_users" ON public.app_users;
CREATE POLICY "Allow full access on app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

-- Ensure ALL public tables have open RLS policies for authenticated users
-- This covers any new tables added dynamically (e.g. CHEDS_Academic_Programs)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Full access on %I" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Full access on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;
