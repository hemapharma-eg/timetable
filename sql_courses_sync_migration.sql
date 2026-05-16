-- SQL to upgrade Course uniqueness
-- The user specified that Course Code alone is not unique (repeats by year/program).
-- We will use a composite key of (code, academic_year, program).

-- 1. Remove the old (incorrect) unique constraint
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_code_unique;

-- 2. Add the new composite unique constraint
-- Note: If this fails, you have existing duplicates for the same code/year/program.
-- You must clean them up in the Supabase Table Editor before running this.
ALTER TABLE courses ADD CONSTRAINT courses_composite_unique UNIQUE (code, academic_year, program);

-- 3. Update indexes
DROP INDEX IF EXISTS idx_courses_code;
CREATE INDEX IF NOT EXISTS idx_courses_composite ON courses(code, academic_year, program);
