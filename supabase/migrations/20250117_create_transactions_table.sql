-- Crear tabla de transacciones para gestionar pagos
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) DEFAULT 'COP',
  payment_method VARCHAR(50) NOT NULL,
  payment_provider VARCHAR(50) NOT NULL,
  provider_reference VARCHAR(255) UNIQUE,
  provider_transaction_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'approved', 'rejected', 'cancelled', 'refunded', 'error')
  ),
  response_code VARCHAR(50),
  response_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_appointment_id ON transactions(appointment_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_provider_reference ON transactions(provider_reference);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- Función para actualizar updated_at
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
-- Los usuarios pueden ver sus propias transacciones
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Los usuarios pueden crear transacciones
CREATE POLICY "Users can create transactions" ON transactions
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Solo el sistema puede actualizar transacciones (mediante service role)
CREATE POLICY "System can update transactions" ON transactions
    FOR UPDATE 
    USING (false);

-- Los administradores pueden ver todas las transacciones
CREATE POLICY "Admins can view all transactions" ON transactions
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Función para obtener resumen de transacciones de un usuario
CREATE OR REPLACE FUNCTION get_user_transaction_summary(p_user_id UUID)
RETURNS TABLE (
    total_transactions BIGINT,
    total_approved BIGINT,
    total_amount DECIMAL(10,2),
    last_transaction_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_transactions,
        COUNT(*) FILTER (WHERE status = 'approved')::BIGINT as total_approved,
        COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) as total_amount,
        MAX(created_at) as last_transaction_date
    FROM transactions
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Comentario de tabla
COMMENT ON TABLE transactions IS 'Registro de todas las transacciones de pago realizadas en el sistema';
COMMENT ON COLUMN transactions.provider_reference IS 'Referencia única generada por nosotros para el proveedor de pago';
COMMENT ON COLUMN transactions.provider_transaction_id IS 'ID de transacción devuelto por el proveedor de pago';