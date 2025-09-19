const { createClient } = require('@supabase/supabase-js');

// Configuración
const SUPABASE_URL = 'https://vgwyhegpymqbljqtskra.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3loZWdweW1xYmxqcXRza3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNTU2MTMsImV4cCI6MjA3MTYzMTYxM30.miWLsUHcBJe9zfxlmcO3Pbw1GmGkg5NPjcBwYQRrMf4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuth() {
  console.log('🔐 Probando autenticación...\n');
  
  // Test 1: Login con usuario admin
  const adminEmails = ['admin@healingforest.com', 'lmg880@gmail.com'];
  
  for (const email of adminEmails) {
    console.log(`\n📧 Probando con: ${email}`);
    
    try {
      // Intentar login (necesitarás la contraseña real)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: 'test123456' // Cambiar por la contraseña real
      });
      
      if (authError) {
        console.log(`❌ Error de autenticación: ${authError.message}`);
        continue;
      }
      
      console.log(`✅ Login exitoso`);
      console.log(`   User ID: ${authData.user.id}`);
      
      // Verificar rol del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
      if (profileError) {
        console.log(`❌ Error al obtener perfil: ${profileError.message}`);
      } else {
        console.log(`✅ Perfil encontrado:`);
        console.log(`   Role: ${profile.role}`);
        console.log(`   Name: ${profile.full_name}`);
      }
      
      // Verificar función is_admin
      const { data: isAdminResult, error: isAdminError } = await supabase.rpc('is_admin', { 
        user_id: authData.user.id 
      });
      
      if (isAdminError) {
        console.log(`❌ Error en función is_admin: ${isAdminError.message}`);
      } else {
        console.log(`✅ Función is_admin: ${isAdminResult}`);
      }
      
      // Verificar función get_services_with_details
      const { data: services, error: servicesError } = await supabase.rpc('get_services_with_details');
      
      if (servicesError) {
        console.log(`❌ Error en get_services_with_details: ${servicesError.message}`);
      } else {
        console.log(`✅ Función get_services_with_details: ${services.length} servicios encontrados`);
      }
      
      // Cerrar sesión
      await supabase.auth.signOut();
      
    } catch (err) {
      console.log(`❌ Error general: ${err.message}`);
    }
  }
  
  // Test 2: Verificar llamada directa sin autenticación
  console.log('\n\n📡 Probando llamadas sin autenticación...\n');
  
  try {
    const { data, error } = await supabase.rpc('get_services_with_details');
    
    if (error) {
      console.log(`❌ Error sin auth: ${error.message}`);
      console.log(`   Código: ${error.code}`);
      console.log(`   Detalles: ${error.details}`);
    } else {
      console.log(`✅ Llamada exitosa sin auth: ${data.length} servicios`);
    }
  } catch (err) {
    console.log(`❌ Error de conexión: ${err.message}`);
  }
  
  console.log('\n\n💡 IMPORTANTE:');
  console.log('1. Actualiza las contraseñas en este script con las reales');
  console.log('2. Si get_services_with_details falla, el dashboard no podrá cargar');
  console.log('3. Revisa los logs del navegador al intentar acceder al dashboard');
}

testAuth().catch(console.error);