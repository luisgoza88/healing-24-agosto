'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, MapPin, Users, DollarSign, Star, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { User } from '@supabase/supabase-js'

interface BreatheMoveClass {
  id: string
  name: string
  description: string
  instructor_name: string
  instructor_bio?: string
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
  capacity: number
  enrolled_count: number
  location: string
  price: number
  class_type: string
  level: string
  image_url?: string
  what_to_bring?: string
  requirements?: string
}

export default function ClassDetailPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.id as string
  
  const [classData, setClassData] = useState<BreatheMoveClass | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchClassDetails()
    checkUserEnrollment()
  }, [classId])

  const fetchClassDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .eq('id', classId)
        .single()

      if (error) throw error
      setClassData(data)
    } catch (error) {
      console.error('Error fetching class:', error)
      setError('Error al cargar los detalles de la clase')
    } finally {
      setLoading(false)
    }
  }

  const checkUserEnrollment = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const { data } = await supabase
        .from('breathe_move_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('class_id', classId)
        .single()

      setIsEnrolled(!!data)
    }
  }

  const handleEnroll = async () => {
    if (!user) {
      router.push(`/auth/login?redirectedFrom=/classes/${classId}`)
      return
    }

    setEnrolling(true)
    setError(null)

    try {
      // Create enrollment
      const { error: enrollError } = await supabase
        .from('breathe_move_enrollments')
        .insert({
          user_id: user.id,
          class_id: classId,
          payment_status: 'pending',
        })

      if (enrollError) throw enrollError

      // Update enrolled count
      const { error: updateError } = await supabase.rpc('increment_class_enrollment', {
        class_id: classId,
      })

      if (updateError) throw updateError

      // Redirect to payment
      router.push(`/checkout?type=class&id=${classId}`)
    } catch (error: any) {
      console.error('Error enrolling:', error)
      setError(error.message || 'Error al inscribirse en la clase')
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Cargando detalles...</p>
        </div>
      </div>
    )
  }

  if (!classData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Clase no encontrada</p>
          <Link href="/classes" className="mt-4 text-green-600 hover:text-green-700">
            Volver a clases
          </Link>
        </div>
      </div>
    )
  }

  const availableSpots = classData.capacity - classData.enrolled_count
  const isFull = availableSpots <= 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <Link
            href="/classes"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a clases
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Hero Image */}
          {classData.image_url && (
            <div className="h-64 bg-gray-200">
              <img
                src={classData.image_url}
                alt={classData.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="p-6 lg:p-8">
            {/* Title and Level */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{classData.name}</h1>
                <p className="mt-2 text-lg text-gray-600">con {classData.instructor_name}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium
                ${classData.level === 'beginner' ? 'bg-green-100 text-green-800' : ''}
                ${classData.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' : ''}
                ${classData.level === 'advanced' ? 'bg-red-100 text-red-800' : ''}
              `}>
                {classData.level === 'beginner' && 'Principiante'}
                {classData.level === 'intermediate' && 'Intermedio'}
                {classData.level === 'advanced' && 'Avanzado'}
              </span>
            </div>

            {/* Description */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h2>
              <p className="text-gray-600 whitespace-pre-line">{classData.description}</p>
            </div>

            {/* Details Grid */}
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="mr-3 h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Fecha</p>
                    <p className="text-gray-600">
                      {format(parseISO(classData.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Clock className="mr-3 h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Horario</p>
                    <p className="text-gray-600">
                      {classData.start_time.slice(0, 5)} - {classData.end_time.slice(0, 5)}
                      <span className="text-sm"> ({classData.duration_minutes} minutos)</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPin className="mr-3 h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Ubicación</p>
                    <p className="text-gray-600">{classData.location}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <Users className="mr-3 h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Cupos</p>
                    <p className={`${isFull ? 'text-red-600' : 'text-gray-600'}`}>
                      {isFull ? 'Clase llena' : `${availableSpots} de ${classData.capacity} disponibles`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <DollarSign className="mr-3 h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Precio</p>
                    <p className="text-gray-600">${classData.price.toLocaleString('es-CO')} COP</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructor Bio */}
            {classData.instructor_bio && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Sobre el instructor</h2>
                <p className="text-gray-600">{classData.instructor_bio}</p>
              </div>
            )}

            {/* What to bring */}
            {classData.what_to_bring && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Qué traer</h2>
                <p className="text-gray-600">{classData.what_to_bring}</p>
              </div>
            )}

            {/* Requirements */}
            {classData.requirements && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Requisitos</h2>
                <p className="text-gray-600">{classData.requirements}</p>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="mt-6 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="mt-8 border-t pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${classData.price.toLocaleString('es-CO')} COP
                  </p>
                  <p className="text-sm text-gray-600">por persona</p>
                </div>
                
                {isEnrolled ? (
                  <div className="text-center">
                    <p className="text-green-600 font-medium mb-2">¡Ya estás inscrito!</p>
                    <Link
                      href="/classes/my-classes"
                      className="text-sm text-green-600 hover:text-green-700 underline"
                    >
                      Ver mis clases
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={handleEnroll}
                    disabled={isFull || enrolling}
                    className={`rounded-md px-6 py-3 text-base font-medium transition-colors ${
                      isFull || enrolling
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {enrolling ? 'Procesando...' : isFull ? 'Clase llena' : 'Inscribirse'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}