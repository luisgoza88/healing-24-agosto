-- =====================================================
-- MIGRACIÓN UNIFICADA PARA HEALING FOREST
-- EJECUTAR EN SUPABASE DASHBOARD > SQL EDITOR
-- =====================================================

-- PASO 1: Ejecutar la migración unificada de créditos
-- (Copiar y pegar el contenido de supabase/migrations/99_unified_credits_system.sql)

-- PASO 2: Verificar que las funciones de autenticación existen
-- Crear función is_admin si no existe
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
    -- Primero verificar en user_roles si existe la tabla
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        RETURN EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = user_uuid AND role = 'admin'
        );
    END IF;
    
    -- Si no existe user_roles, verificar en profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RETURN EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = user_uuid 
            AND role IN ('admin', 'super_admin', 'manager')
        );
    END IF;
    
    -- Si no hay sistema de roles, permitir para desarrollo
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear función get_user_roles si no existe
CREATE OR REPLACE FUNCTION public.get_user_roles(user_uuid UUID DEFAULT auth.uid())
RETURNS text[] AS $$
BEGIN
    -- Verificar en user_roles si existe la tabla
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        RETURN ARRAY(
            SELECT role FROM user_roles 
            WHERE user_id = user_uuid
        );
    END IF;
    
    -- Si no existe user_roles, verificar en profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RETURN ARRAY(
            SELECT role FROM profiles 
            WHERE id = user_uuid AND role IS NOT NULL
        );
    END IF;
    
    -- Si no hay sistema de roles, retornar array vacío
    RETURN ARRAY[]::text[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 3: Asegurar que la tabla profiles existe con la estructura correcta
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin', 'super_admin', 'manager', 'professional')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en profiles si no está habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR ALL USING (public.is_admin());

-- Trigger para actualizar updated_at en profiles
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at_trigger ON profiles;
CREATE TRIGGER update_profiles_updated_at_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profiles_updated_at();

-- PASO 4: Función para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PASO 5: Migrar datos existentes de user_metadata a profiles
INSERT INTO profiles (id, email, full_name, phone)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) as full_name,
    u.raw_user_meta_data->>'phone' as phone
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = NOW();

-- PASO 6: Verificación final
-- Mostrar resumen de la migración
SELECT 
    'Usuarios totales' as descripcion,
    COUNT(*) as cantidad
FROM auth.users
UNION ALL
SELECT 
    'Perfiles creados' as descripcion,
    COUNT(*) as cantidad
FROM profiles
UNION ALL
SELECT 
    'Créditos disponibles' as descripcion,
    COUNT(*) as cantidad
FROM user_credits
WHERE is_used = false
UNION ALL
SELECT 
    'Transacciones de créditos' as descripcion,
    COUNT(*) as cantidad
FROM credit_transactions;

-- Mostrar funciones creadas
SELECT 
    routine_name as funcion,
    routine_type as tipo
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('is_admin', 'get_user_roles', 'get_user_credit_balance', 'create_cancellation_credit', 'use_credits_for_appointment')
ORDER BY routine_name;

-- MENSAJE FINAL
SELECT 'MIGRACIÓN COMPLETADA EXITOSAMENTE' as resultado;
