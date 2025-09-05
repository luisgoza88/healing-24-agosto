const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vgwyhegpymqbljqtskra.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3loZWdweW1xYmxqcXRza3JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA1NTYxMywiZXhwIjoyMDcxNjMxNjEzfQ.Ze7tkXgKYa1iKt68eBrdDyQ4jZjDY_hdrEHlXRvm8j8';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function updatePassword() {
  console.log('🔑 Actualizando contraseña del usuario...\n');
  
  const userId = '2be90958-b4d8-4cd7-8945-e8ae911f9c36';
  
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    password: 'Florida20'
  });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('✅ Contraseña actualizada exitosamente');
  console.log('\n🎯 Credenciales actualizadas:');
  console.log('📧 Email: lmg880@gmail.com');
  console.log('🔑 Contraseña: Florida20');
  
  // Probar login
  console.log('\n🔐 Probando login...');
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: 'lmg880@gmail.com',
    password: 'Florida20'
  });

  if (!loginError) {
    console.log('✅ Login exitoso!');
  } else {
    console.log('❌ Error en login:', loginError.message);
  }
}

updatePassword();