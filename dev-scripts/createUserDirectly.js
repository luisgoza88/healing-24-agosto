const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vgwyhegpymqbljqtskra.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3loZWdweW1xYmxqcXRza3JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA1NTYxMywiZXhwIjoyMDcxNjMxNjEzfQ.Ze7tkXgKYa1iKt68eBrdDyQ4jZjDY_hdrEHlXRvm8j8';

// Crear cliente con service role (admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  try {
    // Crear usuario usando la API de admin
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: 'lmg880@gmail.com',
      password: 'Florida20',
      email_confirm: true,
      user_metadata: {
        full_name: 'Luis Miguel González López'
      }
    });

    if (createError) {
      console.error('Error creando usuario:', createError);
      return;
    }

    console.log('✅ Usuario creado exitosamente:', user);
    
    // Verificar que el perfil se creó
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.user.id)
      .single();

    if (profileError) {
      console.log('⚠️ El perfil no se creó automáticamente, creándolo ahora...');
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.user.id,
          email: 'lmg880@gmail.com',
          full_name: 'Luis Miguel González López'
        });
      
      if (insertError) {
        console.error('Error creando perfil:', insertError);
      } else {
        console.log('✅ Perfil creado exitosamente');
      }
    } else {
      console.log('✅ Perfil encontrado:', profile);
    }

    console.log('\n🎉 ¡Todo listo! Ya puedes iniciar sesión con:');
    console.log('Email: lmg880@gmail.com');
    console.log('Contraseña: Florida20');

  } catch (error) {
    console.error('Error inesperado:', error);
  }
}

createTestUser();