import { supabase } from '../lib/supabase';
import { seedBreatheMoveClasses } from './seedBreatheMoveClasses';

export const resetBreatheMoveClasses = async () => {
  try {
    console.log('=== RESETTING ALL BREATHE & MOVE CLASSES ===');
    
    // First, delete ALL future classes to start fresh
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { error: deleteError } = await supabase
      .from('breathe_move_classes')
      .delete()
      .gte('class_date', today.toISOString().split('T')[0]);
    
    if (deleteError) {
      console.error('Error deleting classes:', deleteError);
      return { success: false, message: deleteError.message };
    }
    
    console.log('All future classes deleted');
    
    // Now seed new classes
    const seedResult = await seedBreatheMoveClasses();
    
    return seedResult;
    
  } catch (error) {
    console.error('Error in resetBreatheMoveClasses:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};