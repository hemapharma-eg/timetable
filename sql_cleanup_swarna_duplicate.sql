-- SQL Migration: Cleanup Duplicate Faculty Entry for swarna@dmu.ae
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/zqlpvnctweyfatlouacu/sql/new)

-- 1. Ensure the modern unified staff_roles table has the QAIE role assignment for swarna@dmu.ae
INSERT INTO public.staff_roles (email, custom_role_id)
VALUES ('swarna@dmu.ae', 'd30b4691-f63f-47c5-9c65-b6fcade378ba')
ON CONFLICT (email, custom_role_id) DO NOTHING;

-- 2. Delete the old, incomplete manual record from the faculty table (c34c278a-7b5c-4a28-b102-69b56ae5cd64)
DELETE FROM public.faculty
WHERE id = 'c34c278a-7b5c-4a28-b102-69b56ae5cd64';

-- 3. Confirm that dribrahimpharmaceutics@gmail.com is kept intact as admin
SELECT * FROM public.app_users WHERE email = 'dribrahimpharmaceutics@gmail.com';
