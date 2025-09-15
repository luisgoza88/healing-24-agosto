import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { addDays } from 'date-fns'

interface BreatheMoveClass {
  id: string
  name: string
  description: string
  instructor_name: string
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
  capacity: number
  enrolled_count: number
  location: string
  price: number
  class_type: string
  level: string
  image_url?: string
}

interface ClassEnrollment {
  id: string
  user_id: string
  class_id: string
  payment_status: string
  created_at: string
}

export function useClasses(filters?: {
  startDate?: Date
  endDate?: Date
  classType?: string
  level?: string
}) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['classes', filters],
    queryFn: async () => {
      let query = supabase.from('breathe_move_classes').select('*')

      const startDate = filters?.startDate || new Date()
      const endDate = filters?.endDate || addDays(startDate, 30)

      query = query
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])

      if (filters?.classType && filters.classType !== 'all') {
        query = query.eq('class_type', filters.classType)
      }

      if (filters?.level && filters.level !== 'all') {
        query = query.eq('level', filters.level)
      }

      const { data, error } = await query
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error
      return data as BreatheMoveClass[]
    },
  })
}

export function useClass(classId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .eq('id', classId)
        .single()

      if (error) throw error
      return data as BreatheMoveClass
    },
    enabled: !!classId,
  })
}

export function useMyClasses() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['my-classes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('breathe_move_enrollments')
        .select(`
          *,
          class:breathe_move_classes(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useEnrollInClass() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (classId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from('breathe_move_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('class_id', classId)
        .single()

      if (existingEnrollment) {
        throw new Error('Ya estás inscrito en esta clase')
      }

      // Enroll in class
      const { data, error } = await supabase
        .from('breathe_move_enrollments')
        .insert({
          user_id: user.id,
          class_id: classId,
          payment_status: 'pending',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['my-classes'] })
    },
  })
}

export function useCancelEnrollment() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('breathe_move_enrollments')
        .delete()
        .eq('id', enrollmentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['my-classes'] })
    },
  })
}