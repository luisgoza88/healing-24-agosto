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
      console.log('[useCredits] Loading credits...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuario no autenticado');
        return;
      }
      console.log('[useCredits] User ID:', user.id);

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
          console.log('[useCredits] Credits loaded:', creditsData);
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

      console.log('Setting up realtime subscription for user:', user.id);

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
            console.log('[useCredits] Credits changed:', payload);
            console.log('[useCredits] Event type:', payload.eventType);
            console.log('[useCredits] New data:', payload.new);
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
            console.log('[useCredits] Transaction changed:', payload);
            console.log('[useCredits] Event type:', payload.eventType);
            console.log('[useCredits] New data:', payload.new);
            loadCredits();
          }
        )
        .subscribe((status) => {
          console.log('[useCredits] Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('[useCredits] Successfully subscribed to realtime updates');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[useCredits] Channel error in subscription');
          } else if (status === 'TIMED_OUT') {
            console.error('[useCredits] Subscription timed out');
          } else if (status === 'CLOSED') {
            console.log('[useCredits] Subscription closed');
          }
        });
    };

    setupSubscription();

    // Set up periodic refresh every 30 seconds as a fallback
    const refreshInterval = setInterval(() => {
      console.log('[useCredits] Periodic refresh triggered');
      loadCredits();
    }, 30000);

    // Cleanup
    return () => {
      clearInterval(refreshInterval);
      if (channel) {
        console.log('Removing subscription channel');
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
      console.log('[useCredits] Manual refresh triggered');
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