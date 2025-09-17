'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Briefcase, 
  ChevronRight,
  Activity,
  Heart,
  Sparkles,
  Dna,
  Droplet,
  Smile,
  HandHeart,
  HeartPulse,
  TreePine,
  Wind,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  Loader2,
  Stethoscope,
  Flower2,
  HandHelping,
  HeartHandshake,
  Dumbbell,
  ArrowRight,
  Zap,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/src/lib/supabase'

interface ServiceCategory {
  id: string
  name: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
  description: string
  subServices: string[]
  serviceCount?: number
  appointmentCount?: number
  stats?: {
    totalAppointments: number
    totalRevenue: number
    totalPatients: number
    upcomingAppointments: number
  }
}

const SERVICE_ICONS: Record<string, any> = {
  'Medicina Funcional': Heart,
  'Medicina Estética': Sparkles,
  'Medicina Regenerativa & Longevidad': Dna,
  'DRIPS - Sueroterapia': Droplet,
  'Faciales': Smile,
  'Masajes': HandHeart,
  'Wellness Integral': HeartPulse,
  'Breathe & Move': Activity,
}

const SERVICE_COLORS: Record<string, string> = {
  'Medicina Funcional': 'bg-[#3E5444]',
  'Medicina Estética': 'bg-[#B8604D]',
  'Medicina Regenerativa & Longevidad': 'bg-[#5E3532]',
  'DRIPS - Sueroterapia': 'bg-[#4A6C9B]',
  'Faciales': 'bg-[#879794]',
  'Masajes': 'bg-[#61473B]',
  'Wellness Integral': 'bg-[#879794]',
  'Breathe & Move': 'bg-green-600',
}

const serviceCategories: ServiceCategory[] = [
  {
    id: 'medicina-funcional',
    name: 'Medicina Funcional',
    icon: Stethoscope,
    color: 'text-green-700',
    bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50',
    borderColor: 'border-green-200',
    description: 'Consultas especializadas y péptidos',
    subServices: [
      'Consulta funcional – primera vez',
      'Consulta funcional – seguimiento',
      'Consulta péptidos',
      'Consulta células madre'
    ]
  },
  {
    id: 'medicina-estetica',
    name: 'Medicina Estética',
    icon: Sparkles,
    color: 'text-pink-700',
    bgColor: 'bg-gradient-to-br from-pink-50 to-rose-50',
    borderColor: 'border-pink-200',
    description: 'Procedimientos estéticos avanzados',
    subServices: [
      'Consulta medicina estética valoración',
      'Procedimientos estéticos'
    ]
  },
  {
    id: 'medicina-regenerativa',
    name: 'Medicina Regenerativa & Longevidad',
    icon: Heart,
    color: 'text-red-700',
    bgColor: 'bg-gradient-to-br from-red-50 to-orange-50',
    borderColor: 'border-red-200',
    description: 'Terapias antiedad y bienestar',
    subServices: [
      'Baño helado',
      'Sauna infrarrojo',
      'Baño helado + sauna infrarrojo',
      'Cámara hiperbárica'
    ]
  },
  {
    id: 'drips',
    name: 'DRIPS - Sueroterapia',
    icon: Droplet,
    color: 'text-blue-700',
    bgColor: 'bg-gradient-to-br from-blue-50 to-sky-50',
    borderColor: 'border-blue-200',
    description: 'Terapias intravenosas y sueroterapia',
    subServices: [
      'Vitaminas - IV Drips',
      'NAD 125 mg',
      'NAD 500 mg',
      'NAD 1000 mg',
      'Ozonoterapia – suero ozonizado',
      'Ozonoterapia – autohemoterapia mayor'
    ]
  },
  {
    id: 'faciales',
    name: 'Faciales',
    icon: Flower2,
    color: 'text-purple-700',
    bgColor: 'bg-gradient-to-br from-purple-50 to-lavender-50',
    borderColor: 'border-purple-200',
    description: 'Tratamientos faciales especializados',
    subServices: [
      'Clean Facial',
      'Glow Facial',
      'Anti-Age Facial',
      'Anti-Acné Facial',
      'Lymph Facial'
    ]
  },
  {
    id: 'masajes',
    name: 'Masajes',
    icon: HandHelping,
    color: 'text-amber-700',
    bgColor: 'bg-gradient-to-br from-amber-50 to-yellow-50',
    borderColor: 'border-amber-200',
    description: 'Masajes terapéuticos y relajantes',
    subServices: [
      'Drenaje linfático',
      'Relajante'
    ]
  },
  {
    id: 'wellness-integral',
    name: 'Wellness Integral',
    icon: HeartHandshake,
    color: 'text-indigo-700',
    bgColor: 'bg-gradient-to-br from-indigo-50 to-blue-50',
    borderColor: 'border-indigo-200',
    description: 'Servicios de bienestar integral',
    subServices: []
  },
  {
    id: 'breathe-move',
    name: 'Breathe & Move',
    icon: Wind,
    color: 'text-cyan-700',
    bgColor: 'bg-gradient-to-br from-cyan-50 to-sky-50',
    borderColor: 'border-cyan-200',
    description: 'Clases de movimiento consciente y respiración',
    subServices: [
      'Clases individuales',
      'Paquetes de clases'
    ]
  },
]

