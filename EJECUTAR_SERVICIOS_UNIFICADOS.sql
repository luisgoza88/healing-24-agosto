-- =====================================================
-- SISTEMA UNIFICADO DE SERVICIOS - SCRIPT COMPLETO
-- EJECUTAR EN SUPABASE DASHBOARD > SQL EDITOR
-- =====================================================

-- IMPORTANTE: Este script unifica todos los servicios entre
-- el dashboard administrativo y la aplicación móvil

-- PASO 1: Copiar y pegar TODO este contenido en SQL Editor de Supabase
-- PASO 2: Hacer clic en "Run"
-- PASO 3: Verificar que no hay errores

-- =====================================================
-- PARTE 1: ESTRUCTURA DE TABLAS
-- =====================================================

-- Tabla de categorías de servicios
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    icon VARCHAR(50),
    order_index INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Actualizar tabla de servicios
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS color VARCHAR(7),
ADD COLUMN IF NOT EXISTS icon VARCHAR(50),
ADD COLUMN IF NOT EXISTS requires_professional BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_advance_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS min_advance_hours INTEGER DEFAULT 24;

-- Actualizar tabla de sub-servicios
ALTER TABLE public.sub_services
ADD COLUMN IF NOT EXISTS price_note VARCHAR(50),
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Tabla de relación profesionales-servicios
CREATE TABLE IF NOT EXISTS public.professional_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    sub_service_id UUID REFERENCES public.sub_services(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(professional_id, service_id, sub_service_id)
);

-- Tabla de configuración de servicios
CREATE TABLE IF NOT EXISTS public.service_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE UNIQUE,
    allow_online_booking BOOLEAN DEFAULT true,
    require_deposit BOOLEAN DEFAULT false,
    deposit_percentage DECIMAL(5,2) DEFAULT 0,
    cancellation_hours INTEGER DEFAULT 24,
    reminder_hours INTEGER DEFAULT 24,
    custom_fields JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PARTE 2: DATOS MAESTROS
-- =====================================================

-- Insertar categorías
INSERT INTO service_categories (code, name, description, color, icon, order_index) VALUES
('medical', 'Servicios Médicos', 'Consultas y tratamientos médicos especializados', '#3E5444', 'medical-bag', 1),
('wellness', 'Bienestar & Spa', 'Servicios de relajación y bienestar integral', '#879794', 'spa', 2),
('aesthetic', 'Estética & Belleza', 'Tratamientos estéticos y de belleza', '#B8604D', 'face-woman-shimmer', 3),
('movement', 'Movimiento & Ejercicio', 'Clases y actividades físicas', '#4CAF50', 'fitness', 4)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon,
    updated_at = NOW();

-- Limpiar servicios existentes incorrectos
DELETE FROM services WHERE name NOT IN (
    'Medicina Funcional',
    'Medicina Estética', 
    'Medicina Regenerativa & Longevidad',
    'DRIPS - Sueroterapia',
    'Faciales',
    'Masajes',
    'Wellness Integral',
    'Breathe & Move'
);

-- Insertar/Actualizar servicios correctos
DO $$
DECLARE
    cat_medical UUID;
    cat_wellness UUID;
    cat_aesthetic UUID;
    cat_movement UUID;
    serv_id UUID;
