import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface BreatheMoveClass {
  id: string;
  class_name: string;
  instructor: string;
  class_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_capacity: number;
  status: string;
  intensity: string;
}

// Hook para obtener clases del mes
export function useBreatheMoveClasses(currentMonth: Date) {
  const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['breathe-move-classes', start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .gte('class_date', start)
        .lte('class_date', end)
        .order('class_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('[useBreatheMoveClasses] Error:', error);
        throw error;
      }

      console.log(`[useBreatheMoveClasses] Clases obtenidas: ${data?.length || 0}`);

      // Filtrar clases de domingo
      return (data || []).filter(cls => {
        const date = new Date(cls.class_date + 'T00:00:00');
        return date.getDay() !== 0;
      });
    },
    staleTime: 5 * 60 * 1000, // Los datos son frescos por 5 minutos
    gcTime: 30 * 60 * 1000, // Mantener en caché por 30 minutos
  });
}

// Hook para eliminar clase
export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, className }: { id: string; className: string }) => {
      const confirmed = confirm(`¿Estás seguro de que deseas eliminar la clase ${className}?`);
      if (!confirmed) throw new Error('Cancelled');

      const { error } = await supabase
        .from('breathe_move_classes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidar todas las queries de clases para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ['breathe-move-classes'] });
      alert('Clase eliminada exitosamente');
    },
    onError: (error: any) => {
      if (error.message !== 'Cancelled') {
        alert('Error al eliminar la clase: ' + error.message);
      }
    },
  });
}

// Hook para actualizar clase
export function useUpdateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      // Calcular end_time
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const endHours = minutes + 50 >= 60 ? hours + 1 : hours;
      const endMinutes = (minutes + 50) % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;

      const { error } = await supabase
        .from('breathe_move_classes')
        .update({
          class_name: data.class_name,
          instructor: data.instructor,
          class_date: data.class_date,
          start_time: data.start_time + ':00',
          end_time: endTime,
          max_capacity: data.max_capacity,
          intensity: data.intensity,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breathe-move-classes'] });
      alert('Clase actualizada exitosamente');
    },
    onError: (error: any) => {
      alert('Error al actualizar la clase: ' + error.message);
    },
  });
}

// Hook para crear clase
export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      // Verificar que no sea domingo
      const selectedDate = new Date(data.class_date + 'T00:00:00');
      if (selectedDate.getDay() === 0) {
        throw new Error('No se pueden programar clases los domingos');
      }

      // Calcular end_time
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const endHours = minutes + 50 >= 60 ? hours + 1 : hours;
      const endMinutes = (minutes + 50) % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;

      const { error } = await supabase
        .from('breathe_move_classes')
        .insert({
          class_name: data.class_name,
          instructor: data.instructor,
          class_date: data.class_date,
          start_time: data.start_time + ':00',
          end_time: endTime,
          max_capacity: data.max_capacity,
          current_capacity: 0,
          intensity: data.intensity,
          status: data.status || 'scheduled',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breathe-move-classes'] });
      alert('Clase creada exitosamente');
    },
    onError: (error: any) => {
      alert('Error al crear la clase: ' + error.message);
    },
  });
}

// Prefetch de clases para el siguiente mes
export function usePrefetchNextMonth(currentMonth: Date) {
  const queryClient = useQueryClient();
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  const start = format(startOfMonth(nextMonth), 'yyyy-MM-dd');
  const end = format(endOfMonth(nextMonth), 'yyyy-MM-dd');

  return () => {
    queryClient.prefetchQuery({
      queryKey: ['breathe-move-classes', start, end],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('breathe_move_classes')
          .select('*')
          .gte('class_date', start)
          .lte('class_date', end)
          .order('class_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;
        return (data || []).filter(cls => {
          const date = new Date(cls.class_date + 'T00:00:00');
          return date.getDay() !== 0;
        });
      },
    });
  };
}