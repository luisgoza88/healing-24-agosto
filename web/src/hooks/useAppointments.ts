import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient, useSupabase } from '../lib/supabase';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  service?: string;
  professional_id: string;
  professional_name: string;
  user_id: string;
  patient_name: string;
  patient_email: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no_show';
  notes?: string;
  total_amount: number;
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  created_at: string;
}

interface AppointmentFilters {
  searchTerm?: string;
  status?: string;
  date?: string;
  professional?: string;
  service?: string;
  dateRange?: number; // días hacia atrás
}

// Hook principal para obtener citas con filtros
export function useAppointments(filters: AppointmentFilters = {}) {
  const { dateRange = 30 } = filters;
  const supabase = useSupabase();

  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: async (): Promise<Appointment[]> => {
      // Si el rango es 9999, no aplicamos filtro de fecha para mostrar todas las citas
      const applyDateFilter = dateRange !== 9999;
      const dateLimit = applyDateFilter ? subDays(new Date(), dateRange).toISOString().split('T')[0] : null;

      let query = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          total_amount,
          payment_status,
          user_id,
          professional_id,
          service_id,
          created_at,
          notes,
          professionals ( id, full_name ),
          services ( id, name )
        `);

      // Solo aplicar filtro de fecha si no es "todas las citas"
      if (applyDateFilter && dateLimit) {
        query = query.gte('appointment_date', dateLimit);
      }

      query = query
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      // Aplicar filtros
      if (filters.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }

      if (filters.date) {
        query = query.eq('appointment_date', filters.date);
      }

      if (filters.professional) {
        query = query.eq('professional_id', filters.professional);
      }

      if (filters.service) {
        query = query.eq('service_id', filters.service);
      }

      // Eliminar el límite para obtener todas las citas
      const { data, error } = await query;

      if (error) throw error;

      console.log(`[useAppointments] Citas obtenidas: ${data?.length || 0}`, { 
        dateRange, 
        applyDateFilter,
        searchTerm: filters.searchTerm 
      });

      // Obtener información adicional para citas de Breathe & Move
      const breatheMoveAppointments = (data || []).filter((apt: any) => {
        const serviceName = (apt as any).services?.name;
        return serviceName === 'BritainMove' || serviceName === 'Breathe & Move';
      });

      let breatheMoveClassesMap = new Map();
      if (breatheMoveAppointments.length > 0) {
        // Obtener todas las clases de Breathe & Move para las fechas de las citas
        const uniqueDates = [...new Set(breatheMoveAppointments.map(apt => apt.appointment_date))];
        
        if (uniqueDates.length > 0) {
          const { data: allClasses } = await supabase
            .from('breathe_move_classes')
            .select('id, class_name, class_date, start_time, end_time')
            .in('class_date', uniqueDates);

          // Mapear cada cita con su clase correspondiente
          if (allClasses) {
            breatheMoveAppointments.forEach(apt => {
              const appointmentTime = apt.appointment_time.split(':').slice(0, 2).join(':'); // HH:MM
              
              const matchingClass = allClasses.find(cls => {
                if (cls.class_date !== apt.appointment_date) return false;
                
                const startTime = cls.start_time.split(':').slice(0, 2).join(':'); // HH:MM
                const endTime = cls.end_time.split(':').slice(0, 2).join(':'); // HH:MM
                
                // La cita debe estar dentro del horario de la clase
                return appointmentTime >= startTime && appointmentTime <= endTime;
              });

              if (matchingClass) {
                breatheMoveClassesMap.set(apt.id, matchingClass.class_name);
              }
            });
          }
        }
      }

      // Crear mapas para búsqueda rápida
      // Cargar perfiles en bloque (no hay FK declarada en PostgREST)
      const userIds = [...new Set((data || []).map(a => a.user_id).filter(Boolean))];
      let profilesMap = new Map<string, { id: string; full_name?: string; email?: string }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds as string[]);
        profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      }

      const formattedData = data?.map(apt => {
        const profile = profilesMap.get(apt.user_id);
        const professional = (apt as any).professionals;
        const service = (apt as any).services;
        const className = breatheMoveClassesMap.get(apt.id);

        // Formatear el nombre del servicio para Breathe & Move
        let serviceName = service?.name || 'Servicio general';
        if ((serviceName === 'BritainMove' || serviceName === 'Breathe & Move') && className) {
          serviceName = `B&M: ${className}`;
        }

        return {
          id: apt.id,
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          service: serviceName,
          professional_id: apt.professional_id,
          professional_name: professional?.full_name || 'No asignado',
          user_id: apt.user_id,
          patient_name: profile?.full_name || 'Paciente',
          patient_email: profile?.email || '',
          status: apt.status,
          notes: apt.notes,
          total_amount: apt.total_amount || 0,
          payment_status: apt.payment_status,
          created_at: apt.created_at
        };
      }) || [];

      // Aplicar búsqueda de texto del lado del cliente
      if (filters.searchTerm) {
        const search = filters.searchTerm.toLowerCase();
        return formattedData.filter(apt => 
          apt.patient_name.toLowerCase().includes(search) ||
          apt.patient_email.toLowerCase().includes(search) ||
          apt.professional_name.toLowerCase().includes(search) ||
          apt.service?.toLowerCase().includes(search) ||
          apt.notes?.toLowerCase().includes(search) ||
          apt.id.toLowerCase().includes(search)
        );
      }

      return formattedData;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos (optimizado)
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: false, // ✅ DESACTIVADO - solo refetch manual
    enabled: true,
    refetchOnWindowFocus: false
  });
}

// Hook para obtener servicios únicos para el filtro
export function useAppointmentServices() {
  return useQuery({
    queryKey: ['appointment-services'],
    queryFn: async (): Promise<Array<{ id: string; name: string }>> => {
      const supabase = useSupabase();
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name');

      if (error) throw error;

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

// Hook para crear cita
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentData: any) => {
      const supabase = useSupabase();
      const { error } = await supabase
        .from('appointments')
        .insert(appointmentData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      alert('Cita creada exitosamente');
    },
    onError: (error: any) => {
      alert('Error al crear la cita: ' + error.message);
    },
  });
}

// Hook para actualizar cita
export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const supabase = useSupabase();
      const { error } = await supabase
        .from('appointments')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      alert('Cita actualizada exitosamente');
    },
    onError: (error: any) => {
      alert('Error al actualizar la cita: ' + error.message);
    },
  });
}

// Hook para cancelar cita
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const supabase = useSupabase();
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      alert('Cita cancelada exitosamente');
    },
    onError: (error: any) => {
      alert('Error al cancelar la cita: ' + error.message);
    },
  });
}

// Hook para obtener profesionales
export function useProfessionals() {
  return useQuery({
    queryKey: ['professionals'],
    queryFn: async () => {
      const supabase = useSupabase();
      const { data, error } = await supabase
        .from('professionals')
        .select('id, full_name, specialties')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
}

// Hook para obtener servicios
export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const supabase = useSupabase();
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
}

// Hook para obtener estadísticas de citas
export function useAppointmentStats() {
  return useQuery({
    queryKey: ['appointment-stats'],
    queryFn: async () => {
      const supabase = useSupabase();
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const [todayCount, tomorrowCount, pendingCount, completedToday] = await Promise.all([
        // Citas hoy
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('appointment_date', today)
          .neq('status', 'cancelled'),

        // Citas mañana
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('appointment_date', tomorrowStr)
          .neq('status', 'cancelled'),

        // Citas pendientes
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),

        // Citas completadas hoy
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('appointment_date', today)
          .eq('status', 'completed'),
      ]);

      return {
        today: todayCount.count || 0,
        tomorrow: tomorrowCount.count || 0,
        pending: pendingCount.count || 0,
        completedToday: completedToday.count || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos para stats
    refetchInterval: false, // ✅ DESACTIVADO
    refetchOnWindowFocus: false
  });
}