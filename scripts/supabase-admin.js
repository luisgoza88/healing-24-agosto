const { createClient } = require('@supabase/supabase-js');
const express = require('express');

const SUPABASE_URL = 'https://vgwyhegpymqbljqtskra.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3loZWdweW1xYmxqcXRza3JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA1NTYxMywiZXhwIjoyMDcxNjMxNjEzfQ.Ze7tkXgKYa1iKt68eBrdDyQ4jZjDY_hdrEHlXRvm8j8';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Funciones admin disponibles
const adminFunctions = {
  // Crear usuario
  async createUser(email, password, metadata = {}) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata
      });
      return { success: !error, data, error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Listar usuarios
  async listUsers() {
    try {
      const { data, error } = await supabase.auth.admin.listUsers();
      return { success: !error, data, error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Eliminar usuario
  async deleteUser(userId) {
    try {
      const { data, error } = await supabase.auth.admin.deleteUser(userId);
      return { success: !error, data, error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Ejecutar SQL
  async executeSQL(sql) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      return { success: !error, data, error };
    } catch (err) {
      // Si no existe la función, intentar crear una
      return { success: false, error: 'SQL execution not available' };
    }
  },

  // CRUD para cualquier tabla
  async select(table, filters = {}) {
    let query = supabase.from(table).select('*');
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const { data, error } = await query;
    return { success: !error, data, error };
  },

  async insert(table, data) {
    const { data: result, error } = await supabase.from(table).insert(data);
    return { success: !error, data: result, error };
  },

  async update(table, id, data) {
    const { data: result, error } = await supabase.from(table).update(data).eq('id', id);
    return { success: !error, data: result, error };
  },

  async delete(table, id) {
    const { data: result, error } = await supabase.from(table).delete().eq('id', id);
    return { success: !error, data: result, error };
  }
};

// Si se ejecuta directamente, ejecutar comandos
if (require.main === module) {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'create-user':
      if (args.length < 2) {
        console.log('Uso: node supabase-admin.js create-user <email> <password> [nombre]');
        process.exit(1);
      }
      adminFunctions.createUser(args[0], args[1], { full_name: args[2] || args[0].split('@')[0] })
        .then(result => {
          if (result.success) {
            console.log('✅ Usuario creado:', result.data.user.email);
          } else {
            console.error('❌ Error:', result.error);
          }
        });
      break;

    case 'list-users':
      adminFunctions.listUsers()
        .then(result => {
          if (result.success) {
            console.log('Usuarios encontrados:', result.data.users.length);
            result.data.users.forEach(user => {
              console.log(`- ${user.email} (${user.id})`);
            });
          } else {
            console.error('❌ Error:', result.error);
          }
        });
      break;

    case 'fix-trigger':
      const fixSQL = `
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        DROP FUNCTION IF EXISTS handle_new_user();
      `;
      console.log('Para arreglar el trigger, ejecuta este SQL en Supabase:');
      console.log(fixSQL);
      break;

    default:
      console.log('Comandos disponibles:');
      console.log('  create-user <email> <password> [nombre]');
      console.log('  list-users');
      console.log('  fix-trigger');
  }
}

module.exports = adminFunctions;