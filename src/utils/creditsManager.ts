import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

export interface UserCredit {
  id: string;
  user_id: string;
  amount: number;
  credit_type: 'cancellation' | 'refund' | 'promotion' | 'admin_adjustment';
  description?: string;
  expires_at?: string;
  is_used: boolean;
  used_at?: string;
  used_in_appointment_id?: string;
  source_appointment_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  credit_id?: string;
  transaction_type: 'earned' | 'used' | 'expired' | 'refunded';
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string;
  appointment_id?: string;
  created_at: string;
}

/**
 * Obtiene el balance total de créditos disponibles para un usuario
 */
export const getUserCreditBalance = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('amount')
      .eq('user_id', userId)
      .eq('is_used', false)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (error) {
      // Si la tabla no existe, devolver 0 en lugar de error
      if (error.code === 'PGRST205' || error.message.includes('user_credits')) {
        console.log('Credits table not found, returning 0 balance');
        return 0;
      }
      console.error('Error fetching user credit balance:', error);
      return 0;
    }

    const totalBalance = data?.reduce((sum, credit) => sum + parseFloat(credit.amount.toString()), 0) || 0;
    return totalBalance;
  } catch (error) {
    console.error('Error getting user credit balance:', error);
    return 0;
  }
};

/**
 * Crea un crédito por cancelación de cita
 */
export const createCancellationCredit = async (
  userId: string,
  appointmentId: string,
  amount: number,
  description?: string
): Promise<string | null> => {
  try {
    // Verificar si las tablas de créditos existen
    const { error: testError } = await supabase
      .from('user_credits')
      .select('id')
      .limit(1);

    // Si las tablas no existen, devolver null silenciosamente
    if (testError && (testError.code === 'PGRST205' || testError.message.includes('user_credits'))) {
      console.log('Credits system not yet activated - skipping credit creation');
      return null;
    }

    // Obtener balance actual
    const currentBalance = await getUserCreditBalance(userId);
    const newBalance = currentBalance + amount;
    
    const creditDescription = description || 'Crédito por cancelación de cita';
    
    // Crear el crédito (expira en 12 meses)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 12);
    
    const { data: creditData, error: creditError } = await supabase
      .from('user_credits')
      .insert({
        user_id: userId,
        amount: amount,
        credit_type: 'cancellation',
        description: creditDescription,
        expires_at: expiresAt.toISOString(),
        source_appointment_id: appointmentId,
        created_by: userId
      })
      .select()
      .single();

    if (creditError) {
      console.error('Error creating credit:', creditError);
      // Si es error de tabla no encontrada, devolver null silenciosamente
      if (creditError.code === 'PGRST205' || creditError.message.includes('user_credits')) {
        return null;
      }
      throw creditError;
    }

    // Registrar transacción
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        credit_id: creditData.id,
        transaction_type: 'earned',
        amount: amount,
        balance_before: currentBalance,
        balance_after: newBalance,
        description: creditDescription,
        appointment_id: appointmentId,
        created_by: userId
      });

    if (transactionError) {
      console.error('Error creating credit transaction:', transactionError);
      // No hacer throw aquí para no fallar todo el proceso
    }

    return creditData.id;
  } catch (error) {
    console.error('Error creating cancellation credit:', error);
    // Si es error de tabla no encontrada, devolver null silenciosamente
    if (error.code === 'PGRST205' || error.message?.includes('user_credits')) {
      return null;
    }
    return null;
  }
};

/**
 * Usa créditos para pagar una nueva cita
 */
export const useCreditsForAppointment = async (
  userId: string,
  appointmentId: string,
  amountToUse: number
): Promise<boolean> => {
  try {
    // Verificar que hay suficientes créditos
    const availableBalance = await getUserCreditBalance(userId);
    if (availableBalance < amountToUse) {
      return false;
    }

    // Obtener créditos disponibles ordenados por fecha (FIFO)
    const { data: availableCredits, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_used', false)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching available credits:', error);
      return false;
    }

    if (!availableCredits || availableCredits.length === 0) {
      return false;
    }

    let remainingAmount = amountToUse;
    let currentBalance = availableBalance;

    // Usar créditos hasta completar el monto
    for (const credit of availableCredits) {
      if (remainingAmount <= 0) break;

      const amountToUseFromCredit = Math.min(credit.amount, remainingAmount);

      // Si usamos todo el crédito, marcarlo como usado
      if (amountToUseFromCredit === credit.amount) {
        const { error: updateError } = await supabase
          .from('user_credits')
          .update({
            is_used: true,
            used_at: new Date().toISOString(),
            used_in_appointment_id: appointmentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', credit.id);

        if (updateError) {
          console.error('Error marking credit as used:', updateError);
          continue;
        }
      } else {
        // Si usamos parte del crédito, reducir el monto
        const { error: updateError } = await supabase
          .from('user_credits')
          .update({
            amount: credit.amount - amountToUseFromCredit,
            updated_at: new Date().toISOString()
          })
          .eq('id', credit.id);

        if (updateError) {
          console.error('Error updating credit amount:', updateError);
          continue;
        }
      }

      // Registrar transacción
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          credit_id: credit.id,
          transaction_type: 'used',
          amount: amountToUseFromCredit,
          balance_before: currentBalance,
          balance_after: currentBalance - amountToUseFromCredit,
          description: 'Crédito usado en nueva reserva',
          appointment_id: appointmentId,
          created_by: userId
        });

      if (transactionError) {
        console.error('Error creating credit transaction:', transactionError);
      }

      remainingAmount -= amountToUseFromCredit;
      currentBalance -= amountToUseFromCredit;
    }

    return remainingAmount === 0;
  } catch (error) {
    console.error('Error using credits for appointment:', error);
    return false;
  }
};

