-- Ajustes para habilitar el dashboard administrativo
-- Refuerza funciones y políticas necesarias para consultas globales

-- 1. Función unificada para validar roles administrativos
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
    has_user_roles boolean := to_regclass('public.user_roles') IS NOT NULL;
BEGIN
    IF user_uuid IS NULL THEN
        RETURN false;
    END IF;

    IF has_user_roles AND EXISTS (
        SELECT 1
        FROM user_roles
        WHERE user_id = user_uuid
          AND role IN ('admin', 'super_admin', 'manager')
    ) THEN
        RETURN true;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = user_uuid
          AND role IN ('admin', 'super_admin', 'manager')
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_admin(UUID) IS 'Retorna true cuando el usuario pertenece a un rol administrativo.';

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- 2. Permitir a administradores gestionar perfiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

CREATE POLICY "Admins can view profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can update profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

-- 3. Asegurar que las funciones y vistas del dashboard sean accesibles
GRANT EXECUTE ON FUNCTION get_services_with_details() TO authenticated;
GRANT EXECUTE ON FUNCTION get_professionals_by_service(UUID) TO authenticated;

GRANT SELECT ON service_dashboard_view TO authenticated;
