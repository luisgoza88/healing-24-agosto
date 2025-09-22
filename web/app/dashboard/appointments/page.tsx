'use client'

import { useState, useMemo, useEffect } from 'react'
import { 
  Calendar, 
  Clock, 
  User, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  X, 
  Plus, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Ban, 
  Trash2,
  CreditCard,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import NewAppointmentModal from '@/components/NewAppointmentModal'
import { useAppointments, useAppointmentStats, useAppointmentServices, useUpdateAppointment, type Appointment } from '@/src/hooks/useAppointments'
import { useGenerateCredit, calculateCreditAmount } from '@/src/hooks/usePatientCredits'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQueryClient } from '@tanstack/react-query'
import { createClient, useSupabase } from '@/lib/supabase'
import { useDebounce } from '@/hooks/useDebounce'
import { usePrefetchNextPage } from '@/hooks/usePrefetchAppointments'
import { useInvalidation } from '@/src/hooks/useInvalidation'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  TableEmpty,
  TableLoading 
} from '@/components/ui/table'
import Button from '@/components/ui/button'
import { useToast } from '@/contexts/ToastContext'

export default function AppointmentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [dateFilter, setDateFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('todos')
  const [dateRange, setDateRange] = useState(30)
  const [showNewModal, setShowNewModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  const { showToast } = useToast()
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // React Query y Supabase
  const supabase = useSupabase()
  const generateCredit = useGenerateCredit()
  const updateAppointmentMutation = useUpdateAppointment()
  const { invalidateAppointments } = useInvalidation()

  // React Query hooks
  const { data: appointments = [], isLoading, error, refetch } = useAppointments({
    searchTerm: debouncedSearchTerm,
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
  
  // Prefetch siguiente página
  const prefetchNextPage = usePrefetchNextPage(
    { searchTerm: debouncedSearchTerm, statusFilter, dateFilter, serviceFilter },
    currentPage
  )
  
  // Prefetch cuando estemos cerca del final de la página actual
  useEffect(() => {
    if (currentPage < totalPages && !isLoading) {
      prefetchNextPage()
    }
  }, [currentPage, totalPages, isLoading, prefetchNextPage])

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
          icon: <CheckCircle className="h-4 w-4" />,
          text: 'Confirmada'
        }
      case 'pending':
        return {
          color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
          icon: <Clock className="h-4 w-4" />,
          text: 'Pendiente'
        }
      case 'completed':
        return {
          color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          icon: <CheckCircle className="h-4 w-4" />,
          text: 'Completada'
        }
      case 'cancelled':
        return {
          color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
          icon: <X className="h-4 w-4" />,
          text: 'Cancelada'
        }
      case 'no_show':
        return {
          color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
          icon: <Ban className="h-4 w-4" />,
          text: 'No asistió'
        }
      default:
        return {
          color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
          icon: <Clock className="h-4 w-4" />,
          text: status
        }
    }
  }

  const getPaymentStatusConfig = (status?: string) => {
    switch (status) {
      case 'paid':
        return { color: 'text-green-600 dark:text-green-400', text: 'Pagado' }
      case 'pending':
        return { color: 'text-yellow-600 dark:text-yellow-400', text: 'Pendiente' }
      case 'failed':
        return { color: 'text-red-600 dark:text-red-400', text: 'Fallido' }
      case 'refunded':
        return { color: 'text-purple-600 dark:text-purple-400', text: 'Reembolsado' }
      case 'cancelled':
        return { color: 'text-gray-600 dark:text-gray-400', text: 'Cancelado' }
      default:
        return { color: 'text-gray-600 dark:text-gray-400', text: 'Sin pago' }
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      await updateAppointmentMutation.mutateAsync({
        id: appointmentId,
        status: newStatus
      })
      showToast('success', 'Estado actualizado correctamente')
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('error', 'Error al actualizar el estado')
    }
  }

  const handleGenerateCredit = async (appointment: Appointment) => {
    if (!confirm('¿Deseas generar un crédito para esta cita cancelada?')) return

    try {
      const creditAmount = calculateCreditAmount(appointment)
      
      await generateCredit.mutateAsync({
        patientId: appointment.patient_id,
        amount: creditAmount,
        description: `Crédito por cita cancelada - ${appointment.service_name}`,
        appointmentId: appointment.id
      })
      
      showToast('success', 'Crédito generado correctamente')
    } catch (error) {
      console.error('Error generating credit:', error)
      showToast('error', 'Error al generar el crédito')
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-foreground">Error al cargar las citas</p>
            <Button 
              onClick={() => refetch()} 
              className="mt-4"
              leftIcon={<Loader2 className="w-4 h-4" />}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Citas</h1>
          <p className="text-muted-foreground">Gestiona las citas de tus pacientes</p>
        </div>
        <Button
          onClick={() => setShowNewModal(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nueva Cita
        </Button>
      </motion.div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confirmadas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completadas</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por paciente, profesional o servicio..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
            >
              <option value="todos">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
              <option value="no_show">No asistió</option>
            </select>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
            >
              <option value="todos">Todos los servicios</option>
              {services.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow hover={false}>
              <TableHead>Fecha y Hora</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Profesional</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead align="right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoading rows={5} columns={7} />
            ) : paginatedAppointments.length === 0 ? (
              <TableEmpty 
                message="No se encontraron citas" 
                icon={<Calendar className="h-12 w-12" />}
              />
            ) : (
              <AnimatePresence mode="popLayout">
                {paginatedAppointments.map((appointment, index) => {
                  const statusConfig = getStatusConfig(appointment.status)
                  const paymentConfig = getPaymentStatusConfig(appointment.payment_status)
                  
                  return (
                    <motion.tr
                      key={appointment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">
                              {format(new Date(appointment.appointment_date), 'dd MMM yyyy', { locale: es })}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {appointment.appointment_time}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{appointment.patient_name}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-foreground">{appointment.professional_name}</span>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-foreground">{appointment.service_name}</span>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(appointment.service_price)}
                        </p>
                      </TableCell>

                      <TableCell>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                          {statusConfig.icon}
                          {statusConfig.text}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CreditCard className={`h-4 w-4 ${paymentConfig.color}`} />
                          <span className={`text-sm font-medium ${paymentConfig.color}`}>
                            {paymentConfig.text}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1">
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                            <Link
                              href={`/dashboard/appointments/${appointment.id}`}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded transition-all duration-200"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                            <Link
                              href={`/dashboard/appointments/${appointment.id}/edit`}
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-all duration-200"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                          </motion.div>
                          
                          {appointment.status === 'pending' && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-all duration-200"
                              title="Confirmar cita"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </motion.button>
                          )}
                          
                          {appointment.status === 'cancelled' && !appointment.credit_generated && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleGenerateCredit(appointment)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-all duration-200"
                              title="Generar crédito"
                            >
                              <CreditCard className="h-4 w-4" />
                            </motion.button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, appointments.length)} de {appointments.length} citas
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Anterior
              </Button>
              <span className="text-sm text-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      {showNewModal && (
        <NewAppointmentModal
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  )
}