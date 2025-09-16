import { useQuery } from '@tanstack/react-query';
import { createClient } from '../lib/supabase';

const supabase = createClient();

// Hook para obtener profesionales
export function useProfessionals() {
  return useQuery({
    queryKey: ['professionals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('active', true)
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

// Hook para obtener servicios
export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook para obtener pacientes
export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook para obtener horarios disponibles
export function useAvailableSlots(professionalId: string, date: string) {
  return useQuery({
    queryKey: ['available-slots', professionalId, date],
    queryFn: async () => {
      if (!professionalId || !date) return [];

      // Obtener el día de la semana
      const dayOfWeek = new Date(date).getDay();

      // Obtener horario del profesional
      const { data: schedule } = await supabase
        .from('professional_availability')
        .select('start_time, end_time')
        .eq('professional_id', professionalId)
        .eq('day_of_week', dayOfWeek)
        .single();

      if (!schedule) return [];

      // Obtener citas existentes
      const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_time, duration')
        .eq('professional_id', professionalId)
        .eq('appointment_date', date)
        .neq('status', 'cancelled');

      // Generar slots disponibles
      const slots = [];
      const startTime = timeToMinutes(schedule.start_time);
      const endTime = timeToMinutes(schedule.end_time);
      const interval = 30; // intervalos de 30 minutos

      for (let time = startTime; time <= endTime - 60; time += interval) {
        const timeStr = minutesToTime(time);
        const isAvailable = !appointments?.some(apt => {
          const aptStart = timeToMinutes(apt.appointment_time);
          const aptEnd = aptStart + (apt.duration || 60);
          return time >= aptStart && time < aptEnd;
        });

        if (isAvailable) {
          slots.push(timeStr);
        }
      }

      return slots;
    },
    enabled: !!professionalId && !!date,
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 60 * 1000,
  });
}

// Funciones auxiliares
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}