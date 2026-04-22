ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS role text;
