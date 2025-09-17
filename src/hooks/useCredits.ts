/**
 * HOOK DE CRÉDITOS PARA REACT NATIVE
 * Usa el sistema unificado de créditos
 */

import { supabase } from '../lib/supabase';
import { 
  useUserCredits as useUserCreditsShared, 
  useAllCredits as useAllCreditsShared, 
  useCreditCalculations as useCreditCalculationsShared 
} from '../../shared/hooks/useCredits';

// Re-exportar los tipos desde el sistema unificado
export type {
  UserCredit,
  CreditTransaction,
  CreditsSummary
} from '../../shared/utils/creditsManager';

/**
 * Hook principal para créditos del usuario actual
 */
export function useUserCredits(userId?: string) {
  return useUserCreditsShared(supabase, userId);
}

/**
 * Hook para administradores (todos los créditos)
 */
export function useAllCredits() {
  return useAllCreditsShared(supabase);
}

/**
 * Hook para cálculos de créditos
 */
export function useCreditCalculations() {
  return useCreditCalculationsShared();
}

// Funciones de conveniencia específicas para React Native
export { getUserCreditBalance, createCancellationCredit, useCreditsForAppointment, calculateCreditAmount } from '../../shared/utils/creditsManager';