BEGIN
    -- Obtener IDs de categorías
    SELECT id INTO cat_medical FROM service_categories WHERE code = 'medical';
    SELECT id INTO cat_wellness FROM service_categories WHERE code = 'wellness';
    SELECT id INTO cat_aesthetic FROM service_categories WHERE code = 'aesthetic';
    SELECT id INTO cat_movement FROM service_categories WHERE code = 'movement';

    -- Medicina Funcional
    INSERT INTO services (category_id, code, name, description, base_price, duration_minutes, color, icon)
    VALUES (cat_medical, 'medicina-funcional', 'Medicina Funcional', 'Consultas especializadas y péptidos', 200000, 60, '#3E5444', 'medical-bag')
    ON CONFLICT (code) DO UPDATE SET 
        category_id = cat_medical,
        name = 'Medicina Funcional',
        color = '#3E5444',
        icon = 'medical-bag';
    
    SELECT id INTO serv_id FROM services WHERE code = 'medicina-funcional';
    DELETE FROM sub_services WHERE service_id = serv_id;
    INSERT INTO sub_services (service_id, name, price, duration_minutes, order_index) VALUES
    (serv_id, 'Consulta funcional – primera vez', 300000, 75, 1),
    (serv_id, 'Consulta funcional – seguimiento', 150000, 30, 2),
    (serv_id, 'Consulta péptidos', 200000, 60, 3),
    (serv_id, 'Consulta células madre', 200000, 60, 4);

    -- Medicina Estética
    INSERT INTO services (category_id, code, name, description, base_price, duration_minutes, color, icon)
    VALUES (cat_aesthetic, 'medicina-estetica', 'Medicina Estética', 'Procedimientos estéticos avanzados', 750000, 60, '#B8604D', 'face-woman-shimmer')
    ON CONFLICT (code) DO UPDATE SET
        category_id = cat_aesthetic,
        name = 'Medicina Estética',
        color = '#B8604D',
        icon = 'face-woman-shimmer';
    
    SELECT id INTO serv_id FROM services WHERE code = 'medicina-estetica';
    DELETE FROM sub_services WHERE service_id = serv_id;
    INSERT INTO sub_services (service_id, name, price, duration_minutes, price_note, order_index) VALUES
    (serv_id, 'Consulta medicina estética valoración', 150000, 60, NULL, 1),
    (serv_id, 'Procedimientos estéticos', 750000, 60, 'desde', 2);

    -- Medicina Regenerativa
    INSERT INTO services (category_id, code, name, description, base_price, duration_minutes, color, icon)
    VALUES (cat_medical, 'medicina-regenerativa', 'Medicina Regenerativa & Longevidad', 'Terapias antiedad y bienestar', 180000, 60, '#5E3532', 'dna')
    ON CONFLICT (code) DO UPDATE SET
        category_id = cat_medical,
        name = 'Medicina Regenerativa & Longevidad',
        color = '#5E3532',
        icon = 'dna';
    
    SELECT id INTO serv_id FROM services WHERE code = 'medicina-regenerativa';
    DELETE FROM sub_services WHERE service_id = serv_id;
    INSERT INTO sub_services (service_id, name, price, duration_minutes, order_index) VALUES
    (serv_id, 'Baño helado', 80000, 30, 1),
    (serv_id, 'Sauna infrarrojo', 130000, 45, 2),
    (serv_id, 'Baño helado + sauna infrarrojo', 190000, 60, 3),
    (serv_id, 'Cámara hiperbárica', 180000, 60, 4);

    -- DRIPS
    INSERT INTO services (category_id, code, name, description, base_price, duration_minutes, color, icon)
    VALUES (cat_medical, 'drips', 'DRIPS - Sueroterapia', 'Terapias intravenosas y sueroterapia', 265000, 60, '#4A6C9B', 'medical-services')
    ON CONFLICT (code) DO UPDATE SET
        category_id = cat_medical,
        name = 'DRIPS - Sueroterapia',
        color = '#4A6C9B',
        icon = 'medical-services';
    
    SELECT id INTO serv_id FROM services WHERE code = 'drips';
    DELETE FROM sub_services WHERE service_id = serv_id;
    INSERT INTO sub_services (service_id, name, price, duration_minutes, price_note, order_index) VALUES
    (serv_id, 'Vitaminas - IV Drips', 265000, 60, 'desde', 1),
    (serv_id, 'NAD 125 mg', 400000, 90, NULL, 2),
    (serv_id, 'NAD 500 mg', 1500000, 180, NULL, 3),
    (serv_id, 'NAD 1000 mg', 2300000, 240, NULL, 4),
    (serv_id, 'Ozonoterapia – suero ozonizado', 300000, 60, NULL, 5),
    (serv_id, 'Ozonoterapia – autohemoterapia mayor', 350000, 60, NULL, 6);

    -- Faciales
    INSERT INTO services (category_id, code, name, description, base_price, duration_minutes, color, icon)
    VALUES (cat_aesthetic, 'faciales', 'Faciales', 'Tratamientos faciales especializados', 380000, 90, '#879794', 'face')
    ON CONFLICT (code) DO UPDATE SET
        category_id = cat_aesthetic,
        name = 'Faciales',
        color = '#879794',
        icon = 'face';
    
    SELECT id INTO serv_id FROM services WHERE code = 'faciales';
    DELETE FROM sub_services WHERE service_id = serv_id;
    INSERT INTO sub_services (service_id, name, price, duration_minutes, order_index) VALUES
    (serv_id, 'Clean Facial', 280000, 75, 1),
    (serv_id, 'Glow Facial', 380000, 90, 2),
    (serv_id, 'Anti-Age Facial', 380000, 90, 3),
    (serv_id, 'Anti-Acné Facial', 380000, 90, 4),
    (serv_id, 'Lymph Facial', 380000, 90, 5);

    -- Masajes
    INSERT INTO services (category_id, code, name, description, base_price, duration_minutes, color, icon)
    VALUES (cat_wellness, 'masajes', 'Masajes', 'Masajes terapéuticos y relajantes', 200000, 75, '#61473B', 'spa')
    ON CONFLICT (code) DO UPDATE SET
        category_id = cat_wellness,
        name = 'Masajes',
        color = '#61473B',
        icon = 'spa';
    
    SELECT id INTO serv_id FROM services WHERE code = 'masajes';
    DELETE FROM sub_services WHERE service_id = serv_id;
    INSERT INTO sub_services (service_id, name, price, duration_minutes, order_index) VALUES
    (serv_id, 'Drenaje linfático', 190000, 75, 1),
    (serv_id, 'Relajante', 200000, 75, 2);

    -- Wellness Integral
    INSERT INTO services (category_id, code, name, description, base_price, duration_minutes, color, icon)
    VALUES (cat_wellness, 'wellness-integral', 'Wellness Integral', 'Servicios de bienestar integral', 200000, 60, '#879794', 'heart-pulse')
    ON CONFLICT (code) DO UPDATE SET
        category_id = cat_wellness,
        name = 'Wellness Integral',
        color = '#879794',
        icon = 'heart-pulse';

    -- Breathe & Move
    INSERT INTO services (category_id, code, name, description, base_price, duration_minutes, color, icon, requires_professional)
    VALUES (cat_movement, 'breathe-move', 'Breathe & Move', 'Clases de movimiento y respiración consciente', 50000, 60, '#4CAF50', 'fitness', false)
    ON CONFLICT (code) DO UPDATE SET
        category_id = cat_movement,
        name = 'Breathe & Move',
        color = '#4CAF50',
        icon = 'fitness',
        requires_professional = false;
