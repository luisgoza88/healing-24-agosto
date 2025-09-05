const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vgwyhegpymqbljqtskra.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3loZWdweW1xYmxqcXRza3JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA1NTYxMywiZXhwIjoyMDcxNjMxNjEzfQ.Ze7tkXgKYa1iKt68eBrdDyQ4jZjDY_hdrEHlXRvm8j8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUser() {
  console.log('🔍 Verificando si el usuario existe...');
  
  // Listar usuarios existentes
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listando usuarios:', listError);
    return;
  }
  
  const existingUser = users.find(u => u.email === 'lmg880@gmail.com');
  
  if (existingUser) {
    console.log('✅ El usuario ya existe!');
    console.log('ID:', existingUser.id);
    console.log('Email:', existingUser.email);
    console.log('Creado:', new Date(existingUser.created_at).toLocaleString());
    
    // Verificar perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', existingUser.id)
      .single();
      
    if (!profile) {
      console.log('⚠️ Creando perfil faltante...');
      await supabase
        .from('profiles')
        .insert({
          id: existingUser.id,
          email: 'lmg880@gmail.com',
          full_name: 'Luis Miguel González López'
        });
    }
  } else {
    console.log('📝 Creando nuevo usuario...');
    
    // Método alternativo: primero crear sin contraseña
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'lmg880@gmail.com',
      email_confirm: true,
      user_metadata: {
        full_name: 'Luis Miguel González López'
      }
    });
    
    if (createError) {
      console.error('Error creando usuario:', createError);
      return;
    }
    
    console.log('✅ Usuario creado, actualizando contraseña...');
    
    // Actualizar con contraseña
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      newUser.user.id,
      { password: 'Florida20' }
    );
    
    if (updateError) {
      console.error('Error actualizando contraseña:', updateError);
    }
    
    console.log('✅ Usuario creado completamente');
  }
  
  console.log('\n🎉 Credenciales de acceso:');
  console.log('Email: lmg880@gmail.com');
  console.log('Contraseña: Florida20');
  console.log('\nYa puedes iniciar sesión en la app!');
}

createUser();