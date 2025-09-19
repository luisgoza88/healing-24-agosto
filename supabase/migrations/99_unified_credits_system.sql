-- =====================================================
-- SISTEMA UNIFICADO DE CRÉDITOS - MIGRACIÓN FINAL
-- =====================================================
-- Esta migración unifica los dos sistemas de créditos existentes
-- y crea un solo esquema consistente

-- 1. LIMPIAR ESQUEMAS CONFLICTIVOS
-- Eliminar políticas existentes que pueden causar problemas
DROP POLICY IF EXISTS "Users can view their own credits" ON patient_credits;
DROP POLICY IF EXISTS "Admin users can view all credits" ON patient_credits;
DROP POLICY IF EXISTS "Admin users can manage credits" ON patient_credits;
DROP POLICY IF EXISTS "Users can view their own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admin users can view all transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admin users can manage transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Service role can manage all credits" ON patient_credits;
DROP POLICY IF EXISTS "Service role can manage all transactions" ON credit_transactions;
DROP POLICY IF EXISTS "System can create credits on cancellation" ON patient_credits;
DROP POLICY IF EXISTS "System can update credits" ON patient_credits;
DROP POLICY IF EXISTS "System can create transactions" ON credit_transactions;

-- Eliminar políticas del esquema user_credits también
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "System can insert credits" ON user_credits;
DROP POLICY IF EXISTS "System can insert transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can view all credits" ON user_credits;
DROP POLICY IF EXISTS "Admins can view all transactions" ON credit_transactions;

-- 2. MIGRAR DATOS DE patient_credits A user_credits (si existen)
DO $$ 
BEGIN
    -- Verificar si patient_credits tiene datos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_credits') THEN
        -- Migrar datos de patient_credits a user_credits
        INSERT INTO user_credits (
            user_id, 
            amount, 
            credit_type, 
            description, 
            is_used,
            created_at,
            updated_at
        )
        SELECT 
            patient_id,
            available_credits,
            'migration'::text,
            'Migrado desde patient_credits',
            false,
            created_at,
            updated_at
        FROM patient_credits
        WHERE available_credits > 0
        ON CONFLICT (user_id) DO NOTHING; -- Evitar duplicados si ya existen
        
        -- Migrar transacciones si existen
        INSERT INTO credit_transactions (
            user_id,
            transaction_type,
            amount,
            description,
            appointment_id,
            created_at
        )
        SELECT 
            patient_id,
            CASE 
                WHEN transaction_type = 'earned' THEN 'earned'
                WHEN transaction_type = 'used' THEN 'used'
                WHEN transaction_type = 'expired' THEN 'expired'
                ELSE 'adjustment'
            END,
            amount,
            COALESCE(description, 'Migrado desde credit_transactions'),
            appointment_id,
            created_at
        FROM credit_transactions ct
        WHERE EXISTS (
            SELECT 1 FROM patient_credits pc 
            WHERE pc.patient_id = ct.patient_id
        );
    END IF;
END $$;

-- 3. ELIMINAR TABLAS OBSOLETAS (después de migrar datos)
DROP TABLE IF EXISTS patient_credits CASCADE;
-- Nota: No eliminamos credit_transactions porque puede tener el mismo nombre en ambos esquemas

-- 4. ASEGURAR QUE user_credits EXISTE CON LA ESTRUCTURA CORRECTA
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    credit_type TEXT NOT NULL CHECK (credit_type IN ('cancellation', 'refund', 'promotion', 'admin_adjustment', 'migration')),
    description TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    used_in_appointment_id UUID,
    source_appointment_id UUID,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_credits_per_source UNIQUE (user_id, source_appointment_id)
);

