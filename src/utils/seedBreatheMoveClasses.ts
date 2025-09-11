import { supabase } from '../lib/supabase';
import { format, addDays, getDay } from 'date-fns';
import { SEPTEMBER_2025_SCHEDULE } from '../constants/breatheMoveSchedule';

export const seedBreatheMoveClasses = async () => {
  try {
    console.log('Starting to seed Breathe & Move classes...');
    
    // Get current date
    const today = new Date();
    const classesToInsert = [];
    
    // Generate classes for the next 30 days
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const currentDate = addDays(today, dayOffset);
      const dayOfWeek = getDay(currentDate);
      
      // Skip Sundays - no classes on Sundays
      if (dayOfWeek === 0) {
        continue;
      }
      
      // Find all classes for this day of week from the official schedule
      const classesForDay = SEPTEMBER_2025_SCHEDULE.filter(c => c.dayOfWeek === dayOfWeek);
      
      for (const classTemplate of classesForDay) {
        const [hours, minutes] = classTemplate.time.split(':').map(Number);
        const classDateTime = new Date(currentDate);
        classDateTime.setHours(hours, minutes, 0, 0);
        
        // Skip if class time has already passed today
        if (dayOffset === 0 && classDateTime < new Date()) {
          continue;
        }
        
        // Calculate end time (50 minutes later)
        const endHours = minutes + 50 >= 60 ? hours + 1 : hours;
        const endMinutes = (minutes + 50) % 60;
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
        
        classesToInsert.push({
          class_name: classTemplate.className,
          class_date: format(currentDate, 'yyyy-MM-dd'),
          start_time: classTemplate.time + ':00',
          end_time: endTime + ':00',
          instructor: classTemplate.instructor,
          max_capacity: 12,
          current_capacity: 0,
          status: 'scheduled',
          intensity: classTemplate.intensity
        });
      }
    }
    
    // First, check if there are already classes to avoid duplicates
    const { data: existingClasses, error: checkError } = await supabase
      .from('breathe_move_classes')
      .select('id, class_date, start_time, class_name')
      .gte('class_date', format(today, 'yyyy-MM-dd'));
    
    if (checkError) {
      console.error('Error checking existing classes:', checkError);
      return { success: false, message: checkError.message };
    }
    
    // Filter out duplicates
    const existingClassKeys = new Set(
      (existingClasses || []).map(c => `${c.class_date}_${c.start_time}_${c.class_name}`)
    );
    
    const newClasses = classesToInsert.filter(c => 
      !existingClassKeys.has(`${c.class_date}_${c.start_time}_${c.class_name}`)
    );
    
    // Insert only new classes
    if (newClasses.length > 0) {
      const { data, error } = await supabase
        .from('breathe_move_classes')
        .insert(newClasses)
        .select();
      
      if (error) {
        console.error('Error inserting classes:', error);
        return { success: false, message: error.message };
      }
      
      console.log(`Successfully inserted ${data?.length || 0} new classes`);
      return { success: true, message: `Created ${data?.length || 0} new classes` };
    }
    
    return { success: true, message: 'No new classes to insert - all classes already exist' };
    
  } catch (error) {
    console.error('Error in seedBreatheMoveClasses:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};