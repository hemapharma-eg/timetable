-- Add Organizational Structure tables (colleges, programs, committees)

-- Colleges
CREATE TABLE IF NOT EXISTS public.colleges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all on colleges" ON public.colleges;
CREATE POLICY "Enable read access for all on colleges" ON public.colleges FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for authenticated" ON public.colleges;
CREATE POLICY "Enable insert access for authenticated" ON public.colleges FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable update access for authenticated" ON public.colleges;
CREATE POLICY "Enable update access for authenticated" ON public.colleges FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable delete access for authenticated" ON public.colleges;
CREATE POLICY "Enable delete access for authenticated" ON public.colleges FOR DELETE USING (auth.role() = 'authenticated');

-- Programs
CREATE TABLE IF NOT EXISTS public.programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(name, college_id)
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all on programs" ON public.programs;
CREATE POLICY "Enable read access for all on programs" ON public.programs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for authenticated" ON public.programs;
CREATE POLICY "Enable insert access for authenticated" ON public.programs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable update access for authenticated" ON public.programs;
CREATE POLICY "Enable update access for authenticated" ON public.programs FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable delete access for authenticated" ON public.programs;
CREATE POLICY "Enable delete access for authenticated" ON public.programs FOR DELETE USING (auth.role() = 'authenticated');

-- Committees
CREATE TABLE IF NOT EXISTS public.committees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(name, college_id)
);

ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all on committees" ON public.committees;
CREATE POLICY "Enable read access for all on committees" ON public.committees FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for authenticated" ON public.committees;
CREATE POLICY "Enable insert access for authenticated" ON public.committees FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable update access for authenticated" ON public.committees;
CREATE POLICY "Enable update access for authenticated" ON public.committees FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable delete access for authenticated" ON public.committees;
CREATE POLICY "Enable delete access for authenticated" ON public.committees FOR DELETE USING (auth.role() = 'authenticated');
