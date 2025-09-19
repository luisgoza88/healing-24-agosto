const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Error: Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testLogin() {
  console.log('🔐 Probando login con credenciales de prueba...\n');
  
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  
  if (!email || !password) {
    console.error('❌ Error: Missing test user credentials in environment variables');
    console.log('💡 Tip: Add TEST_USER_EMAIL and TEST_USER_PASSWORD to your .env file');
    process.exit(1);
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('❌ Error al iniciar sesión:', error.message);
    return;
  }

  console.log('✅ ¡Login exitoso!');
  console.log('👤 Usuario ID:', data.user.id);
  console.log('📧 Email:', data.user.email);
  console.log('🎯 Sesión activa:', !!data.session);
  
  // Verificar perfil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profile) {
    console.log('\n📋 Perfil encontrado:');
    console.log('   Nombre:', profile.full_name);
    console.log('   Email:', profile.email);
  } else {
    console.log('\n⚠️ No se encontró perfil, creándolo...');
    await supabase.from('profiles').insert({
      id: data.user.id,
      email: email,
      full_name: process.env.TEST_USER_NAME || 'Test User'
    });
  }

  console.log('\n🎉 Todo listo para usar la app!');
}

testLogin();