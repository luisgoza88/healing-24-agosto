/**
 * Script para ejecutar las correcciones SQL en Supabase
 * Ejecutar con: node execute-sql-fixes.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan las credenciales de Supabase');
  console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_KEY en tu .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQLFixes() {
  console.log('🚀 Iniciando correcciones SQL...\n');

  try {
    // 1. Verificar conexión
    console.log('1️⃣ Verificando conexión a Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      throw new Error(`Error de conexión: ${testError.message}`);
    }
    console.log('✅ Conexión exitosa\n');

    // 2. Verificar y actualizar tabla professionals
    console.log('2️⃣ Verificando tabla professionals...');
    const { data: profData, error: profError } = await supabase
      .from('professionals')
      .select('*')
      .limit(1);
    
    if (!profError) {
      console.log('✅ Tabla professionals existe\n');
    } else {
      console.log('⚠️  Tabla professionals no existe o hay un error\n');
    }

    // 3. Verificar roles de admin
    console.log('3️⃣ Verificando usuarios admin...');
    const { data: adminUsers, error: adminError } = await supabase
      .from('profiles')
      .select('email, role')
      .in('email', ['lmg880@gmail.com', 'admin@healingforest.com']);
    
    if (adminUsers) {
      console.log('Usuarios encontrados:');
      adminUsers.forEach(user => {
        console.log(`   - ${user.email}: ${user.role || 'sin rol'}`);
      });
    }

    // 4. Actualizar roles de admin usando la API de Admin
    console.log('\n4️⃣ Actualizando roles de admin...');
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'super_admin' })
      .in('email', ['lmg880@gmail.com', 'admin@healingforest.com']);
    
    if (updateError) {
      console.error('❌ Error actualizando roles:', updateError.message);
    } else {
      console.log('✅ Roles actualizados correctamente\n');
    }

    // 5. Verificar servicios
    console.log('5️⃣ Verificando servicios...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('name')
      .limit(5);
    
    if (services && services.length > 0) {
      console.log(`✅ ${services.length} servicios encontrados\n`);
    } else if (!servicesError) {
      console.log('⚠️  No hay servicios, insertando datos de prueba...');
      
      const { error: insertError } = await supabase
        .from('services')
        .insert([
          { name: 'Consulta General', description: 'Consulta médica general', base_price: 150000, duration_minutes: 30, category: 'Medicina', is_active: true },
          { name: 'Terapia Física', description: 'Sesión de fisioterapia', base_price: 180000, duration_minutes: 45, category: 'Terapias', is_active: true },
          { name: 'Breathe & Move', description: 'Clase grupal de respiración y movimiento', base_price: 120000, duration_minutes: 60, category: 'Clases', is_active: true }
        ]);
      
      if (!insertError) {
        console.log('✅ Servicios de prueba insertados\n');
      }
    }

    console.log('✨ ¡Proceso completado!');
    console.log('\nNOTA: Algunas operaciones como crear funciones SQL o modificar columnas');
    console.log('requieren ejecutarse directamente en el SQL Editor de Supabase.');
    console.log('\nPor favor, ejecuta el archivo FIX_DASHBOARD_COMPLETE.sql en el SQL Editor para:');
    console.log('- Renombrar columna active → is_active en professionals');
    console.log('- Crear funciones is_admin y get_user_roles');
    console.log('- Configurar políticas RLS');
    console.log('- Crear triggers');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runSQLFixes();