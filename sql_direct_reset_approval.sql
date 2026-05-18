-- SQL Migration: Secure Direct Password Reset Function (with app_users email column addition)
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/zqlpvnctweyfatlouacu/sql/new)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Ensure the app_users table has the email column (fixes the missing column error)
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Create secure definer function to reset password directly and lock the account as 'pending'
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
  -- This blocks their sign-in until dribrahimpharmaceutics@gmail.com approves them in the dashboard
  INSERT INTO app_users (id, email, role)
  VALUES (target_user_id, user_email, 'pending')
  ON CONFLICT (id) DO UPDATE SET role = 'pending';

  -- 4. Delete existing staff roles so they have no permissions until re-assigned
  DELETE FROM staff_roles WHERE email = user_email;

  -- 5. Clear their custom role in the faculty table as a secondary safeguard
  UPDATE faculty SET custom_role_id = NULL WHERE email = user_email;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
