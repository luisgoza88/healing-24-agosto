'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/hooks/usePermissions'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { ProtectedComponent } from '@/components/auth/ProtectedComponent'
import { Calendar, Clock, User, MapPin, DollarSign, X, Check } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { role, can } = usePermissions()
  const supabase = createClient()
  
  useEffect(() => {
    loadAppointments()
  }, [])
  
  async function loadAppointments() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey(*),
          professional:professionals(*),
          service:services(*),
          payment:payments(*)
        `)
        .order('date', { ascending: true })
      
      // Si el usuario no puede ver todas las citas, solo mostrar las suyas
      if (!can.viewAllAppointments()) {
        query = query.eq('patient_id', user.id)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setAppointments(data || [])
    } catch (error) {
      console.error('Error loading appointments:', error)
    } finally {
      setLoading(false)
    }
  }
  
  async function cancelAppointment(appointmentId: string) {
    try {
      const response = await fetch(`/appointments/${appointmentId}/cancel`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message)
      }
      
      // Recargar citas
      await loadAppointments()
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      alert(error.message)
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white p-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {can.viewAllAppointments() ? 'Todas las Citas' : 'Mis Citas'}
          </h1>
          <p className="text-gray-600 mt-2">
            {can.viewAllAppointments() 
              ? `Gestiona todas las citas del centro (${appointments.length} citas)`
              : 'Gestiona tus citas médicas y de bienestar'
            }
          </p>
        </div>
        
        {/* Lista de citas */}
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <AnimatedCard className="bg-white rounded-2xl p-8 text-center">
              <p className="text-gray-500">No hay citas registradas</p>
            </AnimatedCard>
          ) : (
            appointments.map((appointment, index) => (
              <AnimatedCard
                key={appointment.id}
                delay={index * 0.1}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {appointment.service?.name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status === 'confirmed' && 'Confirmada'}
                        {appointment.status === 'pending' && 'Pendiente'}
                        {appointment.status === 'cancelled' && 'Cancelada'}
                        {appointment.status === 'completed' && 'Completada'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4 text-emerald-600" />
                        <span>
                          {format(new Date(appointment.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        <span>
                          {format(new Date(appointment.date), "h:mm a", { locale: es })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="h-4 w-4 text-emerald-600" />
                        <span>
                          {appointment.professional?.full_name}
                        </span>
                      </div>
                      
                      {/* Mostrar paciente si puede ver todas las citas */}
                      {can.viewAllAppointments() && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-4 w-4 text-purple-600" />
                          <span>
                            Paciente: {appointment.patient?.full_name || appointment.patient?.email}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <span>
                          ${appointment.total_amount?.toLocaleString('es-CO')} COP
                        </span>
                      </div>
                    </div>
                    
                    {appointment.notes && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Notas:</strong> {appointment.notes}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Acciones */}
                  <div className="flex gap-2 ml-4">
                    {appointment.status === 'confirmed' && (
                      <>
                        {/* Botón de cancelar - mostrar según permisos */}
                        {(appointment.patient_id === supabase.auth.user?.id || can.cancelAnyAppointment()) && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => cancelAppointment(appointment.id)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            title="Cancelar cita"
                          >
                            <X className="h-5 w-5" />
                          </motion.button>
                        )}
                        
                        {/* Botón de modificar - solo para roles con permisos */}
                        <ProtectedComponent resource="appointments.all" action="modify">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Modificar cita"
                          >
                            <Calendar className="h-5 w-5" />
                          </motion.button>
                        </ProtectedComponent>
                      </>
                    )}
                  </div>
                </div>
              </AnimatedCard>
            ))
          )}
        </div>
        
        {/* Botón de nueva cita */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-8 right-8"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = '/appointments/new'}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full p-4 shadow-2xl hover:shadow-3xl transition-shadow"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}