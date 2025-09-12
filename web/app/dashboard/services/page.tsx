'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Briefcase, 
  ChevronRight,
  Activity,
  Heart,
  Brain,
  Sparkles
} from 'lucide-react'
import { createClient } from '@/src/lib/supabase'

interface Service {
  id: string
  name: string
  description: string
  icon: any
  color: string
  stats?: {
    totalAppointments: number
    totalRevenue: number
    totalPatients: number
    upcomingAppointments: number
  }
}

const SERVICE_ICONS: Record<string, any> = {
  'Breathe & Move': Activity,
  'Medicina Funcional': Heart,
  'Medicina Estética': Sparkles,
  'Terapias Alternativas': Brain,
}

const SERVICE_COLORS: Record<string, string> = {
  'Breathe & Move': 'bg-green-500',
  'Medicina Funcional': 'bg-blue-500',
  'Medicina Estética': 'bg-purple-500',
  'Terapias Alternativas': 'bg-pink-500',
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Record<string, any>>({})

  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    try {
      setLoading(true)
      console.log('[Services] Loading services...')
      
      const supabase = createClient()
      
      // Cargar servicios de la base de datos
      const { data: servicesData, error } = await supabase
        .from('services')
        .select('*')
        .order('name')

      if (error) {
        console.error('[Services] Error loading services:', error)
        throw error
      }

      console.log('[Services] Services loaded:', servicesData?.length || 0)

      // Mapear servicios con iconos y colores
      const mappedServices = servicesData?.map(service => ({
        ...service,
        icon: SERVICE_ICONS[service.name] || Briefcase,
        color: SERVICE_COLORS[service.name] || 'bg-gray-500'
      })) || []

      // Por ahora, mostrar los servicios sin estadísticas para que cargue rápido
      setServices(mappedServices)
      setLoading(false)

      // Cargar estadísticas en segundo plano
      loadStatisticsInBackground(mappedServices)
    } catch (error) {
      console.error('[Services] Fatal error:', error)
      setLoading(false)
    }
  }

  const loadStatisticsInBackground = async (services: Service[]) => {
    try {
      const supabase = createClient()
      const serviceStats: Record<string, any> = {}
      const today = new Date().toISOString().split('T')[0]
      
      // Cargar estadísticas básicas para todos los servicios de una vez
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select('service_id, status, total_amount, payment_status, appointment_date, user_id')
        .in('service_id', services.map(s => s.id))

      if (allAppointments) {
        // Procesar estadísticas por servicio
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
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Servicios</h1>
        <p className="text-gray-600">Gestiona los calendarios, personal y estadísticas de cada servicio</p>
      </div>

      {services.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">No hay servicios disponibles</p>
          <p className="text-gray-500">Los servicios aparecerán aquí una vez que estén configurados en la base de datos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {services.map((service) => {
          const Icon = service.icon
          const isBreathMove = service.name === 'Breathe & Move'
          const href = isBreathMove 
            ? '/dashboard/services/breathe-move' 
            : `/dashboard/services/${service.id}`

          return (
            <Link
              key={service.id}
              href={href}
              className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className={`inline-flex p-4 rounded-full ${service.color} bg-opacity-10 mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`w-12 h-12 ${service.color.replace('bg-', 'text-')}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{service.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{service.description}</p>
              </div>
              
              {/* Hover overlay con estadísticas rápidas */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-gray-900/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end">
                <div className="p-6 w-full text-white">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm">Citas próximas</span>
                    <span className="font-semibold">{stats[service.id]?.upcomingAppointments || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Este mes</span>
                    <span className="font-semibold">{formatCurrency(stats[service.id]?.totalRevenue || 0)}</span>
                  </div>
                </div>
              </div>
              
              {/* Indicador de hover */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <ChevronRight className="w-5 h-5 text-white" />
              </div>
            </Link>
          )
        })}
        </div>
      )}
    </div>
  )
}