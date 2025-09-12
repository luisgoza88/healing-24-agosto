'use client'

import { useState, useMemo } from 'react'
import { Calendar, Clock, User, Search, Filter, Eye, Edit, X, Plus, Loader2, AlertCircle, CheckCircle, Ban, Trash2 } from 'lucide-react'
import Link from 'next/link'
import NewAppointmentModal from '@/components/NewAppointmentModal'
import { useAppointments, useAppointmentStats, useAppointmentServices, type Appointment } from '@/src/hooks/useAppointments'
import { useGenerateCredit, calculateCreditAmount } from '@/src/hooks/usePatientCredits'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/src/lib/supabase'

export default function AppointmentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [dateFilter, setDateFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('todos')
  const [dateRange, setDateRange] = useState(30) // Días hacia atrás
  const [showNewModal, setShowNewModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // React Query y Supabase
  const queryClient = useQueryClient()
  const supabase = createClient()
  const generateCredit = useGenerateCredit()

  // React Query hooks
  const { data: appointments = [], isLoading } = useAppointments({
    searchTerm,
    status: statusFilter,
    date: dateFilter,
    service: serviceFilter === 'todos' ? undefined : serviceFilter,
    dateRange: dateRange,
  })
  
  const { data: stats } = useAppointmentStats()
  const { data: services = [] } = useAppointmentServices()

  // Paginación
  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return appointments.slice(startIndex, startIndex + itemsPerPage)
  }, [appointments, currentPage])

  const totalPages = Math.ceil(appointments.length / itemsPerPage)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border border-green-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200'
      case 'completed': return 'bg-blue-100 text-blue-800 border border-blue-200'
      case 'no_show': return 'bg-gray-100 text-gray-800 border border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada'
      case 'pending': return 'Pendiente'
      case 'cancelled': return 'Cancelada'
      case 'completed': return 'Completada'
      case 'no_show': return 'No asistió'
      default: return status
    }
  }

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case 'paid': return 'text-green-600'
      case 'pending': return 'text-yellow-600'
      case 'failed': return 'text-red-600'
      case 'refunded': return 'text-purple-600'
      case 'cancelled': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getPaymentStatusText = (status?: string) => {
    switch (status) {
      case 'paid': return 'Pagado'
      case 'pending': return 'Pendiente'
      case 'failed': return 'Fallido'
      case 'refunded': return 'Reembolsado'
      case 'cancelled': return 'Cancelado'
      default: return 'Sin pago'
    }
  }

  const handleCancelAppointment = async (appointment: Appointment) => {
    console.log('[handleCancelAppointment] Starting cancellation for appointment:', appointment)
    
    if (appointment.status === 'cancelled') {
      alert('Esta cita ya está cancelada')
      return
    }

    // Verificar si la cita fue pagada para generar crédito
    const wasPaid = appointment.payment_status === 'paid'
    let creditInfo = null

    console.log('[handleCancelAppointment] Payment status:', appointment.payment_status, 'Was paid:', wasPaid)

    if (wasPaid) {
      creditInfo = calculateCreditAmount(
        appointment.total_amount,
        appointment.appointment_date,
        appointment.appointment_time
      )
      console.log('[handleCancelAppointment] Credit info calculated:', creditInfo)
    }

    // Mostrar confirmación con información de crédito
    const confirmMessage = wasPaid 
      ? `¿Estás seguro de cancelar la cita de ${appointment.patient_name}?\n\n` +
        `💰 La cita fue pagada: ${formatCurrency(appointment.total_amount)}\n` +
        `🎫 Se generará un crédito de: ${formatCurrency(creditInfo!.creditAmount)} (${creditInfo!.refundPercentage}%)\n` +
        `⏰ Política aplicada según tiempo de cancelación\n\n` +
        `El crédito podrá ser usado en futuras citas.`
      : `¿Estás seguro de cancelar la cita de ${appointment.patient_name}?`

    if (confirm(confirmMessage)) {
      try {
        // Usar transacción para asegurar consistencia
        if (wasPaid && creditInfo!.creditAmount > 0) {
          console.log('[handleCancelAppointment] Generating credit for user:', appointment.user_id)
          console.log('[handleCancelAppointment] Credit amount:', creditInfo!.creditAmount)
          
          // Si hay crédito, usar el hook que maneja todo en una transacción
          await generateCredit.mutateAsync({
            patientId: appointment.user_id,
            appointmentId: appointment.id,
            amount: creditInfo!.creditAmount,
            reason: `Cancelación de cita - Reembolso ${creditInfo!.refundPercentage}%`
          })
          
          console.log('[handleCancelAppointment] Credit generated successfully')
          
          // Luego actualizar el estado de la cita
          const { error } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', appointment.id)

          if (error) {
            console.error('[handleCancelAppointment] Error updating appointment status:', error)
            throw error
          }
          
          console.log('[handleCancelAppointment] Appointment status updated to cancelled')
          
          alert(
            `✅ Cita cancelada exitosamente\n\n` +
            `🎫 Crédito generado: ${formatCurrency(creditInfo!.creditAmount)}\n` +
            `El paciente podrá usar este crédito en futuras citas.`
          )
        } else {
          // Si no hay crédito, solo cancelar la cita
          const { error } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', appointment.id)

          if (error) {
            throw error
          }
          
          const message = wasPaid && creditInfo!.creditAmount === 0
            ? `Cita cancelada. No se generó crédito debido a la política de cancelación (cancelado muy cerca de la fecha).`
            : `Cita cancelada exitosamente.`
          alert(message)
        }

        // Invalidar cache para actualizar la lista
        queryClient.invalidateQueries({ queryKey: ['appointments'] })
        queryClient.invalidateQueries({ queryKey: ['appointment-stats'] })
        queryClient.invalidateQueries({ queryKey: ['patient-credits'] })
      } catch (error: any) {
        console.error('[handleCancelAppointment] Error:', error)
        alert('Error al cancelar la cita: ' + (error.message || 'Error inesperado'))
      }
    }
  }

  const handleDeleteAppointment = async (appointment: Appointment) => {
    if (confirm(`¿Estás seguro de eliminar permanentemente la cita de ${appointment.patient_name}?`)) {
      try {
        // Primero eliminar los pagos relacionados
        const { error: paymentsError } = await supabase
          .from('payments')
          .delete()
          .eq('appointment_id', appointment.id)

        if (paymentsError) {
          console.error('Error deleting related payments:', paymentsError)
          alert('Error al eliminar los pagos relacionados: ' + paymentsError.message)
          return
        }

        // Luego eliminar la cita
        const { error: appointmentError } = await supabase
          .from('appointments')
          .delete()
          .eq('id', appointment.id)

        if (appointmentError) {
          console.error('Error deleting appointment:', appointmentError)
          alert('Error al eliminar la cita: ' + appointmentError.message)
          return
        }

        alert('Cita eliminada exitosamente')
        // Invalidar cache para actualizar la lista
        queryClient.invalidateQueries({ queryKey: ['appointments'] })
        queryClient.invalidateQueries({ queryKey: ['appointment-stats'] })
      } catch (error) {
        console.error('Error:', error)
        alert('Error inesperado al eliminar la cita')
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Citas</h1>
            <p className="text-sm text-gray-600">
              Mostrando: {dateRange === 9999 ? 'Todas las citas' : `Últimos ${dateRange} días`} 
              ({appointments.length} resultados)
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="bg-gradient-to-r from-green-600 to-green-500 text-white px-5 py-2.5 rounded-lg hover:from-green-700 hover:to-green-600 transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva Cita</span>
          </button>
        </div>

        {/* Estadísticas rápidas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Citas Hoy</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">{stats.today}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completadas Hoy</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">{stats.completedToday}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pendientes</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">{stats.pending}</p>
                </div>
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Mañana</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">{stats.tomorrow}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 mb-6 space-y-4 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por paciente, profesional..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none"
              >
                <option value="todos">Todos los estados</option>
                <option value="confirmed">Confirmada</option>
                <option value="pending">Pendiente</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
                <option value="no_show">No asistió</option>
              </select>
            </div>
            
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none"
              >
                <option value="todos">Todos los servicios</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none"
              >
                <option value={7}>Últimos 7 días</option>
                <option value={30}>Últimos 30 días</option>
                <option value={90}>Últimos 3 meses</option>
                <option value={180}>Últimos 6 meses</option>
                <option value={365}>Último año</option>
                <option value={730}>Últimos 2 años</option>
                <option value={9999}>Todas las citas</option>
              </select>
            </div>
            
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('todos')
                setServiceFilter('todos')
                setDateFilter('')
                setDateRange(30)
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200"
            >
              Limpiar filtros
            </button>
          </div>
          
          {/* Indicador de búsqueda activa */}
          {searchTerm && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Buscando: <strong>"{searchTerm}"</strong> en {appointments.length} citas encontradas
                {dateRange !== 9999 && (
                  <span className="ml-2 text-blue-600">
                    (mostrando últimos {dateRange} días - 
                    <button 
                      onClick={() => setDateRange(9999)} 
                      className="ml-1 underline font-medium hover:text-blue-800"
                    >
                      ver todas las citas
                    </button>)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>


        {/* Tabla de citas */}
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
                <p className="text-gray-600">Cargando citas...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No se encontraron citas con los filtros aplicados</p>
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha y Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paciente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profesional
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Servicio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pago
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedAppointments.map((appointment) => (
                      <tr key={appointment.id} className="group hover:bg-blue-50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-b border-gray-100 cursor-pointer">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {format(new Date(appointment.appointment_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {appointment.appointment_time.slice(0, 5)} hrs
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{appointment.patient_name}</div>
                          <div className="text-sm text-gray-500">{appointment.patient_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{appointment.professional_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{appointment.service}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                            {getStatusText(appointment.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(appointment.total_amount)}
                            </div>
                            <div className={`text-xs ${getPaymentStatusColor(appointment.payment_status)}`}>
                              {getPaymentStatusText(appointment.payment_status)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                            <Link
                              href={`/dashboard/appointments/${appointment.id}`}
                              className="text-green-600 hover:text-white hover:bg-green-600 hover:shadow-lg hover:scale-110 p-2 rounded-lg transition-all duration-200 transform"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/dashboard/appointments/${appointment.id}/edit`}
                              className="text-blue-600 hover:text-white hover:bg-blue-600 hover:shadow-lg hover:scale-110 p-2 rounded-lg transition-all duration-200 transform"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            {appointment.status !== 'cancelled' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelAppointment(appointment);
                                }}
                                className="text-orange-600 hover:text-white hover:bg-orange-600 hover:shadow-lg hover:scale-110 p-2 rounded-lg transition-all duration-200 transform"
                                title="Cancelar cita"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAppointment(appointment);
                              }}
                              className="text-red-600 hover:text-white hover:bg-red-600 hover:shadow-lg hover:scale-110 p-2 rounded-lg transition-all duration-200 transform"
                              title="Eliminar cita permanentemente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                          <span className="font-medium">
                            {Math.min(currentPage * itemsPerPage, appointments.length)}
                          </span>{' '}
                          de <span className="font-medium">{appointments.length}</span> resultados
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Primera
                          </button>
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            ←
                          </button>
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            Página {currentPage} de {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            →
                          </button>
                          <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Última
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal para nueva cita */}
      {showNewModal && (
        <NewAppointmentModal 
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)} 
          onSuccess={() => {
            setShowNewModal(false);
            // Invalidar queries en lugar de recargar la página
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
          }}
        />
      )}
    </div>
  )
}