-- Migración para crear sistema de créditos
-- Permite a los usuarios acumular créditos por cancelaciones y usarlos en reservas futuras

-- 1. Crear tabla de créditos
CREATE TABLE user_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('cancellation', 'refund', 'promotion', 'admin_adjustment')),
  description TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  used_in_appointment_id UUID,
  source_appointment_id UUID, -- La cita que generó el crédito
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla de transacciones de créditos (historial)
CREATE TABLE credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_id UUID REFERENCES user_credits(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'used', 'expired', 'refunded')),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_after DECIMAL(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  appointment_id UUID, -- Cita relacionada
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear índices para optimizar consultas
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX idx_user_credits_is_used ON user_credits(is_used);
CREATE INDEX idx_user_credits_expires_at ON user_credits(expires_at);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);

-- 4. Función para obtener balance total de créditos disponibles de un usuario
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

-- 5. Función para crear un crédito por cancelación
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
  -- Obtener balance actual
  current_balance := get_user_credit_balance(p_user_id);
  new_balance := current_balance + p_amount;
  
  -- Crear descripción por defecto si no se proporciona
  IF p_description IS NULL THEN
    credit_description := 'Crédito por cancelación de cita';
  ELSE
    credit_description := p_description;
  END IF;
  
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
    p_user_id
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
    p_user_id
  );
  
  RETURN credit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Función para usar créditos en una nueva reserva
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
    ORDER BY created_at ASC; -- FIFO: usar los más antiguos primero
  
  credit_record RECORD;
  remaining_amount DECIMAL(10,2) := p_amount_to_use;
  current_balance DECIMAL(10,2);
  amount_to_use_from_credit DECIMAL(10,2);
BEGIN
  -- Verificar que hay suficientes créditos
  current_balance := get_user_credit_balance(p_user_id);
  IF current_balance < p_amount_to_use THEN
    RETURN FALSE;
  END IF;
  
  -- Usar créditos hasta completar el monto
  FOR credit_record IN available_credits LOOP
    EXIT WHEN remaining_amount <= 0;
    
    -- Determinar cuánto usar de este crédito
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
      -- Si usamos parte del crédito, reducir el monto
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
      p_user_id
    );
    
    remaining_amount := remaining_amount - amount_to_use_from_credit;
    current_balance := current_balance - amount_to_use_from_credit;
  END LOOP;
  
  RETURN remaining_amount = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Función para expirar créditos automáticamente
CREATE OR REPLACE FUNCTION expire_old_credits()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER := 0;
  expired_credit RECORD;
BEGIN
  FOR expired_credit IN
    SELECT id, user_id, amount
    FROM user_credits
    WHERE expires_at < NOW()
      AND is_used = FALSE
  LOOP
    -- Marcar crédito como usado (expirado)
    UPDATE user_credits
    SET is_used = TRUE,
        used_at = NOW(),
        updated_at = NOW()
    WHERE id = expired_credit.id;
    
    -- Registrar transacción de expiración
    INSERT INTO credit_transactions (
      user_id,
      credit_id,
      transaction_type,
      amount,
      balance_before,
      balance_after,
      description,
      created_by
    ) VALUES (
      expired_credit.user_id,
      expired_credit.id,
      'expired',
      expired_credit.amount,
      get_user_credit_balance(expired_credit.user_id) + expired_credit.amount,
      get_user_credit_balance(expired_credit.user_id),
      'Crédito expirado automáticamente',
      expired_credit.user_id
    );
    
    expired_count := expired_count + 1;
  END LOOP;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Políticas RLS para seguridad
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver sus propios créditos
CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios solo pueden ver sus propias transacciones
CREATE POLICY "Users can view own transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Solo el sistema puede insertar créditos
CREATE POLICY "System can insert credits" ON user_credits
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Solo el sistema puede insertar transacciones
CREATE POLICY "System can insert transactions" ON credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Los administradores pueden ver todos los créditos
CREATE POLICY "Admins can view all credits" ON user_credits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Los administradores pueden ver todas las transacciones
CREATE POLICY "Admins can view all transactions" ON credit_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- 10. Crear vista para resumen de créditos por usuario
CREATE VIEW user_credits_summary AS
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

-- 11. Crear algunos datos de ejemplo para testing
COMMENT ON TABLE user_credits IS 'Almacena los créditos disponibles de cada usuario';
COMMENT ON TABLE credit_transactions IS 'Historial completo de todas las transacciones de créditos';
COMMENT ON FUNCTION get_user_credit_balance(UUID) IS 'Retorna el balance actual de créditos disponibles para un usuario';
COMMENT ON FUNCTION create_cancellation_credit(UUID, UUID, DECIMAL, TEXT) IS 'Crea un crédito cuando se cancela una cita';
COMMENT ON FUNCTION use_credits_for_appointment(UUID, UUID, DECIMAL) IS 'Usa créditos disponibles para pagar una nueva cita';
COMMENT ON FUNCTION expire_old_credits() IS 'Expira automáticamente créditos vencidos - ejecutar diariamente';