-- 5. RECREAR credit_transactions CON ESTRUCTURA UNIFICADA
DROP TABLE IF EXISTS credit_transactions CASCADE;
CREATE TABLE credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credit_id UUID REFERENCES user_credits(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'used', 'expired', 'refunded', 'adjustment')),
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance_after DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    appointment_id UUID,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CREAR ÍNDICES OPTIMIZADOS
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_is_used ON user_credits(is_used);
CREATE INDEX IF NOT EXISTS idx_user_credits_expires_at ON user_credits(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_credits_source_appointment ON user_credits(source_appointment_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_appointment_id ON credit_transactions(appointment_id);

-- 7. FUNCIÓN UNIFICADA PARA VERIFICAR ADMIN
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
    -- Primero verificar en user_roles si existe la tabla
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        RETURN EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = user_uuid AND role = 'admin'
        );
    END IF;
    
    -- Si no existe user_roles, verificar en profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RETURN EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = user_uuid 
            AND role IN ('admin', 'super_admin', 'manager')
        );
    END IF;
    
    -- Si no hay sistema de roles, permitir para desarrollo
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. FUNCIONES UNIFICADAS PARA MANEJO DE CRÉDITOS
CREATE OR REPLACE FUNCTION get_user_credit_balance(p_user_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_balance DECIMAL(10,2) := 0;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO total_balance
    FROM user_credits
    WHERE user_id = p_user_id
        AND is_used = FALSE
        AND (expires_at IS NULL OR expires_at > NOW());
        
    RETURN total_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_cancellation_credit(
    p_user_id UUID,
    p_appointment_id UUID,
    p_amount DECIMAL(10,2),
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    credit_id UUID;
    current_balance DECIMAL(10,2);
    new_balance DECIMAL(10,2);
    credit_description TEXT;
BEGIN
    -- Verificar si ya existe un crédito para esta cita
    IF EXISTS (
        SELECT 1 FROM user_credits 
        WHERE user_id = p_user_id 
        AND source_appointment_id = p_appointment_id
    ) THEN
        RAISE EXCEPTION 'Ya existe un crédito para esta cita';
    END IF;
    
    -- Obtener balance actual
    current_balance := get_user_credit_balance(p_user_id);
    new_balance := current_balance + p_amount;
    
    -- Crear descripción por defecto
    credit_description := COALESCE(p_description, 'Crédito por cancelación de cita');
    
    -- Crear el crédito (expira en 12 meses)
    INSERT INTO user_credits (
        user_id,
        amount,
        credit_type,
        description,
        expires_at,
        source_appointment_id,
        created_by
    ) VALUES (
        p_user_id,
        p_amount,
        'cancellation',
        credit_description,
        NOW() + INTERVAL '12 months',
        p_appointment_id,
        COALESCE(auth.uid(), p_user_id)
    ) RETURNING id INTO credit_id;
    
    -- Registrar transacción
    INSERT INTO credit_transactions (
        user_id,
        credit_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        appointment_id,
        created_by
    ) VALUES (
        p_user_id,
        credit_id,
        'earned',
        p_amount,
        current_balance,
        new_balance,
        credit_description,
        p_appointment_id,
        COALESCE(auth.uid(), p_user_id)
    );
    
    RETURN credit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION use_credits_for_appointment(
    p_user_id UUID,
    p_appointment_id UUID,
    p_amount_to_use DECIMAL(10,2)
)
RETURNS BOOLEAN AS $$
DECLARE
    available_credits CURSOR FOR
        SELECT id, amount
        FROM user_credits
        WHERE user_id = p_user_id
            AND is_used = FALSE
            AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at ASC; -- FIFO
    
    credit_record RECORD;
    remaining_amount DECIMAL(10,2) := p_amount_to_use;
    current_balance DECIMAL(10,2);
    amount_to_use_from_credit DECIMAL(10,2);
BEGIN
    -- Verificar suficientes créditos
    current_balance := get_user_credit_balance(p_user_id);
    IF current_balance < p_amount_to_use THEN
        RETURN FALSE;
    END IF;
    
    -- Usar créditos hasta completar el monto
    FOR credit_record IN available_credits LOOP
        EXIT WHEN remaining_amount <= 0;
        
        amount_to_use_from_credit := LEAST(credit_record.amount, remaining_amount);
        
        -- Si usamos todo el crédito, marcarlo como usado
        IF amount_to_use_from_credit = credit_record.amount THEN
            UPDATE user_credits
            SET is_used = TRUE,
                used_at = NOW(),
                used_in_appointment_id = p_appointment_id,
                updated_at = NOW()
            WHERE id = credit_record.id;
        ELSE
            -- Si usamos parte, reducir el monto
            UPDATE user_credits
            SET amount = amount - amount_to_use_from_credit,
                updated_at = NOW()
            WHERE id = credit_record.id;
        END IF;
        
        -- Registrar transacción
        INSERT INTO credit_transactions (
            user_id,
            credit_id,
            transaction_type,
            amount,
            balance_before,
            balance_after,
            description,
            appointment_id,
            created_by
        ) VALUES (
            p_user_id,
            credit_record.id,
            'used',
            amount_to_use_from_credit,
            current_balance,
            current_balance - amount_to_use_from_credit,
            'Crédito usado en nueva reserva',
            p_appointment_id,
            COALESCE(auth.uid(), p_user_id)
        );
        
        remaining_amount := remaining_amount - amount_to_use_from_credit;
        current_balance := current_balance - amount_to_use_from_credit;
    END LOOP;
    
    RETURN remaining_amount = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. POLÍTICAS RLS UNIFICADAS Y SEGURAS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propios créditos
CREATE POLICY "users_can_view_own_credits" ON user_credits
    FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());

-- Usuarios pueden ver sus propias transacciones
CREATE POLICY "users_can_view_own_transactions" ON credit_transactions
    FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());

