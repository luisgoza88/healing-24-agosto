import { useQueryClient } from '@tanstack/react-query';

// ✅ HOOK PARA INVALIDACIONES INTELIGENTES
export function useInvalidation() {
  const queryClient = useQueryClient();

  // ✅ INVALIDACIONES SELECTIVAS - Solo lo necesario
  const invalidateAppointments = () => {
    console.log('[Invalidation] Invalidating appointments data');
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
    queryClient.invalidateQueries({ queryKey: ['today-appointments'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };

  const invalidatePatients = () => {
    console.log('[Invalidation] Invalidating patients data');
    queryClient.invalidateQueries({ queryKey: ['patients'] });
    queryClient.invalidateQueries({ queryKey: ['patient-stats'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };

  const invalidateProfessionals = () => {
    console.log('[Invalidation] Invalidating professionals data');
    queryClient.invalidateQueries({ queryKey: ['professionals'] });
    queryClient.invalidateQueries({ queryKey: ['appointment-services'] });
  };

  const invalidateCredits = (patientId?: string) => {
    console.log('[Invalidation] Invalidating credits for:', patientId);
    if (patientId) {
      queryClient.invalidateQueries({ queryKey: ['patient-credits', patientId] });
      queryClient.invalidateQueries({ queryKey: ['credit-transactions', patientId] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['patient-credits'] });
      queryClient.invalidateQueries({ queryKey: ['credit-transactions'] });
    }
  };

  const invalidateServices = () => {
    console.log('[Invalidation] Invalidating services data');
    queryClient.invalidateQueries({ queryKey: ['services'] });
    queryClient.invalidateQueries({ queryKey: ['appointment-services'] });
  };

  // ✅ INVALIDACIÓN COMPLETA (usar con precaución)
  const invalidateAll = () => {
    console.log('[Invalidation] Invalidating ALL queries - use sparingly');
    queryClient.invalidateQueries();
  };

  // ✅ REFETCH ESPECÍFICO (sin invalidar cache)
  const refetchDashboard = () => {
    console.log('[Refetch] Refreshing dashboard data');
    queryClient.refetchQueries({ queryKey: ['dashboard-stats'] });
    queryClient.refetchQueries({ queryKey: ['today-appointments'] });
  };

  return {
    // Invalidaciones específicas
    invalidateAppointments,
    invalidatePatients,
    invalidateProfessionals,
    invalidateCredits,
    invalidateServices,
    
    // Acciones especiales
    invalidateAll,
    refetchDashboard,
    
    // Helpers
    clearCache: () => queryClient.clear(),
    getQueryCache: () => queryClient.getQueryCache(),
  };
}

// ✅ HOOK PARA PREFETCH INTELIGENTE
export function usePrefetch() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const prefetchPatients = () => {
    queryClient.prefetchQuery({
      queryKey: ['patients', {}],
      queryFn: async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, created_at')
          .order('created_at', { ascending: false })
          .limit(50); // Límite para optimizar
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchAppointments = () => {
    queryClient.prefetchQuery({
      queryKey: ['appointments', {}],
      queryFn: async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('appointments')
          .select('id, appointment_date, appointment_time, status')
          .gte('appointment_date', today)
          .order('appointment_date', { ascending: true })
          .limit(100); // Límite para optimizar
        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });
  };

  return {
    prefetchPatients,
    prefetchAppointments,
  };
}







