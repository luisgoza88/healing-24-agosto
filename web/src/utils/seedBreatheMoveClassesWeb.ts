import { supabase } from '@/src/lib/supabase';
import { format, addDays, getDay, getDaysInMonth } from 'date-fns';

// Importamos el horario oficial
const SEPTEMBER_2025_SCHEDULE = [
  // LUNES
  { id: 'mon-7am', className: 'FireRush', instructor: 'JENNY', time: '07:00', intensity: 'high', dayOfWeek: 1 },
  { id: 'mon-10am', className: 'StoneBarre', instructor: 'HELEN', time: '10:00', intensity: 'medium', dayOfWeek: 1 },
  { id: 'mon-5pm', className: 'OmRoot', instructor: 'KATA', time: '17:00', intensity: 'low', dayOfWeek: 1 },
  { id: 'mon-6pm', className: 'ForestFire', instructor: 'MANUELA', time: '18:00', intensity: 'medium', dayOfWeek: 1 },
  { id: 'mon-7pm', className: 'OmRoot', instructor: 'KATA', time: '19:00', intensity: 'low', dayOfWeek: 1 },

  // MARTES
  { id: 'tue-7am', className: 'BloomBeat', instructor: 'MAYTECK', time: '07:00', intensity: 'medium', dayOfWeek: 2 },
  { id: 'tue-10am', className: 'FireRush', instructor: 'SARA', time: '10:00', intensity: 'high', dayOfWeek: 2 },
  { id: 'tue-5pm', className: 'ForestFire', instructor: 'FERNANDA', time: '17:00', intensity: 'medium', dayOfWeek: 2 },
  { id: 'tue-6pm', className: 'FireRush', instructor: 'FERNANDA', time: '18:00', intensity: 'high', dayOfWeek: 2 },

  // MIÉRCOLES
  { id: 'wed-7am', className: 'ForestFire', instructor: 'KARO', time: '07:00', intensity: 'medium', dayOfWeek: 3 },
  { id: 'wed-10am', className: 'GutReboot', instructor: 'FERNANDA', time: '10:00', intensity: 'low', dayOfWeek: 3 },
  { id: 'wed-5pm', className: 'WindFlow', instructor: 'GOURA', time: '17:00', intensity: 'medium', dayOfWeek: 3 },
  { id: 'wed-6pm', className: 'GutReboot', instructor: 'MANUELA', time: '18:00', intensity: 'low', dayOfWeek: 3 },
  { id: 'wed-7pm', className: 'MoonRelief', instructor: 'MAYTECK', time: '19:00', intensity: 'low', dayOfWeek: 3 },

  // JUEVES
  { id: 'thu-7am', className: 'StoneBarre', instructor: 'JENNY', time: '07:00', intensity: 'medium', dayOfWeek: 4 },
  { id: 'thu-10am', className: 'FireRush', instructor: 'SARA', time: '10:00', intensity: 'high', dayOfWeek: 4 },
  { id: 'thu-5pm', className: 'WildPower', instructor: 'FERNANDA', time: '17:00', intensity: 'high', dayOfWeek: 4 },
  { id: 'thu-6pm', className: 'StoneBarre', instructor: 'FERNANDA', time: '18:00', intensity: 'medium', dayOfWeek: 4 },
  { id: 'thu-7pm', className: 'WaveMind', instructor: 'MAYTECK', time: '19:00', intensity: 'low', dayOfWeek: 4 },

  // VIERNES
  { id: 'fri-7am', className: 'GutReboot', instructor: 'CLARA', time: '07:00', intensity: 'low', dayOfWeek: 5 },
  { id: 'fri-10am', className: 'WindMove', instructor: 'SARA', time: '10:00', intensity: 'low', dayOfWeek: 5 },
  { id: 'fri-5pm', className: 'WindFlow', instructor: 'GOURA', time: '17:00', intensity: 'medium', dayOfWeek: 5 },
  { id: 'fri-6pm', className: 'WindFlow', instructor: 'GOURA', time: '18:00', intensity: 'medium', dayOfWeek: 5 },

  // SÁBADO
  { id: 'sat-10am', className: 'WildPower', instructor: 'CLARA', time: '10:00', intensity: 'high', dayOfWeek: 6 }
];

export const seedBreatheMoveClassesForMonth = async (year: number, month: number) => {
  try {
    console.log(`Seeding Breathe & Move classes for ${year}-${month}...`);
    
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = getDaysInMonth(firstDay);
    const classesToInsert: any[] = [];
    
    // Generar clases para todo el mes
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const dayOfWeek = getDay(currentDate);
      
      // Skip Sundays - no classes on Sundays
      if (dayOfWeek === 0) {
        console.log(`Skipping Sunday ${format(currentDate, 'yyyy-MM-dd')}`);
        continue;
      }
      
      // Find all classes for this day of week
      const classesForDay = SEPTEMBER_2025_SCHEDULE.filter(c => c.dayOfWeek === dayOfWeek);
      
      for (const classTemplate of classesForDay) {
        const [hours, minutes] = classTemplate.time.split(':').map(Number);
        
        // Calculate end time (50 minutes later)
        const endHours = minutes + 50 >= 60 ? hours + 1 : hours;
        const endMinutes = (minutes + 50) % 60;
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
        
        const classData = {
          class_name: classTemplate.className,
          class_date: format(currentDate, 'yyyy-MM-dd'),
          start_time: classTemplate.time + ':00',
          end_time: endTime + ':00',
          instructor: classTemplate.instructor,
          max_capacity: 12,
          current_capacity: 0,
          status: 'scheduled',
          intensity: classTemplate.intensity as 'low' | 'medium' | 'high'
        };
        
        classesToInsert.push(classData);
      }
    }
    
    // Check for existing classes to avoid duplicates
    const firstDate = format(firstDay, 'yyyy-MM-dd');
    const lastDate = format(new Date(year, month - 1, daysInMonth), 'yyyy-MM-dd');
    
    const { data: existingClasses, error: checkError } = await supabase
      .from('breathe_move_classes')
      .select('id, class_date, start_time, class_name')
      .gte('class_date', firstDate)
      .lte('class_date', lastDate);
    
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
      
      console.log(`Successfully inserted ${data?.length || 0} new classes for ${year}-${month}`);
      return { success: true, message: `Created ${data?.length || 0} new classes` };
    }
    
    return { success: true, message: 'No new classes to insert - all classes already exist' };
    
  } catch (error) {
    console.error('Error in seedBreatheMoveClassesForMonth:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Función específica para seedear septiembre 2025
export const seedSeptember2025 = async () => {
  return seedBreatheMoveClassesForMonth(2025, 9);
};