-- Admins pueden ver todo
CREATE POLICY "admins_can_view_all_credits" ON user_credits
    FOR ALL 
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "admins_can_view_all_transactions" ON credit_transactions
    FOR ALL 
    TO authenticated
    USING (public.is_admin());

-- Sistema puede insertar créditos
CREATE POLICY "system_can_insert_credits" ON user_credits
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() 
        OR public.is_admin()
        OR auth.role() = 'service_role'
    );

-- Sistema puede insertar transacciones
CREATE POLICY "system_can_insert_transactions" ON credit_transactions
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() 
        OR public.is_admin()
        OR auth.role() = 'service_role'
    );

-- 10. TRIGGERS PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_credits_updated_at ON user_credits;
CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. VISTA UNIFICADA PARA RESUMEN DE CRÉDITOS
CREATE OR REPLACE VIEW user_credits_summary AS
SELECT 
    u.id as user_id,
    COALESCE(p.full_name, u.email) as full_name,
    u.email,
    COALESCE(get_user_credit_balance(u.id), 0) as available_balance,
    COALESCE(total_earned.amount, 0) as total_earned,
    COALESCE(total_used.amount, 0) as total_used,
    COALESCE(total_expired.amount, 0) as total_expired,
    COALESCE(credit_count.count, 0) as active_credits_count,
    u.created_at as user_created_at
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN (
    SELECT user_id, SUM(amount) as amount
    FROM credit_transactions
    WHERE transaction_type = 'earned'
    GROUP BY user_id
) total_earned ON total_earned.user_id = u.id
LEFT JOIN (
    SELECT user_id, SUM(amount) as amount
    FROM credit_transactions
    WHERE transaction_type = 'used'
    GROUP BY user_id
) total_used ON total_used.user_id = u.id
LEFT JOIN (
    SELECT user_id, SUM(amount) as amount
    FROM credit_transactions
    WHERE transaction_type = 'expired'
    GROUP BY user_id
) total_expired ON total_expired.user_id = u.id
LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM user_credits
    WHERE is_used = FALSE AND (expires_at IS NULL OR expires_at > NOW())
    GROUP BY user_id
) credit_count ON credit_count.user_id = u.id;

-- 12. COMENTARIOS PARA DOCUMENTACIÓN
COMMENT ON TABLE user_credits IS 'Sistema unificado de créditos para usuarios';
COMMENT ON TABLE credit_transactions IS 'Historial completo de transacciones de créditos';
COMMENT ON FUNCTION get_user_credit_balance(UUID) IS 'Obtiene el balance actual de créditos disponibles';
COMMENT ON FUNCTION create_cancellation_credit(UUID, UUID, DECIMAL, TEXT) IS 'Crea un crédito por cancelación de cita';
COMMENT ON FUNCTION use_credits_for_appointment(UUID, UUID, DECIMAL) IS 'Usa créditos para pagar una nueva cita';
COMMENT ON FUNCTION public.is_admin(UUID) IS 'Función unificada para verificar permisos de administrador';






