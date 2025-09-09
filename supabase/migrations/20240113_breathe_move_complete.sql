-- =====================================================
-- BREATHE & MOVE - SISTEMA COMPLETO
-- =====================================================

-- La tabla breathe_move_classes ya fue creada en migraciones anteriores
-- Aquí agregamos las tablas faltantes

-- Crear tabla de paquetes disponibles
CREATE TABLE IF NOT EXISTS public.breathe_move_package_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    classes_count INTEGER NOT NULL, -- 4, 8, 12
    price DECIMAL(10,2) NOT NULL,
    price_per_class DECIMAL(10,2) NOT NULL,
    savings_percentage INTEGER,
    validity_days INTEGER DEFAULT 30,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear tabla de paquetes comprados por usuarios
CREATE TABLE IF NOT EXISTS public.breathe_move_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    package_type VARCHAR(50) NOT NULL, -- '4-classes', '8-classes', '12-classes'
    classes_total INTEGER NOT NULL,
    classes_used INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active', -- active, expired, completed
    valid_until DATE NOT NULL,
    payment_id UUID, -- Referencia a la tabla de pagos
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed
    payment_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_package_status CHECK (status IN ('active', 'expired', 'completed')),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed')),
    CONSTRAINT valid_classes_used CHECK (classes_used >= 0 AND classes_used <= classes_total)
);

-- Crear tabla de inscripciones a clases (si no existe)
CREATE TABLE IF NOT EXISTS public.breathe_move_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.breathe_move_classes(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.breathe_move_packages(id),
    status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, attended, cancelled, no_show
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    attended_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_breathe_move_enrollment UNIQUE (user_id, class_id),
    CONSTRAINT valid_enrollment_status CHECK (status IN ('confirmed', 'attended', 'cancelled', 'no_show'))
);

-- Crear tabla de lista de espera
CREATE TABLE IF NOT EXISTS public.breathe_move_waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.breathe_move_classes(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'waiting', -- waiting, enrolled, expired
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_waitlist_entry UNIQUE (user_id, class_id)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_breathe_move_packages_user ON public.breathe_move_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_breathe_move_packages_status ON public.breathe_move_packages(status);
CREATE INDEX IF NOT EXISTS idx_breathe_move_enrollments_user ON public.breathe_move_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_breathe_move_enrollments_class ON public.breathe_move_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_breathe_move_waitlist_class ON public.breathe_move_waitlist(class_id);

-- =====================================================
-- RLS POLICIES - BREATHE & MOVE
-- =====================================================

ALTER TABLE public.breathe_move_package_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breathe_move_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breathe_move_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breathe_move_waitlist ENABLE ROW LEVEL SECURITY;

-- Políticas públicas
CREATE POLICY "Package types are viewable by everyone" ON public.breathe_move_package_types
    FOR SELECT USING (true);

-- Políticas para paquetes de usuarios
CREATE POLICY "Users can view own packages" ON public.breathe_move_packages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own packages" ON public.breathe_move_packages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packages" ON public.breathe_move_packages
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para inscripciones
CREATE POLICY "Users can view own enrollments BM" ON public.breathe_move_enrollments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own enrollments BM" ON public.breathe_move_enrollments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollments BM" ON public.breathe_move_enrollments
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para lista de espera
CREATE POLICY "Users can view own waitlist" ON public.breathe_move_waitlist
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can join waitlist" ON public.breathe_move_waitlist
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRIGGER FUNCTIONS - BREATHE & MOVE
-- =====================================================

-- Trigger para actualizar clases usadas en paquete
CREATE OR REPLACE FUNCTION update_package_classes_used()
RETURNS TRIGGER AS $$
BEGIN
    -- Al confirmar inscripción, incrementar clases usadas
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' AND NEW.package_id IS NOT NULL THEN
        UPDATE public.breathe_move_packages 
        SET classes_used = classes_used + 1 
        WHERE id = NEW.package_id;
    -- Al cancelar inscripción (con más de 2 horas de anticipación), decrementar
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status = 'cancelled' AND NEW.package_id IS NOT NULL THEN
        -- Verificar política de cancelación (2 horas)
        IF EXISTS (
            SELECT 1 FROM public.breathe_move_classes 
            WHERE id = NEW.class_id 
            AND (class_date + start_time) > (NOW() + INTERVAL '2 hours')
        ) THEN
            UPDATE public.breathe_move_packages 
            SET classes_used = classes_used - 1 
            WHERE id = NEW.package_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_package_usage_trigger
AFTER INSERT OR UPDATE ON public.breathe_move_enrollments
FOR EACH ROW EXECUTE FUNCTION update_package_classes_used();

-- Trigger para actualizar capacidad de clase Breathe & Move
CREATE OR REPLACE FUNCTION update_breathe_move_class_capacity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        UPDATE public.breathe_move_classes 
        SET current_capacity = current_capacity + 1 
        WHERE id = NEW.class_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status IN ('cancelled', 'no_show') THEN
        UPDATE public.breathe_move_classes 
        SET current_capacity = current_capacity - 1 
        WHERE id = NEW.class_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_breathe_move_capacity_trigger
AFTER INSERT OR UPDATE ON public.breathe_move_enrollments
FOR EACH ROW EXECUTE FUNCTION update_breathe_move_class_capacity();

-- Trigger para validar solo una clase por día
CREATE OR REPLACE FUNCTION validate_one_class_per_day()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si el usuario ya tiene una clase ese día
    IF EXISTS (
        SELECT 1 
        FROM public.breathe_move_enrollments e
        JOIN public.breathe_move_classes c ON e.class_id = c.id
        WHERE e.user_id = NEW.user_id 
        AND e.status = 'confirmed'
        AND c.class_date = (
            SELECT class_date FROM public.breathe_move_classes WHERE id = NEW.class_id
        )
        AND e.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
        RAISE EXCEPTION 'Solo puedes inscribirte a una clase por día';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_one_class_per_day_trigger
BEFORE INSERT OR UPDATE ON public.breathe_move_enrollments
FOR EACH ROW EXECUTE FUNCTION validate_one_class_per_day();

-- Triggers para updated_at
CREATE TRIGGER update_breathe_move_packages_updated_at BEFORE UPDATE
    ON public.breathe_move_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA - BREATHE & MOVE
-- =====================================================

-- Insertar tipos de paquetes
INSERT INTO public.breathe_move_package_types (name, classes_count, price, price_per_class, savings_percentage, validity_days) VALUES
    ('4 Clases', 4, 260000, 65000, 0, 30),
    ('8 Clases', 8, 480000, 60000, 8, 30),
    ('12 Clases', 12, 660000, 55000, 15, 45)
ON CONFLICT DO NOTHING;