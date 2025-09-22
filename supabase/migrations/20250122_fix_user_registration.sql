-- =====================================================
-- FIX USER REGISTRATION - CREAR PERFIL AUTOMÁTICAMENTE
-- =====================================================

-- 1. Crear función para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insertar nuevo perfil cuando se crea un usuario
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    now(),
    now()
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Crear trigger para ejecutar la función cuando se crea un usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Asegurar que las políticas RLS permiten la inserción desde el trigger
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- 5. Agregar política para el trigger del sistema
DROP POLICY IF EXISTS "System can create profiles on signup" ON public.profiles;
CREATE POLICY "System can create profiles on signup" ON public.profiles
    FOR INSERT WITH CHECK (true);

-- 6. Verificar y crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- 7. Función de utilidad para verificar si el perfil existe
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  SELECT 
    user_id,
    (SELECT email FROM auth.users WHERE id = user_id),
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permisos necesarios
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists(UUID) TO authenticated;

-- 9. Comentarios para documentación
COMMENT ON FUNCTION public.handle_new_user() IS 'Crea automáticamente un perfil cuando se registra un nuevo usuario';
COMMENT ON FUNCTION public.ensure_profile_exists(UUID) IS 'Asegura que existe un perfil para el usuario especificado';