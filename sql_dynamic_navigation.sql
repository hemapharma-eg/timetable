-- Create table for sidebar sections
CREATE TABLE IF NOT EXISTS public.app_sections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Create table for custom pages (Apps and Reports)
CREATE TABLE IF NOT EXISTS public.app_pages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    section_id uuid REFERENCES public.app_sections(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('app', 'report')),
    configuration jsonb DEFAULT '{}'::jsonb,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.app_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_pages ENABLE ROW LEVEL SECURITY;

-- Policies for app_sections
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_sections' AND policyname = 'Allow read for all authenticated') THEN
        CREATE POLICY "Allow read for all authenticated" ON public.app_sections FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_sections' AND policyname = 'Allow all for tech_admin') THEN
        CREATE POLICY "Allow all for tech_admin" ON public.app_sections FOR ALL USING (
            EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('technical_admin', 'academic_admin'))
        );
    END IF;
END $$;

-- Policies for app_pages
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_pages' AND policyname = 'Allow read for all authenticated') THEN
        CREATE POLICY "Allow read for all authenticated" ON public.app_pages FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_pages' AND policyname = 'Allow all for tech_admin') THEN
        CREATE POLICY "Allow all for tech_admin" ON public.app_pages FOR ALL USING (
            EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('technical_admin', 'academic_admin'))
        );
    END IF;
END $$;
