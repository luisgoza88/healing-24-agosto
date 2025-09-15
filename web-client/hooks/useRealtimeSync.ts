import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

export function useRealtimeSync(userId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  useEffect(() => {
    if (!userId) return
    
    // Suscribirse a cambios en las citas del usuario
    const appointmentsChannel = supabase
      .channel(`user-appointments-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${userId}`
        },
        (payload) => {
          // Invalidar queries relacionadas cuando hay cambios
          queryClient.invalidateQueries({ queryKey: ['appointments'] })
          queryClient.invalidateQueries({ queryKey: ['user-stats'] })
          
          // Mostrar notificación si es una nueva cita
          if (payload.eventType === 'INSERT') {
            // Aquí podrías mostrar una notificación toast
            console.log('Nueva cita creada:', payload.new)
          }
        }
      )
      .subscribe()
    
    // Suscribirse a cambios en las clases
    const classesChannel = supabase
      .channel(`user-classes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'breathe_move_bookings',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['classes'] })
          queryClient.invalidateQueries({ queryKey: ['my-classes'] })
        }
      )
      .subscribe()
    
    // Suscribirse a notificaciones
    const notificationsChannel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Mostrar notificación push o toast
          console.log('Nueva notificación:', payload.new)
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(appointmentsChannel)
      supabase.removeChannel(classesChannel)
      supabase.removeChannel(notificationsChannel)
    }
  }, [userId, supabase, queryClient])
}