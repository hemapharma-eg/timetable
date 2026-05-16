-- SQL to support Google Sheet → Supabase courses sync
-- Run this in your Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS)

-- 1. Add ALL mapped columns from the Google Sheet
ALTER TABLE courses ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_crn TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_description TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS college TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS program TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_program_1 TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS study_plan TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS study_plan_year TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cohort TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS offered_in TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_mandatory TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_credits TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS credit_hours TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_contact_hours TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_theory TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_lab TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_mode TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_grade TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_faculty TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_codev_1 TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_codel_1 TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS sections TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS student_number TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_eval_system TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS ge TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS basic_science TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS ems_flag TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS elective TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS q_flag TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_degree TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_academic_level TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_random_id TEXT;

-- 2. Ensure 'code' has a UNIQUE constraint (required for upsert onConflict)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_code_unique'
  ) THEN
    -- Only add if it's not already a PK or unique
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'courses' AND constraint_type = 'PRIMARY KEY'
    ) THEN
      ALTER TABLE courses ADD CONSTRAINT courses_code_unique UNIQUE (code);
    END IF;
  END IF;
END
$$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_courses_crn ON courses(course_crn);
