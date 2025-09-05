const { createClient } = require('@supabase/supabase-js');

// Credenciales de Supabase
const supabaseUrl = 'https://vgwyhegpymqbljqtskra.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3loZWdweW1xYmxqcXRza3JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA1NTYxMywiZXhwIjoyMDcxNjMxNjEzfQ.Ze7tkXgKYa1iKt68eBrdDyQ4jZjDY_hdrEHlXRvm8j8';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🔧 Iniciando migración de la tabla appointments...\n');
  
  try {
    // Primero, intentamos una consulta simple para ver el estado actual
    console.log('1. Verificando estructura actual de la tabla...');
    const { data: currentData, error: currentError } = await supabase
      .from('appointments')
      .select('*')
      .limit(1);
    
    if (currentError) {
      console.log('❌ Error al consultar la tabla:', currentError.message);
      
      // Si el error menciona appointment_time, sabemos que falta esa columna
      if (currentError.message.includes('appointment_time')) {
        console.log('✅ Confirmado: falta la columna appointment_time');
      }
    } else {
      console.log('✅ La tabla appointments existe y es accesible');
    }
    
    // Ahora intentamos crear un registro de prueba completo
    console.log('\n2. Intentando crear un registro de prueba...');
    
    // Primero obtenemos un usuario válido
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    const testUserId = users && users[0] ? users[0].id : 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    
    const testAppointment = {
      user_id: testUserId,
      service_id: 'medicina-funcional',
      professional_id: '1',
      appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      appointment_time: '10:00:00',
      duration: 60,
      status: 'test_migration',
      total_amount: 100000,
      notes: 'Cita de prueba para migración'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('appointments')
      .insert(testAppointment)
      .select();
    
    if (insertError) {
      console.log('❌ Error al insertar:', insertError.message);
      
      if (insertError.message.includes('appointment_time')) {
        console.log('\n⚠️  La columna appointment_time no existe en la tabla.');
        console.log('📋 Por favor, ejecuta el siguiente SQL en el dashboard de Supabase:\n');
        console.log('```sql');
        console.log('-- Agregar columna appointment_time');
        console.log("ALTER TABLE appointments");
        console.log("ADD COLUMN appointment_time TIME NOT NULL DEFAULT '09:00:00';");
        console.log('\n-- Asegurar que appointment_date sea tipo DATE');
        console.log("ALTER TABLE appointments");
        console.log("ALTER COLUMN appointment_date TYPE DATE USING appointment_date::DATE;");
        console.log('\n-- Crear índice para mejorar rendimiento');
        console.log("CREATE INDEX IF NOT EXISTS idx_appointments_date_time");
        console.log("ON appointments(appointment_date, appointment_time);");
        console.log('```');
        
        console.log('\n🔗 Enlace directo al SQL Editor:');
        console.log(`https://supabase.com/dashboard/project/vgwyhegpymqbljqtskra/sql/new`);
      } else {
        console.log('Error completo:', insertError);
      }
    } else {
      console.log('✅ Registro de prueba creado exitosamente');
      console.log('✅ La tabla appointments tiene todas las columnas necesarias');
      
      // Eliminar el registro de prueba
      if (insertData && insertData[0]) {
        await supabase
          .from('appointments')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Registro de prueba eliminado');
      }
      
      console.log('\n✨ ¡Migración completada! La tabla está lista para usar.');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar
runMigration();