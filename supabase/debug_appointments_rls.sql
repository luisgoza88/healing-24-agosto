-- =====================================================
-- DEBUG SCRIPT FOR APPOINTMENTS RLS ISSUES
-- =====================================================

-- 1. Check if RLS is enabled on appointments table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'appointments';

-- 2. List all policies on appointments table
SELECT 
    polname AS policy_name,
    polcmd AS command,
    polpermissive AS permissive,
    pg_get_expr(polqual, polrelid) AS using_expression,
    pg_get_expr(polwithcheck, polrelid) AS check_expression
FROM pg_policy
WHERE polrelid = 'appointments'::regclass;

-- 3. Check if user can see their own appointments (replace with actual user_id)
-- This query should be run as the authenticated user
SELECT 
    COUNT(*) as total_appointments,
    COUNT(CASE WHEN user_id = auth.uid() THEN 1 END) as my_appointments
FROM appointments;

-- 4. Create a function to bypass RLS for debugging
CREATE OR REPLACE FUNCTION get_appointments_debug(input_user_id UUID)
RETURNS TABLE (
    total_count BIGINT,
    user_count BIGINT,
    sample_appointment JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH counts AS (
        SELECT 
            COUNT(*) as total_count,
            COUNT(CASE WHEN user_id = input_user_id THEN 1 END) as user_count
        FROM appointments
    ),
    sample AS (
        SELECT to_jsonb(a.*) as appointment
        FROM appointments a
        WHERE a.user_id = input_user_id
        LIMIT 1
    )
    SELECT 
        c.total_count,
        c.user_count,
        COALESCE(s.appointment, '{}'::jsonb) as sample_appointment
    FROM counts c
    LEFT JOIN sample s ON true;
$$;

-- 5. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_appointments_debug(UUID) TO authenticated;

-- 6. Create a simpler RLS policy for testing (if needed)
-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;
DROP POLICY IF EXISTS "Professionals can view their appointments" ON appointments;

-- Create new, simpler policies
CREATE POLICY "Enable read access for users" ON appointments
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users" ON appointments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users" ON appointments
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users" ON appointments
    FOR DELETE
    USING (auth.uid() = user_id);

-- 7. Verify the new policies
SELECT 
    polname AS policy_name,
    polcmd AS command,
    pg_get_expr(polqual, polrelid) AS using_expression
FROM pg_policy
WHERE polrelid = 'appointments'::regclass
ORDER BY polname;

-- 8. Test query to verify data visibility
-- Run this as the authenticated user
SELECT 
    id,
    user_id,
    appointment_date,
    status,
    created_at
FROM appointments
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;