END $$;

-- =====================================================
-- PARTE 3: FUNCIONES Y VISTAS
-- =====================================================

-- Función para obtener servicios con detalles
CREATE OR REPLACE FUNCTION get_services_with_details()
RETURNS TABLE (
    service_id UUID,
    service_code VARCHAR,
    service_name VARCHAR,
    service_description TEXT,
    category_name VARCHAR,
    category_code VARCHAR,
    base_price DECIMAL,
    duration_minutes INTEGER,
    color VARCHAR,
    icon VARCHAR,
    sub_services JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.code,
        s.name,
        s.description,
        sc.name,
        sc.code,
        s.base_price,
        s.duration_minutes,
        s.color,
        s.icon,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', ss.id,
                    'name', ss.name,
                    'price', ss.price,
                    'duration_minutes', ss.duration_minutes,
                    'price_note', ss.price_note
                ) ORDER BY ss.order_index
            ) FILTER (WHERE ss.id IS NOT NULL),
            '[]'::jsonb
        ) as sub_services
    FROM services s
    LEFT JOIN service_categories sc ON s.category_id = sc.id
    LEFT JOIN sub_services ss ON s.id = ss.service_id AND ss.active = true
    WHERE s.active = true
    GROUP BY s.id, s.code, s.name, s.description, sc.name, sc.code, s.base_price, s.duration_minutes, s.color, s.icon
    ORDER BY sc.order_index, s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener profesionales por servicio
