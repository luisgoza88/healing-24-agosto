import { supabase } from '../lib/supabase';

export const seedTestAppointments = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No hay usuario autenticado');
      return;
    }

    // Datos de prueba para citas
    const testAppointments = [
      // Citas futuras
      {
        user_id: user.id,
        service_id: 'medicina-funcional',
        professional_id: '1', // ID ficticio
        appointment_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // En 2 días
        appointment_time: '10:00:00',
        duration: 75,
        status: 'confirmed',
        total_amount: 300000,
        notes: 'Medicina Funcional - Consulta funcional – primera vez'
      },
      {
        user_id: user.id,
        service_id: 'medicina-estetica',
        professional_id: '3',
        appointment_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // En 5 días
        appointment_time: '14:30:00',
        duration: 60,
        status: 'pending_payment',
        total_amount: 350000,
        notes: 'Medicina Estética - Toxina botulínica'
      },
      {
        user_id: user.id,
        service_id: 'faciales',
        professional_id: '2',
        appointment_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // En 10 días
        appointment_time: '16:00:00',
        duration: 90,
        status: 'confirmed',
        total_amount: 280000,
        notes: 'Faciales - HydraFacial'
      },
      // Citas pasadas
      {
        user_id: user.id,
        service_id: 'masajes',
        professional_id: '2',
        appointment_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 7 días
        appointment_time: '11:00:00',
        duration: 60,
        status: 'completed',
        total_amount: 180000,
        notes: 'Masajes - Masaje relajante'
      },
      {
        user_id: user.id,
        service_id: 'medicina-regenerativa',
        professional_id: '1',
        appointment_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 30 días
        appointment_time: '09:00:00',
        duration: 90,
        status: 'completed',
        total_amount: 450000,
        notes: 'Medicina Regenerativa & Longevidad - Terapia con células madre'
      },
      {
        user_id: user.id,
        service_id: 'faciales',
        professional_id: '3',
        appointment_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 15 días
        appointment_time: '15:30:00',
        duration: 60,
        status: 'cancelled',
        total_amount: 250000,
        notes: 'Faciales - Limpieza facial profunda'
      }
    ];

    // Insertar las citas de prueba
    const { data, error } = await supabase
      .from('appointments')
      .insert(testAppointments)
      .select();

    if (error) {
      console.error('Error al crear citas de prueba:', error);
      throw error;
    }

    console.log('Citas de prueba creadas exitosamente:', data?.length);
    return data;
  } catch (error) {
    console.error('Error en seedTestAppointments:', error);
    throw error;
  }
};

// Función para limpiar todas las citas del usuario actual
export const clearUserAppointments = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
    console.log('Citas eliminadas exitosamente');
  } catch (error) {
    console.error('Error al eliminar citas:', error);
  }
};