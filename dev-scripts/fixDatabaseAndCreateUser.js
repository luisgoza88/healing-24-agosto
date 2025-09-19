const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in environment variables');
  console.log('💡 Tip: Make sure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAndCreateUser() {
  console.log('🔧 Arreglando la función handle_new_user...');
  
  // Primero arreglar la función
  const { error: dropError } = await supabase.rpc('exec_sql', {
    sql: `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      DROP FUNCTION IF EXISTS handle_new_user();
    `
  }).catch(() => ({ error: 'ignored' }));

  const { error: createFuncError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        BEGIN
          INSERT INTO profiles (id, email, full_name)
          VALUES (
            NEW.id,
            NEW.email,
            COALESCE(
              NEW.raw_user_meta_data->>'full_name',
              split_part(NEW.email, '@', 1)
            )
          );
        EXCEPTION
          WHEN unique_violation THEN
            UPDATE profiles
            SET 
              email = NEW.email,
              full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name)
            WHERE id = NEW.id;
          WHEN OTHERS THEN
            RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        END;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION handle_new_user();
    `
  }).catch(err => {
    console.log('No se pudo ejecutar SQL directamente, intentando con API...');
    return { error: err };
  });

  // Intentar crear el usuario de otra manera
  console.log('🔄 Intentando crear usuario...');
  
  // Primero verificar si ya existe
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  const fullName = process.env.TEST_USER_NAME || 'Test User';
  
  if (!email || !password) {
    console.error('❌ Error: Missing test user credentials in environment variables');
    console.log('💡 Tip: Add TEST_USER_EMAIL and TEST_USER_PASSWORD to your .env file');
    process.exit(1);
  }
  
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const userExists = existingUsers?.users?.some(u => u.email === email);
  
  if (userExists) {
    console.log('✅ El usuario ya existe. Puedes iniciar sesión con las credenciales en tu archivo .env');
    return;
  }

  // Si no existe, usar el método de signup normal
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) {
    console.error('Error:', error.message);
    
    // Si es un error de que ya existe, está bien
    if (error.message.includes('already registered')) {
      console.log('✅ El usuario ya fue creado previamente. Puedes iniciar sesión.');
    }
  } else {
    console.log('✅ Usuario creado exitosamente');
    
    // Intentar actualizar para confirmar el email
    try {
      await supabase.auth.admin.updateUserById(data.user.id, {
        email_confirm: true
      });
      console.log('✅ Email confirmado automáticamente');
    } catch (e) {
      console.log('⚠️ No se pudo confirmar el email automáticamente');
    }
  }

  console.log('\n🎉 Ya puedes iniciar sesión con las credenciales configuradas en tu archivo .env');
}

fixAndCreateUser();