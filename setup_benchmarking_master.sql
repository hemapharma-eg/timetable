-- Master tables for Benchmarking Persistence

-- 1. Universities
CREATE TABLE IF NOT EXISTS public.benchmarking_universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    abbr TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Years
CREATE TABLE IF NOT EXISTS public.benchmarking_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. KPI Definitions
CREATE TABLE IF NOT EXISTS public.benchmarking_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(category, name)
);

-- 4. Benchmarking Values (Data Entry)
CREATE TABLE IF NOT EXISTS public.benchmarking_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id UUID REFERENCES public.benchmarking_kpis(id) ON DELETE CASCADE,
    year_id UUID REFERENCES public.benchmarking_years(id) ON DELETE CASCADE,
    values JSONB NOT NULL DEFAULT '{}',
    action_plan TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(kpi_id, year_id)
);

-- Enable RLS
ALTER TABLE public.benchmarking_universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmarking_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmarking_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmarking_values ENABLE ROW LEVEL SECURITY;

-- Policies (Public read, Authenticated write)
DO $$ 
BEGIN
    -- Read Policies
    CREATE POLICY "Public read universities" ON public.benchmarking_universities FOR SELECT USING (true);
    CREATE POLICY "Public read years" ON public.benchmarking_years FOR SELECT USING (true);
    CREATE POLICY "Public read kpis" ON public.benchmarking_kpis FOR SELECT USING (true);
    CREATE POLICY "Public read values" ON public.benchmarking_values FOR SELECT USING (true);

    -- Write Policies (Authenticated)
    CREATE POLICY "Admin write universities" ON public.benchmarking_universities FOR ALL TO authenticated USING (true);
    CREATE POLICY "Admin write years" ON public.benchmarking_years FOR ALL TO authenticated USING (true);
    CREATE POLICY "Admin write kpis" ON public.benchmarking_kpis FOR ALL TO authenticated USING (true);
    CREATE POLICY "Admin write values" ON public.benchmarking_values FOR ALL TO authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
