-- =====================================================
-- SISTEMA DE CITAS MÉDICAS
-- =====================================================

-- Crear tabla de servicios médicos
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- medicina-funcional, medicina-estetica, etc
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- medical, wellness, aesthetic
    base_price DECIMAL(10,2),
    duration_minutes INTEGER DEFAULT 60,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear tabla de sub-servicios
CREATE TABLE IF NOT EXISTS public.sub_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear tabla de profesionales
CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    full_name VARCHAR(255) NOT NULL,
    title VARCHAR(100), -- Dra., Dr., etc
    specialties TEXT[], -- Array de especialidades
    bio TEXT,
    avatar_url TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear tabla de disponibilidad de profesionales
CREATE TABLE IF NOT EXISTS public.professional_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Domingo, 6=Sábado
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Crear tabla de citas médicas (actualizar la existente)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professionals(id),
    service_id UUID REFERENCES public.services(id),
    sub_service_id UUID REFERENCES public.sub_services(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER DEFAULT 60, -- duración en minutos
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled, completed, no_show
    notes TEXT,
    internal_notes TEXT, -- Notas del profesional
    total_amount DECIMAL(10,2),
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    CONSTRAINT valid_appointment_time CHECK (end_time > appointment_time)
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_professional_availability_professional ON public.professional_availability(professional_id);

-- =====================================================
-- RLS POLICIES - APPOINTMENTS SYSTEM
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Políticas para services (todos pueden ver)
CREATE POLICY "Services are viewable by everyone" ON public.services
    FOR SELECT USING (true);

-- Políticas para sub_services (todos pueden ver)
CREATE POLICY "Sub-services are viewable by everyone" ON public.sub_services
    FOR SELECT USING (true);

-- Políticas para professionals (todos pueden ver)
CREATE POLICY "Professionals are viewable by everyone" ON public.professionals
    FOR SELECT USING (active = true);

-- Políticas para professional_availability (todos pueden ver)
CREATE POLICY "Professional availability is viewable by everyone" ON public.professional_availability
    FOR SELECT USING (active = true);

-- Políticas para appointments
CREATE POLICY "Users can view own appointments" ON public.appointments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own appointments" ON public.appointments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments" ON public.appointments
    FOR UPDATE USING (auth.uid() = user_id);

-- Professionals can view their appointments
CREATE POLICY "Professionals can view their appointments" ON public.appointments
    FOR SELECT USING (
        professional_id IN (
            SELECT id FROM public.professionals 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Trigger para actualizar updated_at
CREATE TRIGGER update_services_updated_at BEFORE UPDATE
    ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_services_updated_at BEFORE UPDATE
    ON public.sub_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE
    ON public.professionals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE
    ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA - SERVICIOS Y PROFESIONALES
-- =====================================================

-- Insertar servicios principales
INSERT INTO public.services (code, name, category, description) VALUES
    ('medicina-funcional', 'Medicina Funcional', 'medical', 'Enfoque integral de la salud'),
    ('medicina-estetica', 'Medicina Estética', 'aesthetic', 'Tratamientos estéticos médicos'),
    ('wellness-integral', 'Wellness Integral', 'wellness', 'Bienestar holístico'),
    ('hot-studio', 'Hot Studio', 'wellness', 'Clases de yoga y fitness')
ON CONFLICT (code) DO NOTHING;

-- Insertar sub-servicios de Medicina Funcional
INSERT INTO public.sub_services (service_id, name, price, duration_minutes)
SELECT 
    id,
    unnest(ARRAY[
        'Consulta inicial medicina funcional',
        'Consulta de seguimiento',
        'Análisis de biomarcadores',
        'Plan de nutrición personalizado',
        'Terapia hormonal bioidentica',
        'Medicina regenerativa'
    ]),
    unnest(ARRAY[350000, 250000, 450000, 300000, 400000, 500000]::DECIMAL[]),
    unnest(ARRAY[90, 60, 60, 45, 60, 90]::INTEGER[])
FROM public.services WHERE code = 'medicina-funcional';

-- Insertar sub-servicios de Medicina Estética
INSERT INTO public.sub_services (service_id, name, price, duration_minutes)
SELECT 
    id,
    unnest(ARRAY[
        'Botox',
        'Ácido hialurónico',
        'Mesoterapia facial',
        'Peeling químico',
        'Radiofrecuencia facial',
        'Procedimientos estéticos'
    ]),
    unnest(ARRAY[400000, 600000, 350000, 300000, 250000, 750000]::DECIMAL[]),
    unnest(ARRAY[30, 45, 60, 45, 60, 90]::INTEGER[])
FROM public.services WHERE code = 'medicina-estetica';

-- Insertar sub-servicios de Wellness Integral
INSERT INTO public.sub_services (service_id, name, price, duration_minutes)
SELECT 
    id,
    unnest(ARRAY[
        'Terapia de bienestar',
        'Coaching de salud',
        'Evaluación integral',
        'Plan de wellness personalizado'
    ]),
    unnest(ARRAY[200000, 180000, 400000, 350000]::DECIMAL[]),
    unnest(ARRAY[60, 60, 120, 90]::INTEGER[])
FROM public.services WHERE code = 'wellness-integral';

-- Insertar profesional principal
INSERT INTO public.professionals (full_name, title, specialties, bio, email)
VALUES (
    'Estefanía González',
    'Dra.',
    ARRAY['Medicina Funcional', 'Medicina Integrativa', 'Medicina Estética'],
    'Especialista en medicina funcional e integrativa con enfoque holístico',
    'dra.gonzalez@healing.com'
) ON CONFLICT DO NOTHING;

-- Insertar disponibilidad de la Dra. González (Lunes a Viernes 8AM-5PM)
INSERT INTO public.professional_availability (professional_id, day_of_week, start_time, end_time)
SELECT 
    id,
    generate_series(1, 5), -- Lunes a Viernes
    '08:00:00'::TIME,
    '17:00:00'::TIME
FROM public.professionals 
WHERE full_name = 'Estefanía González';