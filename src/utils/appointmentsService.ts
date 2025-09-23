import { supabase } from '../lib/supabase';

// Interfaz para citas
export interface Appointment {
  id?: string;
  user_id?: string;
  service_id: string;
  professional_id: string;
  appointment_date: string; // formato YYYY-MM-DD
  appointment_time: string; // formato HH:MM:SS
  duration_minutes?: number;
  status?: string;
  total_amount: number;
  notes?: string;
  cancellation_reason?: string;
  payment_status?: string;
  payment_method?: string;
  payment_reference?: string;
  consultation_room_id?: string; // Para citas de consultorio
  hyperbaric_chamber_id?: string; // Para citas de cámara hiperbárica
}

// Crear una nueva cita
export async function createAppointment(appointmentData: Appointment) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        ...appointmentData,
        user_id: user.id,
        status: appointmentData.status || 'pending',
        payment_status: appointmentData.payment_status || 'pending',
        duration_minutes: appointmentData.duration_minutes || 60
      }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating appointment:', error);
    return { data: null, error };
  }
}

// Obtener todas las citas del usuario
export async function getUserAppointments() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        services!inner(
          id,
          name,
          duration,
          price
        ),
        professionals!inner(
          id,
          full_name,
          specialization
        )
      `)
      .eq('user_id', user.id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error getting appointments:', error);
    return { data: [], error };
  }
}

// Actualizar el estado de una cita
export async function updateAppointmentStatus(appointmentId: string, status: string, cancellation_reason?: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const updateData: any = { status };
    if (status === 'cancelled' && cancellation_reason) {
      updateData.cancellation_reason = cancellation_reason;
    }

    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .match({
        id: appointmentId,
        user_id: user.id
      });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error updating appointment:', error);
    return { error };
  }
}

// Obtener horarios disponibles para un profesional
export async function getAvailableSlots(professional_id: string, date: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_available_slots', {
        p_professional_id: professional_id,
        p_date: date,
        p_service_duration: 60
      });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error getting available slots:', error);
    return { data: [], error };
  }
}

// Verificar si un horario está disponible
export async function checkSlotAvailability(
  professional_id: string, 
  date: string, 
  time: string,
  duration_minutes: number = 60
) {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .eq('professional_id', professional_id)
      .eq('appointment_date', date)
      .neq('status', 'cancelled')
      .gte('appointment_time', time)
      .lt('appointment_time', calculateEndTime(time, duration_minutes));

    if (error) throw error;
    return { isAvailable: !data || data.length === 0, error: null };
  } catch (error) {
    console.error('Error checking availability:', error);
    return { isAvailable: false, error };
  }
}

// Función auxiliar para calcular hora de finalización
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;
}

// Actualizar información de pago
export async function updateAppointmentPayment(
  appointmentId: string,
  paymentInfo: {
    payment_status: string;
    payment_method?: string;
    payment_reference?: string;
    total_amount?: number;
  }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('appointments')
      .update(paymentInfo)
      .eq('id', appointmentId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error updating payment:', error);
    return { error };
  }
}
