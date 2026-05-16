-- 1. Update the type constraint on app_pages to allow 'benchmarking'
ALTER TABLE public.app_pages DROP CONSTRAINT IF EXISTS app_pages_type_check;
ALTER TABLE public.app_pages ADD CONSTRAINT app_pages_type_check CHECK (type IN ('app', 'report', 'benchmarking'));

-- 2. Create the Benchmarking section
-- Note: UUIDs are hardcoded to allow for idempotent inserts
INSERT INTO public.app_sections (id, name, order_index)
VALUES ('b47a1100-0000-4000-8000-000000000000', 'Benchmarking', 10)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, order_index = EXCLUDED.order_index;

-- 3. Create the Dashboard page
INSERT INTO public.app_pages (id, section_id, name, type, configuration, order_index)
VALUES (
    'b47a1100-0000-4000-8000-000000000001', 
    'b47a1100-0000-4000-8000-000000000000', 
    'Performance Dashboard', 
    'benchmarking', 
    '{"view": "dashboard"}', 
    0
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, configuration = EXCLUDED.configuration;

-- 4. Create the Admin Panel page
INSERT INTO public.app_pages (id, section_id, name, type, configuration, order_index)
VALUES (
    'b47a1100-0000-4000-8000-000000000002', 
    'b47a1100-0000-4000-8000-000000000000', 
    'Data Management', 
    'benchmarking', 
    '{"view": "admin"}', 
    1
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, configuration = EXCLUDED.configuration;
