-- =====================================================
-- HOT STUDIO - SISTEMA DE CLASES
-- =====================================================

-- Crear tabla de tipos de clases
CREATE TABLE IF NOT EXISTS public.class_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 60,
    max_capacity INTEGER DEFAULT 15,
    color VARCHAR(7), -- Color hex para UI
    icon VARCHAR(50), -- Nombre del ícono
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear tabla de instructores
CREATE TABLE IF NOT EXISTS public.instructors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    full_name VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    specialties TEXT[], -- Array de especialidades
    certifications TEXT[],
    phone VARCHAR(50),
    email VARCHAR(255),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear tabla de membresías
CREATE TABLE IF NOT EXISTS public.hot_studio_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_days INTEGER NOT NULL, -- 30, 90, 365
    classes_per_month INTEGER, -- NULL = ilimitadas
    benefits TEXT[],
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear tabla de membresías de usuarios
CREATE TABLE IF NOT EXISTS public.user_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES public.hot_studio_memberships(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, expired, cancelled, paused
    classes_used INTEGER DEFAULT 0,
    payment_id UUID, -- Referencia a la tabla de pagos
    auto_renew BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_membership_status CHECK (status IN ('active', 'expired', 'cancelled', 'paused'))
);

-- Crear tabla de clases programadas
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_type_id UUID NOT NULL REFERENCES public.class_types(id),
    instructor_id UUID NOT NULL REFERENCES public.instructors(id),
    class_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INTEGER DEFAULT 15,
    current_capacity INTEGER DEFAULT 0,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_capacity CHECK (current_capacity >= 0 AND current_capacity <= max_capacity),
    CONSTRAINT valid_class_time CHECK (end_time > start_time),
    CONSTRAINT valid_class_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

-- Crear tabla de inscripciones a clases
CREATE TABLE IF NOT EXISTS public.class_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES public.user_memberships(id),
    status VARCHAR(50) DEFAULT 'enrolled', -- enrolled, attended, cancelled, no_show
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    attended_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_class_enrollment UNIQUE (user_id, class_id),
    CONSTRAINT valid_enrollment_status CHECK (status IN ('enrolled', 'attended', 'cancelled', 'no_show'))
);

-- Crear tabla de horarios recurrentes
CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_type_id UUID NOT NULL REFERENCES public.class_types(id),
    instructor_id UUID NOT NULL REFERENCES public.instructors(id),
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Domingo
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INTEGER DEFAULT 15,
    location VARCHAR(255),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_classes_date ON public.classes(class_date);
CREATE INDEX IF NOT EXISTS idx_classes_instructor ON public.classes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_user ON public.class_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON public.class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_user ON public.user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_status ON public.user_memberships(status);

-- =====================================================
-- RLS POLICIES - HOT STUDIO
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.class_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hot_studio_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de lectura
CREATE POLICY "Class types are viewable by everyone" ON public.class_types
    FOR SELECT USING (true);

CREATE POLICY "Instructors are viewable by everyone" ON public.instructors
    FOR SELECT USING (active = true);

CREATE POLICY "Memberships are viewable by everyone" ON public.hot_studio_memberships
    FOR SELECT USING (active = true);

CREATE POLICY "Classes are viewable by everyone" ON public.classes
    FOR SELECT USING (true);

CREATE POLICY "Class schedules are viewable by everyone" ON public.class_schedules
    FOR SELECT USING (active = true);

-- Políticas para user_memberships
CREATE POLICY "Users can view own memberships" ON public.user_memberships
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memberships" ON public.user_memberships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para class_enrollments
CREATE POLICY "Users can view own enrollments" ON public.class_enrollments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own enrollments" ON public.class_enrollments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollments" ON public.class_enrollments
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Triggers para updated_at
CREATE TRIGGER update_class_types_updated_at BEFORE UPDATE
    ON public.class_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instructors_updated_at BEFORE UPDATE
    ON public.instructors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_memberships_updated_at BEFORE UPDATE
    ON public.user_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE
    ON public.classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar capacidad de clase
CREATE OR REPLACE FUNCTION update_class_capacity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'enrolled' THEN
        UPDATE public.classes 
        SET current_capacity = current_capacity + 1 
        WHERE id = NEW.class_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'enrolled' AND NEW.status IN ('cancelled', 'no_show') THEN
        UPDATE public.classes 
        SET current_capacity = current_capacity - 1 
        WHERE id = NEW.class_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_capacity_trigger
AFTER INSERT OR UPDATE ON public.class_enrollments
FOR EACH ROW EXECUTE FUNCTION update_class_capacity();

-- =====================================================
-- SEED DATA - HOT STUDIO
-- =====================================================

-- Insertar tipos de clases
INSERT INTO public.class_types (name, description, duration_minutes, max_capacity, color, icon) VALUES
    ('Yoga', 'Práctica tradicional de yoga', 60, 15, '#4ECDC4', 'yoga'),
    ('Pilates', 'Fortalecimiento y flexibilidad', 60, 12, '#FF6B6B', 'pilates'),
    ('Sound Healing', 'Sanación a través del sonido', 75, 20, '#9B5DE5', 'music'),
    ('Stretching', 'Estiramiento profundo', 45, 15, '#45B7D1', 'stretch'),
    ('HIIT', 'Entrenamiento de alta intensidad', 45, 10, '#F7B801', 'fitness'),
    ('Meditación', 'Práctica de meditación guiada', 60, 20, '#00BBF9', 'meditation')
ON CONFLICT DO NOTHING;

-- Insertar instructores
INSERT INTO public.instructors (full_name, bio, specialties) VALUES
    ('Maria González', 'Instructora certificada de Yoga con 10 años de experiencia', 
     ARRAY['Yoga', 'Meditación', 'Sound Healing']),
    ('Carlos Rodríguez', 'Especialista en Pilates y entrenamiento funcional', 
     ARRAY['Pilates', 'HIIT', 'Stretching']),
    ('Ana Martínez', 'Terapeuta de sonido y maestra de meditación', 
     ARRAY['Sound Healing', 'Meditación', 'Yoga']),
    ('Diego López', 'Entrenador personal y especialista en HIIT', 
     ARRAY['HIIT', 'Pilates', 'Stretching'])
ON CONFLICT DO NOTHING;

-- Insertar tipos de membresías
INSERT INTO public.hot_studio_memberships (name, description, price, duration_days, classes_per_month, benefits) VALUES
    ('Mensual Básica', '8 clases al mes', 280000, 30, 8, 
     ARRAY['8 clases mensuales', 'Acceso a vestuarios', 'Mat de yoga incluido']),
    ('Mensual Ilimitada', 'Clases ilimitadas por mes', 450000, 30, NULL, 
     ARRAY['Clases ilimitadas', 'Acceso a vestuarios', 'Mat de yoga incluido', '10% descuento en workshops']),
    ('Trimestral', 'Clases ilimitadas por 3 meses', 1200000, 90, NULL, 
     ARRAY['Clases ilimitadas', 'Acceso a vestuarios', 'Mat de yoga incluido', '15% descuento en workshops', 'Invitado gratis 1 vez al mes']),
    ('Clase suelta', 'Pago por clase individual', 45000, 1, 1, 
     ARRAY['1 clase', 'Acceso a vestuarios'])
ON CONFLICT DO NOTHING;