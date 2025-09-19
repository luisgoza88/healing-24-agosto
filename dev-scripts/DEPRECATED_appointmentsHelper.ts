import { supabase } from '../lib/supabase';

// Interfaz para citas temporales
interface TempAppointment {
  id: string;
  service_id: string;
  professional_id: string;
  appointment_date: string;
  status: string;
  total_amount: number;
  notes: string;
  created_at: string;
}

// Guardar citas temporalmente en el perfil del usuario
export async function createTempAppointment(appointmentData: Omit<TempAppointment, 'id' | 'created_at'>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user');

    // Obtener el perfil actual
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('medical_conditions')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Usar el campo medical_conditions para guardar citas temporalmente
    let appointments: TempAppointment[] = [];
    if (profile.medical_conditions) {
      try {
        const parsed = JSON.parse(profile.medical_conditions);
        if (parsed.appointments) {
          appointments = parsed.appointments;
        }
      } catch (e) {
        // Si no es JSON válido, ignorar
      }
    }

    // Crear nueva cita
    const newAppointment: TempAppointment = {
      ...appointmentData,
      id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };

    appointments.push(newAppointment);

    // Guardar de vuelta
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        medical_conditions: JSON.stringify({ 
          appointments,
          _note: 'Temporal - citas guardadas aquí mientras se arregla la tabla appointments'
        })
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return { data: newAppointment, error: null };
  } catch (error) {
    console.error('Error creating temp appointment:', error);
    return { data: null, error };
  }
}

// Obtener todas las citas temporales
export async function getTempAppointments() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('medical_conditions')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    let appointments: TempAppointment[] = [];
    if (profile.medical_conditions) {
      try {
        const parsed = JSON.parse(profile.medical_conditions);
        if (parsed.appointments) {
          appointments = parsed.appointments;
        }
      } catch (e) {
        // Si no es JSON válido, ignorar
      }
    }

    return { data: appointments, error: null };
  } catch (error) {
    console.error('Error getting temp appointments:', error);
    return { data: [], error };
  }
}

// Actualizar el estado de una cita temporal
export async function updateTempAppointmentStatus(appointmentId: string, status: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user');

    const { data: appointments, error: getError } = await getTempAppointments();
    if (getError) throw getError;

    const updatedAppointments = appointments.map(apt => 
      apt.id === appointmentId ? { ...apt, status } : apt
    );

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        medical_conditions: JSON.stringify({ 
          appointments: updatedAppointments,
          _note: 'Temporal - citas guardadas aquí mientras se arregla la tabla appointments'
        })
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return { error: null };
  } catch (error) {
    console.error('Error updating temp appointment:', error);
    return { error };
  }
}