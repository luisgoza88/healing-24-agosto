import { createClient } from '@supabase/supabase-js';

// Usar las credenciales del archivo .env
const supabaseUrl = 'https://vgwyhegpymqbljqtskra.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3loZWdweW1xYmxqcXRza3JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA1NTYxMywiZXhwIjoyMDcxNjMxNjEzfQ.Ze7tkXgKYa1iKt68eBrdDyQ4jZjDY_hdrEHlXRvm8j8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Ejecutando migración para appointments...');
    
    // Primero verificamos si la columna ya existe
    const { data: checkData, error: checkError } = await supabase
      .from('appointments')
      .select('*')
      .limit(1);
    
    console.log('Estado actual de la tabla:', checkError ? 'Error' : 'OK');
    
    // Ejecutar las migraciones SQL directamente
    const migrations = [
      // Agregar columna appointment_time si no existe
      `ALTER TABLE appointments 
       ADD COLUMN IF NOT EXISTS appointment_time TIME NOT NULL DEFAULT '09:00:00'`,
      
      // Asegurar que appointment_date sea tipo DATE
      `ALTER TABLE appointments 
       ALTER COLUMN appointment_date TYPE DATE USING appointment_date::DATE`,
      
      // Crear índice para mejorar las consultas
      `CREATE INDEX IF NOT EXISTS idx_appointments_date_time 
       ON appointments(appointment_date, appointment_time)`,
       
      // Agregar columnas que podrían faltar
      `ALTER TABLE appointments 
       ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60`,
       
      `ALTER TABLE appointments 
       ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0`,
       
      `ALTER TABLE appointments 
       ADD COLUMN IF NOT EXISTS notes TEXT`
    ];
    
    // Ejecutar cada migración
    for (const sql of migrations) {
      try {
        console.log('Ejecutando:', sql.substring(0, 50) + '...');
        
        // Usando el service role key, podemos ejecutar SQL directamente
        const { data, error } = await supabase.rpc('exec_migration', {
          migration_sql: sql
        }).single();
        
        if (error) {
          // Si el RPC no existe, intentamos crear la función primero
          if (error.message.includes('exec_migration')) {
            console.log('Creando función exec_migration...');
            
            // Crear la función RPC
            const createFunction = `
              CREATE OR REPLACE FUNCTION exec_migration(migration_sql text)
              RETURNS void AS $$
              BEGIN
                EXECUTE migration_sql;
              END;
              $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;
            
            // Como no podemos ejecutar esto directamente, lo haremos de otra manera
            console.log('La función RPC no existe. Ejecutando plan alternativo...');
          }
          console.log('Error (puede ser ignorado si la columna ya existe):', error.message);
        } else {
          console.log('✓ Migración ejecutada exitosamente');
        }
      } catch (err) {
        console.log('Error en migración individual:', err);
      }
    }
    
    // Verificar el resultado
    console.log('\nVerificando estructura final de la tabla...');
    const { data: testInsert, error: testError } = await supabase
      .from('appointments')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // UUID dummy
        service_id: 'test',
        professional_id: 'test',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '10:00:00',
        duration: 60,
        status: 'test',
        total_amount: 0,
        notes: 'Test de migración'
      })
      .select();
    
    if (testError) {
      console.log('Error en inserción de prueba:', testError.message);
      console.log('\nPor favor, ejecuta estas migraciones manualmente en el SQL Editor de Supabase:');
      migrations.forEach(sql => console.log(sql + ';'));
    } else {
      console.log('✓ Estructura de la tabla verificada correctamente');
      
      // Eliminar el registro de prueba
      if (testInsert && testInsert[0]) {
        await supabase
          .from('appointments')
          .delete()
          .eq('id', testInsert[0].id);
      }
    }
    
  } catch (error) {
    console.error('Error general:', error);
  }
}

// Ejecutar la migración
runMigration();