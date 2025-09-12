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
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadCredits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuario no autenticado');
        return;
      }

      // Cargar créditos del usuario - con manejo de error específico
      try {
        const { data: creditsData, error: creditsError } = await supabase
          .from('patient_credits')
          .select('*')
          .eq('patient_id', user.id)
          .maybeSingle();

        if (creditsError && creditsError.code !== 'PGRST116') {
          // Si es error de recursión infinita, ignorar y continuar
          if (creditsError.code === '42P17') {
            console.warn('Error de políticas en patient_credits, continuando sin créditos');
            setCredits(null);
          } else {
            throw creditsError;
          }
        } else {
          setCredits(creditsData || null);
          setLastRefresh(new Date());
        }
      } catch (creditsErr) {
        console.warn('Error cargando créditos:', creditsErr);
        setCredits(null);
      }

      // Cargar transacciones - con manejo de error específico
      try {
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (transactionsError) {
          // Si es error de recursión infinita, ignorar y continuar
          if (transactionsError.code === '42P17') {
            console.warn('Error de políticas en credit_transactions, continuando sin transacciones');
            setTransactions([]);
          } else {
            throw transactionsError;
          }
        } else {
          setTransactions(transactionsData || []);
        }
      } catch (transErr) {
        console.warn('Error cargando transacciones:', transErr);
        setTransactions([]);
      }
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
    let channel: any = null;
    
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`credits-changes-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'patient_credits',
            filter: `patient_id=eq.${user.id}`
          },
          (payload) => {
            loadCredits();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'credit_transactions',
            filter: `patient_id=eq.${user.id}`
          },
          (payload) => {
            loadCredits();
          }
        )
        .subscribe();
    };

    setupSubscription();

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return {
    credits,
    transactions,
    loading,
    error,
    lastRefresh,
    refresh: () => {
      return loadCredits();
    }
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