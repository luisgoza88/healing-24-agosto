-- Fix RLS policies for breathe_move_classes table
-- This allows authenticated users to perform all operations

-- First, drop existing policies
DROP POLICY IF EXISTS "Anyone can view breathe move classes" ON breathe_move_classes;
DROP POLICY IF EXISTS "Authenticated users can insert classes" ON breathe_move_classes;
DROP POLICY IF EXISTS "Authenticated users can update classes" ON breathe_move_classes;

-- Create new policies
-- Allow anyone to view classes
CREATE POLICY "Anyone can view breathe move classes" 
ON breathe_move_classes 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert classes
CREATE POLICY "Authenticated users can insert classes" 
ON breathe_move_classes 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update classes
CREATE POLICY "Authenticated users can update classes" 
ON breathe_move_classes 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete classes
CREATE POLICY "Authenticated users can delete classes" 
ON breathe_move_classes 
FOR DELETE 
USING (auth.uid() IS NOT NULL);