const fetch = require('node-fetch');

const SUPABASE_URL = 'https://vgwyhegpymqbljqtskra.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3loZWdweW1xYmxqcXRza3JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA1NTYxMywiZXhwIjoyMDcxNjMxNjEzfQ.Ze7tkXgKYa1iKt68eBrdDyQ4jZjDY_hdrEHlXRvm8j8';

async function createUserDirectly() {
  console.log('🚀 Creando usuario con método alternativo...\n');

  try {
    // Paso 1: Crear el usuario usando el API REST directamente
    const createUserResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        email: 'lmg880@gmail.com',
        password: 'Florida20',
        email_confirm: true,
        user_metadata: {
          full_name: 'Luis Miguel González López'
        },
        app_metadata: {},
        aud: 'authenticated',
        role: 'authenticated'
      })
    });

    const result = await createUserResponse.json();

    if (!createUserResponse.ok) {
      // Si el usuario ya existe, obtener su ID
      if (result.msg && result.msg.includes('already been registered')) {
        console.log('⚠️  El usuario ya existe, obteniendo información...');
        
        // Listar usuarios para encontrar el ID
        const listResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?filter=email.eq.lmg880@gmail.com`, {
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY
          }
        });
        
        const { users } = await listResponse.json();
        if (users && users.length > 0) {
          const userId = users[0].id;
          console.log('✅ Usuario encontrado con ID:', userId);
          await createProfile(userId);
        }
      } else {
        console.error('Error:', result);
      }
      return;
    }

    console.log('✅ Usuario creado exitosamente');
    console.log('ID:', result.id);
    
    // Paso 2: Crear el perfil
    await createProfile(result.id);

  } catch (error) {
    console.error('Error:', error);
  }
}

async function createProfile(userId) {
  console.log('\n📝 Creando perfil de usuario...');
  
  // Primero verificar si existe
  const checkResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    }
  );
  
  const existing = await checkResponse.json();
  
  if (existing && existing.length > 0) {
    console.log('✅ El perfil ya existe');
    showCredentials();
    return;
  }
  
  // Crear el perfil
  const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      id: userId,
      email: 'lmg880@gmail.com',
      full_name: 'Luis Miguel González López'
    })
  });

  if (profileResponse.ok) {
    console.log('✅ Perfil creado exitosamente');
  } else {
    const error = await profileResponse.text();
    console.log('⚠️  Error creando perfil:', error);
  }
  
  showCredentials();
}

function showCredentials() {
  console.log('\n' + '='.repeat(50));
  console.log('🎉 ¡TODO LISTO! Ya puedes iniciar sesión con:');
  console.log('='.repeat(50));
  console.log('📧 Email: lmg880@gmail.com');
  console.log('🔑 Contraseña: Florida20');
  console.log('👤 Nombre: Luis Miguel González López');
  console.log('='.repeat(50));
}

// Verificar si node-fetch está instalado
try {
  require.resolve('node-fetch');
  createUserDirectly();
} catch(e) {
  console.log('Instalando dependencias necesarias...');
  require('child_process').execSync('npm install node-fetch@2', { stdio: 'inherit' });
  console.log('Dependencias instaladas. Ejecuta el script nuevamente.');
}