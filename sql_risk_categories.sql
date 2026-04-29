-- ═══════════════════════════════════════════════════════════════════════════
-- Risk Categories Table
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.risk_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  value text NOT NULL UNIQUE,      -- short key stored in risk_management_plan.Category
  label text NOT NULL,              -- display name shown in dropdowns / reports
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.risk_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access on risk_categories" ON public.risk_categories;
CREATE POLICY "Full access on risk_categories" ON public.risk_categories
  FOR ALL USING (true) WITH CHECK (true);

-- Seed with the existing hardcoded categories
INSERT INTO public.risk_categories (value, label, sort_order) VALUES
  ('Academic',    'Academic & Research',       1),
  ('Clinical',    'Clinical Operations',       2),
  ('Compliance',  'Compliance & Legal',        3),
  ('Financial',   'Financial',                 4),
  ('IT',          'IT & Cybersecurity',        5),
  ('Operational', 'Operational / Facilities',  6),
  ('Strategic',   'Strategic',                 7)
ON CONFLICT (value) DO NOTHING;
