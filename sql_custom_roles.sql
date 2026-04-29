-- ═══════════════════════════════════════════════════════════════════════════
-- RBAC (Role-Based Access Control) for Faculty & Staff
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Custom Roles Table (e.g. Dean, HR, Finance)
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access on custom_roles" ON public.custom_roles;
CREATE POLICY "Full access on custom_roles" ON public.custom_roles FOR ALL USING (true) WITH CHECK (true);

-- Seed some default roles
INSERT INTO public.custom_roles (name, description) VALUES
  ('Dean', 'College Dean'),
  ('Associate Dean', 'Associate Dean for Academic Affairs'),
  ('Department Chair', 'Head of Department'),
  ('HR', 'Human Resources'),
  ('Finance', 'Finance and Budgeting')
ON CONFLICT (name) DO NOTHING;

-- 2. Role Permissions Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  module_name text NOT NULL, -- e.g. 'risk_dashboard', 'risk_register', 'risk_reports', 'faculty_db'
  can_view boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, module_name)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access on role_permissions" ON public.role_permissions;
CREATE POLICY "Full access on role_permissions" ON public.role_permissions FOR ALL USING (true) WITH CHECK (true);

-- 3. Update Faculty table to link to custom_roles
DO $$ BEGIN
  ALTER TABLE public.faculty ADD COLUMN custom_role_id uuid REFERENCES public.custom_roles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
