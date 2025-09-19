import { supabase } from '../lib/supabase';

export const checkBreatheMoveCitas = async () => {
  try {
    console.log('=== VERIFICANDO CITAS DE BREATHE & MOVE ===');
    
    // Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No hay usuario autenticado');
      return;
    }
    
    // Buscar todas las citas del usuario
    const { data: allAppointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error al cargar citas:', error);
      return;
    }
    
    console.log('Total de citas:', allAppointments?.length || 0);
    
    // Filtrar citas de Breathe & Move
    const breatheMoveCitas = allAppointments?.filter(apt => 
      apt.notes && apt.notes.includes('Breathe & Move')
    ) || [];
    
    console.log('Citas de Breathe & Move:', breatheMoveCitas.length);
    
    breatheMoveCitas.forEach((cita, index) => {
      console.log(`\nCita ${index + 1}:`);
      console.log('- ID:', cita.id);
      console.log('- Fecha:', cita.appointment_date);
      console.log('- Hora:', cita.appointment_time);
      console.log('- Notas:', cita.notes);
      console.log('- Estado:', cita.status);
      console.log('- Professional ID:', cita.professional_id);
      console.log('- Service ID:', cita.service_id);
    });
    
    // También verificar paquetes
    const { data: packages } = await supabase
      .from('breathe_move_packages')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');
    
    console.log('\nPaquetes activos:', packages?.length || 0);
    packages?.forEach(pkg => {
      console.log(`- ${pkg.package_type}: ${pkg.classes_used}/${pkg.classes_total} usadas`);
    });
    
  } catch (error) {
    console.error('Error en verificación:', error);
  }
};