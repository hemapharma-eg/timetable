-- SQL Migration: Secure Direct Password Reset Function (with server-side notification mailer)
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/zqlpvnctweyfatlouacu/sql/new)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Ensure the app_users table has the email column (fixes the missing column error)
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Drop the obsolete check constraint that restricts the role column, allowing 'pending' and 'approved' values
ALTER TABLE public.app_users DROP CONSTRAINT IF EXISTS app_users_role_check;

-- 3. Create secure definer function to reset password directly and lock the account as 'pending'
CREATE OR REPLACE FUNCTION rpc_reset_password_direct(user_email TEXT, new_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- 1. Locate the user in auth.users by email
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  
  -- If the user does not exist, return false
  IF target_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 2. Update their password securely
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  -- 3. Lock the account as 'pending' in app_users
  -- This blocks their sign-in until approved in the dashboard
  INSERT INTO app_users (id, email, role)
  VALUES (target_user_id, user_email, 'pending')
  ON CONFLICT (id) DO UPDATE SET role = 'pending';

  -- 4. Delete existing staff roles so they have no permissions until re-assigned
  DELETE FROM staff_roles WHERE email = user_email;

  -- 5. Clear their custom role in the faculty table as a secondary safeguard
  UPDATE faculty SET custom_role_id = NULL WHERE email = user_email;

  -- 6. Trigger background approval notification emails to qaie_dept@dmu.ae and qaie.dmu@gmail.com
  -- Bypasses client browser security, ad-blockers, firewalls, and CORS policies!
  BEGIN
    PERFORM net.http_post(
      url := 'https://formsubmit.co/ajax/qaie_dept@dmu.ae',
      body := jsonb_build_object(
        '_subject', '⚠️ QA Hub: New Password Reset Approval Required',
        'User Email', user_email,
        'Requested At', to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
        'Approval Dashboard', 'https://qa-hub-dmu.vercel.app',
        'Instructions', 'A user has requested a password reset. Their account is locked as pending. Please log into the QA Hub admin dashboard (User Role Assignment) to approve their sign-in.'
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );

    PERFORM net.http_post(
      url := 'https://formsubmit.co/ajax/qaie.dmu@gmail.com',
      body := jsonb_build_object(
        '_subject', '⚠️ QA Hub: New Password Reset Approval Required',
        'User Email', user_email,
        'Requested At', to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
        'Approval Dashboard', 'https://qa-hub-dmu.vercel.app',
        'Instructions', 'A user has requested a password reset. Their account is locked as pending. Please log into the QA Hub admin dashboard (User Role Assignment) to approve their sign-in.'
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    -- Prevent background mailer failure from blocking the password reset itself
    RAISE WARNING 'Approval mailer triggered an error: %', SQLERRM;
  END;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
