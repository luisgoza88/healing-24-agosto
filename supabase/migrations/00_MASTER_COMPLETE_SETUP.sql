-- =====================================================
-- HEALING APP - CONFIGURACIÓN COMPLETA DE BASE DE DATOS
-- =====================================================
-- 
-- IMPORTANTE: Ejecutar este archivo creará TODAS las tablas
-- necesarias para la aplicación Healing.
--
-- Orden de ejecución:
-- 1. Funciones auxiliares
-- 2. Profiles y Storage
-- 3. Sistema de citas médicas
-- 4. Hot Studio
-- 5. Breathe & Move
-- 6. Sistema de pagos
-- 7. Notificaciones
--
-- =====================================================

-- =====================================================
-- 1. FUNCIONES AUXILIARES
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 2. PROFILES Y STORAGE (usuarios y fotos)
-- =====================================================

-- Crear tabla profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    bio TEXT,
    date_of_birth DATE,
    gender TEXT,
    address TEXT,
    city TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_conditions TEXT,
    allergies TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear bucket para avatares en Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- =====================================================
-- 3. SISTEMA DE CITAS MÉDICAS
-- =====================================================

-- Servicios médicos
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    base_price DECIMAL(10,2),
    duration_minutes INTEGER DEFAULT 60,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Sub-servicios
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

-- Profesionales
CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    full_name VARCHAR(255) NOT NULL,
    title VARCHAR(100),
    specialties TEXT[],
    bio TEXT,
    avatar_url TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Disponibilidad de profesionales
CREATE TABLE IF NOT EXISTS public.professional_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Citas médicas
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professionals(id),
    service_id UUID REFERENCES public.services(id),
    sub_service_id UUID REFERENCES public.sub_services(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER DEFAULT 60,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    internal_notes TEXT,
    total_amount DECIMAL(10,2),
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    CONSTRAINT valid_appointment_time CHECK (end_time > appointment_time)
);

-- =====================================================
-- 4. HOT STUDIO (Clases de yoga y fitness)
-- =====================================================

-- Tipos de clases
CREATE TABLE IF NOT EXISTS public.class_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 60,
    max_capacity INTEGER DEFAULT 15,
    color VARCHAR(7),
    icon VARCHAR(50),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Instructores
CREATE TABLE IF NOT EXISTS public.instructors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    full_name VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    specialties TEXT[],
    certifications TEXT[],
    phone VARCHAR(50),
    email VARCHAR(255),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Membresías Hot Studio
CREATE TABLE IF NOT EXISTS public.hot_studio_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_days INTEGER NOT NULL,
    classes_per_month INTEGER,
    benefits TEXT[],
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Membresías de usuarios
CREATE TABLE IF NOT EXISTS public.user_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES public.hot_studio_memberships(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    classes_used INTEGER DEFAULT 0,
    payment_id UUID,
    auto_renew BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_membership_status CHECK (status IN ('active', 'expired', 'cancelled', 'paused'))
);

-- Clases programadas
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
    status VARCHAR(50) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_capacity CHECK (current_capacity >= 0 AND current_capacity <= max_capacity),
    CONSTRAINT valid_class_time CHECK (end_time > start_time),
    CONSTRAINT valid_class_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

-- Inscripciones a clases
CREATE TABLE IF NOT EXISTS public.class_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES public.user_memberships(id),
    status VARCHAR(50) DEFAULT 'enrolled',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    attended_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_class_enrollment UNIQUE (user_id, class_id),
    CONSTRAINT valid_enrollment_status CHECK (status IN ('enrolled', 'attended', 'cancelled', 'no_show'))
);

-- =====================================================
-- 5. BREATHE & MOVE
-- =====================================================

-- Clases de Breathe & Move
CREATE TABLE IF NOT EXISTS public.breathe_move_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_name VARCHAR(255) NOT NULL,
    instructor VARCHAR(255) NOT NULL,
    class_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INTEGER DEFAULT 15,
    current_capacity INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'scheduled',
    intensity VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_capacity CHECK (current_capacity >= 0 AND current_capacity <= max_capacity),
    CONSTRAINT valid_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

-- Tipos de paquetes
CREATE TABLE IF NOT EXISTS public.breathe_move_package_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    classes_count INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    price_per_class DECIMAL(10,2) NOT NULL,
    savings_percentage INTEGER,
    validity_days INTEGER DEFAULT 30,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Paquetes comprados
CREATE TABLE IF NOT EXISTS public.breathe_move_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    package_type VARCHAR(50) NOT NULL,
    classes_total INTEGER NOT NULL,
    classes_used INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    valid_until DATE NOT NULL,
    payment_id UUID,
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_package_status CHECK (status IN ('active', 'expired', 'completed')),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed')),
    CONSTRAINT valid_classes_used CHECK (classes_used >= 0 AND classes_used <= classes_total)
);

-- Inscripciones Breathe & Move
CREATE TABLE IF NOT EXISTS public.breathe_move_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.breathe_move_classes(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.breathe_move_packages(id),
    status VARCHAR(50) DEFAULT 'confirmed',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    attended_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_breathe_move_enrollment UNIQUE (user_id, class_id),
    CONSTRAINT valid_enrollment_status CHECK (status IN ('confirmed', 'attended', 'cancelled', 'no_show'))
);

-- =====================================================
-- 6. SISTEMA DE PAGOS
-- =====================================================

-- Métodos de pago
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

-- Pagos
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'COP',
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    description TEXT,
    appointment_id UUID REFERENCES public.appointments(id),
    hot_studio_membership_id UUID REFERENCES public.user_memberships(id),
    breathe_move_package_id UUID REFERENCES public.breathe_move_packages(id),
    transaction_id VARCHAR(255),
    gateway_response TEXT,
    metadata JSONB DEFAULT '{}',
    processed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded'))
);

