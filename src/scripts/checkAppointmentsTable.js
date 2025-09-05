const { createClient } = require('@supabase/supabase-js');

// Credenciales de Supabase
const supabaseUrl = 'https://vgwyhegpymqbljqtskra.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3loZWdweW1xYmxqcXRza3JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA1NTYxMywiZXhwIjoyMDcxNjMxNjEzfQ.Ze7tkXgKYa1iKt68eBrdDyQ4jZjDY_hdrEHlXRvm8j8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreateMinimalAppointment() {
  console.log('🔍 Verificando estructura de la tabla appointments...\n');
  
  try {
    // Intentar crear una cita mínima solo con los campos esenciales
    const minimalAppointment = {
      user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // UUID válido
      appointment_date: new Date().toISOString(),
      status: 'test'
    };
    
    console.log('Intentando crear cita con campos mínimos:', minimalAppointment);
    
    const { data, error } = await supabase
      .from('appointments')
      .insert(minimalAppointment)
      .select();
    
    if (error) {
      console.log('❌ Error con campos mínimos:', error.message);
      console.log('\nCampos requeridos según el error:', error.details || 'No hay detalles');
      
      // Intentar con más campos
      const extendedAppointment = {
        user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        appointment_date: new Date().toISOString(),
        status: 'pending',
        service_id: 'medicina-funcional',
        professional_id: '1',
        total_amount: 100000,
        notes: 'Test appointment'
      };
      
      console.log('\nIntentando con más campos:', extendedAppointment);
      
      const { data: data2, error: error2 } = await supabase
        .from('appointments')
        .insert(extendedAppointment)
        .select();
      
      if (error2) {
        console.log('❌ Error con campos extendidos:', error2.message);
        
        // Vamos a intentar obtener información de la tabla
        console.log('\n📋 Intentando obtener información de la tabla...');
        
        const { data: tableInfo, error: infoError } = await supabase
          .from('appointments')
          .select('*')
          .limit(0);
        
        if (!infoError) {
          console.log('✅ La tabla existe y es accesible');
        }
        
        // Sugerir solución
        console.log('\n💡 SOLUCIÓN SUGERIDA:');
        console.log('La tabla appointments parece tener restricciones o columnas faltantes.');
        console.log('\nOpción 1: Crear la tabla desde cero con esta estructura:');
        console.log(`
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id VARCHAR(255),
  professional_id VARCHAR(255),
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
        `);
        
        console.log('\nOpción 2: Usar la estructura existente pero asegurarse de enviar todos los campos requeridos.');
      } else {
        console.log('✅ Cita creada exitosamente con campos extendidos');
        console.log('Datos creados:', data2);
        
        // Eliminar el registro de prueba
        if (data2 && data2[0]) {
          await supabase
            .from('appointments')
            .delete()
            .eq('id', data2[0].id);
          console.log('🧹 Registro de prueba eliminado');
        }
      }
    } else {
      console.log('✅ Cita creada exitosamente con campos mínimos');
      console.log('Datos creados:', data);
      
      // Eliminar el registro de prueba
      if (data && data[0]) {
        await supabase
          .from('appointments')
          .delete()
          .eq('id', data[0].id);
        console.log('🧹 Registro de prueba eliminado');
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar
checkAndCreateMinimalAppointment();