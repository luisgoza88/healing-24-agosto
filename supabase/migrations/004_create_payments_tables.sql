-- Crear tabla de transacciones de pago
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'COP',
  payment_method VARCHAR(50) NOT NULL, -- 'credit_card', 'pse', 'cash'
  payment_provider VARCHAR(50), -- 'payu', 'manual'
  provider_reference VARCHAR(255), -- ID de transacción del proveedor
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'approved', 'rejected', 'cancelled'
  response_code VARCHAR(50),
  response_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para métodos de pago guardados
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'credit_card', 'debit_card'
  provider VARCHAR(50) NOT NULL, -- 'payu'
  token VARCHAR(255) NOT NULL, -- Token tokenizado del proveedor
  last_four VARCHAR(4),
  brand VARCHAR(50), -- 'visa', 'mastercard', etc
  expiry_month INTEGER,
  expiry_year INTEGER,
  holder_name VARCHAR(255),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX idx_transactions_appointment_id ON transactions(appointment_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver sus propias transacciones
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios solo pueden ver sus propios métodos de pago
CREATE POLICY "Users can view own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propios métodos de pago
CREATE POLICY "Users can create own payment methods" ON payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propios métodos de pago
CREATE POLICY "Users can update own payment methods" ON payment_methods
  FOR UPDATE USING (auth.uid() = user_id);