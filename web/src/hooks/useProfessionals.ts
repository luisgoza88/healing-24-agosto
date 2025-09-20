import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient, useSupabase } from '../lib/supabase';

export interface Professional {
  id: string;
  full_name: string;
  title?: string;
  specialty?: string;
  specialties?: string[];
  email?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  total_appointments?: number;
  completed_appointments?: number;
  average_rating?: number;
  revenue?: number;
  availability?: any;
}

interface ProfessionalFilters {
  searchTerm?: string;
  specialty?: string;
  status?: string;
}

// Hook principal para obtener profesionales con estadísticas
export function useProfessionals(filters: ProfessionalFilters = {}) {
  return useQuery({
    queryKey: ['professionals', filters],
    queryFn: async (): Promise<Professional[]> => {
      const supabase = useSupabase();
      // Obtener profesionales
      const { data: professionalsData, error: professionalsError } = await supabase
        .from('professionals')
        .select('*')
        .order('created_at', { ascending: false });

      if (professionalsError) throw professionalsError;

      // Obtener estadísticas de citas
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('professional_id, status, total_amount, payment_status');

      if (appointmentsError) throw appointmentsError;

      // Agrupar citas por profesional
      const appointmentsByProfessional = appointmentsData?.reduce((acc: any, apt) => {
        if (!apt.professional_id) return acc;
        
        if (!acc[apt.professional_id]) {
          acc[apt.professional_id] = {
            total: 0,
            completed: 0,
            revenue: 0
          };
        }
        
        acc[apt.professional_id].total++;
        
        if (apt.status === 'completed') {
          acc[apt.professional_id].completed++;
        }
        
        if (apt.payment_status === 'paid') {
          acc[apt.professional_id].revenue += apt.total_amount || 0;
        }
        
        return acc;
      }, {});

      // Formatear profesionales con estadísticas
      let formattedProfessionals = professionalsData?.map(prof => ({
        id: prof.id,
        full_name: prof.full_name,
        title: prof.title,
        specialty: prof.specialties?.[0] || '',
        specialties: prof.specialties || [],
        email: prof.email,
        phone: prof.phone,
        avatar_url: prof.avatar_url,
        // Normalizar is_active (algunas BD usan active)
        is_active: (prof as any).is_active ?? (prof as any).active ?? true,
        created_at: prof.created_at,
        total_appointments: appointmentsByProfessional?.[prof.id]?.total || 0,
        completed_appointments: appointmentsByProfessional?.[prof.id]?.completed || 0,
        revenue: appointmentsByProfessional?.[prof.id]?.revenue || 0,
        average_rating: 0, // TODO: Implementar cuando haya ratings
        availability: prof.availability
      })) || [];

      // Aplicar filtros
      if (filters.status && filters.status !== 'todos') {
        const isActive = filters.status === 'active';
        formattedProfessionals = formattedProfessionals.filter(p => p.is_active === isActive);
      }

      if (filters.specialty && filters.specialty !== 'todos') {
        formattedProfessionals = formattedProfessionals.filter(p => 
          p.specialties?.includes(filters.specialty!) || p.specialty === filters.specialty
        );
      }

      if (filters.searchTerm) {
        const search = filters.searchTerm.toLowerCase();
        formattedProfessionals = formattedProfessionals.filter(p =>
          p.full_name.toLowerCase().includes(search) ||
          p.email?.toLowerCase().includes(search) ||
          p.phone?.toLowerCase().includes(search) ||
          p.title?.toLowerCase().includes(search) ||
          p.specialty?.toLowerCase().includes(search)
        );
      }

      return formattedProfessionals;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

// Hook para obtener un profesional específico
export function useProfessional(professionalId: string) {
  return useQuery({
    queryKey: ['professional', professionalId],
    queryFn: async () => {
      const supabase = useSupabase();
      // Obtener datos del profesional
      const { data: professional, error: professionalError } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', professionalId)
        .single();

      if (professionalError) throw professionalError;

      // Obtener estadísticas detalladas
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          service,
          total_amount,
          payment_status,
          profiles!appointments_user_id_fkey(full_name)
        `)
        .eq('professional_id', professionalId)
        .order('appointment_date', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Calcular estadísticas
      const stats = {
        totalAppointments: appointments?.length || 0,
        completedAppointments: appointments?.filter(a => a.status === 'completed').length || 0,
        cancelledAppointments: appointments?.filter(a => a.status === 'cancelled').length || 0,
        revenue: appointments?.filter(a => a.payment_status === 'paid')
          .reduce((sum, a) => sum + (a.total_amount || 0), 0) || 0,
        upcomingAppointments: appointments?.filter(a => 
          new Date(a.appointment_date + 'T' + a.appointment_time) > new Date()
        ).length || 0,
      };

      return {
        ...professional,
        appointments: appointments || [],
        stats
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
  });
}

// Hook para crear profesional
export function useCreateProfessional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (professionalData: Partial<Professional>) => {
      const supabase = useSupabase();
      const { data, error } = await supabase
        .from('professionals')
        .insert({
          full_name: professionalData.full_name,
          title: professionalData.title,
          specialties: professionalData.specialties || (professionalData.specialty ? [professionalData.specialty] : []),
          email: professionalData.email,
          phone: professionalData.phone,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
      alert('Profesional creado exitosamente');
    },
    onError: (error: any) => {
      alert('Error al crear el profesional: ' + error.message);
    },
  });
}

// Hook para actualizar profesional
export function useUpdateProfessional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Professional> }) => {
      const supabase = useSupabase();
      const { error } = await supabase
        .from('professionals')
        .update({
          full_name: data.full_name,
          title: data.title,
          specialties: data.specialties || (data.specialty ? [data.specialty] : []),
          email: data.email,
          phone: data.phone,
          active: data.is_active,
          availability: data.availability,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
      queryClient.invalidateQueries({ queryKey: ['professional', variables.id] });
      alert('Profesional actualizado exitosamente');
    },
    onError: (error: any) => {
      alert('Error al actualizar el profesional: ' + error.message);
    },
  });
}

// Hook para obtener especialidades únicas
export function useSpecialties() {
  return useQuery({
    queryKey: ['specialties'],
    queryFn: async (): Promise<string[]> => {
      const supabase = useSupabase();
      const { data, error } = await supabase
        .from('professionals')
        .select('specialties');

      if (error) throw error;

      // Obtener especialidades únicas
      const allSpecialties = new Set<string>();
      
      data?.forEach(prof => {
        if (prof.specialties && Array.isArray(prof.specialties)) {
          prof.specialties.forEach((s: string) => allSpecialties.add(s));
        }
      });

      return Array.from(allSpecialties).sort();
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
}

// Hook para estadísticas de profesionales
export function useProfessionalStats() {
  return useQuery({
    queryKey: ['professional-stats'],
    queryFn: async () => {
      const supabase = useSupabase();
      const today = new Date().toISOString().split('T')[0];
      
      // Consultas paralelas
      const [totalProfessionals, activeProfessionals, todayAppointments, monthRevenue] = await Promise.all([
        // Total de profesionales
        supabase.from('professionals').select('*', { count: 'exact', head: true }),

        // Profesionales activos
        supabase
          .from('professionals')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),

        // Citas de hoy por profesional
        supabase
          .from('appointments')
          .select('professional_id')
          .eq('appointment_date', today)
          .neq('status', 'cancelled'),

        // Ingresos del mes
        supabase
          .from('appointments')
          .select('total_amount, payment_status')
          .gte('appointment_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
          .eq('payment_status', 'paid'),
      ]);

      // Contar profesionales únicos con citas hoy
      const professionalsWithAppointmentsToday = new Set(
        todayAppointments.data?.map(a => a.professional_id).filter(Boolean) || []
      ).size;

      // Calcular ingresos totales del mes
      const totalMonthRevenue = monthRevenue.data?.reduce((sum, a) => sum + (a.total_amount || 0), 0) || 0;

      return {
        total: totalProfessionals.count || 0,
        active: activeProfessionals.count || 0,
        workingToday: professionalsWithAppointmentsToday,
        monthRevenue: totalMonthRevenue,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Refrescar cada 5 minutos
  });
}