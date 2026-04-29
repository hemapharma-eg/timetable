-- ═══════════════════════════════════════════════════════════════════════════
-- Academic Years & Risk-Year Mappings
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Academic Years table
CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL UNIQUE,        -- e.g. '2024-2025'
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access on academic_years" ON public.academic_years;
CREATE POLICY "Full access on academic_years" ON public.academic_years
  FOR ALL USING (true) WITH CHECK (true);

-- Seed with default years
INSERT INTO public.academic_years (label, sort_order) VALUES
  ('2023-2024', 1),
  ('2024-2025', 2),
  ('2025-2026', 3)
ON CONFLICT (label) DO NOTHING;

-- 2. Risk-Year Mapping table (which risks appear in which year)
CREATE TABLE IF NOT EXISTS public.risk_year_mapping (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id uuid NOT NULL REFERENCES public.risk_management_plan(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(risk_id, academic_year)
);

ALTER TABLE public.risk_year_mapping ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access on risk_year_mapping" ON public.risk_year_mapping;
CREATE POLICY "Full access on risk_year_mapping" ON public.risk_year_mapping
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Add sort_order to kri_rubrics if not exists
DO $$ BEGIN
  ALTER TABLE public.kri_rubrics ADD COLUMN sort_order int DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
