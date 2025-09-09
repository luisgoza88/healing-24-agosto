import { supabase } from '../lib/supabase';
import { format, addDays } from 'date-fns';
import { seedBreatheMoveClasses } from './seedBreatheMoveClasses';

export const forceSeedClasses = async () => {
  try {
    console.log('=== FORCE SEEDING BREATHE & MOVE CLASSES ===');
    
    // First, clear all existing classes for the next 7 days
    const today = new Date();
    const { error: deleteError } = await supabase
      .from('breathe_move_classes')
      .delete()
      .gte('class_date', format(today, 'yyyy-MM-dd'))
      .lte('class_date', format(addDays(today, 7), 'yyyy-MM-dd'));
    
    if (deleteError) {
      console.error('Error clearing classes:', deleteError);
    }
    
    // Now seed new classes
    const result = await seedBreatheMoveClasses();
    console.log('Seed result:', result);
    
    // Verify classes were created
    const { data: newClasses, error: fetchError } = await supabase
      .from('breathe_move_classes')
      .select('*')
      .order('class_date')
      .limit(10);
    
    console.log('New classes created:', newClasses?.length || 0);
    if (newClasses && newClasses.length > 0) {
      console.log('First class:', newClasses[0]);
    }
    
    return result;
  } catch (error) {
    console.error('Force seed error:', error);
    throw error;
  }
};