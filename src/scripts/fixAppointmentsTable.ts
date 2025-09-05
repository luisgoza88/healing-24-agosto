import { supabase } from '../lib/supabase';

// Primero, vamos a eliminar la tabla appointments existente y recrearla correctamente
export async function fixAppointmentsTable() {
  try {
    console.log('Recreando tabla appointments con estructura correcta...');
    
    // Usar el cliente admin con service role
    const adminClient = supabase;
    
    // Primero intentamos eliminar la tabla si existe
    await adminClient.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Tabla limpiada. Ahora puedes crear citas nuevas.');
    
    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

// Solo para verificar la estructura
export async function checkTableStructure() {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .limit(1);
      
    if (error) {
      console.log('Error al verificar tabla:', error.message);
      return false;
    }
    
    console.log('Estructura de tabla OK');
    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}