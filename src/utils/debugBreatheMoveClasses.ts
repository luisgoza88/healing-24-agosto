import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { seedBreatheMoveClasses } from './seedBreatheMoveClasses';

export const debugBreatheMoveClasses = async () => {
  try {
    console.log('=== DEBUG BREATHE & MOVE CLASSES ===');
    
    // Check current date
    const today = new Date();
    console.log('Current date:', format(today, 'yyyy-MM-dd'));
    
    // Check if there are any classes in the database
    const { data: allClasses, error: allError } = await supabase
      .from('breathe_move_classes')
      .select('*')
      .order('class_date', { ascending: true })
      .limit(10);
    
    console.log('All classes in DB:', allClasses);
    console.log('Error:', allError);
    
    // Check classes for today
    const { data: todayClasses, error: todayError } = await supabase
      .from('breathe_move_classes')
      .select('*')
      .eq('class_date', format(today, 'yyyy-MM-dd'));
    
    console.log('Classes for today:', todayClasses);
    console.log('Today error:', todayError);
    
    if (!allClasses || allClasses.length === 0) {
      console.log('No classes found, seeding database...');
      const result = await seedBreatheMoveClasses();
      console.log('Seed result:', result);
    }
    
    return { allClasses, todayClasses };
  } catch (error) {
    console.error('Debug error:', error);
    throw error;
  }
};