import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'

export interface PaymentItem {
  id: string
  user_id: string | null
  amount: number
  currency: string
  payment_method: string | null
  status: PaymentStatus
  description?: string | null
  transaction_id?: string | null
  created_at: string
  processed_at?: string | null
  appointment_id?: string | null
  appointment_date?: string
  appointment_time?: string
  professional_name?: string
  service_name?: string
  patient_name?: string
  patient_email?: string
}

export interface PaymentFilters {
  search?: string
  status?: PaymentStatus | 'todos'
  method?: string | 'todos'
  startDate?: string // ISO date
  endDate?: string   // ISO date
}

export function usePayments(filters: PaymentFilters = {}) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: async (): Promise<PaymentItem[]> => {
      const supabase = useSupabase()

      const today = new Date()
      const defaultStart = new Date(today)
      defaultStart.setDate(defaultStart.getDate() - 30)
      const start = (filters.startDate || defaultStart.toISOString()).slice(0, 10) + 'T00:00:00'
      const end = (filters.endDate || today.toISOString()).slice(0, 10) + 'T23:59:59'

      let query = supabase
        .from('payments')
        .select(`
          id,
          user_id,
          amount,
          currency,
          payment_method,
          status,
          description,
          transaction_id,
          created_at,
          processed_at,
          appointment:appointments(
            id,
            appointment_date,
            appointment_time,
            professional:professionals(id, full_name),
            service:services(id, name)
          )
        `)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      if (filters.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status)
      }

      if (filters.method && filters.method !== 'todos') {
        query = query.eq('payment_method', filters.method)
      }

      const { data, error } = await query
      if (error) throw error

      // Cargar perfiles para obtener nombre de paciente
      const userIds = [...new Set((data || []).map(p => p.user_id).filter(Boolean))] as string[]
      let profilesMap = new Map<string, { id: string; full_name?: string; email?: string }>()
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)
        profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]))
      }

      const items: PaymentItem[] = (data || []).map((p: any) => {
        const appointment = p.appointment
        const professional = appointment?.professional
        const service = appointment?.service
        const profile = p.user_id ? profilesMap.get(p.user_id) : undefined

        return {
          id: p.id,
          user_id: p.user_id,
          amount: Number(p.amount) || 0,
          currency: p.currency || 'COP',
          payment_method: p.payment_method || null,
          status: p.status,
          description: p.description,
          transaction_id: p.transaction_id,
          created_at: p.created_at,
          processed_at: p.processed_at,
          appointment_id: appointment?.id,
          appointment_date: appointment?.appointment_date,
          appointment_time: appointment?.appointment_time,
          professional_name: professional?.full_name,
          service_name: service?.name,
          patient_name: profile?.full_name,
          patient_email: profile?.email,
        }
      })

      // Filtro de búsqueda por cliente, email, tx id, servicio o profesional
      if (filters.search) {
        const s = filters.search.toLowerCase()
        return items.filter(it =>
          (it.patient_name || '').toLowerCase().includes(s) ||
          (it.patient_email || '').toLowerCase().includes(s) ||
          (it.transaction_id || '').toLowerCase().includes(s) ||
          (it.service_name || '').toLowerCase().includes(s) ||
          (it.professional_name || '').toLowerCase().includes(s)
        )
      }

      return items
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export interface PaymentStats {
  countPaid: number
  sumPaid: number
  countPending: number
  sumPending: number
  countRefunded: number
  sumRefunded: number
}

export function usePaymentStats(filters: Omit<PaymentFilters, 'search' | 'method'> = {}) {
  return useQuery({
    queryKey: ['payment-stats', filters],
    queryFn: async (): Promise<PaymentStats> => {
      const supabase = useSupabase()

      const today = new Date()
      const defaultStart = new Date(today)
      defaultStart.setDate(defaultStart.getDate() - 30)
      const start = (filters.startDate || defaultStart.toISOString()).slice(0, 10) + 'T00:00:00'
      const end = (filters.endDate || today.toISOString()).slice(0, 10) + 'T23:59:59'

      const { data, error } = await supabase
        .from('payments')
        .select('amount, status, created_at')
        .gte('created_at', start)
        .lte('created_at', end)

      if (error) throw error

      const stats: PaymentStats = {
        countPaid: 0,
        sumPaid: 0,
        countPending: 0,
        sumPending: 0,
        countRefunded: 0,
        sumRefunded: 0,
      }

      ;(data || []).forEach((p: any) => {
        const amount = Number(p.amount) || 0
        if (p.status === 'completed') {
          stats.countPaid++
          stats.sumPaid += amount
        } else if (p.status === 'pending') {
          stats.countPending++
          stats.sumPending += amount
        } else if (p.status === 'refunded') {
          stats.countRefunded++
          stats.sumRefunded += amount
        }
      })

      return stats
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

// Detalle de pago por ID
export function usePayment(paymentId: string) {
  return useQuery({
    queryKey: ['payment', paymentId],
    queryFn: async (): Promise<PaymentItem | null> => {
      const supabase = useSupabase()

      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          user_id,
          amount,
          currency,
          payment_method,
          status,
          description,
          transaction_id,
          created_at,
          processed_at,
          failed_at,
          refunded_at,
          gateway_response,
          metadata,
          appointment:appointments(
            id,
            appointment_date,
            appointment_time,
            professional:professionals(id, full_name),
            service:services(id, name)
          )
        `)
        .eq('id', paymentId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      const profile = data.user_id
        ? (await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', data.user_id)
            .maybeSingle()).data
        : null

      const p: any = data
      return {
        id: p.id,
        user_id: p.user_id,
        amount: Number(p.amount) || 0,
        currency: p.currency || 'COP',
        payment_method: p.payment_method || null,
        status: p.status,
        description: p.description,
        transaction_id: p.transaction_id,
        created_at: p.created_at,
        processed_at: p.processed_at,
        appointment_id: p.appointment?.id,
        appointment_date: p.appointment?.appointment_date,
        appointment_time: p.appointment?.appointment_time,
        professional_name: p.appointment?.professional?.full_name,
        service_name: p.appointment?.service?.name,
        patient_name: profile?.full_name,
        patient_email: profile?.email,
      }
    },
    staleTime: 60_000,
  })
}

// Mutación: marcar pago como recibido
export function useMarkPaymentReceived() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const supabase = useSupabase()
      const { error } = await supabase
        .from('payments')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('id', paymentId)
      if (error) throw error
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payment', id] })
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] })
    },
  })
}

// Mutación: reembolsar pago
export function useRefundPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const supabase = useSupabase()
      const { error } = await supabase
        .from('payments')
        .update({ status: 'refunded', refunded_at: new Date().toISOString() })
        .eq('id', paymentId)
      if (error) throw error
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payment', id] })
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] })
    },
  })
}


