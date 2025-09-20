/**
 * SISTEMA UNIFICADO DE CRÉDITOS
 * Este archivo reemplaza las implementaciones duplicadas en mobile y web
 */

import { createClient } from '@supabase/supabase-js';

// Interfaces unificadas
export interface UserCredit {
  id: string;
  user_id: string;
  amount: number;
  credit_type: 'cancellation' | 'refund' | 'promotion' | 'admin_adjustment' | 'migration';
  description?: string;
  expires_at?: string;
  is_used: boolean;
  used_at?: string;
  used_in_appointment_id?: string;
  source_appointment_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  credit_id?: string;
  transaction_type: 'earned' | 'used' | 'expired' | 'refunded' | 'adjustment';
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string;
  appointment_id?: string;
  created_by?: string;
  created_at: string;
}

export interface CreditsSummary {
  user_id: string;
  full_name?: string;
  email: string;
  available_balance: number;
  total_earned: number;
  total_used: number;
  total_expired: number;
  active_credits_count: number;
  user_created_at: string;
}

/**
 * Clase unificada para manejo de créditos
 * Funciona tanto en React Native como en Next.js
 */
export class CreditsManager {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Obtiene el balance total de créditos disponibles para un usuario
   */
  async getUserCreditBalance(userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('get_user_credit_balance', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching user credit balance:', error);
        return 0;
      }

      return parseFloat(data || 0);
    } catch (error) {
      console.error('Error getting user credit balance:', error);
      return 0;
    }
  }

  /**
   * Obtiene todos los créditos activos de un usuario
   */
  async getUserCredits(userId: string): Promise<UserCredit[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_used', false)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching user credits:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user credits:', error);
      return [];
    }
  }

  /**
   * Obtiene el historial de transacciones de créditos
   */
  async getCreditTransactions(userId: string, limit: number = 50): Promise<CreditTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching credit transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting credit transactions:', error);
      return [];
    }
  }

  /**
   * Crea un crédito por cancelación de cita
   */
  async createCancellationCredit(
    userId: string,
    appointmentId: string,
    amount: number,
    description?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.rpc('create_cancellation_credit', {
        p_user_id: userId,
        p_appointment_id: appointmentId,
        p_amount: amount,
        p_description: description
      });

      if (error) {
        console.error('Error creating cancellation credit:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating cancellation credit:', error);
      throw error;
    }
  }

  /**
   * Usa créditos para pagar una nueva cita
   */
  async useCreditsForAppointment(
    userId: string,
    appointmentId: string,
    amountToUse: number
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('use_credits_for_appointment', {
        p_user_id: userId,
        p_appointment_id: appointmentId,
        p_amount_to_use: amountToUse
      });

      if (error) {
        console.error('Error using credits for appointment:', error);
        throw error;
      }

      return data === true;
    } catch (error) {
      console.error('Error using credits for appointment:', error);
      throw error;
    }
  }

  /**
   * Crea un crédito manual (solo para admins)
   */
  async createManualCredit(
    userId: string,
    amount: number,
    creditType: UserCredit['credit_type'],
    description: string,
    expiresAt?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          amount: amount,
          credit_type: creditType,
          description: description,
          expires_at: expiresAt,
          created_by: (await this.supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating manual credit:', error);
        throw error;
      }

      // Crear transacción correspondiente
      const currentBalance = await this.getUserCreditBalance(userId);
      await this.supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          credit_id: data.id,
          transaction_type: 'earned',
          amount: amount,
          balance_before: currentBalance - amount,
          balance_after: currentBalance,
          description: description,
          created_by: (await this.supabase.auth.getUser()).data.user?.id
        });

      return data.id;
    } catch (error) {
      console.error('Error creating manual credit:', error);
      throw error;
    }
  }

  /**
   * Obtiene el resumen de créditos de un usuario
   */
  async getUserCreditsSummary(userId: string): Promise<CreditsSummary | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_credits_summary')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user credits summary:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user credits summary:', error);
      return null;
    }
  }

  /**
   * Obtiene todos los resúmenes de créditos (solo para admins)
   */
  async getAllCreditsSummary(): Promise<CreditsSummary[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_credits_summary')
        .select('*')
        .order('available_balance', { ascending: false });

      if (error) {
        console.error('Error fetching all credits summary:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting all credits summary:', error);
      return [];
    }
  }

  /**
   * Calcula el monto de crédito basado en la política de cancelación
   */
  calculateCreditAmount(
    appointmentAmount: number,
    appointmentDate: string,
    appointmentTime: string
  ): { creditAmount: number; refundPercentage: number } {
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Política de créditos basada en tiempo de cancelación
    if (hoursUntilAppointment >= 24) {
      // 24+ horas: 100% de crédito
      return { creditAmount: appointmentAmount, refundPercentage: 100 };
    } else if (hoursUntilAppointment >= 12) {
      // 12-24 horas: 75% de crédito
      const creditAmount = appointmentAmount * 0.75;
      return { creditAmount, refundPercentage: 75 };
    } else if (hoursUntilAppointment >= 6) {
      // 6-12 horas: 50% de crédito
      const creditAmount = appointmentAmount * 0.50;
      return { creditAmount, refundPercentage: 50 };
    } else if (hoursUntilAppointment >= 2) {
      // 2-6 horas: 25% de crédito
      const creditAmount = appointmentAmount * 0.25;
      return { creditAmount, refundPercentage: 25 };
    } else {
      // Menos de 2 horas: Sin crédito
      return { creditAmount: 0, refundPercentage: 0 };
    }
  }

  /**
   * Expira créditos vencidos (función de mantenimiento)
   */
  async expireOldCredits(): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('expire_old_credits');

      if (error) {
        console.error('Error expiring old credits:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error expiring old credits:', error);
      return 0;
    }
  }
}

// Funciones de conveniencia para usar directamente
export const getUserCreditBalance = async (supabaseClient: any, userId: string): Promise<number> => {
  const manager = new CreditsManager(supabaseClient);
  return manager.getUserCreditBalance(userId);
};

export const createCancellationCredit = async (
  supabaseClient: any,
  userId: string,
  appointmentId: string,
  amount: number,
  description?: string
): Promise<string | null> => {
  const manager = new CreditsManager(supabaseClient);
  return manager.createCancellationCredit(userId, appointmentId, amount, description);
};

export const useCreditsForAppointment = async (
  supabaseClient: any,
  userId: string,
  appointmentId: string,
  amountToUse: number
): Promise<boolean> => {
  const manager = new CreditsManager(supabaseClient);
  return manager.useCreditsForAppointment(userId, appointmentId, amountToUse);
};

export const calculateCreditAmount = (
  appointmentAmount: number,
  appointmentDate: string,
  appointmentTime: string
): { creditAmount: number; refundPercentage: number } => {
  const manager = new CreditsManager(null);
  return manager.calculateCreditAmount(appointmentAmount, appointmentDate, appointmentTime);
};








