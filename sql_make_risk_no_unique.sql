-- 1. Ensure that Risk_No is unique across all risk records
-- Note: If you already have duplicate Risk_No values in your database, this query will fail.
-- You must first manually ensure no duplicates exist before running this.
ALTER TABLE public.risk_management_plan ADD CONSTRAINT risk_no_unique UNIQUE ("Risk_No");
