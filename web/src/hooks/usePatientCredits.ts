'use client';

/**
 * Hook de créditos para el panel web
 * Usa el sistema unificado de créditos
 */

import { useUserCredits, useAllCredits, useCreditCalculations } from '../../../shared/hooks/useCredits';
import { createClient } from '@/src/lib/supabase';

// Re-exportar los tipos
export type {
  UserCredit,
  CreditTransaction,
  CreditsSummary
} from '../../../shared/utils/creditsManager';

// Re-exportar hooks con los nombres originales para compatibilidad
export function usePatientCredits(userId?: string) {
  const supabase = createClient();
  return useUserCredits(supabase, userId);
}

export function useAllPatientCredits() {
  const supabase = createClient();
  return useAllCredits(supabase);
}

export { useCreditCalculations };

// Hooks adicionales para el admin panel
export function useCreateManualCredit() {
  const supabase = createClient();
  const { createManualCreditForUser, loading } = useAllCredits(supabase);
  
  return {
    mutate: async (data: {
      patientId: string;
      amount: number;
      description: string;
      reason: string;
    }) => {
      try {
        await createManualCreditForUser(
          data.patientId,
          data.amount,
          'admin_adjustment',
          `${data.reason}: ${data.description}`
        );
      } catch (error) {
        console.error('Error creating manual credit:', error);
        throw error;
      }
    },
    isLoading: loading
  };
}

// Hook para generar créditos por cancelación (para compatibilidad)
export function useGenerateCredit() {
  const supabase = createClient();
  const { allSummaries, createManualCreditForUser, loading } = useAllCredits(supabase);
  
  return {
    mutate: async (data: {
      appointmentId: string;
      patientId: string;
      amount: number;
      description?: string;
    }) => {
      try {
        await createManualCreditForUser(
          data.patientId,
          data.amount,
          'cancellation',
          data.description || `Cancelación de cita ${data.appointmentId}`
        );
      } catch (error) {
        console.error('Error generating credit:', error);
        throw error;
      }
    },
    isLoading: loading
  };
}

// Re-exportar funciones de utilidad
export { 
  getUserCreditBalance, 
  createCancellationCredit, 
  useCreditsForAppointment,
  calculateCreditAmount 
} from '../../../shared/utils/creditsManager';