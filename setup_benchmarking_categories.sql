-- 1. Benchmarking Categories Table
CREATE TABLE IF NOT EXISTS public.benchmarking_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Seed initial categories and migrate existing ones
INSERT INTO public.benchmarking_categories (name) VALUES 
('Students'), 
('Faculty'), 
('Research'), 
('Facilities'), 
('Financial') 
ON CONFLICT (name) DO NOTHING;

-- Migrate existing categories from KPIs
INSERT INTO public.benchmarking_categories (name)
SELECT DISTINCT category FROM public.benchmarking_kpis
ON CONFLICT (name) DO NOTHING;

-- 3. Enable RLS
ALTER TABLE public.benchmarking_categories ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DO $$ 
BEGIN
    CREATE POLICY "Public read categories" ON public.benchmarking_categories FOR SELECT USING (true);
    CREATE POLICY "Admin write categories" ON public.benchmarking_categories FOR ALL TO authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
