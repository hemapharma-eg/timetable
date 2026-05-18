-- Upgrade staff_roles to support multiple roles per person
-- 1. Remove the old primary key constraint
ALTER TABLE staff_roles DROP CONSTRAINT IF EXISTS staff_roles_pkey;

-- 2. Add a composite primary key (email, custom_role_id)
-- This allows one person (email) to have many roles.
ALTER TABLE staff_roles ADD PRIMARY KEY (email, custom_role_id);

-- No change needed to RLS policies as they use 'email' or 'auth.uid()'
