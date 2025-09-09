import { supabase } from '../lib/supabase';

export const seedTestAppointments = async () => {
  try {
    console.log('=== SEEDING TEST APPOINTMENTS ===');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      throw new Error('Error al obtener usuario: ' + userError.message);
    }
    
    if (!user) {
      console.error('No hay usuario autenticado');
      return;
    }
    
    console.log('Current user for seed:', user.id, user.email);

    // Primero, obtener o crear un profesional
    let professionalId: string;
    
    // Buscar si existe algún profesional
    const { data: existingProfessional } = await supabase
      .from('professionals')
      .select('id')
      .limit(1)
      .single();

    if (existingProfessional) {
      professionalId = existingProfessional.id;
    } else {
      // Crear un profesional de prueba si no existe ninguno
      const { data: newProfessional, error: profError } = await supabase
        .from('professionals')
        .insert({
          full_name: 'Dra. Estefanía González',
          title: 'Médica Funcional',
          specialties: ['Medicina Funcional', 'Medicina Integrativa', 'Medicina Estética'],
          bio: 'Especialista en medicina funcional con enfoque holístico',
          active: true
        })
        .select()
        .single();

      if (profError) throw profError;
      professionalId = newProfessional.id;
    }

    // También necesitamos obtener los IDs reales de los servicios
    const { data: services } = await supabase
      .from('services')
      .select('id, code');

    const serviceMap: { [key: string]: string } = {};
    services?.forEach(service => {
      serviceMap[service.code] = service.id;
    });

    // Datos de prueba para citas
    const testAppointments = [
      // Citas futuras
      {
        user_id: user.id,
        service_id: serviceMap['medicina-funcional'] || serviceMap[Object.keys(serviceMap)[0]],
        professional_id: professionalId,
        appointment_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // En 2 días
        appointment_time: '10:00:00',
        end_time: '11:15:00',
        duration: 75,
        status: 'confirmed',
        total_amount: 300000,
        notes: 'Medicina Funcional - Consulta funcional – primera vez'
      },
      {
        user_id: user.id,
        service_id: serviceMap['medicina-estetica'] || serviceMap[Object.keys(serviceMap)[0]],
        professional_id: professionalId,
        appointment_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // En 5 días
        appointment_time: '14:30:00',
        end_time: '15:30:00',
        duration: 60,
        status: 'pending',
        total_amount: 350000,
        notes: 'Medicina Estética - Toxina botulínica'
      },
      {
        user_id: user.id,
        service_id: serviceMap['wellness-integral'] || serviceMap[Object.keys(serviceMap)[0]],
        professional_id: professionalId,
        appointment_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // En 10 días
        appointment_time: '16:00:00',
        end_time: '17:30:00',
        duration: 90,
        status: 'confirmed',
        total_amount: 280000,
        notes: 'Wellness Integral - HydraFacial'
      },
      // Citas pasadas
      {
        user_id: user.id,
        service_id: serviceMap['wellness-integral'] || serviceMap[Object.keys(serviceMap)[0]],
        professional_id: professionalId,
        appointment_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 7 días
        appointment_time: '11:00:00',
        end_time: '12:00:00',
        duration: 60,
        status: 'completed',
        total_amount: 180000,
        notes: 'Wellness Integral - Masaje relajante'
      },
      {
        user_id: user.id,
        service_id: serviceMap['medicina-funcional'] || serviceMap[Object.keys(serviceMap)[0]],
        professional_id: professionalId,
        appointment_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 30 días
        appointment_time: '09:00:00',
        end_time: '10:30:00',
        duration: 90,
        status: 'completed',
        total_amount: 450000,
        notes: 'Medicina Funcional - Terapia regenerativa'
      },
      {
        user_id: user.id,
        service_id: serviceMap['medicina-estetica'] || serviceMap[Object.keys(serviceMap)[0]],
        professional_id: professionalId,
        appointment_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 15 días
        appointment_time: '15:30:00',
        end_time: '16:30:00',
        duration: 60,
        status: 'cancelled',
        total_amount: 250000,
        notes: 'Medicina Estética - Limpieza facial profunda'
      }
    ];

    console.log('Test appointments to insert:', testAppointments.length);
    console.log('Sample appointment:', testAppointments[0]);

    // Insertar las citas de prueba
    const { data, error } = await supabase
      .from('appointments')
      .insert(testAppointments)
      .select();

    if (error) {
      console.error('=== SEED INSERT ERROR ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      throw error;
    }

    console.log('Citas de prueba creadas exitosamente:', data?.length);
    console.log('Created appointments IDs:', data?.map(a => a.id));
    
    // Verificar que se crearon correctamente
    const { data: verifyData, error: verifyError } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log('Verification - Total appointments for user:', verifyData?.length || 0);
    if (verifyError) console.error('Verification error:', verifyError);
    
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