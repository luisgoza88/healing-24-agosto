const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Falta configuración de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAdminStatus() {
  console.log('🔍 Verificando estado de admin para img880@gmail.com...\n');

  try {
    // 1. Buscar el usuario
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error buscando usuarios:', userError);
      return;
    }

    const user = users.users.find(u => u.email === 'img880@gmail.com');
    
    if (!user) {
      console.log('❌ Usuario no encontrado con email img880@gmail.com');
      console.log('\n📧 Usuarios existentes:');
      users.users.forEach(u => {
        console.log(`  - ${u.email} (ID: ${u.id})`);
      });
      return;
    }

    console.log(`✅ Usuario encontrado:`);
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Creado: ${new Date(user.created_at).toLocaleDateString()}`);

    // 2. Verificar el perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.log('\n❌ No se encontró perfil para este usuario');
      console.log('   Esto puede ser porque nunca ha iniciado sesión en la app');
      
      // Crear perfil con rol admin
      console.log('\n🔧 Creando perfil con rol admin...');
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          role: 'admin',
          created_at: new Date().toISOString()
        });
      
      if (createError) {
        console.error('❌ Error creando perfil:', createError);
      } else {
        console.log('✅ Perfil creado con rol admin');
      }
      return;
    }

    console.log(`\n📋 Perfil encontrado:`);
    console.log(`  - Role: ${profile.role || 'Sin rol asignado'}`);
    console.log(`  - Nombre: ${profile.full_name || 'No especificado'}`);

    // 3. Si no es admin, actualizar
    if (!['admin', 'super_admin', 'manager'].includes(profile.role)) {
      console.log('\n⚠️  El usuario NO tiene rol de admin');
      console.log('🔧 Actualizando rol a admin...');
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('❌ Error actualizando rol:', updateError);
      } else {
        console.log('✅ Rol actualizado a admin');
      }
    } else {
      console.log('\n✅ El usuario YA tiene rol de admin');
    }

    // 4. Verificar la función is_admin
    console.log('\n🔍 Verificando función is_admin...');
    const { data: isAdminResult, error: funcError } = await supabase
      .rpc('is_admin', { user_uuid: user.id });
    
    if (funcError) {
      console.log('❌ La función is_admin no existe');
      console.log('   Ejecuta la migración 20250118_add_admin_functions.sql en Supabase');
    } else {
      console.log(`✅ Resultado is_admin: ${isAdminResult}`);
    }

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

console.log('🚀 Healing Forest - Verificación de Admin\n');
checkAdminStatus();