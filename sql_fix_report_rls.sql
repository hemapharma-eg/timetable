-- Enable read access for authenticated and anonymous users to view Risk Reports
-- This resolves the issue where shared links or restricted users cannot view report data

-- 1. risk_management_plan
DROP POLICY IF EXISTS "Enable read access for all on risk_management_plan" ON public.risk_management_plan;
CREATE POLICY "Enable read access for all on risk_management_plan" 
ON public.risk_management_plan FOR SELECT 
TO public, anon, authenticated 
USING (true);

-- 2. risk_kris
DROP POLICY IF EXISTS "Enable read access for all on risk_kris" ON public.risk_kris;
CREATE POLICY "Enable read access for all on risk_kris" 
ON public.risk_kris FOR SELECT 
TO public, anon, authenticated 
USING (true);

-- 3. risk_kri_values
DROP POLICY IF EXISTS "Enable read access for all on risk_kri_values" ON public.risk_kri_values;
CREATE POLICY "Enable read access for all on risk_kri_values" 
ON public.risk_kri_values FOR SELECT 
TO public, anon, authenticated 
USING (true);

-- 4. kri_rubrics
DROP POLICY IF EXISTS "Enable read access for all on kri_rubrics" ON public.kri_rubrics;
CREATE POLICY "Enable read access for all on kri_rubrics" 
ON public.kri_rubrics FOR SELECT 
TO public, anon, authenticated 
USING (true);

-- 5. risk_year_mapping
DROP POLICY IF EXISTS "Enable read access for all on risk_year_mapping" ON public.risk_year_mapping;
CREATE POLICY "Enable read access for all on risk_year_mapping" 
ON public.risk_year_mapping FOR SELECT 
TO public, anon, authenticated 
USING (true);
