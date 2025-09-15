-- ===================================================================
-- MIGRACIÓN COMPLETA PARA SISTEMA DE CRÉDITOS
-- EJECUTAR EN SUPABASE DASHBOARD > SQL EDITOR
-- ===================================================================

-- 1. Crear tabla de créditos
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('cancellation', 'refund', 'promotion', 'admin_adjustment')),
  description TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  used_in_appointment_id UUID,
  source_appointment_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla de transacciones de créditos
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_id UUID REFERENCES user_credits(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'used', 'expired', 'refunded')),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_after DECIMAL(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  appointment_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_is_used ON user_credits(is_used);
CREATE INDEX IF NOT EXISTS idx_user_credits_expires_at ON user_credits(expires_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- 4. Habilitar RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas RLS - Los usuarios solo pueden ver sus propios créditos
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios solo pueden ver sus propias transacciones
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
CREATE POLICY "Users can view own transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Solo el sistema puede insertar créditos
DROP POLICY IF EXISTS "System can insert credits" ON user_credits;
CREATE POLICY "System can insert credits" ON user_credits
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Solo el sistema puede actualizar créditos
DROP POLICY IF EXISTS "System can update credits" ON user_credits;
CREATE POLICY "System can update credits" ON user_credits
  FOR UPDATE USING (auth.uid() = created_by);

-- Solo el sistema puede insertar transacciones
DROP POLICY IF EXISTS "System can insert transactions" ON credit_transactions;
CREATE POLICY "System can insert transactions" ON credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Los administradores pueden ver todos los créditos
DROP POLICY IF EXISTS "Admins can manage all credits" ON user_credits;
CREATE POLICY "Admins can manage all credits" ON user_credits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Los administradores pueden ver todas las transacciones
DROP POLICY IF EXISTS "Admins can view all transactions" ON credit_transactions;
CREATE POLICY "Admins can view all transactions" ON credit_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- 6. Crear función para obtener balance de créditos
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

-- 7. Crear vista para resumen de créditos por usuario
CREATE OR REPLACE VIEW user_credits_summary AS
SELECT 
  u.id as user_id,
  p.full_name,
  p.email,
  COALESCE(get_user_credit_balance(u.id), 0) as available_balance,
  COALESCE(total_earned.amount, 0) as total_earned,
  COALESCE(total_used.amount, 0) as total_used,
  COALESCE(total_expired.amount, 0) as total_expired,
  COALESCE(credit_count.count, 0) as active_credits_count
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
) credit_count ON credit_count.user_id = u.id
WHERE p.role = 'client' OR p.role IS NULL;

-- 8. Verificar que todo se creó correctamente
SELECT 'user_credits table created' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_credits');

SELECT 'credit_transactions table created' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_transactions');

-- 9. OPCIONAL: Crear un crédito de prueba
-- Descomenta las siguientes líneas y reemplaza 'TU-USER-ID' con un ID real
-- INSERT INTO user_credits (user_id, amount, credit_type, description, expires_at, created_by)
-- VALUES (
--   'TU-USER-ID',
--   50000,
--   'promotion',
--   'Crédito de bienvenida - Sistema activado',
--   NOW() + INTERVAL '12 months',
--   'TU-USER-ID'
-- );

-- Mostrar mensaje final
SELECT '✅ Sistema de créditos instalado correctamente' as resultado;