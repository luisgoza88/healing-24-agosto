import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { startOfMonth } from 'date-fns';

interface DashboardStats {
  todayAppointments: number;
  totalPatients: number;
  todayRevenue: number;
  monthlyRevenue: number;
}

interface TodayAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  patient_name: string;
  professional_name: string;
  service?: string;
  status: string;
}

interface RecentActivity {
  id: string;
  type: 'appointment' | 'payment' | 'patient';
  description: string;
  timestamp: string;
}

// Hook principal para estadísticas del dashboard
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = startOfMonth(new Date()).toISOString().split('T')[0];

      console.log('[useDashboardStats] Iniciando consultas...');
      
      // Ejecutar todas las consultas en paralelo
      const [todayAppointments, totalPatients, todayPayments, monthPayments] = await Promise.all([
        // Citas de hoy
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('appointment_date', today),

        // Total de pacientes
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),

        // Ingresos del día
        supabase
          .from('payments')
          .select('amount')
          .gte('created_at', today + 'T00:00:00')
          .lte('created_at', today + 'T23:59:59')
          .eq('status', 'completed'),

        // Ingresos del mes
        supabase
          .from('payments')
          .select('amount')
          .gte('created_at', firstDayOfMonth + 'T00:00:00')
          .eq('status', 'completed'),
      ]);

      // Obtener citas no canceladas para contar correctamente
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('status')
        .eq('appointment_date', today);
      
      const nonCancelledCount = appointmentsData?.filter(a => a.status !== 'cancelled').length || 0;

      const todayRevenue = todayPayments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const monthlyRevenue = monthPayments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      console.log('[useDashboardStats] Resultados:', {
        todayAppointments: nonCancelledCount,
        totalPatients: totalPatients.count || 0,
        todayRevenue,
        monthlyRevenue,
      });

      return {
        todayAppointments: nonCancelledCount,
        totalPatients: totalPatients.count || 0,
        todayRevenue,
        monthlyRevenue,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 60 * 1000, // Refrescar cada minuto
  });
}

// Hook para citas de hoy
export function useTodayAppointments() {
  return useQuery({
    queryKey: ['today-appointments'],
    queryFn: async (): Promise<TodayAppointment[]> => {
      const today = new Date().toISOString().split('T')[0];

      console.log('[useTodayAppointments] Ejecutando query para fecha:', today);
      
      const { data, error } = await supabase
        .from('appointments')
        .select('id,appointment_date,appointment_time,service_id,status,user_id,professional_id')
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true })
        .limit(20); // Aumentamos el límite para compensar el filtro del cliente

      if (error) {
        console.error('[useTodayAppointments] Error detallado:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      // Obtener datos relacionados
      const userIds = [...new Set(data?.map(a => a.user_id).filter(Boolean) || [])];
      const professionalIds = [...new Set(data?.map(a => a.professional_id).filter(Boolean) || [])];
      const serviceIds = [...new Set(data?.map(a => a.service_id).filter(Boolean) || [])];

      const [profiles, professionals, services] = await Promise.all([
        userIds.length > 0
          ? supabase.from('profiles').select('id, full_name').in('id', userIds)
          : { data: [] },
        professionalIds.length > 0
          ? supabase.from('professionals').select('id, full_name').in('id', professionalIds)
          : { data: [] },
        serviceIds.length > 0
          ? supabase.from('services').select('id, name').in('id', serviceIds)
          : { data: [] },
      ]);

      const profilesMap = new Map(profiles.data?.map(p => [p.id, p]) || []);
      const professionalsMap = new Map(professionals.data?.map(p => [p.id, p]) || []);
      const servicesMap = new Map(services.data?.map(s => [s.id, s]) || []);

      // Filtrar citas canceladas en el cliente
      return (data || [])
        .filter(apt => apt.status !== 'cancelled')
        .slice(0, 10) // Limitar a 10 resultados después del filtro
        .map(apt => {
          const profile = profilesMap.get(apt.user_id);
          const professional = professionalsMap.get(apt.professional_id);
          const service = servicesMap.get(apt.service_id);
          
          return {
            id: apt.id,
            appointment_date: apt.appointment_date,
            appointment_time: apt.appointment_time,
            patient_name: profile?.full_name || 'N/A',
            professional_name: professional?.full_name || 'N/A',
            service: service?.name,
            status: apt.status,
          };
        });
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000, // Refrescar cada 30 segundos
  });
}

// Hook para actividad reciente
export function useRecentActivity() {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async (): Promise<RecentActivity[]> => {
      // Obtener las últimas citas creadas
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Obtener los últimos pagos
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          id,
          created_at,
          amount
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      // Obtener nombres de usuarios si hay citas
      let profilesMap = new Map();
      if (appointments && appointments.length > 0) {
        const userIds = [...new Set(appointments.map(a => a.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        }
      }

      const activities: RecentActivity[] = [];

      // Combinar actividades
      appointments?.forEach(apt => {
        const profile = profilesMap.get(apt.user_id);
        activities.push({
          id: apt.id,
          type: 'appointment',
          description: `Nueva cita agendada para ${profile?.full_name || 'Paciente'}`,
          timestamp: apt.created_at,
        });
      });

      payments?.forEach(payment => {
        activities.push({
          id: payment.id,
          type: 'payment',
          description: `Pago recibido - $${payment.amount}`,
          timestamp: payment.created_at,
        });
      });

      // Ordenar por timestamp y tomar los 10 más recientes
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    },
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 2 * 60 * 1000,
    refetchInterval: 30 * 1000, // Refrescar cada 30 segundos
  });
}

// Prefetch de datos del dashboard
export function usePrefetchDashboard() {
  const queryClient = useQueryClient();

  return () => {
    // Prefetch todas las queries del dashboard
    queryClient.prefetchQuery({
      queryKey: ['dashboard-stats'],
      queryFn: async () => {
        // La misma función que useDashboardStats
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = startOfMonth(new Date()).toISOString().split('T')[0];
        
        const [todayAppointments, totalPatients, todayPayments, monthPayments, appointmentsData] = await Promise.all([
          supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', today),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('payments').select('amount').gte('created_at', today + 'T00:00:00').lte('created_at', today + 'T23:59:59').eq('status', 'completed'),
          supabase.from('payments').select('amount').gte('created_at', firstDayOfMonth + 'T00:00:00').eq('status', 'completed'),
          supabase.from('appointments').select('status').eq('appointment_date', today),
        ]);
        
        const nonCancelledCount = appointmentsData.data?.filter(a => a.status !== 'cancelled').length || 0;

        const todayRevenue = todayPayments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const monthlyRevenue = monthPayments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        return {
          todayAppointments: nonCancelledCount,
          totalPatients: totalPatients.count || 0,
          todayRevenue,
          monthlyRevenue,
        };
      },
    });

    queryClient.prefetchQuery({
      queryKey: ['today-appointments'],
      queryFn: async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('appointments')
          .select(`
            id, 
            appointment_date, 
            appointment_time, 
            service, 
            status,
            user_id,
            professional_id
          `)
          .eq('appointment_date', today)
          .neq('status', 'cancelled')
          .order('appointment_time', { ascending: true })
          .limit(10);
        
        return data || [];
      },
    });
  };
}