-- =====================================================
-- SISTEMA DE CRÉDITOS PARA PACIENTES
-- =====================================================

-- Crear tabla de créditos de pacientes
CREATE TABLE IF NOT EXISTS public.patient_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    available_credits DECIMAL(10,2) DEFAULT 0 NOT NULL,
    total_earned DECIMAL(10,2) DEFAULT 0 NOT NULL,
    total_used DECIMAL(10,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_patient_credits UNIQUE (patient_id),
    CONSTRAINT valid_credits CHECK (available_credits >= 0)
);

-- Crear tabla de transacciones de créditos
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id),
    amount DECIMAL(10,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- earned, used, expired, adjustment
    source VARCHAR(50) NOT NULL, -- cancelled_appointment, manual_adjustment, appointment_payment, etc.
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('earned', 'used', 'expired', 'adjustment'))
);

-- Agregar columnas a la tabla de citas para rastrear créditos generados
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS credits_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS credit_amount DECIMAL(10,2) DEFAULT 0;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_patient_credits_patient_id ON public.patient_credits(patient_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_patient_id ON public.credit_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_appointment_id ON public.credit_transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.patient_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para patient_credits
-- Los usuarios pueden ver sus propios créditos
CREATE POLICY "Users can view their own credits" 
    ON public.patient_credits FOR SELECT
    TO authenticated
    USING (patient_id = auth.uid());

-- Los admins pueden ver todos los créditos
CREATE POLICY "Admin users can view all credits" 
    ON public.patient_credits FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- Los admins pueden gestionar créditos
CREATE POLICY "Admin users can manage credits" 
    ON public.patient_credits FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- Políticas para credit_transactions
-- Los usuarios pueden ver sus propias transacciones
CREATE POLICY "Users can view their own transactions" 
    ON public.credit_transactions FOR SELECT
    TO authenticated
    USING (patient_id = auth.uid());

-- Los admins pueden ver todas las transacciones
CREATE POLICY "Admin users can view all transactions" 
    ON public.credit_transactions FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- Los admins pueden gestionar transacciones
CREATE POLICY "Admin users can manage transactions" 
    ON public.credit_transactions FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- Función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION public.update_patient_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_patient_credits_updated_at_trigger
    BEFORE UPDATE ON public.patient_credits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_patient_credits_updated_at();

-- Función para verificar y crear créditos al cancelar una cita
CREATE OR REPLACE FUNCTION public.handle_appointment_cancellation_credits()
RETURNS TRIGGER AS $$
DECLARE
    v_credit_amount DECIMAL(10,2);
    v_existing_credits RECORD;
BEGIN
    -- Solo procesar si la cita cambió a 'cancelled' y fue pagada
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.payment_status = 'paid' THEN
        -- Verificar si ya se generaron créditos para esta cita
        IF NOT COALESCE(NEW.credits_generated, false) THEN
            -- Aquí podrías implementar la lógica de cálculo de créditos
            -- Por ahora, se maneja desde la aplicación
            NULL;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para manejar cancelaciones
CREATE TRIGGER handle_appointment_cancellation_credits_trigger
    AFTER UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_appointment_cancellation_credits();