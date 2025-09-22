'use client'

import { 
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  MapPin,
  User,
  ArrowRight
} from 'lucide-react'
import { useDashboardStats, useTodayAppointments, useRecentActivity, useDashboardCharts } from '@/src/hooks/useDashboard'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorState from '@/components/ErrorState'
import DashboardStats from '@/components/DashboardStats'
import InteractiveChart from '@/components/InteractiveChart'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error, refetch } = useDashboardStats()
  const { data: todayAppointments, isLoading: appointmentsLoading } = useTodayAppointments()
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity()
  const { data: chartData } = useDashboardCharts()

  const formatTime = (timeString: string) => {
    if (timeString && timeString.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    }
    
    try {
      return format(new Date(timeString), "HH:mm", { locale: es });
    } catch {
      return timeString;
    }
  }

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Hace un momento';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} minutos`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)} horas`;
    return format(date, "dd MMM", { locale: es });
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
          icon: <CheckCircle className="h-4 w-4" />,
          text: 'Confirmada'
        };
      case 'pending':
        return {
          color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
          icon: <Clock className="h-4 w-4" />,
          text: 'Pendiente'
        };
      case 'completed':
        return {
          color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          icon: <CheckCircle className="h-4 w-4" />,
          text: 'Completada'
        };
      case 'cancelled':
        return {
          color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
          icon: <XCircle className="h-4 w-4" />,
          text: 'Cancelada'
        };
      case 'no_show':
        return {
          color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
          icon: <XCircle className="h-4 w-4" />,
          text: 'No asistió'
        };
      default:
        return {
          color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
          icon: <Clock className="h-4 w-4" />,
          text: status
        };
    }
  }

  if (error) {
    return (
      <div className="p-6 bg-background">
        <h1 className="text-2xl font-bold text-foreground mb-6">Panel Administrativo - Dashboard</h1>
        <ErrorState message="Error al cargar el dashboard" onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: es })}
          </p>
        </div>
        <motion.button 
          onClick={() => refetch()}
          className="p-2 text-foreground/70 hover:text-foreground hover:bg-accent/10 rounded-lg transition-all duration-200 group"
          title="Actualizar datos"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className={`h-5 w-5 transition-transform duration-500 ${statsLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
        </motion.button>
      </motion.div>

      {/* Statistics Cards */}
      {statsLoading ? (
        <LoadingSkeleton type="stats" />
      ) : stats ? (
        <DashboardStats stats={stats} />
      ) : null}

      {/* Charts */}
      {chartData && chartData.length > 0 && (
        <InteractiveChart data={chartData} title="Análisis de Tendencias" />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Citas de Hoy
            </h2>
            <Link 
              href="/dashboard/appointments"
              className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              Ver todas
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {appointmentsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : todayAppointments && todayAppointments.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {todayAppointments.map((appointment, index) => {
                const statusConfig = getStatusConfig(appointment.status);
                return (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold text-primary">
                          {formatTime(appointment.appointment_time)}
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                          {statusConfig.icon}
                          {statusConfig.text}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-foreground/80">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{appointment.patient_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <span>{appointment.professional_name}</span>
                      </div>
                      {appointment.service && (
                        <div className="flex items-center gap-2 text-primary">
                          <MapPin className="w-4 h-4" />
                          <span className="font-medium">{appointment.service}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No hay citas programadas para hoy</p>
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              Actividad Reciente
            </h2>
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          
          {activityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/5 transition-colors duration-200 group"
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-150 ${
                    activity.type === 'appointment' ? 'bg-blue-500' :
                    activity.type === 'payment' ? 'bg-green-500' :
                    'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/80">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No hay actividad reciente</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="bg-muted/30 rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: "/dashboard/appointments/new", icon: Calendar, label: "Nueva Cita", color: "text-blue-600 dark:text-blue-400" },
            { href: "/dashboard/patients/new", icon: User, label: "Nuevo Paciente", color: "text-green-600 dark:text-green-400" },
            { href: "/dashboard/reports", icon: Activity, label: "Ver Reportes", color: "text-purple-600 dark:text-purple-400" },
            { href: "/dashboard/professionals", icon: User, label: "Profesionales", color: "text-orange-600 dark:text-orange-400" }
          ].map((action, index) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.9 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                href={action.href}
                className="flex flex-col items-center p-4 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
              >
                <action.icon className={`h-8 w-8 ${action.color} mb-2 group-hover:scale-110 transition-transform`} />
                <span className="text-sm text-foreground/80 group-hover:text-foreground">{action.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}