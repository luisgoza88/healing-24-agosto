'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Heart, Brain, Sparkles, Activity, Leaf, Shield, Clock, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Service {
  id: string
  code: string
  name: string
  description: string
  duration_minutes: number
  price: number
  category: string
  benefits?: string[]
  requirements?: string[]
}

const serviceCategories = [
  {
    id: 'functional',
    name: 'Medicina Funcional',
    description: 'Enfoque integral para tratar la raíz de los problemas de salud',
    icon: Heart,
    color: 'bg-red-100 text-red-700',
  },
  {
    id: 'aesthetic',
    name: 'Medicina Estética',
    description: 'Tratamientos para realzar tu belleza natural',
    icon: Sparkles,
    color: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'wellness',
    name: 'Bienestar Integral',
    description: 'Servicios para equilibrar cuerpo, mente y espíritu',
    icon: Leaf,
    color: 'bg-green-100 text-green-700',
  },
  {
    id: 'diagnostic',
    name: 'Diagnóstico',
    description: 'Evaluaciones completas de tu estado de salud',
    icon: Activity,
    color: 'bg-blue-100 text-blue-700',
  },
]

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setServices(data || [])
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredServices = selectedCategory === 'all'
    ? services
    : services.filter(service => service.category === selectedCategory)

  const getCategoryIcon = (category: string) => {
    const cat = serviceCategories.find(c => c.id === category)
    return cat ? <cat.icon className="h-5 w-5" /> : <Heart className="h-5 w-5" />
  }

  const getCategoryColor = (category: string) => {
    const cat = serviceCategories.find(c => c.id === category)
    return cat?.color || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-green-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Nuestros Servicios
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xl text-gray-600">
              Ofrecemos una amplia gama de servicios médicos y de bienestar para cuidar de ti de manera integral
            </p>
          </div>

          {/* Category Cards */}
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {serviceCategories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`group relative rounded-lg p-6 text-left transition-all hover:shadow-lg ${
                    selectedCategory === category.id
                      ? 'bg-white shadow-md ring-2 ring-green-600'
                      : 'bg-white shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className={`inline-flex rounded-lg p-3 ${category.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {category.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {category.description}
                  </p>
                  <ChevronRight className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-hover:text-gray-600" />
                </button>
              )
            })}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Ver todos los servicios
            </button>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Cargando servicios...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className="group relative rounded-lg bg-white p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`inline-flex rounded-lg p-2 ${getCategoryColor(service.category)}`}>
                        {getCategoryIcon(service.category)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600">
                          {service.name}
                        </h3>
                        <p className="text-sm text-gray-500">{service.code}</p>
                      </div>
                    </div>
                    
                    <p className="mt-3 text-gray-600 line-clamp-3">
                      {service.description}
                    </p>

                    {service.benefits && service.benefits.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900">Beneficios:</h4>
                        <ul className="mt-1 space-y-1">
                          {service.benefits.slice(0, 3).map((benefit, index) => (
                            <li key={index} className="flex items-start text-sm text-gray-600">
                              <Shield className="mr-2 h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        {service.duration_minutes} minutos
                      </div>
                      <div className="font-medium text-gray-900">
                        ${service.price.toLocaleString('es-CO')} COP
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Link
                    href={`/services/${service.id}`}
                    className="text-sm font-medium text-green-600 hover:text-green-700"
                  >
                    Ver más detalles
                  </Link>
                  <Link
                    href={`/booking?service=${service.id}`}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Agendar cita
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-green-700">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">
              ¿No encuentras lo que buscas?
            </h2>
            <p className="mt-4 text-xl text-green-100">
              Contáctanos y te ayudaremos a encontrar el servicio perfecto para ti
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/contact"
                className="rounded-md bg-white px-6 py-3 text-base font-medium text-green-700 shadow-sm hover:bg-green-50"
              >
                Contactar
              </Link>
              <Link
                href="tel:+5712345678"
                className="rounded-md border-2 border-white px-6 py-3 text-base font-medium text-white hover:bg-green-600"
              >
                Llamar ahora
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}