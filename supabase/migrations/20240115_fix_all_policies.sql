-- =====================================================
-- ARREGLAR TODAS LAS POLÍTICAS PARA EVITAR RECURSIÓN
-- =====================================================

-- Primero, eliminar TODAS las políticas existentes que puedan causar problemas
DROP POLICY IF EXISTS "Users can view their own credits" ON patient_credits;
DROP POLICY IF EXISTS "Admin users can view all credits" ON patient_credits;
DROP POLICY IF EXISTS "Admin users can manage credits" ON patient_credits;

DROP POLICY IF EXISTS "Users can view their own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admin users can view all transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admin users can manage transactions" ON credit_transactions;

-- Crear políticas simples sin referencias a user_roles para evitar recursión
-- 1. Políticas para patient_credits
CREATE POLICY "Users can view their own credits" 
    ON patient_credits FOR SELECT
    TO authenticated
    USING (patient_id = auth.uid());

-- Política temporal para admins (sin verificar user_roles)
CREATE POLICY "Service role can manage all credits" 
    ON patient_credits FOR ALL
    TO service_role
    USING (true);

-- 2. Políticas para credit_transactions
CREATE POLICY "Users can view their own transactions" 
    ON credit_transactions FOR SELECT
    TO authenticated
    USING (patient_id = auth.uid());

-- Política temporal para admins (sin verificar user_roles)
CREATE POLICY "Service role can manage all transactions" 
    ON credit_transactions FOR ALL
    TO service_role
    USING (true);

-- 3. Crear función helper para verificar si es admin (sin recursión)
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
RETURNS boolean AS $$
BEGIN
    -- Verificación directa sin recursión
    RETURN EXISTS (
        SELECT 1 
        FROM user_roles 
        WHERE user_roles.user_id = $1 
        AND user_roles.role = 'admin'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Política especial para permitir que el sistema genere créditos
CREATE POLICY "System can create credits on cancellation" 
    ON patient_credits FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Permitir si es el propio usuario O si es admin
        patient_id = auth.uid() 
        OR public.is_admin_user(auth.uid())
    );

CREATE POLICY "System can update credits" 
    ON patient_credits FOR UPDATE
    TO authenticated
    USING (
        -- Permitir si es el propio usuario O si es admin
        patient_id = auth.uid() 
        OR public.is_admin_user(auth.uid())
    );

CREATE POLICY "System can create transactions" 
    ON credit_transactions FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Permitir si es el propio usuario O si es admin
        patient_id = auth.uid() 
        OR public.is_admin_user(auth.uid())
    );

-- 5. Arreglar las referencias de foreign key
ALTER TABLE patient_credits DROP CONSTRAINT IF EXISTS patient_credits_patient_id_fkey;
ALTER TABLE patient_credits 
    ADD CONSTRAINT patient_credits_patient_id_fkey 
    FOREIGN KEY (patient_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_patient_id_fkey;
ALTER TABLE credit_transactions 
    ADD CONSTRAINT credit_transactions_patient_id_fkey 
    FOREIGN KEY (patient_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- 6. Asegurar que los timestamps sean correctos
ALTER TABLE patient_credits 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN created_at SET DEFAULT TIMEZONE('utc'::text, NOW()),
    ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING updated_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at SET DEFAULT TIMEZONE('utc'::text, NOW());

ALTER TABLE credit_transactions 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN created_at SET DEFAULT TIMEZONE('utc'::text, NOW());

-- 7. Agregar tipo de pago para créditos si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public' 
        AND t.typname = 'payment_status_enum'
    ) THEN
        -- El tipo no existe, así que lo creamos
        NULL; -- Ya existe en appointments
    END IF;
    
    -- Verificar si 'credited' ya existe en el enum
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'payment_status_enum'
        AND e.enumlabel = 'credited'
    ) THEN
        -- Agregar 'credited' al enum existente
        ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'credited';
    END IF;
END $$;