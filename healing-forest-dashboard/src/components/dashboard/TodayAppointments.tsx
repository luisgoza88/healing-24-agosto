"use client"

import React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, User, MapPin } from 'lucide-react'

interface Appointment {
  id: string
  time: string
  patientName: string
  service: string
  professional: string
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
}

interface TodayAppointmentsProps {
  appointments: Appointment[]
  loading?: boolean
}

export const TodayAppointments: React.FC<TodayAppointmentsProps> = ({ 
  appointments, 
  loading 
}) => {
  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada'
      case 'pending':
        return 'Pendiente'
      case 'completed':
        return 'Completada'
      case 'cancelled':
        return 'Cancelada'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-gray-500">Cargando citas...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Citas de Hoy</h3>
          <p className="text-sm text-gray-500 mt-1">
            {format(new Date(), 'EEEE, dd MMMM', { locale: es })}
          </p>
        </div>
        <span className="px-3 py-1 bg-hf-primary/10 text-hf-primary rounded-full text-sm font-medium">
          {appointments.length} citas
        </span>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[350px] custom-scrollbar">
        {appointments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No hay citas programadas para hoy
          </div>
        ) : (
          appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{appointment.time}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                  {getStatusText(appointment.status)}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-3.5 w-3.5" />
                  <span>{appointment.patientName}</span>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {appointment.service}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{appointment.professional}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Estilos para el scrollbar personalizado
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f3f4f6;
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
`

// Agregar los estilos al documento
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = scrollbarStyles
  document.head.appendChild(style)
}