-- Agregar restricciones y funciones para el sistema de clases Breathe & Move

-- Función para verificar si un usuario ya tiene una clase en el día
CREATE OR REPLACE FUNCTION check_one_class_per_day()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
  class_date DATE;
BEGIN
  -- Solo aplicar para inscripciones nuevas o confirmadas
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- Obtener la fecha de la clase
  SELECT DATE(c.class_date) INTO class_date
  FROM breathe_move_classes c
  WHERE c.id = NEW.class_id;

  -- Contar clases existentes del usuario en ese día
  SELECT COUNT(*) INTO existing_count
  FROM breathe_move_enrollments e
  JOIN breathe_move_classes c ON e.class_id = c.id
  WHERE e.user_id = NEW.user_id
    AND e.status = 'confirmed'
    AND DATE(c.class_date) = class_date
    AND e.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');

  IF existing_count > 0 THEN
    RAISE EXCEPTION 'Solo puedes inscribirte a una clase por día';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar una clase por día
CREATE TRIGGER enforce_one_class_per_day
BEFORE INSERT OR UPDATE ON breathe_move_enrollments
FOR EACH ROW
EXECUTE FUNCTION check_one_class_per_day();

-- Función para verificar cancelación con 2 horas de anticipación
CREATE OR REPLACE FUNCTION check_cancellation_time()
RETURNS TRIGGER AS $$
DECLARE
  class_datetime TIMESTAMP;
  hours_before INTERVAL;
BEGIN
  -- Solo verificar cuando se cambia a estado cancelado
  IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    -- Obtener fecha y hora de la clase
    SELECT c.class_date + c.start_time INTO class_datetime
    FROM breathe_move_classes c
    WHERE c.id = NEW.class_id;

    -- Calcular diferencia de horas
    hours_before := class_datetime - NOW();

    IF hours_before < INTERVAL '2 hours' THEN
      RAISE EXCEPTION 'Las cancelaciones deben hacerse con al menos 2 horas de anticipación';
    END IF;

    -- Marcar hora de cancelación
    NEW.cancelled_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar tiempo de cancelación
CREATE TRIGGER enforce_cancellation_time
BEFORE UPDATE ON breathe_move_enrollments
FOR EACH ROW
EXECUTE FUNCTION check_cancellation_time();

-- Función para restaurar clase a un paquete cuando se cancela
CREATE OR REPLACE FUNCTION restore_package_class()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la inscripción usó un paquete y se está cancelando
  IF OLD.package_id IS NOT NULL AND NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    -- Devolver la clase al paquete
    UPDATE breathe_move_packages
    SET classes_remaining = classes_remaining + 1
    WHERE id = OLD.package_id
      AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para restaurar clases en cancelaciones
CREATE TRIGGER restore_class_on_cancellation
AFTER UPDATE ON breathe_move_enrollments
FOR EACH ROW
EXECUTE FUNCTION restore_package_class();

-- Función actualizada para manejar capacidad de clases (corrige el trigger anterior)
DROP TRIGGER IF EXISTS update_class_capacity_trigger ON breathe_move_enrollments;
DROP FUNCTION IF EXISTS update_class_capacity();

CREATE OR REPLACE FUNCTION update_class_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    -- Incrementar capacidad actual
    UPDATE breathe_move_classes 
    SET current_capacity = current_capacity + 1,
        updated_at = NOW()
    WHERE id = NEW.class_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Si se cancela una inscripción
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
      UPDATE breathe_move_classes 
      SET current_capacity = GREATEST(current_capacity - 1, 0),
          updated_at = NOW()
      WHERE id = NEW.class_id;
    -- Si se confirma una inscripción que no estaba confirmada
    ELSIF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
      UPDATE breathe_move_classes 
      SET current_capacity = current_capacity + 1,
          updated_at = NOW()
      WHERE id = NEW.class_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    -- Decrementar capacidad actual
    UPDATE breathe_move_classes 
    SET current_capacity = GREATEST(current_capacity - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.class_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_capacity_trigger
AFTER INSERT OR UPDATE OR DELETE ON breathe_move_enrollments
FOR EACH ROW
EXECUTE FUNCTION update_class_capacity();

-- Índices adicionales para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_breathe_move_enrollments_user_date 
ON breathe_move_enrollments(user_id, status);

CREATE INDEX IF NOT EXISTS idx_breathe_move_classes_datetime 
ON breathe_move_classes(class_date, start_time);

-- Función para verificar si un paquete está activo y tiene clases
CREATE OR REPLACE FUNCTION is_package_valid(package_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN;
BEGIN
  SELECT 
    CASE 
      WHEN p.status = 'active' 
        AND p.classes_remaining > 0 
        AND p.expires_at > NOW() 
      THEN true 
      ELSE false 
    END INTO is_valid
  FROM breathe_move_packages p
  WHERE p.id = package_id;
  
  RETURN COALESCE(is_valid, false);
END;
$$ LANGUAGE plpgsql;

-- Función RPC para obtener clases disponibles para un usuario en una fecha
CREATE OR REPLACE FUNCTION get_available_classes_for_date(
  p_user_id UUID,
  p_date DATE
)
RETURNS TABLE (
  id UUID,
  class_name VARCHAR,
  instructor VARCHAR,
  start_time TIME,
  end_time TIME,
  available_spots INTEGER,
  is_enrolled BOOLEAN,
  can_enroll BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.class_name,
    c.instructor,
    c.start_time,
    c.end_time,
    (c.max_capacity - c.current_capacity) as available_spots,
    EXISTS(
      SELECT 1 FROM breathe_move_enrollments e 
      WHERE e.class_id = c.id 
        AND e.user_id = p_user_id 
        AND e.status = 'confirmed'
    ) as is_enrolled,
    NOT EXISTS(
      SELECT 1 FROM breathe_move_enrollments e2
      JOIN breathe_move_classes c2 ON e2.class_id = c2.id
      WHERE e2.user_id = p_user_id 
        AND e2.status = 'confirmed'
        AND DATE(c2.class_date) = p_date
    ) as can_enroll
  FROM breathe_move_classes c
  WHERE DATE(c.class_date) = p_date
    AND c.status = 'scheduled'
    AND c.current_capacity < c.max_capacity
  ORDER BY c.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;