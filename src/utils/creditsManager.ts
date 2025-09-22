import { supabase } from '../lib/supabase';
import {
  CreditsManager,
  type UserCredit as SharedUserCredit,
  type CreditTransaction as SharedCreditTransaction
} from '../../shared/utils/creditsManager';

export type UserCredit = SharedUserCredit;
export type CreditTransaction = SharedCreditTransaction;

const creditsManager = new CreditsManager(supabase);

const isCreditsSystemUnavailable = (error: any): boolean => {
  if (!error) return false;
  const message = typeof error === 'string' ? error : error.message || '';
  const code = error.code;

  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes('user_credits') ||
    message.includes('credit_transactions') ||
    message.includes('get_user_credit_balance')
  );
};

/**
 * Obtiene el balance total de créditos disponibles para un usuario
 */
export const getUserCreditBalance = async (userId: string): Promise<number> => {
  try {
    return await creditsManager.getUserCreditBalance(userId);
  } catch (error) {
    if (isCreditsSystemUnavailable(error)) {
      console.log('[getUserCreditBalance] Credits system not ready, returning 0 balance');
      return 0;
    }

    console.error('[getUserCreditBalance] Unexpected error:', error);
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
    return await creditsManager.createCancellationCredit(userId, appointmentId, amount, description);
  } catch (error: any) {
    if (isCreditsSystemUnavailable(error)) {
      console.log('[createCancellationCredit] Credits system not ready - skipping credit creation');
      return null;
    }

    console.error('[createCancellationCredit] Error creating credit:', error);
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
    return await creditsManager.useCreditsForAppointment(userId, appointmentId, amountToUse);
  } catch (error: any) {
    if (isCreditsSystemUnavailable(error)) {
      console.log('[useCreditsForAppointment] Credits system not ready - skipping credit deduction');
      return false;
    }

    console.error('[useCreditsForAppointment] Error using credits:', error);
    return false;
  }
};

/**
 * Obtiene el historial completo de créditos de un usuario
 */
export const getUserCreditsHistory = async (userId: string): Promise<UserCredit[]> => {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isCreditsSystemUnavailable(error)) {
        console.log('[getUserCreditsHistory] Credits system not ready - returning empty history');
        return [];
      }

      console.error('[getUserCreditsHistory] Error fetching history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    if (isCreditsSystemUnavailable(error)) {
      return [];
    }

    console.error('[getUserCreditsHistory] Unexpected error:', error);
    return [];
  }
};

/**
 * Obtiene las transacciones de créditos de un usuario
 */
export const getUserCreditTransactions = async (userId: string, limit: number = 100): Promise<CreditTransaction[]> => {
  try {
    return await creditsManager.getCreditTransactions(userId, limit);
  } catch (error: any) {
    if (isCreditsSystemUnavailable(error)) {
      console.log('[getUserCreditTransactions] Credits system not ready - returning empty transactions');
      return [];
    }

    console.error('[getUserCreditTransactions] Error fetching transactions:', error);
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
  if (cancellationTimeHours >= 24) {
    return appointmentAmount;
  } else if (cancellationTimeHours >= 12) {
    return appointmentAmount * 0.75;
  } else if (cancellationTimeHours >= 4) {
    return appointmentAmount * 0.5;
  } else {
    return appointmentAmount * 0.25;
  }
};

/**
 * Verifica si una cita es elegible para generar créditos
 */
export const isEligibleForCancellationCredit = (
  appointmentDate: string,
  appointmentAmount: number
): boolean => {
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
    if (!isEligibleForCancellationCredit(appointmentDate, appointmentAmount)) {
      return { success: true };
    }

    const appointmentDateTime = new Date(appointmentDate);
    const now = new Date();
    const timeUntilAppointmentHours = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
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
    if (isCreditsSystemUnavailable(error)) {
      console.log('[processCancellationWithCredits] Credits system not ready - skipping credit generation');
      return { success: true };
    }

    console.error('Error processing cancellation with credits:', error);
    return { success: false };
  }
};
