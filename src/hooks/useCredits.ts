import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface PatientCredit {
  id: string;
  patient_id: string;
  available_credits: number;
  total_earned: number;
  total_used: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  patient_id: string;
  appointment_id?: string;
  amount: number;
  transaction_type: 'earned' | 'used' | 'expired' | 'adjustment';
  source: string;
  description: string;
  created_at: string;
}

export function useUserCredits() {
  const [credits, setCredits] = useState<PatientCredit | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCredits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuario no autenticado');
        return;
      }

      // Cargar créditos del usuario
      const { data: creditsData, error: creditsError } = await supabase
        .from('patient_credits')
        .select('*')
        .eq('patient_id', user.id)
        .maybeSingle();

      if (creditsError && creditsError.code !== 'PGRST116') {
        throw creditsError;
      }

      setCredits(creditsData || null);

      // Cargar transacciones
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsError) {
        throw transactionsError;
      }

      setTransactions(transactionsData || []);
    } catch (err) {
      console.error('Error loading credits:', err);
      setError('Error al cargar los créditos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredits();

    // Configurar suscripción en tiempo real
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const creditsChannel = supabase
        .channel('credits-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'patient_credits',
            filter: `patient_id=eq.${user.id}`
          },
          () => {
            loadCredits();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'credit_transactions',
            filter: `patient_id=eq.${user.id}`
          },
          () => {
            loadCredits();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(creditsChannel);
      };
    };

    setupSubscription();
  }, []);

  return {
    credits,
    transactions,
    loading,
    error,
    refresh: loadCredits
  };
}

// Función helper para formatear el monto de créditos
export function formatCredits(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Función helper para obtener el color del tipo de transacción
export function getTransactionColor(type: 'earned' | 'used' | 'expired' | 'adjustment'): string {
  switch (type) {
    case 'earned':
      return '#22C55E'; // Verde
    case 'used':
      return '#EF4444'; // Rojo
    case 'expired':
      return '#F59E0B'; // Naranja
    case 'adjustment':
      return '#3B82F6'; // Azul
    default:
      return '#6B7280'; // Gris
  }
}