CREATE OR REPLACE FUNCTION get_professionals_by_service(p_service_id UUID)
RETURNS TABLE (
    professional_id UUID,
    full_name VARCHAR,
    title VARCHAR,
    specialties TEXT[],
    avatar_url TEXT,
    is_primary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.title,
        p.specialties,
        p.avatar_url,
        ps.is_primary
    FROM professionals p
    JOIN professional_services ps ON p.id = ps.professional_id
    WHERE ps.service_id = p_service_id
    AND p.active = true
    ORDER BY ps.is_primary DESC, p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista para dashboard
CREATE OR REPLACE VIEW service_dashboard_view AS
SELECT 
    s.id,
    s.code,
    s.name,
    s.description,
    sc.name as category_name,
    sc.code as category_code,
    sc.color as category_color,
    s.base_price,
    s.duration_minutes,
    s.color,
    s.icon,
    s.active,
    COUNT(DISTINCT ss.id) as sub_service_count,
    COUNT(DISTINCT ps.professional_id) as professional_count,
    COUNT(DISTINCT a.id) as total_appointments,
    COUNT(DISTINCT CASE WHEN a.status = 'confirmed' AND a.appointment_date >= CURRENT_DATE THEN a.id END) as upcoming_appointments
FROM services s
LEFT JOIN service_categories sc ON s.category_id = sc.id
LEFT JOIN sub_services ss ON s.id = ss.service_id AND ss.active = true
LEFT JOIN professional_services ps ON s.id = ps.service_id
LEFT JOIN appointments a ON s.id = a.service_id
GROUP BY s.id, s.code, s.name, s.description, sc.name, sc.code, sc.color, s.base_price, s.duration_minutes, s.color, s.icon, s.active;

-- =====================================================
-- PARTE 4: ÍNDICES Y POLÍTICAS
-- =====================================================

-- Índices
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_code ON services(code);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_sub_services_service_id ON sub_services(service_id);
CREATE INDEX IF NOT EXISTS idx_sub_services_active ON sub_services(active);
CREATE INDEX IF NOT EXISTS idx_professional_services_professional ON professional_services(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_services_service ON professional_services(service_id);

-- Habilitar RLS
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_settings ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Anyone can view categories" ON service_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON service_categories;
DROP POLICY IF EXISTS "Anyone can view services" ON services;
DROP POLICY IF EXISTS "Admins can manage services" ON services;
DROP POLICY IF EXISTS "Anyone can view sub_services" ON sub_services;
DROP POLICY IF EXISTS "Admins can manage sub_services" ON sub_services;
DROP POLICY IF EXISTS "Anyone can view professional_services" ON professional_services;
DROP POLICY IF EXISTS "Admins can manage professional_services" ON professional_services;
DROP POLICY IF EXISTS "Admins can view service_settings" ON service_settings;
DROP POLICY IF EXISTS "Admins can manage service_settings" ON service_settings;

-- Crear políticas nuevas
CREATE POLICY "Anyone can view categories" ON service_categories
    FOR SELECT TO authenticated USING (active = true);

CREATE POLICY "Admins can manage categories" ON service_categories
    FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Anyone can view services" ON services
    FOR SELECT TO authenticated USING (active = true);

CREATE POLICY "Admins can manage services" ON services
    FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Anyone can view sub_services" ON sub_services
    FOR SELECT TO authenticated USING (active = true);

CREATE POLICY "Admins can manage sub_services" ON sub_services
    FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Anyone can view professional_services" ON professional_services
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage professional_services" ON professional_services
    FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can view service_settings" ON service_settings
    FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can manage service_settings" ON service_settings
    FOR ALL TO authenticated USING (public.is_admin());

-- =====================================================
-- PARTE 5: TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_service_categories_updated_at ON service_categories;
CREATE TRIGGER update_service_categories_updated_at
    BEFORE UPDATE ON service_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sub_services_updated_at ON sub_services;
CREATE TRIGGER update_sub_services_updated_at
    BEFORE UPDATE ON sub_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_settings_updated_at ON service_settings;
CREATE TRIGGER update_service_settings_updated_at
    BEFORE UPDATE ON service_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Mostrar resumen de servicios creados
SELECT 
    'Servicios creados' as descripcion,
    COUNT(*) as cantidad
FROM services
WHERE active = true
UNION ALL
SELECT 
    'Sub-servicios creados' as descripcion,
    COUNT(*) as cantidad
FROM sub_services
WHERE active = true
UNION ALL
SELECT 
    'Categorías creadas' as descripcion,
    COUNT(*) as cantidad
FROM service_categories
WHERE active = true;

-- Mostrar servicios con sus sub-servicios
SELECT 
    s.name as servicio,
    COUNT(ss.id) as sub_servicios,
    s.color,
    s.icon
FROM services s
LEFT JOIN sub_services ss ON s.id = ss.service_id
WHERE s.active = true
GROUP BY s.name, s.color, s.icon
ORDER BY s.name;

-- Mensaje final
SELECT '✅ SISTEMA UNIFICADO DE SERVICIOS CREADO EXITOSAMENTE' as resultado;






