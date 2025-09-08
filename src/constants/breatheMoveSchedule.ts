export interface ScheduleClass {
  id: string;
  className: string;
  instructor: string;
  time: string;
  intensity: 'low' | 'medium' | 'high';
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, etc.
}

export const SEPTEMBER_2025_SCHEDULE: ScheduleClass[] = [
  // LUNES
  { id: 'mon-6am', className: 'StoneBarre', instructor: 'JENNY', time: '06:00', intensity: 'medium', dayOfWeek: 1 },
  { id: 'mon-7am', className: 'FireRush', instructor: 'JENNY', time: '07:00', intensity: 'high', dayOfWeek: 1 },
  { id: 'mon-8am', className: 'WildPower', instructor: 'CLARA', time: '08:00', intensity: 'high', dayOfWeek: 1 },
  { id: 'mon-9am', className: 'HazeRocket', instructor: 'HELEN', time: '09:00', intensity: 'high', dayOfWeek: 1 },
  { id: 'mon-10am', className: 'StoneBarre', instructor: 'HELEN', time: '10:00', intensity: 'medium', dayOfWeek: 1 },
  { id: 'mon-5pm', className: 'OmRoot', instructor: 'KATA', time: '17:00', intensity: 'low', dayOfWeek: 1 },
  { id: 'mon-6pm', className: 'ForestFire', instructor: 'MANUELA', time: '18:00', intensity: 'medium', dayOfWeek: 1 },
  { id: 'mon-7pm', className: 'OmRoot', instructor: 'KATA', time: '19:00', intensity: 'low', dayOfWeek: 1 },

  // MARTES
  { id: 'tue-6am', className: 'WildPower', instructor: 'FERNANDA', time: '06:00', intensity: 'high', dayOfWeek: 2 },
  { id: 'tue-7am', className: 'BloomBeat', instructor: 'MAYTECK', time: '07:00', intensity: 'medium', dayOfWeek: 2 },
  { id: 'tue-8am', className: 'FireRush', instructor: 'FERNANDA', time: '08:00', intensity: 'high', dayOfWeek: 2 },
  { id: 'tue-9am', className: 'GutReboot', instructor: 'FERNANDA', time: '09:00', intensity: 'low', dayOfWeek: 2 },
  { id: 'tue-10am', className: 'FireRush', instructor: 'SARA', time: '10:00', intensity: 'high', dayOfWeek: 2 },
  { id: 'tue-5pm', className: 'ForestFire', instructor: 'FERNANDA', time: '17:00', intensity: 'medium', dayOfWeek: 2 },
  { id: 'tue-6pm', className: 'FireRush', instructor: 'FERNANDA', time: '18:00', intensity: 'high', dayOfWeek: 2 },

  // MIÉRCOLES
  { id: 'wed-6am', className: 'ForestFire', instructor: 'KARO', time: '06:00', intensity: 'medium', dayOfWeek: 3 },
  { id: 'wed-7am', className: 'ForestFire', instructor: 'KARO', time: '07:00', intensity: 'medium', dayOfWeek: 3 },
  { id: 'wed-8am', className: 'WindFlow', instructor: 'GOURA', time: '08:00', intensity: 'medium', dayOfWeek: 3 },
  { id: 'wed-9am', className: 'ForestFire', instructor: 'FERNANDA', time: '09:00', intensity: 'medium', dayOfWeek: 3 },
  { id: 'wed-10am', className: 'GutReboot', instructor: 'FERNANDA', time: '10:00', intensity: 'low', dayOfWeek: 3 },
  { id: 'wed-5pm', className: 'WindFlow', instructor: 'GOURA', time: '17:00', intensity: 'medium', dayOfWeek: 3 },
  { id: 'wed-6pm', className: 'GutReboot', instructor: 'MANUELA', time: '18:00', intensity: 'low', dayOfWeek: 3 },
  { id: 'wed-7pm', className: 'MoonRelief', instructor: 'MAYTECK', time: '19:00', intensity: 'low', dayOfWeek: 3 },

  // JUEVES
  { id: 'thu-6am', className: 'StoneBarre', instructor: 'KARO', time: '06:00', intensity: 'medium', dayOfWeek: 4 },
  { id: 'thu-7am', className: 'StoneBarre', instructor: 'JENNY', time: '07:00', intensity: 'medium', dayOfWeek: 4 },
  { id: 'thu-8am', className: 'GutReboot', instructor: 'FERNANDA', time: '08:00', intensity: 'low', dayOfWeek: 4 },
  { id: 'thu-9am', className: 'WildPower', instructor: 'FERNANDA', time: '09:00', intensity: 'high', dayOfWeek: 4 },
  { id: 'thu-10am', className: 'FireRush', instructor: 'SARA', time: '10:00', intensity: 'high', dayOfWeek: 4 },
  { id: 'thu-11am', className: 'StoneBarre', instructor: 'SARA', time: '11:00', intensity: 'medium', dayOfWeek: 4 },
  { id: 'thu-5pm', className: 'WildPower', instructor: 'FERNANDA', time: '17:00', intensity: 'high', dayOfWeek: 4 },
  { id: 'thu-6pm', className: 'StoneBarre', instructor: 'FERNANDA', time: '18:00', intensity: 'medium', dayOfWeek: 4 },
  { id: 'thu-7pm', className: 'WaveMind', instructor: 'MAYTECK', time: '19:00', intensity: 'low', dayOfWeek: 4 },

  // VIERNES
  { id: 'fri-6am', className: 'FireRush', instructor: 'JENNY', time: '06:00', intensity: 'high', dayOfWeek: 5 },
  { id: 'fri-7am', className: 'GutReboot', instructor: 'CLARA', time: '07:00', intensity: 'low', dayOfWeek: 5 },
  { id: 'fri-8am', className: 'ForestFire', instructor: 'CLARA', time: '08:00', intensity: 'medium', dayOfWeek: 5 },
  { id: 'fri-9am', className: 'FireRush', instructor: 'FERNANDA', time: '09:00', intensity: 'high', dayOfWeek: 5 },
  { id: 'fri-10am', className: 'WindMove', instructor: 'SARA', time: '10:00', intensity: 'low', dayOfWeek: 5 },
  { id: 'fri-5pm', className: 'WindFlow', instructor: 'GOURA', time: '17:00', intensity: 'medium', dayOfWeek: 5 },
  { id: 'fri-6pm', className: 'WindFlow', instructor: 'GOURA', time: '18:00', intensity: 'medium', dayOfWeek: 5 },

  // SÁBADO
  { id: 'sat-8am', className: 'StoneBarre', instructor: 'KARO', time: '08:00', intensity: 'medium', dayOfWeek: 6 },
  { id: 'sat-9am', className: 'WindFlow', instructor: 'GOURA', time: '09:00', intensity: 'medium', dayOfWeek: 6 },
  { id: 'sat-10am', className: 'WildPower', instructor: 'CLARA', time: '10:00', intensity: 'high', dayOfWeek: 6 },
  { id: 'sat-11am', className: 'FireRush', instructor: 'CLARA', time: '11:00', intensity: 'high', dayOfWeek: 6 }
];

// Nota: WaveMind aparece en el horario pero no está en la lista original de clases
// Podría ser una variación de otra clase o una clase especial

export const INSTRUCTORS = [
  'JENNY', 'FERNANDA', 'KARO', 'CLARA', 'HELEN', 
  'SARA', 'KATA', 'MANUELA', 'MAYTECK', 'GOURA'
];

export const getClassesByDay = (dayOfWeek: number) => {
  return SEPTEMBER_2025_SCHEDULE.filter(c => c.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.time.localeCompare(b.time));
};

export const getClassesByInstructor = (instructor: string) => {
  return SEPTEMBER_2025_SCHEDULE.filter(c => 
    c.instructor.toUpperCase() === instructor.toUpperCase()
  );
};

export const getClassesByType = (className: string) => {
  return SEPTEMBER_2025_SCHEDULE.filter(c => 
    c.className === className
  );
};