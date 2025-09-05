import { supabase } from '../lib/supabase';

export const createTestUser = async () => {
  try {
    // Primero intentamos crear el usuario
    const { data, error } = await supabase.auth.signUp({
      email: 'lmg880@gmail.com',
      password: 'Florida20',
      options: {
        data: {
          full_name: 'Luis Miguel González López'
        },
        emailRedirectTo: undefined // No necesitamos confirmación por email
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      
      // Si el usuario ya existe, intentamos hacer login
      if (error.message.includes('already registered')) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: 'lmg880@gmail.com',
          password: 'Florida20'
        });
        
        if (!loginError) {
          console.log('Usuario ya existe, login exitoso');
          return { success: true, message: 'Login exitoso' };
        }
      }
      
      return { success: false, error: error.message };
    }

    console.log('Usuario creado exitosamente:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Error inesperado:', err);
    return { success: false, error: 'Error inesperado' };
  }
};