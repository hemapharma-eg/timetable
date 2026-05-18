-- Benchmarking Action Plans Table
CREATE TABLE IF NOT EXISTS public.benchmarking_action_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id UUID REFERENCES public.benchmarking_kpis(id) ON DELETE CASCADE,
    year_id UUID REFERENCES public.benchmarking_years(id) ON DELETE CASCADE,
    action_text TEXT NOT NULL,
    responsibility TEXT,
    deadline_month TEXT, -- e.g., "September"
    deadline_year TEXT,  -- e.g., "2025"
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in process', 'achieved')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.benchmarking_action_plans ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    CREATE POLICY "Public read action plans" ON public.benchmarking_action_plans FOR SELECT USING (true);
    CREATE POLICY "Admin write action plans" ON public.benchmarking_action_plans FOR ALL TO authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
