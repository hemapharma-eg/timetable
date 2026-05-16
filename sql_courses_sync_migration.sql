-- SQL to fix the 'ON CONFLICT' error for courses sync
-- This ensures the 'code' column is unique, which is required for the sync to work.

-- 1. First, ensure the 'code' column exists
ALTER TABLE courses ADD COLUMN IF NOT EXISTS code TEXT;

-- 2. Add the unique constraint to 'code'
-- NOTE: If this fails, it means you have duplicate course codes already in your table.
-- You must delete or rename duplicates before this will work.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'courses_code_unique'
    ) THEN
        ALTER TABLE courses ADD CONSTRAINT courses_code_unique UNIQUE (code);
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add unique constraint. You may have duplicate course codes.';
END
$$;

-- 3. Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
