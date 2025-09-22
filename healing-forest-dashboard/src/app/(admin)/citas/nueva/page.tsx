"use client"

import React, { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Search,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Package,
  DollarSign,
  AlertCircle
} from 'lucide-react'
import { format, parse } from 'date-fns'
import { es } from 'date-fns/locale'

interface Patient {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  phone_number: string | null
}

interface Professional {
  id: string
  full_name: string
  specialties: string[]
  availability: any
}

interface Service {
  id: string
  name: string
  duration_minutes: number
  base_price: number
  category: string
  requires_professional: boolean
}

interface TimeSlot {
  time: string
  available: boolean
}

export default function NewAppointmentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Patient, 2: Service, 3: Date/Time, 4: Confirm
  
  // Data
  const [patients, setPatients] = useState<Patient[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  
  // Form state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')
  
  // Errors
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedService && selectedDate && (!selectedService.requires_professional || selectedProfessional)) {
      fetchAvailableSlots()
    }
  }, [selectedService, selectedProfessional, selectedDate])

  const fetchInitialData = async () => {
    const supabase = getSupabaseBrowser()
    
    try {
      // Fetch patients
      const { data: patientsData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .order('first_name')

      setPatients(patientsData || [])

      // Fetch services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('category')
        .order('name')

      setServices(servicesData || [])

      // Fetch professionals
      const { data: professionalsData } = await supabase
        .from('professionals')
        .select('*')
        .eq('active', true)
        .order('full_name')

      setProfessionals(professionalsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const fetchAvailableSlots = async () => {
    const supabase = getSupabaseBrowser()
    
    try {
      // Get all appointments for the selected date and professional
      const query = supabase
        .from('appointments')
        .select('appointment_time, services:services!appointments_service_id_fkey(duration_minutes)')
        .eq('appointment_date', selectedDate)
        .neq('status', 'cancelled')

      if (selectedProfessional) {
        query.eq('professional_id', selectedProfessional.id)
      }

      const { data: existingAppointments } = await query

      // Generate available time slots
      const slots: TimeSlot[] = []
      const startHour = 8
      const endHour = 20
      const interval = 30 // minutes

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          
          // Check if this slot conflicts with existing appointments
          const isAvailable = !existingAppointments?.some(apt => {
            const aptStart = parse(apt.appointment_time, 'HH:mm:ss', new Date())
            const aptEnd = new Date(aptStart.getTime() + (apt.services?.duration_minutes || 60) * 60000)
            const slotStart = parse(time, 'HH:mm', new Date())
            const slotEnd = new Date(slotStart.getTime() + (selectedService?.duration_minutes || 60) * 60000)
            
            return (slotStart >= aptStart && slotStart < aptEnd) || 
                   (slotEnd > aptStart && slotEnd <= aptEnd) ||
                   (slotStart <= aptStart && slotEnd >= aptEnd)
          })

          slots.push({ time, available: isAvailable })
        }
      }

      setAvailableSlots(slots)
    } catch (error) {
      console.error('Error fetching available slots:', error)
    }
  }

  const getPatientName = (patient: Patient) => {
    if (patient.first_name && patient.last_name) {
      return `${patient.first_name} ${patient.last_name}`
    }
    return patient.full_name || 'Sin nombre'
  }

  const filteredPatients = patients.filter(patient => {
    const name = getPatientName(patient).toLowerCase()
    const email = patient.email.toLowerCase()
    const phone = patient.phone_number || ''
    const search = searchTerm.toLowerCase()
    
    return name.includes(search) || email.includes(search) || phone.includes(search)
  })

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = []
    }
    acc[service.category].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    if (!selectedPatient || !selectedService || !selectedDate || !selectedTime) {
      setError('Por favor completa todos los campos requeridos')
      setLoading(false)
      return
    }

    const supabase = getSupabaseBrowser()

    try {
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          user_id: selectedPatient.id,
          service_id: selectedService.id,
          professional_id: selectedProfessional?.id,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          status: 'confirmed',
          notes: notes || null
        })

      if (appointmentError) throw appointmentError

      router.push('/citas')
    } catch (error) {
      console.error('Error creating appointment:', error)
      setError('Error al crear la cita. Por favor intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedPatient !== null
      case 2:
        return selectedService !== null && (!selectedService.requires_professional || selectedProfessional !== null)
      case 3:
        return selectedDate && selectedTime
      default:
        return true
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/citas"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nueva Cita</h1>
          <p className="text-sm text-gray-500 mt-1">
            Paso {step} de 4
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-1">
        <div className="flex">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 text-center py-2 rounded text-sm font-medium transition-colors ${
                s === step
                  ? 'bg-hf-primary text-white'
                  : s < step
                  ? 'bg-hf-primary/20 text-hf-primary'
                  : 'text-gray-400'
              }`}
            >
              {s === 1 && 'Paciente'}
              {s === 2 && 'Servicio'}
              {s === 3 && 'Fecha y Hora'}
              {s === 4 && 'Confirmar'}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Step 1: Select Patient */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Seleccionar Paciente</h2>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedPatient?.id === patient.id
                      ? 'border-hf-primary bg-hf-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {getPatientName(patient)}
                      </h3>
                      <p className="text-sm text-gray-500">{patient.email}</p>
                      {patient.phone_number && (
                        <p className="text-sm text-gray-500">{patient.phone_number}</p>
                      )}
                    </div>
                    {selectedPatient?.id === patient.id && (
                      <div className="w-5 h-5 bg-hf-primary rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Service and Professional */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Servicio</h2>
              
              <div className="space-y-4">
                {Object.entries(groupedServices).map(([category, categoryServices]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {categoryServices.map((service) => (
                        <div
                          key={service.id}
                          onClick={() => setSelectedService(service)}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedService?.id === service.id
                              ? 'border-hf-primary bg-hf-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{service.name}</h4>
                              <p className="text-sm text-gray-500">
                                {service.duration_minutes} min • {formatCurrency(service.base_price)}
                              </p>
                            </div>
                            {selectedService?.id === service.id && (
                              <div className="w-5 h-5 bg-hf-primary rounded-full flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedService?.requires_professional && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Profesional</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {professionals.map((professional) => (
                    <div
                      key={professional.id}
                      onClick={() => setSelectedProfessional(professional)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedProfessional?.id === professional.id
                          ? 'border-hf-primary bg-hf-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{professional.full_name}</h4>
                          {professional.specialties && professional.specialties.length > 0 && (
                            <p className="text-sm text-gray-500">
                              {professional.specialties.join(', ')}
                            </p>
                          )}
                        </div>
                        {selectedProfessional?.id === professional.id && (
                          <div className="w-5 h-5 bg-hf-primary rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Select Date and Time */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Fecha</h2>
              
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Hora</h3>
              
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedTime === slot.time
                        ? 'bg-hf-primary text-white'
                        : slot.available
                        ? 'bg-white border border-gray-300 hover:border-hf-primary text-gray-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
                placeholder="Agregar notas o comentarios sobre la cita..."
              />
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Confirmar Cita</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Paciente</p>
                  <p className="font-medium text-gray-900">
                    {selectedPatient && getPatientName(selectedPatient)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Servicio</p>
                  <p className="font-medium text-gray-900">
                    {selectedService?.name} ({selectedService?.duration_minutes} min)
                  </p>
                </div>
              </div>

              {selectedProfessional && (
                <div className="flex items-center gap-3">
                  <Stethoscope className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Profesional</p>
                    <p className="font-medium text-gray-900">
                      {selectedProfessional.full_name}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Fecha</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(selectedDate + 'T00:00:00'), 'EEEE d \'de\' MMMM, yyyy', { locale: es })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Hora</p>
                  <p className="font-medium text-gray-900">{selectedTime}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Precio</p>
                  <p className="font-medium text-gray-900">
                    {selectedService && formatCurrency(selectedService.base_price)}
                  </p>
                </div>
              </div>

              {notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notas</p>
                  <p className="text-gray-700">{notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : router.push('/citas')}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {step === 1 ? 'Cancelar' : 'Anterior'}
        </button>
        
        <button
          onClick={() => step < 4 ? setStep(step + 1) : handleSubmit()}
          disabled={!canProceed() || (step === 4 && loading)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            canProceed() && !(step === 4 && loading)
              ? 'bg-hf-primary text-white hover:bg-hf-primary/90'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {step === 4 ? (loading ? 'Creando...' : 'Crear Cita') : 'Siguiente'}
        </button>
      </div>
    </div>
  )
}