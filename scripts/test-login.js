const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vgwyhegpymqbljqtskra.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3loZWdweW1xYmxqcXRza3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNTU2MTMsImV4cCI6MjA3MTYzMTYxM30.miWLsUHcBJe9zfxlmcO3Pbw1GmGkg5NPjcBwYQRrMf4';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testLogin() {
  console.log('🔐 Probando login con tus credenciales...\n');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'lmg880@gmail.com',
    password: 'Florida20'
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
      email: 'lmg880@gmail.com',
      full_name: 'Luis Miguel González López'
    });
  }

  console.log('\n🎉 Todo listo para usar la app!');
}

testLogin();