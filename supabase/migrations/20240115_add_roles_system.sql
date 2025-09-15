-- Crear enum para roles
CREATE TYPE user_role AS ENUM (
  'client',           -- Cliente/Paciente normal
  'receptionist',     -- Recepcionista
  'nurse',           -- Enfermera
  'professional',     -- Profesional de salud (doctor, terapeuta)
  'manager',         -- Gerente
  'admin',           -- Administrador
  'super_admin'      -- Super administrador
);

-- Agregar columna role a profiles
ALTER TABLE profiles 
ADD COLUMN role user_role DEFAULT 'client' NOT NULL;

-- Crear tabla de permisos
CREATE TABLE permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role user_role NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, resource, action)
);

-- Crear tabla de recursos del sistema
CREATE TABLE system_resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Insertar recursos del sistema
INSERT INTO system_resources (name, description) VALUES
  ('appointments', 'Gestión de citas'),
  ('appointments.all', 'Ver todas las citas'),
  ('appointments.modify_any', 'Modificar cualquier cita'),
  ('appointments.cancel_any', 'Cancelar cualquier cita'),
  ('payments', 'Gestión de pagos'),
  ('payments.all', 'Ver todos los pagos'),
  ('payments.refund', 'Procesar reembolsos'),
  ('patients', 'Gestión de pacientes'),
  ('patients.all', 'Ver todos los pacientes'),
  ('patients.medical_history', 'Ver historial médico completo'),
  ('professionals', 'Gestión de profesionales'),
  ('professionals.manage', 'Crear/editar profesionales'),
  ('professionals.schedule', 'Gestionar horarios'),
  ('services', 'Gestión de servicios'),
  ('services.manage', 'Crear/editar servicios'),
  ('services.pricing', 'Modificar precios'),
  ('reports', 'Reportes y análisis'),
  ('reports.financial', 'Ver reportes financieros'),
  ('reports.operational', 'Ver reportes operativos'),
  ('settings', 'Configuración del sistema'),
  ('settings.general', 'Configuración general'),
  ('settings.users', 'Gestión de usuarios'),
  ('notifications', 'Gestión de notificaciones'),
  ('notifications.send_all', 'Enviar notificaciones masivas');

-- Definir permisos por rol
INSERT INTO permissions (role, resource, action) VALUES
  -- Cliente (paciente)
  ('client', 'appointments', 'view_own'),
  ('client', 'appointments', 'create_own'),
  ('client', 'appointments', 'cancel_own'),
  ('client', 'payments', 'view_own'),
  ('client', 'payments', 'create_own'),
  
  -- Recepcionista
  ('receptionist', 'appointments', 'view_own'),
  ('receptionist', 'appointments', 'create_own'),
  ('receptionist', 'appointments', 'cancel_own'),
  ('receptionist', 'appointments.all', 'view'),
  ('receptionist', 'appointments', 'create_any'),
  ('receptionist', 'appointments', 'modify_basic'),
  ('receptionist', 'patients', 'view_basic'),
  ('receptionist', 'patients', 'create'),
  ('receptionist', 'payments', 'view_own'),
  ('receptionist', 'payments', 'create_any'),
  ('receptionist', 'professionals', 'view'),
  ('receptionist', 'services', 'view'),
  
  -- Enfermera
  ('nurse', 'appointments', 'view_own'),
  ('nurse', 'appointments.all', 'view'),
  ('nurse', 'patients', 'view_basic'),
  ('nurse', 'patients.medical_history', 'view'),
  ('nurse', 'patients.medical_history', 'add_notes'),
  ('nurse', 'professionals', 'view'),
  
  -- Profesional de salud
  ('professional', 'appointments', 'view_own'),
  ('professional', 'appointments', 'modify_own'),
  ('professional', 'patients', 'view_assigned'),
  ('professional', 'patients.medical_history', 'view'),
  ('professional', 'patients.medical_history', 'modify'),
  ('professional', 'professionals.schedule', 'modify_own'),
  
  -- Gerente
  ('manager', 'appointments.all', 'view'),
  ('manager', 'appointments.all', 'modify'),
  ('manager', 'payments.all', 'view'),
  ('manager', 'reports.operational', 'view'),
  ('manager', 'reports.financial', 'view'),
  ('manager', 'professionals', 'view'),
  ('manager', 'professionals.manage', 'modify'),
  ('manager', 'services', 'view'),
  ('manager', 'services.manage', 'modify'),
  ('manager', 'patients.all', 'view'),
  
  -- Administrador
  ('admin', 'appointments.all', 'full_access'),
  ('admin', 'payments.all', 'full_access'),
  ('admin', 'payments.refund', 'process'),
  ('admin', 'patients.all', 'full_access'),
  ('admin', 'professionals.manage', 'full_access'),
  ('admin', 'services.manage', 'full_access'),
  ('admin', 'services.pricing', 'modify'),
  ('admin', 'reports', 'full_access'),
  ('admin', 'settings.general', 'modify'),
  ('admin', 'notifications.send_all', 'execute'),
  
  -- Super Administrador (acceso total)
  ('super_admin', 'all', 'full_access'),
  ('super_admin', 'settings.users', 'full_access');

