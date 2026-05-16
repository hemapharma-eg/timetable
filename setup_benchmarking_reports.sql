-- Create a table to store shared benchmarking reports
CREATE TABLE IF NOT EXISTS public.benchmarking_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.benchmarking_reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read reports
CREATE POLICY "Allow public read access to benchmarking reports"
ON public.benchmarking_reports FOR SELECT
USING (true);

-- Allow authenticated users to insert reports
CREATE POLICY "Allow authenticated users to insert benchmarking reports"
ON public.benchmarking_reports FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also allow anonymous inserts if needed (for public sharing of modified data)
CREATE POLICY "Allow anonymous users to insert benchmarking reports"
ON public.benchmarking_reports FOR INSERT
TO anon
WITH CHECK (true);
