-- Fix the one class per day validation to consider cancelled appointments

-- First drop the existing trigger and function
DROP TRIGGER IF EXISTS enforce_one_class_per_day ON breathe_move_enrollments;
DROP FUNCTION IF EXISTS check_one_class_per_day();

-- Create updated function that checks both enrollments and appointments
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

  -- Contar clases existentes del usuario en ese día en enrollments
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

  -- También verificar en appointments table (excluyendo las canceladas)
  SELECT COUNT(*) INTO existing_count
  FROM appointments a
  WHERE a.user_id = NEW.user_id
    AND DATE(a.appointment_date) = class_date
    AND a.status != 'cancelled'
    AND a.notes LIKE 'Breathe & Move%';

  IF existing_count > 0 THEN
    RAISE EXCEPTION 'Solo puedes inscribirte a una clase por día';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER enforce_one_class_per_day
BEFORE INSERT OR UPDATE ON breathe_move_enrollments
FOR EACH ROW
EXECUTE FUNCTION check_one_class_per_day();