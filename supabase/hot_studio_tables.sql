-- Tabla para los tipos de clases del Hot Studio
CREATE TABLE IF NOT EXISTS class_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  duration integer NOT NULL DEFAULT 60, -- duración en minutos
  max_capacity integer NOT NULL DEFAULT 12,
  color text,
  icon text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla para los instructores
CREATE TABLE IF NOT EXISTS instructors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  bio text,
  specialties text[],
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla para el horario de clases
CREATE TABLE IF NOT EXISTS class_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_type_id uuid REFERENCES class_types(id) ON DELETE CASCADE,
  instructor_id uuid REFERENCES instructors(id) ON DELETE SET NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Domingo, 6=Sábado
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla para las clases específicas (instancias de clases)
CREATE TABLE IF NOT EXISTS classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_schedule_id uuid REFERENCES class_schedules(id) ON DELETE CASCADE,
  class_type_id uuid REFERENCES class_types(id) ON DELETE CASCADE,
  instructor_id uuid REFERENCES instructors(id) ON DELETE SET NULL,
  class_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  max_capacity integer NOT NULL DEFAULT 12,
  current_capacity integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla para los tipos de membresías
CREATE TABLE IF NOT EXISTS membership_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('class_pack', 'monthly', 'quarterly', 'yearly')),
  class_count integer, -- NULL para membresías ilimitadas
  duration_days integer NOT NULL, -- duración en días
  price decimal(10, 2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla para las membresías de usuarios
CREATE TABLE IF NOT EXISTS user_memberships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_type_id uuid REFERENCES membership_types(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  classes_remaining integer, -- NULL para membresías ilimitadas
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla para las inscripciones a clases
CREATE TABLE IF NOT EXISTS class_enrollments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_id uuid REFERENCES user_memberships(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'attended', 'cancelled', 'no_show')),
  check_in_time timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(class_id, user_id)
);

-- Tabla para la lista de espera
CREATE TABLE IF NOT EXISTS class_waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  position integer NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(class_id, user_id)
);

-- Insertar tipos de clases predefinidos
INSERT INTO class_types (name, description, duration, max_capacity, color, icon) VALUES
  ('Yoga', 'Práctica de yoga para todos los niveles', 60, 12, '#60A5FA', '🧘‍♀️'),
  ('Pilates', 'Fortalecimiento y flexibilidad corporal', 60, 12, '#A78BFA', '🤸‍♀️'),
  ('Breathwork', 'Técnicas de respiración consciente', 45, 12, '#34D399', '🌬️'),
  ('Sound Healing', 'Sanación a través de sonidos y vibraciones', 60, 12, '#F472B6', '🎵')
ON CONFLICT DO NOTHING;

-- Insertar tipos de membresías
INSERT INTO membership_types (name, description, type, class_count, duration_days, price) VALUES
  ('5 Clases', 'Paquete de 5 clases para usar en cualquier momento', 'class_pack', 5, 90, 250000),
  ('10 Clases', 'Paquete de 10 clases para usar en cualquier momento', 'class_pack', 10, 120, 450000),
  ('Mensual', 'Acceso ilimitado a todas las clases por 1 mes', 'monthly', NULL, 30, 350000),
  ('Trimestral', 'Acceso ilimitado a todas las clases por 3 meses', 'quarterly', NULL, 90, 900000),
  ('Anual', 'Acceso ilimitado a todas las clases por 1 año', 'yearly', NULL, 365, 3200000)
ON CONFLICT DO NOTHING;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_classes_date ON classes(class_date);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_user ON class_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_user ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_status ON user_memberships(status);

-- Crear funciones auxiliares

-- Función para actualizar el contador de capacidad actual cuando se inscribe un usuario
CREATE OR REPLACE FUNCTION update_class_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'enrolled' THEN
    UPDATE classes 
    SET current_capacity = current_capacity + 1 
    WHERE id = NEW.class_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'enrolled' AND NEW.status != 'enrolled' THEN
    UPDATE classes 
    SET current_capacity = current_capacity - 1 
    WHERE id = NEW.class_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'enrolled' AND NEW.status = 'enrolled' THEN
    UPDATE classes 
    SET current_capacity = current_capacity + 1 
    WHERE id = NEW.class_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'enrolled' THEN
    UPDATE classes 
    SET current_capacity = current_capacity - 1 
    WHERE id = OLD.class_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar capacidad
DROP TRIGGER IF EXISTS update_class_capacity_trigger ON class_enrollments;
CREATE TRIGGER update_class_capacity_trigger
AFTER INSERT OR UPDATE OR DELETE ON class_enrollments
FOR EACH ROW
EXECUTE FUNCTION update_class_capacity();

-- Función para descontar clases de una membresía
CREATE OR REPLACE FUNCTION deduct_membership_class()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.membership_id IS NOT NULL AND NEW.status = 'enrolled' THEN
    UPDATE user_memberships
    SET classes_remaining = classes_remaining - 1
    WHERE id = NEW.membership_id
    AND classes_remaining > 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para descontar clases
DROP TRIGGER IF EXISTS deduct_membership_class_trigger ON class_enrollments;
CREATE TRIGGER deduct_membership_class_trigger
AFTER INSERT ON class_enrollments
FOR EACH ROW
EXECUTE FUNCTION deduct_membership_class();

-- Configurar RLS (Row Level Security)
ALTER TABLE class_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_waitlist ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad - Lectura pública para tipos de clases y membresías
CREATE POLICY "Public read access" ON class_types FOR SELECT USING (true);
CREATE POLICY "Public read access" ON membership_types FOR SELECT USING (true);
CREATE POLICY "Public read access" ON instructors FOR SELECT USING (true);
CREATE POLICY "Public read access" ON class_schedules FOR SELECT USING (true);
CREATE POLICY "Public read access" ON classes FOR SELECT USING (true);

-- Políticas para membresías de usuarios
CREATE POLICY "Users can view own memberships" ON user_memberships
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memberships" ON user_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para inscripciones
CREATE POLICY "Users can view own enrollments" ON class_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own enrollments" ON class_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollments" ON class_enrollments
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para lista de espera
CREATE POLICY "Users can view waitlist" ON class_waitlist
  FOR SELECT USING (true);

CREATE POLICY "Users can join waitlist" ON class_waitlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave waitlist" ON class_waitlist
  FOR DELETE USING (auth.uid() = user_id);