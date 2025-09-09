-- =====================================================
-- SISTEMA DE PAGOS COMPLETO
-- =====================================================

-- Crear tabla de métodos de pago
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    active BOOLEAN DEFAULT true,
    processing_fee_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear tabla principal de pagos
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'COP',
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, refunded
    description TEXT,
    
    -- Referencias a diferentes servicios
    appointment_id UUID REFERENCES public.appointments(id),
    hot_studio_membership_id UUID REFERENCES public.user_memberships(id),
    breathe_move_package_id UUID REFERENCES public.breathe_move_packages(id),
    
    -- Información de transacción
    transaction_id VARCHAR(255), -- ID del procesador de pagos
    gateway_response TEXT, -- Respuesta completa del gateway
    
    -- Metadata adicional
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    processed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded'))
);

-- Crear tabla de reembolsos
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES public.payments(id),
    amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, completed, rejected
    approved_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_refund_amount CHECK (amount > 0),
    CONSTRAINT valid_refund_status CHECK (status IN ('pending', 'approved', 'completed', 'rejected'))
);

-- Crear tabla de cupones de descuento
CREATE TABLE IF NOT EXISTS public.discount_coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL, -- percentage, fixed
    discount_value DECIMAL(10,2) NOT NULL,
    minimum_amount DECIMAL(10,2),
    valid_from DATE,
    valid_until DATE,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    applicable_services TEXT[], -- Array de servicios donde aplica
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_discount_type CHECK (discount_type IN ('percentage', 'fixed')),
    CONSTRAINT valid_discount_value CHECK (
        (discount_type = 'percentage' AND discount_value > 0 AND discount_value <= 100) OR
        (discount_type = 'fixed' AND discount_value > 0)
    )
);

-- Crear tabla de uso de cupones
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coupon_id UUID NOT NULL REFERENCES public.discount_coupons(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    payment_id UUID REFERENCES public.payments(id),
    discount_applied DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_coupon_payment UNIQUE (coupon_id, payment_id)
);

-- Crear tabla de facturas
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    payment_id UUID REFERENCES public.payments(id),
    
    -- Información de facturación
    billing_name VARCHAR(255),
    billing_id VARCHAR(50), -- NIT o CC
    billing_address TEXT,
    billing_email VARCHAR(255),
    billing_phone VARCHAR(50),
    
    -- Detalles de la factura
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Items de la factura (JSONB para flexibilidad)
    items JSONB NOT NULL DEFAULT '[]',
    
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, paid, cancelled
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    CONSTRAINT valid_invoice_status CHECK (status IN ('draft', 'sent', 'paid', 'cancelled'))
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_appointment ON public.payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON public.payments(created_at);
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON public.coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);

-- =====================================================
-- RLS POLICIES - PAYMENTS
-- =====================================================

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Políticas públicas
CREATE POLICY "Payment methods are viewable by everyone" ON public.payment_methods
    FOR SELECT USING (active = true);

CREATE POLICY "Active coupons are viewable by everyone" ON public.discount_coupons
    FOR SELECT USING (active = true);

-- Políticas para payments
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payments" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para refunds
CREATE POLICY "Users can view own refunds" ON public.refunds
    FOR SELECT USING (
        payment_id IN (SELECT id FROM public.payments WHERE user_id = auth.uid())
    );

-- Políticas para coupon usage
CREATE POLICY "Users can view own coupon usage" ON public.coupon_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can use coupons" ON public.coupon_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para invoices
CREATE POLICY "Users can view own invoices" ON public.invoices
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGER FUNCTIONS - PAYMENTS
-- =====================================================

-- Triggers para updated_at
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE
    ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE
    ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar uso de cupones
CREATE OR REPLACE FUNCTION update_coupon_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.discount_coupons
    SET current_uses = current_uses + 1
    WHERE id = NEW.coupon_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coupon_usage_trigger
AFTER INSERT ON public.coupon_usage
FOR EACH ROW EXECUTE FUNCTION update_coupon_usage_count();

-- Función para generar número de factura
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    year_month TEXT;
    last_number INTEGER;
BEGIN
    -- Formato: INV-YYYYMM-0001
    year_month := TO_CHAR(NOW(), 'YYYYMM');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 12) AS INTEGER)), 0) + 1
    INTO last_number
    FROM public.invoices
    WHERE invoice_number LIKE 'INV-' || year_month || '-%';
    
    NEW.invoice_number := 'INV-' || year_month || '-' || LPAD(last_number::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_invoice_number_trigger
BEFORE INSERT ON public.invoices
FOR EACH ROW
WHEN (NEW.invoice_number IS NULL)
EXECUTE FUNCTION generate_invoice_number();

-- =====================================================
-- SEED DATA - PAYMENT METHODS
-- =====================================================

INSERT INTO public.payment_methods (code, name, description, icon) VALUES
    ('nequi', 'Nequi', 'Pago con cuenta Nequi', 'phone-portrait'),
    ('daviplata', 'Daviplata', 'Pago con cuenta Daviplata', 'phone-portrait'),
    ('credit_card', 'Tarjeta de crédito', 'Visa, Mastercard, American Express', 'card'),
    ('debit_card', 'Tarjeta débito', 'PSE - Débito desde tu banco', 'card-outline'),
    ('cash', 'Efectivo', 'Pago en efectivo en recepción', 'cash'),
    ('bank_transfer', 'Transferencia bancaria', 'Transferencia directa', 'bank-transfer')
ON CONFLICT (code) DO NOTHING;

-- Insertar cupones de ejemplo
INSERT INTO public.discount_coupons (code, description, discount_type, discount_value, applicable_services) VALUES
    ('BIENVENIDA20', 'Descuento de bienvenida 20%', 'percentage', 20, ARRAY['medicina-funcional', 'medicina-estetica']),
    ('VERANO50K', 'Descuento de $50,000', 'fixed', 50000, ARRAY['hot-studio', 'breathe-move'])
ON CONFLICT (code) DO NOTHING;