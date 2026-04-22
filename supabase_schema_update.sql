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
