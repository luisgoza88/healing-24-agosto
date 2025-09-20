/**
 * HOOKS UNIFICADOS DE CRÉDITOS
 * Funciona tanto en React Native como en Next.js
 */

import { useState, useEffect, useCallback } from 'react';
import { CreditsManager, UserCredit, CreditTransaction, CreditsSummary } from '../utils/creditsManager';

/**
 * Hook para manejar créditos de un usuario específico
 */
export function useUserCredits(supabaseClient: any, userId?: string) {
  const [credits, setCredits] = useState<UserCredit[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [summary, setSummary] = useState<CreditsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const manager = new CreditsManager(supabaseClient);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [creditsData, balanceData, transactionsData, summaryData] = await Promise.all([
        manager.getUserCredits(userId),
        manager.getUserCreditBalance(userId),
        manager.getCreditTransactions(userId),
        manager.getUserCreditsSummary(userId)
      ]);

      setCredits(creditsData);
      setBalance(balanceData);
      setTransactions(transactionsData);
      setSummary(summaryData);
    } catch (err: any) {
      console.error('Error fetching user credits:', err);
      setError(err.message || 'Error al cargar los créditos');
    } finally {
      setLoading(false);
    }
  }, [userId, manager]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createCancellationCredit = useCallback(async (
    appointmentId: string,
    amount: number,
    description?: string
  ) => {
    if (!userId) throw new Error('Usuario no especificado');

    try {
      const creditId = await manager.createCancellationCredit(userId, appointmentId, amount, description);
      await fetchData(); // Refrescar datos
      return creditId;
    } catch (error) {
      console.error('Error creating cancellation credit:', error);
      throw error;
    }
  }, [userId, manager, fetchData]);

  const useCreditsForAppointment = useCallback(async (
    appointmentId: string,
    amountToUse: number
  ) => {
    if (!userId) throw new Error('Usuario no especificado');

    try {
      const success = await manager.useCreditsForAppointment(userId, appointmentId, amountToUse);
      if (success) {
        await fetchData(); // Refrescar datos
      }
      return success;
    } catch (error) {
      console.error('Error using credits for appointment:', error);
      throw error;
    }
  }, [userId, manager, fetchData]);

  const createManualCredit = useCallback(async (
    amount: number,
    creditType: UserCredit['credit_type'],
    description: string,
    expiresAt?: string
  ) => {
    if (!userId) throw new Error('Usuario no especificado');

    try {
      const creditId = await manager.createManualCredit(userId, amount, creditType, description, expiresAt);
      await fetchData(); // Refrescar datos
      return creditId;
    } catch (error) {
      console.error('Error creating manual credit:', error);
      throw error;
    }
  }, [userId, manager, fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    credits,
    balance,
    transactions,
    summary,
    loading,
    error,
    createCancellationCredit,
    useCreditsForAppointment,
    createManualCredit,
    refresh
  };
}

/**
 * Hook para administradores - maneja créditos de todos los usuarios
 */
export function useAllCredits(supabaseClient: any) {
  const [allSummaries, setAllSummaries] = useState<CreditsSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const manager = new CreditsManager(supabaseClient);

  const fetchAllSummaries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const summaries = await manager.getAllCreditsSummary();
      setAllSummaries(summaries);
    } catch (err: any) {
      console.error('Error fetching all credits summaries:', err);
      setError(err.message || 'Error al cargar los resúmenes de créditos');
    } finally {
      setLoading(false);
    }
  }, [manager]);

  useEffect(() => {
    fetchAllSummaries();
  }, [fetchAllSummaries]);

  const createManualCreditForUser = useCallback(async (
    userId: string,
    amount: number,
    creditType: UserCredit['credit_type'],
    description: string,
    expiresAt?: string
  ) => {
    try {
      const creditId = await manager.createManualCredit(userId, amount, creditType, description, expiresAt);
      await fetchAllSummaries(); // Refrescar datos
      return creditId;
    } catch (error) {
      console.error('Error creating manual credit for user:', error);
      throw error;
    }
  }, [manager, fetchAllSummaries]);

  const expireOldCredits = useCallback(async () => {
    try {
      const expiredCount = await manager.expireOldCredits();
      await fetchAllSummaries(); // Refrescar datos
      return expiredCount;
    } catch (error) {
      console.error('Error expiring old credits:', error);
      throw error;
    }
  }, [manager, fetchAllSummaries]);

  const refresh = useCallback(() => {
    fetchAllSummaries();
  }, [fetchAllSummaries]);

  return {
    allSummaries,
    loading,
    error,
    createManualCreditForUser,
    expireOldCredits,
    refresh
  };
}

/**
 * Hook para cálculos de créditos (no requiere supabase)
 */
export function useCreditCalculations() {
  const calculateCreditAmount = useCallback((
    appointmentAmount: number,
    appointmentDate: string,
    appointmentTime: string
  ): { creditAmount: number; refundPercentage: number } => {
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilAppointment >= 24) {
      return { creditAmount: appointmentAmount, refundPercentage: 100 };
    } else if (hoursUntilAppointment >= 12) {
      const creditAmount = appointmentAmount * 0.75;
      return { creditAmount, refundPercentage: 75 };
    } else if (hoursUntilAppointment >= 6) {
      const creditAmount = appointmentAmount * 0.50;
      return { creditAmount, refundPercentage: 50 };
    } else if (hoursUntilAppointment >= 2) {
      const creditAmount = appointmentAmount * 0.25;
      return { creditAmount, refundPercentage: 25 };
    } else {
      return { creditAmount: 0, refundPercentage: 0 };
    }
  }, []);

  const formatCreditAmount = useCallback((amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  }, []);

  const getCreditTypeLabel = useCallback((creditType: UserCredit['credit_type']): string => {
    const labels = {
      cancellation: 'Cancelación',
      refund: 'Reembolso',
      promotion: 'Promoción',
      admin_adjustment: 'Ajuste Administrativo',
      migration: 'Migración'
    };
    return labels[creditType] || creditType;
  }, []);

  const getTransactionTypeLabel = useCallback((transactionType: CreditTransaction['transaction_type']): string => {
    const labels = {
      earned: 'Ganado',
      used: 'Usado',
      expired: 'Expirado',
      refunded: 'Reembolsado',
      adjustment: 'Ajuste'
    };
    return labels[transactionType] || transactionType;
  }, []);

  return {
    calculateCreditAmount,
    formatCreditAmount,
    getCreditTypeLabel,
    getTransactionTypeLabel
  };
}








