import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient, useSupabase } from '../lib/supabase';

export interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  city?: string;
  address?: string;
  created_at: string;
  total_appointments: number;
  last_appointment?: string;
  medical_conditions?: string;
  allergies?: string;
}

interface PatientFilters {
  searchTerm?: string;
  gender?: string;
  city?: string;
}

// Hook principal para obtener pacientes con estadísticas
export function usePatients(filters: PatientFilters = {}) {
  return useQuery({
    queryKey: ['patients', filters],
    queryFn: async (): Promise<Patient[]> => {
      const supabase = useSupabase();
      // Obtener pacientes
      const { data: patientsData, error: patientsError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (patientsError) {
        console.error('[usePatients] Error obteniendo pacientes:', patientsError);
        const errorMessage = patientsError.message?.toLowerCase().includes('permission denied')
          ? 'No tienes permisos para ver la lista completa de pacientes. Asegúrate de iniciar sesión con una cuenta administradora.'
          : patientsError.message || 'Error al obtener los pacientes';
        throw new Error(errorMessage);
      }

      console.log(`[usePatients] Pacientes obtenidos: ${patientsData?.length || 0}`);

      // Obtener estadísticas de citas
      const { data: appointmentsCount, error: appointmentsError } = await supabase
        .from('appointments')
        .select('user_id, appointment_date')
        .order('appointment_date', { ascending: false });

      if (appointmentsError) {
        console.error('[usePatients] Error obteniendo citas:', appointmentsError);
        throw new Error(appointmentsError.message || 'Error al obtener las citas');
      }

      // Agrupar citas por usuario
      const appointmentsByUser = appointmentsCount?.reduce((acc: any, apt) => {
        if (!acc[apt.user_id]) {
          acc[apt.user_id] = { count: 0, lastDate: apt.appointment_date };
        }
        acc[apt.user_id].count++;
        return acc;
      }, {});

      // Formatear pacientes con estadísticas
      let formattedPatients = patientsData?.map(patient => ({
        id: patient.id,
        full_name: patient.full_name || 'Sin nombre',
        email: patient.email || '',
        phone: patient.phone,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        city: patient.city,
        address: patient.address,
        created_at: patient.created_at,
        total_appointments: appointmentsByUser?.[patient.id]?.count || 0,
        last_appointment: appointmentsByUser?.[patient.id]?.lastDate,
        medical_conditions: patient.medical_conditions,
        allergies: patient.allergies
      })) || [];

      // Aplicar filtros
      if (filters.gender && filters.gender !== 'todos') {
        formattedPatients = formattedPatients.filter(p => p.gender === filters.gender);
      }

      if (filters.city && filters.city !== 'todos') {
        formattedPatients = formattedPatients.filter(p => p.city === filters.city);
      }

      if (filters.searchTerm) {
        const search = filters.searchTerm.toLowerCase();
        formattedPatients = formattedPatients.filter(p =>
          p.full_name.toLowerCase().includes(search) ||
          p.email.toLowerCase().includes(search) ||
          p.phone?.toLowerCase().includes(search) ||
          p.city?.toLowerCase().includes(search)
        );
      }

      return formattedPatients;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos (optimizado)
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchInterval: false, // ✅ DESACTIVADO
    refetchOnWindowFocus: false,
    // ✅ PAGINACIÓN OPTIMIZADA
    keepPreviousData: true
  });
}

// Hook para obtener un paciente específico con historial completo
export function usePatient(patientId: string) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const supabase = useSupabase();
      // Obtener datos del paciente
      const { data: patient, error: patientError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .single();

      if (patientError) throw patientError;

      // Obtener historial de citas
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
          professionals(full_name)
        `)
        .eq('user_id', patientId)
        .order('appointment_date', { ascending: false });

      if (appointmentsError) {
        console.error('[usePatients] Error obteniendo citas:', appointmentsError);
        throw new Error(appointmentsError.message || 'Error al obtener las citas');
      }

      // Obtener pagos
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false });

      return {
        ...patient,
        appointments: appointments || [],
        payments: payments || [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
  });
}

// Hook para crear paciente
export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientData: Partial<Patient>) => {
      const supabase = useSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          full_name: patientData.full_name,
          email: patientData.email,
          phone: patientData.phone,
          date_of_birth: patientData.date_of_birth,
          gender: patientData.gender,
          city: patientData.city,
          address: patientData.address,
          medical_conditions: patientData.medical_conditions,
          allergies: patientData.allergies,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      alert('Paciente creado exitosamente');
    },
    onError: (error: any) => {
      alert('Error al crear el paciente: ' + error.message);
    },
  });
}

// Hook para actualizar paciente
export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Patient> }) => {
      const supabase = useSupabase();
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone,
          date_of_birth: data.date_of_birth,
          gender: data.gender,
          city: data.city,
          address: data.address,
          medical_conditions: data.medical_conditions,
          allergies: data.allergies,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', variables.id] });
      alert('Paciente actualizado exitosamente');
    },
    onError: (error: any) => {
      alert('Error al actualizar el paciente: ' + error.message);
    },
  });
}

// Hook para obtener ciudades únicas
export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: async (): Promise<string[]> => {
      const supabase = useSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('city')
        .not('city', 'is', null)
        .order('city');

      if (error) throw error;

      // Obtener ciudades únicas
      const uniqueCities = [...new Set((data || []).map(p => p.city).filter(Boolean))];
      return uniqueCities.sort();
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
}

// Hook para estadísticas de pacientes
export function usePatientStats() {
  return useQuery({
    queryKey: ['patient-stats'],
    queryFn: async () => {
      const supabase = useSupabase();
      const today = new Date();
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

      // Consultas paralelas
      const [totalPatients, newThisMonth, withAppointments, activePatients] = await Promise.all([
        // Total de pacientes
        supabase.from('profiles').select('*', { count: 'exact', head: true }),

        // Nuevos este mes
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thisMonth.toISOString()),

        // Con citas
        supabase
          .from('appointments')
          .select('user_id')
          .eq('status', 'completed'),

        // Activos (con citas en los últimos 3 meses)
        supabase
          .from('appointments')
          .select('user_id')
          .gte('appointment_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      ]);

      // Contar pacientes únicos con citas
      const uniqueWithAppointments = new Set(withAppointments.data?.map(a => a.user_id) || []).size;
      const uniqueActive = new Set(activePatients.data?.map(a => a.user_id) || []).size;

      return {
        total: totalPatients.count || 0,
        newThisMonth: newThisMonth.count || 0,
        withAppointments: uniqueWithAppointments,
        activePatients: uniqueActive,
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutos para stats
    refetchInterval: false, // ✅ DESACTIVADO
    refetchOnWindowFocus: false
  });
}