export default function ServicesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<ServiceCategory[]>([])
  const [categoriesData, setCategoriesData] = useState<ServiceCategory[]>(serviceCategories)
  const [totalServices, setTotalServices] = useState(0)
  const [todayAppointments, setTodayAppointments] = useState(0)
  const [stats, setStats] = useState<Record<string, any>>({})

  useEffect(() => {
    loadServicesData()
  }, [])

  const loadServicesData = async () => {
    try {
      setLoading(true)
      console.log('[Services] Loading services...')

      // Load services from database
      const { data: servicesData, error } = await supabase
        .from('services')
        .select('*')
        .order('name')

      if (error) {
        console.error('[Services] Error loading services:', error)
        throw error
      }

      console.log('[Services] Services loaded:', servicesData?.length || 0)

      // Map services with icons and colors
      const mappedServices = servicesData?.map(service => {
        // Try to find matching category first
        const matchingCategory = serviceCategories.find(cat => 
          cat.name === service.name || cat.id === service.id
        )
        
        return {
          id: service.id,
          name: service.name,
          description: service.description,
          icon: SERVICE_ICONS[service.name] || matchingCategory?.icon || Briefcase,
          color: matchingCategory?.color || 'text-gray-700',
          bgColor: matchingCategory?.bgColor || 'bg-gradient-to-br from-gray-50 to-gray-50',
          borderColor: matchingCategory?.borderColor || 'border-gray-200',
          subServices: matchingCategory?.subServices || [],
          serviceCount: 0,
          appointmentCount: 0
        }
      }) || []

      // Count services by category
      const serviceCounts = servicesData?.reduce((acc, service) => {
        acc[service.category || service.id] = (acc[service.category || service.id] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      // Update categories with counts
      setCategoriesData(serviceCategories.map(cat => ({
        ...cat,
        serviceCount: serviceCounts[cat.id] || 0
      })))

      setTotalServices(servicesData?.length || 0)
      setServices(mappedServices)

      // Load today's appointments
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id')
        .eq('appointment_date', todayStr)
        .eq('status', 'confirmed')

      if (!appointmentsError && appointments) {
        setTodayAppointments(appointments.length)
      }

      setLoading(false)

      // Load statistics in background
      loadStatisticsInBackground(mappedServices)
    } catch (error) {
      console.error('[Services] Fatal error:', error)
      setLoading(false)
    }
  }

  const loadStatisticsInBackground = async (services: ServiceCategory[]) => {
    try {
      const serviceStats: Record<string, any> = {}
      const today = new Date().toISOString().split('T')[0]
      
      // Load basic statistics for all services at once
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select('service_id, status, total_amount, payment_status, appointment_date, user_id')
        .in('service_id', services.map(s => s.id))

      if (allAppointments) {
        // Process statistics per service
        for (const service of services) {
          const serviceAppointments = allAppointments.filter(apt => apt.service_id === service.id)
          
          const totalAppointments = serviceAppointments.length
          const upcomingAppointments = serviceAppointments.filter(apt => 
            apt.appointment_date >= today && 
            ['confirmed', 'pending'].includes(apt.status)
          ).length
          
          const totalRevenue = serviceAppointments
            .filter(apt => apt.payment_status === 'paid')
            .reduce((sum, apt) => sum + (apt.total_amount || 0), 0)
          
          const uniquePatients = new Set(serviceAppointments.map(apt => apt.user_id)).size

          serviceStats[service.id] = {
            totalAppointments,
            upcomingAppointments,
            totalRevenue,
            totalPatients: uniquePatients
          }
        }
      }

      setStats(serviceStats)
    } catch (error) {
      console.error('[Services] Error loading statistics:', error)
    }
  }

  const handleCategoryClick = (categoryId: string, categoryName?: string) => {
    if (categoryName === 'Breathe & Move' || categoryId === 'breathe-move') {
      router.push('/dashboard/admin/breathe-move')
    } else {
      // Navigate to the admin services page
      router.push('/dashboard/admin/services')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          <span className="text-gray-600">Cargando servicios...</span>
        </div>
      </div>
    )
  }

  // Determine which data to display - database services or default categories
  const displayData = services.length > 0 ? services : categoriesData

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Gestión de Servicios
            </h1>
            <p className="text-gray-600 text-lg">
              Administra todos los servicios médicos y de bienestar de Healing Forest
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Reportes
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Nuevo Servicio
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Total Servicios</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{totalServices || displayData.length}</p>
                <p className="text-xs text-green-600 mt-1">En todas las categorías</p>
              </div>
              <div className="p-3 bg-green-200/50 rounded-xl">
                <Activity className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-sky-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Citas Hoy</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{todayAppointments}</p>
                <p className="text-xs text-blue-600 mt-1">Programadas</p>
              </div>
              <div className="p-3 bg-blue-200/50 rounded-xl">
                <Calendar className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Categorías</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{categoriesData.length}</p>
                <p className="text-xs text-purple-600 mt-1">Activas</p>
              </div>
              <div className="p-3 bg-purple-200/50 rounded-xl">
                <Zap className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Rendimiento</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">94%</p>
                <p className="text-xs text-orange-600 mt-1">Satisfacción</p>
              </div>
              <div className="p-3 bg-orange-200/50 rounded-xl">
                <BarChart3 className="h-6 w-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayData.map((category, index) => {
          const Icon = category.icon
          const categoryStats = stats[category.id] || category.stats
          
          return (
            <Card 
              key={category.id}
              className={`group hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden ${category.borderColor} border-2 transform hover:-translate-y-1`}
              onClick={() => handleCategoryClick(category.id, category.name)}
            >
              <div className={`h-2 ${category.bgColor}`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-4 ${category.bgColor} rounded-xl ${category.color} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <CardTitle className="text-lg font-bold">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{category.description}</p>
                
                {category.subServices && category.subServices.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Servicios incluidos:</p>
                    <div className="flex flex-wrap gap-1">
                      {category.subServices.slice(0, 3).map((service, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {service.split(' ').slice(0, 2).join(' ')}
                        </span>
                      ))}
                      {category.subServices.length > 3 && (
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-medium">
                          +{category.subServices.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Stats overlay on hover */}
                {categoryStats && (
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-gray-900/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end">
                    <div className="p-6 w-full text-white">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm">Citas próximas</span>
                        <span className="font-semibold">{categoryStats.upcomingAppointments || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Este mes</span>
                        <span className="font-semibold">{formatCurrency(categoryStats.totalRevenue || 0)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm pt-3 border-t">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-600 text-xs font-medium">
                        {category.appointmentCount || categoryStats?.totalPatients || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-green-600 text-xs font-medium">
                        Activo
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-12 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8 border border-green-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Gestión de Citas</h3>
              <p className="text-sm text-gray-600">Programa, modifica y cancela citas desde cada servicio</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Profesionales</h3>
              <p className="text-sm text-gray-600">Asigna especialistas a cada categoría de servicio</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Reportes</h3>
              <p className="text-sm text-gray-600">Analiza el rendimiento y estadísticas por servicio</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}