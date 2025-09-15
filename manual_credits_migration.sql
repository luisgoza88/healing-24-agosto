-- MIGRACIÓN MANUAL PARA SISTEMA DE CRÉDITOS
-- Ejecutar este script en Supabase Dashboard > SQL Editor

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

-- 3. Crear índices
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_is_used ON user_credits(is_used);
CREATE INDEX IF NOT EXISTS idx_user_credits_expires_at ON user_credits(expires_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- 4. Habilitar RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas RLS
-- Los usuarios solo pueden ver sus propios créditos
CREATE POLICY IF NOT EXISTS "Users can view own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios solo pueden ver sus propias transacciones
CREATE POLICY IF NOT EXISTS "Users can view own transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Solo el sistema puede insertar créditos
CREATE POLICY IF NOT EXISTS "System can insert credits" ON user_credits
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Solo el sistema puede insertar transacciones
CREATE POLICY IF NOT EXISTS "System can insert transactions" ON credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Los administradores pueden ver todos los créditos
CREATE POLICY IF NOT EXISTS "Admins can view all credits" ON user_credits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Los administradores pueden ver todas las transacciones
CREATE POLICY IF NOT EXISTS "Admins can view all transactions" ON credit_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- 6. Crear algunos créditos de prueba para verificar funcionamiento
-- (Reemplaza 'user-id-aqui' con un ID real de usuario)
/*
INSERT INTO user_credits (user_id, amount, credit_type, description, expires_at, created_by)
VALUES (
  'user-id-aqui',
  50000,
  'promotion',
  'Crédito de bienvenida',
  NOW() + INTERVAL '12 months',
  'user-id-aqui'
);
*/

-- 7. Verificar que las tablas se crearon correctamente
SELECT 'user_credits table created' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_credits');

SELECT 'credit_transactions table created' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_transactions');