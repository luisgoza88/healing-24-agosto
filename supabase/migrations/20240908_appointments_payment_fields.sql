-- Agregar campos de pago a la tabla appointments si no existen
DO $$
BEGIN
  -- payment_status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'payment_status') THEN
    ALTER TABLE appointments ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending';
  END IF;

  -- payment_method
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'payment_method') THEN
    ALTER TABLE appointments ADD COLUMN payment_method VARCHAR(50);
  END IF;

  -- paid_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'paid_at') THEN
    ALTER TABLE appointments ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Agregar constraint para payment_status si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'check_payment_status') THEN
    ALTER TABLE appointments ADD CONSTRAINT check_payment_status 
      CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
  END IF;
END $$;

-- Crear índice para payment_status si no existe
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status);

-- Actualizar appointments existentes con status 'confirmed' para tener payment_status 'paid'
UPDATE appointments 
SET payment_status = 'paid',
    paid_at = COALESCE(paid_at, updated_at)
WHERE status = 'confirmed' AND payment_status = 'pending';