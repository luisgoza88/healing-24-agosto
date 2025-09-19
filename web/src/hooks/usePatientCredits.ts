import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase';

interface CreditSummary {
  available_balance: number;
  total_earned: number;
  total_used: number;
  pending_expiry: number;
}

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'earned' | 'used' | 'expired' | 'refund' | 'manual' | 'cancellation';
  description?: string;
  created_at: string;
  appointment_id?: string;
  expires_at?: string;
}

// Hook principal para obtener créditos de un paciente
export function usePatientCredits(patientId?: string) {
  const supabase = useSupabase();
  
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['patient-credits', patientId],
    queryFn: async (): Promise<CreditSummary> => {
      if (!patientId) {
        return {
          available_balance: 0,
          total_earned: 0,
          total_used: 0,
          pending_expiry: 0,
        };
      }

      // Obtener el balance actual del usuario
      const { data: creditData, error } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', patientId)
        .single();

      if (error || !creditData) {
        console.log('[usePatientCredits] No credits found for user:', patientId);
        return {
          available_balance: 0,
          total_earned: 0,
          total_used: 0,
          pending_expiry: 0,
        };
      }

      // Obtener estadísticas de transacciones
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('amount, type')
        .eq('user_id', patientId);

      let totalEarned = 0;
      let totalUsed = 0;

      transactions?.forEach(tx => {
        if (tx.type === 'earned' || tx.type === 'refund' || tx.type === 'manual' || tx.type === 'cancellation') {
          totalEarned += tx.amount;
        } else if (tx.type === 'used') {
          totalUsed += Math.abs(tx.amount);
        }
      });

      return {
        available_balance: creditData.balance || 0,
        total_earned: totalEarned,
        total_used: totalUsed,
        pending_expiry: 0, // Por ahora no manejamos expiración
      };
    },
    enabled: !!patientId,
    staleTime: 30 * 1000, // 30 segundos
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['credit-transactions', patientId],
    queryFn: async (): Promise<CreditTransaction[]> => {
      if (!patientId) return [];

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[usePatientCredits] Error fetching transactions:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });

  return {
    balance: summary?.available_balance || 0,
    summary,
    transactions,
    loading: summaryLoading || transactionsLoading,
  };
}

// Hook para obtener transacciones de créditos
export function useCreditTransactions(patientId?: string) {
  const supabase = useSupabase();
  
  return useQuery({
    queryKey: ['credit-transactions', patientId],
    queryFn: async (): Promise<CreditTransaction[]> => {
      if (!patientId) return [];

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useCreditTransactions] Error:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

// Hook para crear crédito manual
export function useCreateManualCredit() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return useMutation({
    mutationFn: async ({
      patientId,
      amount,
      description,
    }: {
      patientId: string;
      amount: number;
      description?: string;
    }) => {
      // Crear transacción de crédito
      const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: patientId,
          amount: amount,
          type: 'manual',
          description: description || 'Crédito manual agregado',
        });

      if (txError) throw txError;

      // Actualizar balance
      const { data: currentCredit } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', patientId)
        .single();

      const newBalance = (currentCredit?.balance || 0) + amount;

      const { error: updateError } = await supabase
        .from('user_credits')
        .upsert({
          user_id: patientId,
          balance: newBalance,
        });

      if (updateError) throw updateError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-credits', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['credit-transactions', variables.patientId] });
    },
    onError: (error) => {
      console.error('Error creating manual credit:', error);
    },
  });
}

// Hook para generar crédito por cancelación
export function useGenerateCredit() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return {
    mutate: async (data: {
      appointmentId: string;
      patientId: string;
      amount: number;
      description?: string;
    }) => {
      try {
        // Crear transacción de crédito por cancelación
        const { error: txError } = await supabase
          .from('credit_transactions')
          .insert({
            user_id: data.patientId,
            appointment_id: data.appointmentId,
            amount: data.amount,
            type: 'cancellation',
            description: data.description || `Cancelación de cita ${data.appointmentId}`,
          });

        if (txError) throw txError;

        // Actualizar balance
        const { data: currentCredit } = await supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', data.patientId)
          .single();

        const newBalance = (currentCredit?.balance || 0) + data.amount;

        const { error: updateError } = await supabase
          .from('user_credits')
          .upsert({
            user_id: data.patientId,
            balance: newBalance,
          });

        if (updateError) throw updateError;

        // Invalidar queries
        queryClient.invalidateQueries({ queryKey: ['patient-credits', data.patientId] });
        queryClient.invalidateQueries({ queryKey: ['credit-transactions', data.patientId] });
      } catch (error) {
        console.error('Error generating credit:', error);
        throw error;
      }
    },
    isLoading: false,
  };
}

// Función para calcular el monto de crédito según política de cancelación
export function calculateCreditAmount(
  totalAmount: number,
  appointmentDate: string,
  appointmentTime: string
): { creditAmount: number; refundPercentage: number } {
  const now = new Date();
  const aptDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
  const hoursUntilAppointment = (aptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  let refundPercentage = 0;
  
  if (hoursUntilAppointment >= 24) {
    refundPercentage = 100; // Reembolso completo con 24+ horas de anticipación
  } else if (hoursUntilAppointment >= 12) {
    refundPercentage = 50; // 50% con 12-24 horas
  } else if (hoursUntilAppointment >= 6) {
    refundPercentage = 25; // 25% con 6-12 horas
  } else {
    refundPercentage = 0; // Sin reembolso con menos de 6 horas
  }

  const creditAmount = (totalAmount * refundPercentage) / 100;

  return {
    creditAmount: Math.round(creditAmount), // Redondear a entero
    refundPercentage,
  };
}

// Función para usar créditos en una cita
export async function useCreditsForAppointment(
  supabase: any,
  userId: string,
  appointmentId: string,
  amount: number
): Promise<boolean> {
  try {
    // Verificar balance actual
    const { data: currentCredit } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (!currentCredit || currentCredit.balance < amount) {
      console.error('Insufficient credits');
      return false;
    }

    // Crear transacción de uso de créditos
    const { error: txError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        appointment_id: appointmentId,
        amount: -amount, // Negativo para indicar uso
        type: 'used',
        description: `Pago parcial para cita ${appointmentId}`,
      });

    if (txError) throw txError;

    // Actualizar balance
    const newBalance = currentCredit.balance - amount;
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ balance: newBalance })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Error using credits:', error);
    return false;
  }
}

// Re-exportar para compatibilidad
export function getUserCreditBalance(credits: any): number {
  return credits?.balance || credits?.available_balance || 0;
}