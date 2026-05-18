-- SQL Migration: Auto-Sync Faculty & Students to Supabase Auth
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/zqlpvnctweyfatlouacu/sql/new)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================================
-- 1. HISTORICAL SYNC: Register all current Faculty who don't have accounts
-- =========================================================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  f.email,
  crypt('TemporaryPassword123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', COALESCE(f.name, 'Faculty Member')),
  now(),
  now(),
  '',
  '',
  '',
  ''
FROM faculty f
WHERE f.email IS NOT NULL 
  AND f.email != '' 
  AND f.email LIKE '%@%'
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.email = f.email
  );

-- =========================================================================
-- 2. HISTORICAL SYNC: Register all current Students who don't have accounts
-- =========================================================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  s.email,
  crypt('TemporaryPassword123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', COALESCE(s.name, 'Student')),
  now(),
  now(),
  '',
  '',
  '',
  ''
FROM students s
WHERE s.email IS NOT NULL 
  AND s.email != '' 
  AND s.email LIKE '%@%'
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.email = s.email
  );


-- =========================================================================
-- 3. AUTOMATION: Trigger Function for Faculty Syncs
-- =========================================================================
CREATE OR REPLACE FUNCTION sync_faculty_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email != '' AND NEW.email LIKE '%@%' THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = NEW.email) THEN
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        NEW.email,
        crypt('TemporaryPassword123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', COALESCE(NEW.name, 'Faculty Member')),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Trigger to Faculty Table
DROP TRIGGER IF EXISTS trigger_sync_faculty_to_auth ON faculty;
CREATE TRIGGER trigger_sync_faculty_to_auth
AFTER INSERT OR UPDATE OF email, name ON faculty
FOR EACH ROW
EXECUTE FUNCTION sync_faculty_to_auth();


-- =========================================================================
-- 4. AUTOMATION: Trigger Function for Students Syncs
-- =========================================================================
CREATE OR REPLACE FUNCTION sync_student_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email != '' AND NEW.email LIKE '%@%' THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = NEW.email) THEN
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        NEW.email,
        crypt('TemporaryPassword123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', COALESCE(NEW.name, 'Student')),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Trigger to Students Table
DROP TRIGGER IF EXISTS trigger_sync_student_to_auth ON students;
CREATE TRIGGER trigger_sync_student_to_auth
AFTER INSERT OR UPDATE OF email, name ON students
FOR EACH ROW
EXECUTE FUNCTION sync_student_to_auth();
