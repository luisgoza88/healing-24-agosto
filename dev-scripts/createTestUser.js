const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vgwyhegpymqbljqtskra.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Si no tienes la service key, puedes crear el usuario desde la UI de Supabase
const createTestUser = async () => {
  console.log('Para crear tu usuario de prueba:');
  console.log('');
  console.log('1. Ve a: https://supabase.com/dashboard/project/vgwyhegpymqbljqtskra/auth/users');
  console.log('2. Click en "Add user" → "Create new user"');
  console.log('3. Ingresa estos datos:');
  console.log('   - Email: lmg880@gmail.com');
  console.log('   - Password: Florida20');
  console.log('   - Auto Confirm User: ✓ (activado)');
  console.log('4. En User Metadata agrega:');
  console.log('   { "full_name": "Luis Miguel González López" }');
  console.log('');
  console.log('O puedes registrarte directamente desde la app con esos datos.');
};

createTestUser();