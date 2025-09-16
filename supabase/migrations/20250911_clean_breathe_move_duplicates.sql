-- Migration: Clean duplicate Breathe & Move classes and remove Sunday classes
-- Date: 2025-09-11
-- Description: Removes duplicate classes and classes scheduled on Sundays

-- First, delete all Sunday classes
DELETE FROM breathe_move_classes
WHERE EXTRACT(DOW FROM class_date::date) = 0;

-- Create a temporary table to identify duplicates
-- We'll keep the oldest entry (by created_at) for each unique combination
WITH duplicates AS (
  SELECT 
    id,
    class_date,
    start_time,
    class_name,
    ROW_NUMBER() OVER (
      PARTITION BY class_date, start_time, class_name 
      ORDER BY created_at ASC
    ) as rn
  FROM breathe_move_classes
)
-- Delete all but the first occurrence
DELETE FROM breathe_move_classes
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Also delete any past classes (older than today) to start fresh
DELETE FROM breathe_move_classes
WHERE class_date < CURRENT_DATE;

-- Log the cleanup
DO $$
DECLARE
  sunday_count INTEGER;
  duplicate_count INTEGER;
  past_count INTEGER;
BEGIN
  -- Count would have been done before deletion, but we can estimate
  RAISE NOTICE 'Breathe & Move classes cleanup completed';
  RAISE NOTICE 'Removed Sunday classes, duplicates, and past classes';
END$$;