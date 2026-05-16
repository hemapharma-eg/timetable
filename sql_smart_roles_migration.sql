-- SQL to create a persistent role assignment table
-- This table survives Google Sheet syncs because it's independent of the 'faculty' table.

CREATE TABLE IF NOT EXISTS staff_roles (
    email TEXT PRIMARY KEY,
    custom_role_id UUID REFERENCES custom_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

-- Allow read for everyone (to check roles)
CREATE POLICY "Allow read access for all authenticated users" ON staff_roles
    FOR SELECT TO authenticated USING (true);

-- Allow full access for admins
CREATE POLICY "Allow all access for technical_admin" ON staff_roles
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM app_users 
            WHERE id = auth.uid() AND (role = 'technical_admin' OR role = 'admin')
        ) OR (auth.jwt() ->> 'email' = 'dribrahimpharmaceutics@gmail.com')
    );
