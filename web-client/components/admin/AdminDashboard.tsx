'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/../../shared/types/auth'
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Activity,
  Clock,
  UserPlus,
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle,
  BarChart3,
  CreditCard
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface AdminDashboardProps {
  user: any
  userRole: UserRole
}

interface DashboardStats {
  todayAppointments: number
  pendingPayments: number
  activePatients: number
  todayRevenue: number
  weeklyAppointments: number
  newPatients: number
  pendingTasks: number
  completedTasks: number
}

export default function AdminDashboard({ user, userRole }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    pendingPayments: 0,
    activePatients: 0,
    todayRevenue: 0,
    weeklyAppointments: 0,
    newPatients: 0,
    pendingTasks: 0,
    completedTasks: 0
  })
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
  }, [userRole])

  async function loadDashboardData() {
    setLoading(true)
    
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Cargar estadísticas según el rol
      if (['receptionist', 'admin', 'super_admin', 'manager'].includes(userRole)) {
        // Citas del día
        const { data: appointments, count } = await supabase
          .from('appointments')
          .select(`
            *,
            patient:patients!inner(*),
            professional:professionals(*),
            service:services(*)
          `, { count: 'exact' })
          .gte('date', today.toISOString())
          .lt('date', tomorrow.toISOString())
          .order('date', { ascending: true })

        setTodayAppointments(appointments || [])
        setStats(prev => ({ ...prev, todayAppointments: count || 0 }))
      }

      if (userRole === 'professional') {
        // Citas del profesional
        const { data: appointments, count } = await supabase
          .from('appointments')
          .select(`
            *,
            patient:patients!inner(*),
            service:services(*)
          `, { count: 'exact' })
          .eq('professional_id', user.id)
          .gte('date', today.toISOString())
          .lt('date', tomorrow.toISOString())
          .order('date', { ascending: true })

        setTodayAppointments(appointments || [])
        setStats(prev => ({ ...prev, todayAppointments: count || 0 }))
      }

      if (['nurse', 'professional', 'admin', 'super_admin'].includes(userRole)) {
        // Pacientes activos
        const { count: patientsCount } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')

        setStats(prev => ({ ...prev, activePatients: patientsCount || 0 }))
      }

      if (['receptionist', 'manager', 'admin', 'super_admin'].includes(userRole)) {
        // Pagos pendientes
        const { count: pendingPaymentsCount } = await supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        // Ingresos del día
        const { data: todayPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'completed')
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString())

        const todayRevenue = todayPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0

        setStats(prev => ({ 
          ...prev, 
          pendingPayments: pendingPaymentsCount || 0,
          todayRevenue
        }))
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Renderizar widgets según el rol
  const renderDashboardContent = () => {
    switch (userRole) {
      case 'receptionist':
        return <ReceptionistDashboard stats={stats} appointments={todayAppointments} />
      case 'nurse':
        return <NurseDashboard stats={stats} />
      case 'professional':
        return <ProfessionalDashboard stats={stats} appointments={todayAppointments} />
      case 'manager':
        return <ManagerDashboard stats={stats} />
      case 'admin':
      case 'super_admin':
        return <AdminFullDashboard stats={stats} appointments={todayAppointments} />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Panel de {getRoleDisplayName(userRole)}
      </h1>
      {renderDashboardContent()}
    </div>
  )
}

// Dashboard para Recepcionista
function ReceptionistDashboard({ stats, appointments }: any) {
  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Citas Hoy"
          value={stats.todayAppointments}
          icon={<Calendar className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Pacientes Nuevos"
          value={stats.newPatients}
          icon={<UserPlus className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Pagos Pendientes"
          value={stats.pendingPayments}
          icon={<CreditCard className="w-6 h-6" />}
          color="orange"
        />
        <StatCard
          title="Ingresos Hoy"
          value={`$${stats.todayRevenue.toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="emerald"
        />
      </div>

      {/* Citas del día */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Citas de Hoy</h2>
        <AppointmentsList appointments={appointments} />
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard
          title="Nueva Cita"
          description="Agendar una nueva cita"
          href="/dashboard/appointments/new"
          icon={<Calendar className="w-8 h-8" />}
          color="blue"
        />
        <QuickActionCard
          title="Registrar Paciente"
          description="Agregar nuevo paciente"
          href="/dashboard/patients/register"
          icon={<UserPlus className="w-8 h-8" />}
          color="green"
        />
        <QuickActionCard
          title="Procesar Pago"
          description="Cobrar servicios"
          href="/dashboard/payments/new"
          icon={<CreditCard className="w-8 h-8" />}
          color="orange"
        />
      </div>
    </div>
  )
}

// Dashboard para Enfermera
function NurseDashboard({ stats }: any) {
  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Pacientes Activos"
          value={stats.activePatients}
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Historiales Pendientes"
          value={stats.pendingTasks}
          icon={<FileText className="w-6 h-6" />}
          color="orange"
        />
        <StatCard
          title="Tareas Completadas"
          value={stats.completedTasks}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickActionCard
          title="Lista de Pacientes"
          description="Ver todos los pacientes"
          href="/dashboard/patients"
          icon={<Users className="w-8 h-8" />}
          color="blue"
        />
        <QuickActionCard
          title="Historiales Médicos"
          description="Gestionar historiales"
          href="/dashboard/medical-records"
          icon={<FileText className="w-8 h-8" />}
          color="green"
        />
      </div>
    </div>
  )
}

// Dashboard para Profesional
function ProfessionalDashboard({ stats, appointments }: any) {
  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Citas Hoy"
          value={stats.todayAppointments}
          icon={<Calendar className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Mis Pacientes"
          value={stats.activePatients}
          icon={<Users className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Esta Semana"
          value={stats.weeklyAppointments}
          icon={<Activity className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Próxima Cita"
          value={appointments[0] ? format(new Date(appointments[0].date), 'HH:mm') : 'Sin citas'}
          icon={<Clock className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Mis citas de hoy */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Mis Citas de Hoy</h2>
        <AppointmentsList appointments={appointments} showPatientDetails />
      </div>
    </div>
  )
}

// Dashboard para Gerente
function ManagerDashboard({ stats }: any) {
  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Ingresos del Día"
          value={`$${stats.todayRevenue.toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="emerald"
        />
        <StatCard
          title="Citas Totales"
          value={stats.todayAppointments}
          icon={<Calendar className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Tasa de Ocupación"
          value="78%"
          icon={<TrendingUp className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Satisfacción"
          value="4.8/5"
          icon={<Activity className="w-6 h-6" />}
          color="green"
        />
      </div>

      {/* Acciones de gestión */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard
          title="Reportes"
          description="Ver reportes detallados"
          href="/dashboard/reports"
          icon={<BarChart3 className="w-8 h-8" />}
          color="blue"
        />
        <QuickActionCard
          title="Estadísticas"
          description="Análisis de rendimiento"
          href="/dashboard/analytics"
          icon={<Activity className="w-8 h-8" />}
          color="purple"
        />
        <QuickActionCard
          title="Personal"
          description="Gestionar empleados"
          href="/dashboard/staff"
          icon={<Users className="w-8 h-8" />}
          color="green"
        />
      </div>
    </div>
  )
}

// Dashboard completo para Admin y Super Admin
function AdminFullDashboard({ stats, appointments }: any) {
  return (
    <div className="space-y-6">
      {/* Resumen completo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Ingresos Hoy"
          value={`$${stats.todayRevenue.toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="emerald"
        />
        <StatCard
          title="Citas Hoy"
          value={stats.todayAppointments}
          icon={<Calendar className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Pacientes Activos"
          value={stats.activePatients}
          icon={<Users className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Pagos Pendientes"
          value={stats.pendingPayments}
          icon={<AlertCircle className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Vista general del día */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Citas de Hoy</h2>
          <AppointmentsList appointments={appointments.slice(0, 5)} showPatientDetails />
          {appointments.length > 5 && (
            <a href="/dashboard/appointments/today" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium mt-4 inline-block">
              Ver todas las citas ({appointments.length})
            </a>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Alertas del Sistema</h2>
          <SystemAlerts />
        </div>
      </div>

      {/* Acceso completo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickActionCard
          title="Usuarios"
          description="Gestionar usuarios"
          href="/dashboard/users"
          icon={<Users className="w-6 h-6" />}
          color="purple"
          compact
        />
        <QuickActionCard
          title="Configuración"
          description="Sistema general"
          href="/dashboard/settings"
          icon={<Activity className="w-6 h-6" />}
          color="blue"
          compact
        />
        <QuickActionCard
          title="Reportes"
          description="Análisis completo"
          href="/dashboard/reports"
          icon={<BarChart3 className="w-6 h-6" />}
          color="green"
          compact
        />
        <QuickActionCard
          title="Finanzas"
          description="Control financiero"
          href="/dashboard/payments"
          icon={<DollarSign className="w-6 h-6" />}
          color="emerald"
          compact
        />
      </div>
    </div>
  )
}

// Componentes auxiliares
function StatCard({ title, value, icon, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
    emerald: 'bg-emerald-100 text-emerald-600'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function QuickActionCard({ title, description, href, icon, color, compact = false }: any) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    emerald: 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
  }

  return (
    <a
      href={href}
      className={`block bg-gradient-to-br ${colorClasses[color]} text-white rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 ${compact ? 'p-4' : 'p-6'}`}
    >
      <div className={`flex ${compact ? 'items-center gap-3' : 'flex-col'}`}>
        <div className={`${compact ? '' : 'mb-4'}`}>{icon}</div>
        <div>
          <h3 className={`font-semibold ${compact ? 'text-base' : 'text-lg mb-2'}`}>{title}</h3>
          {!compact && <p className="text-white/80 text-sm">{description}</p>}
        </div>
      </div>
    </a>
  )
}

function AppointmentsList({ appointments, showPatientDetails = false }: any) {
  if (appointments.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">No hay citas programadas para hoy</p>
    )
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment: any) => (
        <div key={appointment.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {format(new Date(appointment.date), 'HH:mm')} - {appointment.service?.name}
              </p>
              {showPatientDetails && (
                <p className="text-sm text-gray-600">
                  Paciente: {appointment.patient?.full_name}
                </p>
              )}
              {appointment.professional && (
                <p className="text-sm text-gray-600">
                  Dr. {appointment.professional.full_name}
                </p>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              appointment.status === 'confirmed' 
                ? 'bg-green-100 text-green-800'
                : appointment.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {appointment.status === 'confirmed' ? 'Confirmada' : 
               appointment.status === 'pending' ? 'Pendiente' : appointment.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function SystemAlerts() {
  const alerts = [
    { type: 'warning', message: '3 pagos pendientes de confirmación' },
    { type: 'info', message: 'Actualización del sistema programada para esta noche' },
    { type: 'success', message: 'Backup diario completado exitosamente' }
  ]

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <div key={index} className={`p-4 rounded-lg flex items-start gap-3 ${
          alert.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
          alert.type === 'info' ? 'bg-blue-50 text-blue-800' :
          'bg-green-50 text-green-800'
        }`}>
          {alert.type === 'warning' && <AlertCircle className="w-5 h-5 mt-0.5" />}
          {alert.type === 'success' && <CheckCircle className="w-5 h-5 mt-0.5" />}
          {alert.type === 'info' && <Activity className="w-5 h-5 mt-0.5" />}
          <p className="text-sm">{alert.message}</p>
        </div>
      ))}
    </div>
  )
}

function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    client: 'Cliente',
    receptionist: 'Recepcionista',
    nurse: 'Enfermería',
    professional: 'Profesional de Salud',
    manager: 'Gerencia',
    admin: 'Administración',
    super_admin: 'Super Administrador'
  }
  return roleNames[role] || role
}