// Utilidades para pagos de prueba
import { supabase } from '../lib/supabase';
import { addDays, addMonths } from 'date-fns';

export const createTestMembership = async (userId: string, membershipTypeId: string) => {
  try {
    // Crear una membresía de prueba válida por 30 días
    const { data, error } = await supabase
      .from('user_memberships')
      .insert({
        user_id: userId,
        membership_id: membershipTypeId,
        start_date: new Date().toISOString(),
        end_date: addDays(new Date(), 30).toISOString(),
        status: 'active',
        classes_used: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating test membership:', error);
    throw error;
  }
};

export const createTestBreatheMovePackage = async (userId: string, classCount: number) => {
  try {
    // Crear un paquete de prueba
    const { data, error } = await supabase
      .from('breathe_move_packages')
      .insert({
        user_id: userId,
        package_type: `${classCount}-classes`,
        classes_total: classCount,
        classes_used: 0,
        status: 'active',
        valid_until: addMonths(new Date(), 1).toISOString(),
        payment_status: 'paid',
        payment_amount: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating test package:', error);
    throw error;
  }
};

// Verificar si un usuario tiene membresías o paquetes activos de prueba
export const hasActiveTestAccess = async (userId: string, type: 'hot_studio' | 'breathe_move') => {
  try {
    if (type === 'hot_studio') {
      const { data, error } = await supabase
        .from('user_memberships')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      return !error && data !== null;
    } else {
      const { data, error } = await supabase
        .from('breathe_move_packages')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      return !error && data !== null;
    }
  } catch (error) {
    return false;
  }
};