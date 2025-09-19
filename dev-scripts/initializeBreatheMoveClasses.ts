import { supabase } from '../lib/supabase';
import { seedBreatheMoveClasses } from './seedBreatheMoveClasses';
import { format, addDays } from 'date-fns';

/**
 * Initialize Breathe & Move classes on app startup
 * This ensures users always have classes available for the next 7 days
 */
export const initializeBreatheMoveClasses = async () => {
  try {
    console.log('=== INITIALIZING BREATHE & MOVE CLASSES ===');
    
    // Check if we have classes for today
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const { data: existingClasses, error } = await supabase
      .from('breathe_move_classes')
      .select('id')
      .eq('class_date', todayStr)
      .limit(1);
      
    if (error) {
      console.error('Error checking existing classes:', error);
      return;
    }
    
    // If no classes exist for today, seed the database
    if (!existingClasses || existingClasses.length === 0) {
      console.log('No classes found for today, seeding database...');
      
      const result = await seedBreatheMoveClasses();
      
      if (result.success) {
        console.log('Classes initialized successfully:', result.message);
      } else {
        console.error('Failed to initialize classes:', result.message);
      }
    } else {
      console.log('Classes already exist, skipping initialization');
      
      // Check if we need to add classes for future days
      const endDate = format(addDays(today, 6), 'yyyy-MM-dd');
      
      const { data: futureClasses, error: futureError } = await supabase
        .from('breathe_move_classes')
        .select('id')
        .eq('class_date', endDate)
        .limit(1);
        
      if (!futureError && (!futureClasses || futureClasses.length === 0)) {
        console.log('Missing classes for future days, refreshing...');
        const result = await seedBreatheMoveClasses();
        
        if (result.success) {
          console.log('Future classes added successfully');
        }
      }
    }
  } catch (error) {
    console.error('Error in initializeBreatheMoveClasses:', error);
  }
};