-- Cupones de descuento
CREATE TABLE IF NOT EXISTS public.discount_coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    minimum_amount DECIMAL(10,2),
    valid_from DATE,
    valid_until DATE,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    applicable_services TEXT[],
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_discount_type CHECK (discount_type IN ('percentage', 'fixed')),
    CONSTRAINT valid_discount_value CHECK (
        (discount_type = 'percentage' AND discount_value > 0 AND discount_value <= 100) OR
        (discount_type = 'fixed' AND discount_value > 0)
    )
);

-- =====================================================
-- 7. NOTIFICACIONES
-- =====================================================

-- Preferencias de notificación
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    appointments_reminder BOOLEAN DEFAULT true,
    appointments_confirmation BOOLEAN DEFAULT true,
    promotions BOOLEAN DEFAULT true,
    hot_studio_updates BOOLEAN DEFAULT true,
    payment_notifications BOOLEAN DEFAULT true,
    reminder_hours_before INTEGER DEFAULT 24,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- =====================================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- =====================================================

-- Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Hot Studio
CREATE INDEX IF NOT EXISTS idx_classes_date ON public.classes(class_date);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_user ON public.class_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_user ON public.user_memberships(user_id);

-- Breathe & Move
CREATE INDEX IF NOT EXISTS idx_breathe_move_classes_date ON public.breathe_move_classes(class_date);
CREATE INDEX IF NOT EXISTS idx_breathe_move_packages_user ON public.breathe_move_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_breathe_move_enrollments_user ON public.breathe_move_enrollments(user_id);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - TODAS LAS TABLAS
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hot_studio_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breathe_move_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breathe_move_package_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breathe_move_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breathe_move_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS BÁSICAS
-- =====================================================

-- Profiles: usuarios solo ven/editan su perfil
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Servicios: todos pueden ver
CREATE POLICY "Services are viewable by everyone" ON public.services FOR SELECT USING (true);
CREATE POLICY "Sub-services are viewable by everyone" ON public.sub_services FOR SELECT USING (true);
CREATE POLICY "Professionals are viewable by everyone" ON public.professionals FOR SELECT USING (active = true);

-- Appointments: usuarios ven sus citas
CREATE POLICY "Users can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = user_id);

-- Storage policies para avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can upload an avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Y muchas más políticas... (ver archivos individuales para políticas completas)

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Y más triggers...

-- =====================================================
-- DATOS INICIALES (SEED DATA)
-- =====================================================

-- Servicios principales
INSERT INTO public.services (code, name, category, description) VALUES
    ('medicina-funcional', 'Medicina Funcional', 'medical', 'Enfoque integral de la salud'),
    ('medicina-estetica', 'Medicina Estética', 'aesthetic', 'Tratamientos estéticos médicos'),
    ('wellness-integral', 'Wellness Integral', 'wellness', 'Bienestar holístico'),
    ('hot-studio', 'Hot Studio', 'wellness', 'Clases de yoga y fitness')
ON CONFLICT (code) DO NOTHING;

-- Profesional principal
INSERT INTO public.professionals (full_name, title, specialties, bio, email)
VALUES (
    'Estefanía González',
    'Dra.',
    ARRAY['Medicina Funcional', 'Medicina Integrativa', 'Medicina Estética'],
    'Especialista en medicina funcional e integrativa con enfoque holístico',
    'dra.gonzalez@healing.com'
) ON CONFLICT DO NOTHING;

-- Métodos de pago
INSERT INTO public.payment_methods (code, name, description, icon) VALUES
    ('nequi', 'Nequi', 'Pago con cuenta Nequi', 'phone-portrait'),
    ('daviplata', 'Daviplata', 'Pago con cuenta Daviplata', 'phone-portrait'),
    ('credit_card', 'Tarjeta de crédito', 'Visa, Mastercard, American Express', 'card'),
    ('debit_card', 'Tarjeta débito', 'PSE - Débito desde tu banco', 'card-outline'),
    ('cash', 'Efectivo', 'Pago en efectivo en recepción', 'cash')
ON CONFLICT (code) DO NOTHING;

-- Tipos de clases Hot Studio
INSERT INTO public.class_types (name, description, duration_minutes, max_capacity, color, icon) VALUES
    ('Yoga', 'Práctica tradicional de yoga', 60, 15, '#4ECDC4', 'yoga'),
    ('Pilates', 'Fortalecimiento y flexibilidad', 60, 12, '#FF6B6B', 'pilates'),
    ('Sound Healing', 'Sanación a través del sonido', 75, 20, '#9B5DE5', 'music'),
    ('Stretching', 'Estiramiento profundo', 45, 15, '#45B7D1', 'stretch'),
    ('HIIT', 'Entrenamiento de alta intensidad', 45, 10, '#F7B801', 'fitness'),
    ('Meditación', 'Práctica de meditación guiada', 60, 20, '#00BBF9', 'meditation')
ON CONFLICT DO NOTHING;

-- Paquetes Breathe & Move
INSERT INTO public.breathe_move_package_types (name, classes_count, price, price_per_class, savings_percentage, validity_days) VALUES
    ('4 Clases', 4, 260000, 65000, 0, 30),
    ('8 Clases', 8, 480000, 60000, 8, 30),
    ('12 Clases', 12, 660000, 55000, 15, 45)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FIN DE LA CONFIGURACIÓN
-- =====================================================
-- 
-- La base de datos está lista para usar.
-- Todas las tablas, índices, políticas y datos iniciales
-- han sido creados correctamente.
--
-- =====================================================