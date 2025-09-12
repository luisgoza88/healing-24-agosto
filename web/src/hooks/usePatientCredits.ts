import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../lib/supabase';

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

// Hook para obtener créditos de un paciente
export function usePatientCredits(patientId: string) {
  return useQuery({
    queryKey: ['patient-credits', patientId],
    queryFn: async (): Promise<PatientCredit | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('patient_credits')
        .select('*')
        .eq('patient_id', patientId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data || null;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000, // 30 segundos
  });
}

// Hook para obtener historial de transacciones de créditos
export function useCreditTransactions(patientId: string) {
  return useQuery({
    queryKey: ['credit-transactions', patientId],
    queryFn: async (): Promise<CreditTransaction[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!patientId,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

// Hook para generar crédito por cancelación
export function useGenerateCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      patientId, 
      appointmentId, 
      amount, 
      reason 
    }: {
      patientId: string;
      appointmentId: string;
      amount: number;
      reason: string;
    }) => {
      const supabase = createClient();
      // 1. Verificar si ya existe registro de créditos para el paciente
      let { data: existingCredits, error: fetchError } = await supabase
        .from('patient_credits')
        .select('*')
        .eq('patient_id', patientId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      // 2. Crear o actualizar registro de créditos
      if (!existingCredits) {
        // Crear nuevo registro
        const { error: createError } = await supabase
          .from('patient_credits')
          .insert({
            patient_id: patientId,
            available_credits: amount,
            total_earned: amount,
            total_used: 0
          });

        if (createError) throw createError;
      } else {
        // Actualizar registro existente
        const { error: updateError } = await supabase
          .from('patient_credits')
          .update({
            available_credits: existingCredits.available_credits + amount,
            total_earned: existingCredits.total_earned + amount,
            updated_at: new Date().toISOString()
          })
          .eq('patient_id', patientId);

        if (updateError) throw updateError;
      }

      // 3. Crear transacción de crédito
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          patient_id: patientId,
          appointment_id: appointmentId,
          amount: amount,
          transaction_type: 'earned',
          source: 'cancelled_appointment',
          description: reason
        });

      if (transactionError) throw transactionError;

      // 4. Marcar la cita como que ya generó créditos
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          credits_generated: true,
          credit_amount: amount,
          payment_status: 'credited'
        })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-credits', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['credit-transactions', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

// Hook para usar créditos en una nueva cita
export function useCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      appointmentId,
      amount,
      description
    }: {
      patientId: string;
      appointmentId: string;
      amount: number;
      description: string;
    }) => {
      const supabase = createClient();
      // 1. Verificar créditos disponibles
      const { data: credits, error: fetchError } = await supabase
        .from('patient_credits')
        .select('*')
        .eq('patient_id', patientId)
        .single();

      if (fetchError || !credits) throw new Error('No se encontraron créditos para este paciente');

      if (credits.available_credits < amount) {
        throw new Error(`Créditos insuficientes. Disponible: $${credits.available_credits}, Requerido: $${amount}`);
      }

      // 2. Actualizar créditos disponibles
      const { error: updateError } = await supabase
        .from('patient_credits')
        .update({
          available_credits: credits.available_credits - amount,
          total_used: credits.total_used + amount,
          updated_at: new Date().toISOString()
        })
        .eq('patient_id', patientId);

      if (updateError) throw updateError;

      // 3. Crear transacción de uso de crédito
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          patient_id: patientId,
          appointment_id: appointmentId,
          amount: -amount, // Negativo porque se está usando
          transaction_type: 'used',
          source: 'appointment_payment',
          description: description
        });

      if (transactionError) throw transactionError;

      return { remaining_credits: credits.available_credits - amount };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-credits', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['credit-transactions', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

// Función helper para calcular crédito según política de cancelación
export function calculateCreditAmount(
  appointmentAmount: number, 
  appointmentDate: string, 
  appointmentTime: string
): { creditAmount: number; refundPercentage: number } {
  const now = new Date();
  const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
  const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Política de reembolso simple basada en tiempo
  let refundPercentage = 0;

  if (hoursUntilAppointment >= 48) {
    refundPercentage = 100; // Reembolso completo si se cancela 48h+ antes
  } else if (hoursUntilAppointment >= 24) {
    refundPercentage = 80;  // 80% si se cancela 24-48h antes
  } else if (hoursUntilAppointment >= 12) {
    refundPercentage = 50;  // 50% si se cancela 12-24h antes
  } else if (hoursUntilAppointment >= 2) {
    refundPercentage = 25;  // 25% si se cancela 2-12h antes
  } else {
    refundPercentage = 0;   // Sin reembolso si se cancela <2h antes
  }

  const creditAmount = (appointmentAmount * refundPercentage) / 100;

  return { creditAmount, refundPercentage };
}

// Hook para obtener todas las transacciones de créditos (admin)
export function useAllCreditTransactions() {
  return useQuery({
    queryKey: ['all-credit-transactions'],
    queryFn: async (): Promise<(CreditTransaction & { patient: { full_name: string; email: string } })[]> => {
      const supabase = createClient();
      
      // Fetch transactions first
      const { data: transactionsData, error: transError } = await supabase
        .from('credit_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (transError) throw transError;

      if (!transactionsData || transactionsData.length === 0) return [];

      // Fetch patient info separately
      const patientIds = [...new Set(transactionsData.map(t => t.patient_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', patientIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      return transactionsData.map(transaction => ({
        ...transaction,
        patient: profilesMap.get(transaction.patient_id) || { full_name: 'Usuario sin perfil', email: '' }
      }));
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

// Hook para crear crédito manual (admin)
export function useCreateManualCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      amount,
      reason,
      description
    }: {
      patientId: string;
      amount: number;
      reason: string;
      description: string;
    }) => {
      const supabase = createClient();
      // 1. Verificar si ya existe registro de créditos para el paciente
      let { data: existingCredits, error: fetchError } = await supabase
        .from('patient_credits')
        .select('*')
        .eq('patient_id', patientId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      // 2. Crear o actualizar registro de créditos
      if (!existingCredits) {
        // Crear nuevo registro
        const { error: createError } = await supabase
          .from('patient_credits')
          .insert({
            patient_id: patientId,
            available_credits: amount,
            total_earned: amount,
            total_used: 0
          });

        if (createError) throw createError;
      } else {
        // Actualizar registro existente
        const { error: updateError } = await supabase
          .from('patient_credits')
          .update({
            available_credits: existingCredits.available_credits + amount,
            total_earned: existingCredits.total_earned + amount,
            updated_at: new Date().toISOString()
          })
          .eq('patient_id', patientId);

        if (updateError) throw updateError;
      }

      // 3. Crear transacción de crédito
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          patient_id: patientId,
          amount: amount,
          transaction_type: 'adjustment',
          source: reason,
          description: description
        });

      if (transactionError) throw transactionError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-credits'] });
      queryClient.invalidateQueries({ queryKey: ['patient-credits-admin'] });
      queryClient.invalidateQueries({ queryKey: ['credit-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['all-credit-transactions'] });
    },
    onError: (error) => {
      console.error('Error creating manual credit:', error);
      alert('Error al crear el crédito manual: ' + (error as any).message);
    },
  });
}