-- Función para verificar permisos
CREATE OR REPLACE FUNCTION has_permission(
  user_id uuid,
  resource text,
  action text
) RETURNS boolean AS $$
DECLARE
  user_role_var user_role;
BEGIN
  -- Obtener el rol del usuario
  SELECT role INTO user_role_var
  FROM profiles
  WHERE id = user_id;
  
  -- Super admin tiene acceso a todo
  IF user_role_var = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Verificar permiso específico
  RETURN EXISTS (
    SELECT 1 FROM permissions
    WHERE role = user_role_var
    AND (
      (permissions.resource = resource AND permissions.action = action)
      OR (permissions.resource = 'all' AND permissions.action = 'full_access')
      OR (permissions.resource = resource AND permissions.action = 'full_access')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar políticas RLS para appointments
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;

-- Política para ver citas
CREATE POLICY "View appointments based on role" ON appointments
FOR SELECT USING (
  -- Usuario puede ver sus propias citas
  auth.uid() = patient_id
  OR
  -- Profesional puede ver sus citas asignadas
  auth.uid() = professional_id
  OR
  -- Verificar permisos por rol
  has_permission(auth.uid(), 'appointments.all', 'view')
  OR
  has_permission(auth.uid(), 'appointments.all', 'full_access')
);

-- Política para crear citas
CREATE POLICY "Create appointments based on role" ON appointments
FOR INSERT WITH CHECK (
  -- Usuario puede crear sus propias citas
  auth.uid() = patient_id
  OR
  -- Verificar permisos para crear citas de otros
  has_permission(auth.uid(), 'appointments', 'create_any')
  OR
  has_permission(auth.uid(), 'appointments.all', 'full_access')
);

-- Política para actualizar citas
CREATE POLICY "Update appointments based on role" ON appointments
FOR UPDATE USING (
  -- Usuario puede actualizar sus propias citas
  auth.uid() = patient_id
  OR
  -- Profesional puede actualizar sus citas
  auth.uid() = professional_id
  OR
  -- Verificar permisos para modificar
  has_permission(auth.uid(), 'appointments.all', 'modify')
  OR
  has_permission(auth.uid(), 'appointments.all', 'full_access')
);

-- Actualizar políticas RLS para payments
DROP POLICY IF EXISTS "Users can view own payments" ON payments;

CREATE POLICY "View payments based on role" ON payments
FOR SELECT USING (
  -- Usuario puede ver sus propios pagos
  auth.uid() = user_id
  OR
  -- Verificar permisos por rol
  has_permission(auth.uid(), 'payments.all', 'view')
  OR
  has_permission(auth.uid(), 'payments.all', 'full_access')
);

-- Crear vista para permisos del usuario actual
CREATE OR REPLACE VIEW my_permissions AS
SELECT DISTINCT
  sr.name as resource,
  sr.description,
  p.action
FROM profiles prof
JOIN permissions p ON p.role = prof.role
JOIN system_resources sr ON sr.name = p.resource
WHERE prof.id = auth.uid();

-- Dar permisos de lectura a la vista
GRANT SELECT ON my_permissions TO authenticated;

-- Índices para mejorar rendimiento
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_permissions_role_resource ON permissions(role, resource);

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;