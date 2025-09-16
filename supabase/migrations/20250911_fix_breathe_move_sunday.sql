-- Migration: Fix Breathe & Move Sunday classes issue
-- Date: 2025-09-11
-- Description: Delete all Sunday classes and ensure they don't get created again

-- Delete ALL Sunday classes (past, present, and future)
DELETE FROM breathe_move_classes
WHERE EXTRACT(DOW FROM class_date::date) = 0;

-- Create a function to check if a date is Sunday
CREATE OR REPLACE FUNCTION is_sunday(check_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXTRACT(DOW FROM check_date) = 0;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to prevent Sunday classes from being inserted
CREATE OR REPLACE FUNCTION prevent_sunday_classes()
RETURNS TRIGGER AS $$
BEGIN
  IF is_sunday(NEW.class_date) THEN
    RAISE EXCEPTION 'Cannot create classes on Sundays';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS no_sunday_classes ON breathe_move_classes;
CREATE TRIGGER no_sunday_classes
  BEFORE INSERT OR UPDATE ON breathe_move_classes
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sunday_classes();

-- Verify no Sunday classes remain
DO $$
DECLARE
  sunday_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO sunday_count
  FROM breathe_move_classes
  WHERE EXTRACT(DOW FROM class_date::date) = 0;
  
  RAISE NOTICE 'Sunday classes remaining: %', sunday_count;
END$$;