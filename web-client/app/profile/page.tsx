'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Calendar, CreditCard, Heart, LogOut, Mail, Phone, Camera, Wallet } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Profile {
  id: string
  full_name: string
  email: string
  phone?: string
  avatar_url?: string
  created_at: string
}

interface Stats {
  totalAppointments: number
  totalClasses: number
  upcomingEvents: number
  totalSpent: number
}

interface RecentActivity {
  id: string
  type: 'appointment' | 'class' | 'payment'
  title: string
  date: string
  amount?: number
  status: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalAppointments: 0,
    totalClasses: 0,
    upcomingEvents: 0,
    totalSpent: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'settings'>('overview')

  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
    fetchStats()
    fetchRecentActivity()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile({
          ...profileData,
          email: user.email || '',
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch appointments count
      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Fetch classes count
      const { count: classesCount } = await supabase
        .from('breathe_move_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Fetch upcoming events
      const today = new Date().toISOString().split('T')[0]
      const { count: upcomingCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('appointment_date', today)
        .eq('status', 'confirmed')

      // Calculate total spent (simplified)
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      const totalSpent = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0

      setStats({
        totalAppointments: appointmentsCount || 0,
        totalClasses: classesCount || 0,
        upcomingEvents: upcomingCount || 0,
        totalSpent,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const activities: RecentActivity[] = []

      // Fetch recent appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          service:services(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      appointments?.forEach(apt => {
        activities.push({
          id: apt.id,
          type: 'appointment',
          title: `Cita: ${apt.service?.name}`,
          date: apt.appointment_date,
          status: apt.status,
        })
      })

      // Fetch recent class enrollments
      const { data: enrollments } = await supabase
        .from('breathe_move_enrollments')
        .select(`
          id,
          created_at,
          payment_status,
          class:breathe_move_classes(name, price)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      enrollments?.forEach(enrollment => {
        activities.push({
          id: enrollment.id,
          type: 'class',
          title: `Clase: ${enrollment.class?.name}`,
          date: enrollment.created_at,
          amount: enrollment.class?.price,
          status: enrollment.payment_status,
        })
      })

      // Sort by date
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setRecentActivity(activities.slice(0, 10))
    } catch (error) {
      console.error('Error fetching activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-4 w-4" />
      case 'class':
        return <Heart className="h-4 w-4" />
      case 'payment':
        return <CreditCard className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'paid':
      case 'completed':
        return 'text-green-600'
      case 'pending':
        return 'text-yellow-600'
      case 'cancelled':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center">
                <div className="relative inline-block">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <button className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full hover:bg-green-700">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  {profile?.full_name}
                </h2>
                <p className="text-sm text-gray-600">
                  Miembro desde {profile && format(parseISO(profile.created_at), 'MMMM yyyy', { locale: es })}
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center text-sm">
                  <Mail className="mr-3 h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{profile?.email}</span>
                </div>
                {profile?.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="mr-3 h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{profile.phone}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalAppointments}</p>
                  <p className="text-sm text-gray-600">Citas médicas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalClasses}</p>
                  <p className="text-sm text-gray-600">Clases tomadas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-gray-900">{stats.upcomingEvents}</p>
                  <p className="text-sm text-gray-600">Próximos eventos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-gray-900">
                    ${stats.totalSpent.toLocaleString('es-CO')}
                  </p>
                  <p className="text-sm text-gray-600">Total invertido</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 border-t pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Acciones rápidas</h3>
                <div className="space-y-2">
                  <Link 
                    href="/credits"
                    className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                        <Wallet className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Mis Créditos</div>
                        <div className="text-xs text-gray-600">Ver y usar créditos disponibles</div>
                      </div>
                    </div>
                    <div className="text-emerald-600 text-xs">→</div>
                  </Link>
                  
                  <Link 
                    href="/appointments"
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Mis Citas</div>
                        <div className="text-xs text-gray-600">Ver historial y próximas citas</div>
                      </div>
                    </div>
                    <div className="text-blue-600 text-xs">→</div>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="border-b">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'overview'
                        ? 'border-b-2 border-green-600 text-green-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Resumen
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'history'
                        ? 'border-b-2 border-green-600 text-green-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Historial
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'settings'
                        ? 'border-b-2 border-green-600 text-green-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Configuración
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Actividad reciente
                    </h3>
                    {recentActivity.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No hay actividad reciente
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {recentActivity.map(activity => (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-gray-400">
                                {getActivityIcon(activity.type)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {activity.title}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {format(parseISO(activity.date), "d 'de' MMMM, yyyy", { locale: es })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {activity.amount && (
                                <p className="font-medium text-gray-900">
                                  ${activity.amount.toLocaleString('es-CO')}
                                </p>
                              )}
                              <p className={`text-sm ${getStatusColor(activity.status)}`}>
                                {activity.status}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-6 flex gap-4">
                      <Link
                        href="/calendar"
                        className="flex-1 text-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Ver calendario
                      </Link>
                      <Link
                        href="/classes"
                        className="flex-1 text-center rounded-md border border-green-600 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50"
                      >
                        Buscar clases
                      </Link>
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Historial completo
                    </h3>
                    <p className="text-gray-600">
                      Aquí podrás ver todo tu historial de citas, clases y pagos.
                    </p>
                    {/* Implement full history view */}
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Configuración de la cuenta
                    </h3>
                    <div className="space-y-4">
                      <button className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300">
                        <p className="font-medium text-gray-900">Actualizar información personal</p>
                        <p className="text-sm text-gray-600">Cambia tu nombre, teléfono y otros datos</p>
                      </button>
                      <button className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300">
                        <p className="font-medium text-gray-900">Cambiar contraseña</p>
                        <p className="text-sm text-gray-600">Actualiza tu contraseña de acceso</p>
                      </button>
                      <button className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300">
                        <p className="font-medium text-gray-900">Notificaciones</p>
                        <p className="text-sm text-gray-600">Configura tus preferencias de notificación</p>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}