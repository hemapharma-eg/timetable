-- Supabase Schema Update (Supplemental)
-- Adds Risk_No column and fixes RLS for Public Reporting Link

-- 1. Add Risk_No Field
ALTER TABLE public.risk_management_plan ADD COLUMN IF NOT EXISTS "Risk_No" text;

-- 2. Open up RLS for the public (Shared Link) to read the risk reports
-- Note: 'anon' role is used when a guest visits the shared link without logging in.
CREATE POLICY "Allow public read risk_management_plan" ON public.risk_management_plan FOR SELECT USING (true);
CREATE POLICY "Allow public read risk_kris" ON public.risk_kris FOR SELECT USING (true);
CREATE POLICY "Allow public read risk_kri_values" ON public.risk_kri_values FOR SELECT USING (true);
CREATE POLICY "Allow public read kri_rubrics" ON public.kri_rubrics FOR SELECT USING (true);
