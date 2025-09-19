const { createClient } = require('@supabase/supabase-js');

// Configuración - CAMBIA ESTOS VALORES por los tuyos
const SUPABASE_URL = 'https://vgwyhegpymqbljqtskra.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3loZWdweW1xYmxqcXRza3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNTU2MTMsImV4cCI6MjA3MTYzMTYxM30.miWLsUHcBJe9zfxlmcO3Pbw1GmGkg5NPjcBwYQRrMf4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSupabase() {
  console.log('🔍 Verificando estado de Supabase...\n');
  
  // Verificar tablas principales
  const tables = [
    { name: 'user_credits', description: 'Tabla de créditos unificada' },
    { name: 'credit_transactions', description: 'Transacciones de créditos' },
    { name: 'profiles', description: 'Perfiles de usuarios' }
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table.name).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table.description}: ${error.message}`);
      } else {
        console.log(`✅ ${table.description}: Existe y funciona`);
      }
    } catch (err) {
      console.log(`❌ ${table.description}: Error de conexión`);
    }
  }
  
  // Verificar funciones RPC
  console.log('\n🔧 Verificando funciones...\n');
  
  const functions = [
    { name: 'is_admin', params: { user_id: '00000000-0000-0000-0000-000000000000' }, description: 'Función de verificación de admin' },
    { name: 'is_admin_enhanced', params: { user_uuid: '00000000-0000-0000-0000-000000000000' }, description: 'Función mejorada de admin' },
    { name: 'get_user_credit_balance', params: { user_uuid: '00000000-0000-0000-0000-000000000000' }, description: 'Función de balance de créditos' },
    { name: 'get_services_with_details', params: {}, description: 'Función de detalles de servicios' }
  ];
  
  for (const func of functions) {
    try {
      const { data, error } = await supabase.rpc(func.name, func.params);
      
      if (error && error.code === '42883') {
        console.log(`❌ ${func.description}: No existe`);
      } else {
        console.log(`✅ ${func.description}: Existe`);
      }
    } catch (err) {
      console.log(`⚠️  ${func.description}: ${err.message}`);
    }
  }
  
  // Verificar vista
  console.log('\n📊 Verificando vistas...\n');
  
  try {
    const { data, error } = await supabase
      .from('user_credits_summary')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Vista user_credits_summary: ${error.message}`);
    } else {
      console.log(`✅ Vista user_credits_summary: Existe`);
    }
  } catch (err) {
    console.log(`❌ Vista user_credits_summary: Error de conexión`);
  }
  
  console.log('\n📋 RESULTADO:');
  console.log('Si ves ✅ en la mayoría = Los cambios se aplicaron correctamente');
  console.log('Si ves ❌ en muchos = Necesitas ejecutar los scripts SQL en Supabase');
  console.log('\n💡 Para conectar realmente, actualiza SUPABASE_URL y SUPABASE_ANON_KEY en este script');
}

checkSupabase().catch(console.error);
