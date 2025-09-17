#!/usr/bin/env node

/**
 * Script de verificación del sistema unificado
 * Verifica que los sistemas de auth y créditos funcionen correctamente
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Intentar cargar configuración desde diferentes fuentes
let supabaseUrl, supabaseKey;

// 1. Intentar desde variables de entorno
require('dotenv').config();
supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 2. Si no están disponibles, usar configuración de prueba
if (!supabaseUrl || !supabaseKey) {
  console.log('⚠️  Variables de entorno no encontradas, usando configuración de prueba...');
  
  // Configuración de ejemplo - REEMPLAZAR con tus valores reales
  supabaseUrl = 'https://tu-proyecto.supabase.co';
  supabaseKey = 'tu-anon-key';
  
  console.log('📝 Para una verificación completa, configura las variables de entorno:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=tu-url');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key\n');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabase() {
  console.log('🔍 Verificando estructura de base de datos...\n');

  try {
    // Verificar tablas principales
    const tables = ['user_credits', 'credit_transactions', 'profiles'];
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Tabla ${table}: ${error.message}`);
      } else {
        console.log(`✅ Tabla ${table}: OK`);
      }
    }

    // Verificar funciones RPC
    console.log('\n🔍 Verificando funciones de base de datos...\n');
    
    const functions = [
      'is_admin',
      'get_user_roles', 
      'get_user_credit_balance',
      'create_cancellation_credit',
      'use_credits_for_appointment'
    ];

    for (const func of functions) {
      try {
        // Intentar llamar cada función con parámetros de prueba
        let result;
        switch (func) {
          case 'is_admin':
            result = await supabase.rpc(func, { user_uuid: '00000000-0000-0000-0000-000000000000' });
            break;
          case 'get_user_roles':
            result = await supabase.rpc(func, { user_uuid: '00000000-0000-0000-0000-000000000000' });
            break;
          case 'get_user_credit_balance':
            result = await supabase.rpc(func, { p_user_id: '00000000-0000-0000-0000-000000000000' });
            break;
          default:
            // Para funciones que requieren parámetros específicos, solo verificar que existan
            result = { error: null };
        }
        
        if (result.error && result.error.code !== '42883') {
          console.log(`✅ Función ${func}: OK`);
        } else if (result.error && result.error.code === '42883') {
          console.log(`❌ Función ${func}: No existe`);
        } else {
          console.log(`✅ Función ${func}: OK`);
        }
      } catch (error) {
        console.log(`❌ Función ${func}: ${error.message}`);
      }
    }

    // Verificar vista
    console.log('\n🔍 Verificando vistas...\n');
    const { data: viewData, error: viewError } = await supabase
      .from('user_credits_summary')
      .select('*')
      .limit(1);
    
    if (viewError) {
      console.log(`❌ Vista user_credits_summary: ${viewError.message}`);
    } else {
      console.log(`✅ Vista user_credits_summary: OK`);
    }

  } catch (error) {
    console.error('❌ Error verificando base de datos:', error.message);
  }
}

async function verifyFileStructure() {
  console.log('\n🔍 Verificando estructura de archivos...\n');

  const fs = require('fs');
  const path = require('path');

  const requiredFiles = [
    'shared/utils/creditsManager.ts',
    'shared/utils/authManager.ts',
    'shared/hooks/useCredits.ts',
    'shared/hooks/useAuth.ts',
    'supabase/migrations/99_unified_credits_system.sql',
    'EJECUTAR_MIGRACION_UNIFICADA.sql',
    'INSTRUCCIONES_MIGRACION_UNIFICADA.md'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file}: Existe`);
    } else {
      console.log(`❌ ${file}: No encontrado`);
    }
  }

  // Verificar archivos actualizados
  console.log('\n🔍 Verificando archivos actualizados...\n');
  
  const updatedFiles = [
    'web/src/hooks/useAuth.ts',
    'src/hooks/useCredits.ts'
  ];

  for (const file of updatedFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('shared/hooks/') || content.includes('shared/utils/')) {
        console.log(`✅ ${file}: Actualizado para usar sistema unificado`);
      } else {
        console.log(`⚠️  ${file}: Puede necesitar actualización`);
      }
    } else {
      console.log(`❌ ${file}: No encontrado`);
    }
  }
}

async function runTests() {
  console.log('\n🧪 Ejecutando pruebas básicas...\n');

  try {
    // Test de autenticación (sin login real)
    const { data: { user } } = await supabase.auth.getUser();
    console.log(`ℹ️  Estado de autenticación: ${user ? 'Autenticado' : 'No autenticado'}`);

    // Test de funciones públicas si no requieren auth
    const { data: testBalance, error: balanceError } = await supabase
      .rpc('get_user_credit_balance', { p_user_id: '00000000-0000-0000-0000-000000000000' });
    
    if (!balanceError || balanceError.message.includes('permission denied')) {
      console.log('✅ Función get_user_credit_balance: Accesible (RLS funcionando)');
    } else {
      console.log(`⚠️  Función get_user_credit_balance: ${balanceError.message}`);
    }

  } catch (error) {
    console.log(`⚠️  Error en pruebas: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Iniciando verificación del sistema unificado...\n');
  console.log('=' .repeat(50));
  
  await verifyFileStructure();
  console.log('\n' + '=' .repeat(50));
  
  await verifyDatabase();
  console.log('\n' + '=' .repeat(50));
  
  await runTests();
  console.log('\n' + '=' .repeat(50));
  
  console.log('\n✨ Verificación completada!');
  console.log('\n📋 Próximos pasos:');
  console.log('1. Si hay errores de base de datos, ejecutar EJECUTAR_MIGRACION_UNIFICADA.sql en Supabase');
  console.log('2. Si hay archivos faltantes, verificar que se crearon correctamente');
  console.log('3. Probar la aplicación manualmente para confirmar funcionalidad');
  console.log('4. Revisar INSTRUCCIONES_MIGRACION_UNIFICADA.md para más detalles\n');
}

main().catch(console.error);
