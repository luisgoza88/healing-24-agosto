#!/usr/bin/env node

/**
 * Script para ejecutar migraciones en Supabase
 * Uso: node scripts/run-migrations.js [--production]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Configuración
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const isProduction = process.argv.includes('--production');

// Validar variables de entorno
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Faltan credenciales de Supabase');
  console.error('   Asegúrate de tener EXPO_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu .env');
  process.exit(1);
}

// Crear cliente de Supabase con permisos de admin
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Tabla para trackear migraciones
const MIGRATIONS_TABLE = '_migrations';

// Función para crear tabla de migraciones si no existe
async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  
  const { error } = await supabase.rpc('exec_sql', { sql: query }).catch(() => ({ 
    // Si exec_sql no existe, intentar con query directa (solo funciona en desarrollo)
    error: 'exec_sql function not available' 
  }));
  
  if (error) {
    console.log('⚠️  No se pudo crear tabla de migraciones automáticamente');
    console.log('   Por favor, ejecuta manualmente en Supabase SQL Editor:');
    console.log(query);
    return false;
  }
  
  return true;
}

// Obtener migraciones ya ejecutadas
async function getExecutedMigrations() {
  const { data, error } = await supabase
    .from(MIGRATIONS_TABLE)
    .select('filename')
    .order('executed_at', { ascending: true });
    
  if (error) {
    console.warn('⚠️  No se pudieron obtener migraciones ejecutadas:', error.message);
    return [];
  }
  
  return data.map(m => m.filename);
}

// Leer archivos de migración
async function getMigrationFiles() {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    return files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Orden alfabético (por fecha si siguen convención YYYYMMDD_)
  } catch (error) {
    console.error('❌ Error leyendo directorio de migraciones:', error);
    return [];
  }
}

// Ejecutar una migración
async function executeMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  
  try {
    const sql = await fs.readFile(filepath, 'utf8');
    
    console.log(`\n📄 Ejecutando: ${filename}`);
    
    // Para producción, mostrar el SQL para ejecución manual
    if (isProduction) {
      console.log('\n--- INICIO SQL ---');
      console.log(sql);
      console.log('--- FIN SQL ---\n');
      console.log('✅ Por favor, ejecuta este SQL en Supabase Dashboard > SQL Editor');
      
      // Marcar como ejecutada manualmente
      await supabase.from(MIGRATIONS_TABLE).insert({ filename });
      
      return true;
    }
    
    // En desarrollo, intentar ejecutar directamente
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`❌ Error ejecutando ${filename}:`, error.message);
      return false;
    }
    
    // Marcar migración como ejecutada
    const { error: trackError } = await supabase
      .from(MIGRATIONS_TABLE)
      .insert({ filename });
      
    if (trackError) {
      console.warn('⚠️  Migración ejecutada pero no se pudo registrar:', trackError.message);
    }
    
    console.log(`✅ ${filename} ejecutada exitosamente`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error procesando ${filename}:`, error.message);
    return false;
  }
}

// Función principal
async function runMigrations() {
  console.log('🚀 Iniciando proceso de migraciones\n');
  console.log(`📍 Ambiente: ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📁 Directorio de migraciones: ${MIGRATIONS_DIR}\n`);
  
  // Crear tabla de migraciones si no existe
  const tableCreated = await createMigrationsTable();
  if (!tableCreated && !isProduction) {
    console.log('\n⚠️  Continuando sin tracking de migraciones...\n');
  }
  
  // Obtener migraciones
  const executedMigrations = await getExecutedMigrations();
  const allMigrations = await getMigrationFiles();
  const pendingMigrations = allMigrations.filter(m => !executedMigrations.includes(m));
  
  console.log(`📊 Estado de migraciones:`);
  console.log(`   - Total: ${allMigrations.length}`);
  console.log(`   - Ejecutadas: ${executedMigrations.length}`);
  console.log(`   - Pendientes: ${pendingMigrations.length}\n`);
  
  if (pendingMigrations.length === 0) {
    console.log('✅ Todas las migraciones están al día!');
    return;
  }
  
  console.log('📋 Migraciones pendientes:');
  pendingMigrations.forEach(m => console.log(`   - ${m}`));
  
  // Confirmar ejecución
  if (isProduction) {
    console.log('\n⚠️  MODO PRODUCCIÓN: Se mostrarán los SQLs para ejecutar manualmente');
    console.log('   Presiona ENTER para continuar o CTRL+C para cancelar...');
    await new Promise(resolve => process.stdin.once('data', resolve));
  }
  
  // Ejecutar migraciones pendientes
  let successCount = 0;
  for (const migration of pendingMigrations) {
    const success = await executeMigration(migration);
    if (success) successCount++;
    
    // En caso de error, preguntar si continuar
    if (!success && !isProduction) {
      console.log('\n¿Continuar con la siguiente migración? (s/n)');
      const answer = await new Promise(resolve => {
        process.stdin.once('data', data => {
          resolve(data.toString().trim().toLowerCase());
        });
      });
      
      if (answer !== 's') {
        break;
      }
    }
  }
  
  console.log(`\n📊 Resumen:`);
  console.log(`   - Migraciones ejecutadas: ${successCount}/${pendingMigrations.length}`);
  
  if (successCount === pendingMigrations.length) {
    console.log('\n✅ ¡Todas las migraciones se ejecutaron exitosamente!');
  } else {
    console.log('\n⚠️  Algunas migraciones no se pudieron ejecutar');
    console.log('   Revisa los errores arriba y ejecuta manualmente si es necesario');
  }
}

// Ejecutar
runMigrations()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });