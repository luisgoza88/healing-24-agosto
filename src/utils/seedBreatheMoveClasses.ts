import { supabase } from '../lib/supabase';
import { format, addDays, setHours, setMinutes } from 'date-fns';

// Class schedule template with instructor names
const INSTRUCTORS = {
  'María García': 'instructor-1',
  'Ana Martínez': 'instructor-2',
  'Carolina López': 'instructor-3',
  'Sofía Rodríguez': 'instructor-4',
  'Valentina Gómez': 'instructor-5'
};

const WEEKLY_SCHEDULE = [
  // Lunes
  { dayOfWeek: 1, className: 'WildPower', time: '07:00', instructor: 'María García', spots: 12 },
  { dayOfWeek: 1, className: 'GutReboot', time: '09:00', instructor: 'Ana Martínez', spots: 12 },
  { dayOfWeek: 1, className: 'FireRush', time: '17:00', instructor: 'Carolina López', spots: 12 },
  { dayOfWeek: 1, className: 'BloomBeat', time: '18:30', instructor: 'Sofía Rodríguez', spots: 12 },
  
  // Martes
  { dayOfWeek: 2, className: 'WindMove', time: '07:00', instructor: 'Valentina Gómez', spots: 12 },
  { dayOfWeek: 2, className: 'ForestFire', time: '10:00', instructor: 'María García', spots: 12 },
  { dayOfWeek: 2, className: 'StoneBarre', time: '17:30', instructor: 'Ana Martínez', spots: 12 },
  { dayOfWeek: 2, className: 'OmRoot', time: '19:00', instructor: 'Carolina López', spots: 12 },
  
  // Miércoles
  { dayOfWeek: 3, className: 'HazeRocket', time: '06:30', instructor: 'Sofía Rodríguez', spots: 12 },
  { dayOfWeek: 3, className: 'WildPower', time: '09:00', instructor: 'Valentina Gómez', spots: 12 },
  { dayOfWeek: 3, className: 'MoonRelief', time: '12:00', instructor: 'María García', spots: 12 },
  { dayOfWeek: 3, className: 'WindFlow', time: '18:00', instructor: 'Ana Martínez', spots: 12 },
  
  // Jueves
  { dayOfWeek: 4, className: 'FireRush', time: '07:00', instructor: 'Carolina López', spots: 12 },
  { dayOfWeek: 4, className: 'BloomBeat', time: '10:00', instructor: 'Sofía Rodríguez', spots: 12 },
  { dayOfWeek: 4, className: 'ForestFire', time: '17:00', instructor: 'Valentina Gómez', spots: 12 },
  { dayOfWeek: 4, className: 'GutReboot', time: '19:00', instructor: 'María García', spots: 12 },
  
  // Viernes
  { dayOfWeek: 5, className: 'WildPower', time: '07:00', instructor: 'Ana Martínez', spots: 12 },
  { dayOfWeek: 5, className: 'WindMove', time: '09:00', instructor: 'Carolina López', spots: 12 },
  { dayOfWeek: 5, className: 'StoneBarre', time: '17:30', instructor: 'Sofía Rodríguez', spots: 12 },
  { dayOfWeek: 5, className: 'MoonRelief', time: '19:00', instructor: 'Valentina Gómez', spots: 12 },
  
  // Sábado
  { dayOfWeek: 6, className: 'HazeRocket', time: '08:00', instructor: 'María García', spots: 12 },
  { dayOfWeek: 6, className: 'BloomBeat', time: '10:00', instructor: 'Ana Martínez', spots: 12 },
  { dayOfWeek: 6, className: 'WindFlow', time: '11:30', instructor: 'Carolina López', spots: 12 },
  
  // Domingo
  { dayOfWeek: 0, className: 'OmRoot', time: '09:00', instructor: 'Sofía Rodríguez', spots: 12 },
  { dayOfWeek: 0, className: 'ForestFire', time: '10:30', instructor: 'Valentina Gómez', spots: 12 },
  { dayOfWeek: 0, className: 'MoonRelief', time: '17:00', instructor: 'María García', spots: 12 },
];

export const seedBreatheMoveClasses = async () => {
  try {
    console.log('Starting to seed Breathe & Move classes...');
    
    // Get current date
    const today = new Date();
    const classesToInsert = [];
    
    // Generate classes for the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = addDays(today, dayOffset);
      const dayOfWeek = currentDate.getDay();
      
      // Find all classes for this day of week
      const classesForDay = WEEKLY_SCHEDULE.filter(c => c.dayOfWeek === dayOfWeek);
      
      for (const classTemplate of classesForDay) {
        const [hours, minutes] = classTemplate.time.split(':').map(Number);
        const classDateTime = setMinutes(setHours(currentDate, hours), minutes);
        
        // Skip if class time has already passed today
        if (dayOffset === 0 && classDateTime < new Date()) {
          continue;
        }
        
        // Calculate end time (50 minutes later)
        const endHours = minutes + 50 >= 60 ? hours + 1 : hours;
        const endMinutes = (minutes + 50) % 60;
        
        classesToInsert.push({
          class_name: classTemplate.className,
          class_date: format(currentDate, 'yyyy-MM-dd'),
          start_time: classTemplate.time,
          end_time: format(new Date(2000, 0, 1, endHours, endMinutes), 'HH:mm'), // 50 min classes
          instructor: classTemplate.instructor,
          max_capacity: classTemplate.spots,
          current_capacity: 0,
          status: 'scheduled',
          intensity: classTemplate.className === 'WildPower' || classTemplate.className === 'FireRush' || classTemplate.className === 'HazeRocket' ? 'high' :
                     classTemplate.className === 'GutReboot' || classTemplate.className === 'WindMove' || classTemplate.className === 'OmRoot' || classTemplate.className === 'MoonRelief' ? 'low' : 'medium'
        });
      }
    }
    
    // Delete old classes (older than today) first
    const { error: deleteError } = await supabase
      .from('breathe_move_classes')
      .delete()
      .lt('class_date', format(today, 'yyyy-MM-dd'));
    
    if (deleteError) {
      console.error('Error deleting old classes:', deleteError);
    }
    
    // Insert new classes
    if (classesToInsert.length > 0) {
      const { data, error } = await supabase
        .from('breathe_move_classes')
        .insert(classesToInsert)
        .select();
      
      if (error) {
        console.error('Error inserting classes:', error);
        return { success: false, message: error.message };
      }
      
      console.log(`Successfully inserted ${data?.length || 0} classes`);
      return { success: true, message: `Created ${data?.length || 0} classes for the next 7 days` };
    }
    
    return { success: true, message: 'No new classes to insert' };
    
  } catch (error) {
    console.error('Error in seedBreatheMoveClasses:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};