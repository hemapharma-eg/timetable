-- SQL to support Google Sheet → Supabase faculty sync
-- Run this in your Supabase SQL Editor

-- 1. Add new columns from the Google Sheet that may not exist yet
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS faculty_random_id TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS admin_role TEXT;

-- 2. Ensure employee_id has a UNIQUE constraint (required for upsert onConflict)
--    Skip if it already exists
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

-- 3. Optional: index on email for fast lookup
CREATE INDEX IF NOT EXISTS idx_faculty_email ON faculty(email);
CREATE INDEX IF NOT EXISTS idx_faculty_employee_id ON faculty(employee_id);
