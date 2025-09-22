-- =====================================================
-- SEPARAR CAMPOS DE NOMBRE EN EL PERFIL
-- =====================================================

-- 1. Agregar nuevas columnas para nombres separados
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS middle_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS second_last_name TEXT;

-- 2. Migrar datos existentes del campo full_name
UPDATE public.profiles
SET 
  first_name = COALESCE(
    CASE 
      WHEN full_name IS NOT NULL AND full_name != '' 
      THEN split_part(full_name, ' ', 1)
      ELSE split_part(email, '@', 1)
    END,
    first_name
  ),
  last_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' 
    AND array_length(string_to_array(full_name, ' '), 1) > 1
    THEN split_part(full_name, ' ', 2)
    ELSE NULL
  END
WHERE first_name IS NULL;

-- 3. Actualizar la función handle_new_user para usar los nuevos campos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insertar nuevo perfil cuando se crea un usuario
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'first_name',
      split_part(new.email, '@', 1)
    ),
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    now(),
    now()
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear índice para mejorar búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_profiles_first_name ON public.profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_profiles_last_name ON public.profiles(last_name);

-- 5. Actualizar función para reconstruir el nombre completo
CREATE OR REPLACE FUNCTION public.get_full_name(
  p_first_name TEXT,
  p_middle_name TEXT,
  p_last_name TEXT,
  p_second_last_name TEXT
)
RETURNS TEXT AS $$
BEGIN
  RETURN TRIM(
    COALESCE(p_first_name, '') || ' ' ||
    COALESCE(p_middle_name, '') || ' ' ||
    COALESCE(p_last_name, '') || ' ' ||
    COALESCE(p_second_last_name, '')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Comentarios para documentación
COMMENT ON COLUMN public.profiles.first_name IS 'Primer nombre del usuario';
COMMENT ON COLUMN public.profiles.middle_name IS 'Segundo nombre del usuario (opcional)';
COMMENT ON COLUMN public.profiles.last_name IS 'Apellido del usuario';
COMMENT ON COLUMN public.profiles.second_last_name IS 'Segundo apellido del usuario (opcional)';
COMMENT ON FUNCTION public.get_full_name IS 'Reconstruye el nombre completo desde los campos separados';