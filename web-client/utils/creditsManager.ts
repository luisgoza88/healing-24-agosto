import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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
    const supabase = createClientComponentClient();
    
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
 * Usa créditos para pagar una nueva cita/reserva
 */
export const useCreditsForAppointment = async (
  userId: string,
  appointmentId: string,
  amountToUse: number
): Promise<boolean> => {
  try {
    const supabase = createClientComponentClient();
    
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
    const supabase = createClientComponentClient();
    
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
    const supabase = createClientComponentClient();
    
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