/**
 * Obtiene el historial de créditos de un usuario
 */
export const getUserCreditsHistory = async (userId: string): Promise<UserCredit[]> => {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      // Si la tabla no existe, devolver array vacío
      if (error.code === 'PGRST205' || error.message.includes('user_credits')) {
        console.log('Credits table not found, returning empty array');
        return [];
      }
      console.error('Error fetching user credits history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting user credits history:', error);
    return [];
  }
};

/**
 * Obtiene las transacciones de créditos de un usuario
 */
export const getUserCreditTransactions = async (userId: string): Promise<CreditTransaction[]> => {
  try {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      // Si la tabla no existe, devolver array vacío
      if (error.code === 'PGRST205' || error.code === '42703' || error.message.includes('credit_transactions')) {
        console.log('Credit transactions table not found, returning empty array');
        return [];
      }
      console.error('Error fetching credit transactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting credit transactions:', error);
    return [];
  }
};

/**
 * Calcula el monto de crédito a generar por cancelación
 */
export const calculateCancellationCreditAmount = (
  appointmentAmount: number,
  cancellationTimeHours: number
): number => {
  // Política de créditos por cancelación:
  // - Más de 24 horas: 100% del valor
  // - Entre 12-24 horas: 75% del valor
  // - Entre 4-12 horas: 50% del valor
  // - Menos de 4 horas: 25% del valor
  
  if (cancellationTimeHours >= 24) {
    return appointmentAmount; // 100%
  } else if (cancellationTimeHours >= 12) {
    return appointmentAmount * 0.75; // 75%
  } else if (cancellationTimeHours >= 4) {
    return appointmentAmount * 0.50; // 50%
  } else {
    return appointmentAmount * 0.25; // 25%
  }
};

/**
 * Verifica si una cita es elegible para generar créditos
 */
export const isEligibleForCancellationCredit = (
  appointmentDate: string,
  appointmentAmount: number
): boolean => {
  // Solo generar créditos si:
  // 1. La cita tiene un monto mayor a 0
  // 2. La cita no ha pasado ya
  
  const appointmentDateTime = new Date(appointmentDate);
  const now = new Date();
  
  return appointmentAmount > 0 && appointmentDateTime > now;
};

/**
 * Procesa la cancelación con créditos automática
 */
export const processCancellationWithCredits = async (
  userId: string,
  appointmentId: string,
  appointmentDate: string,
  appointmentAmount: number,
  serviceName: string
): Promise<{ success: boolean; creditAmount?: number; creditId?: string }> => {
  try {
    // Verificar elegibilidad
    if (!isEligibleForCancellationCredit(appointmentDate, appointmentAmount)) {
      return { success: true }; // Cancelación exitosa pero sin crédito
    }

    // Calcular tiempo hasta la cita
    const appointmentDateTime = new Date(appointmentDate);
    const now = new Date();
    const timeUntilAppointmentMs = appointmentDateTime.getTime() - now.getTime();
    const timeUntilAppointmentHours = timeUntilAppointmentMs / (1000 * 60 * 60);

    // Calcular monto del crédito
    const creditAmount = calculateCancellationCreditAmount(appointmentAmount, timeUntilAppointmentHours);
    
    if (creditAmount > 0) {
      const description = `Crédito por cancelación de ${serviceName}`;
      const creditId = await createCancellationCredit(userId, appointmentId, creditAmount, description);
      
      return {
        success: true,
        creditAmount,
        creditId: creditId || undefined
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error processing cancellation with credits:', error);
    return { success: false };
  }
};