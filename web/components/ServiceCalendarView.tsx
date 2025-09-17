'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  MapPin,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  DollarSign,
  GripVertical,
  Activity,
  Search
} from 'lucide-react';

interface CalendarViewProps {
  category: string;
  categoryData: any;
  services: any[];
  professionals: any[];
  appointments: any[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  viewMode: 'week' | 'month';
  setViewMode: (mode: 'week' | 'month') => void;
  onRefresh: () => void;
  categoryName?: string;
}

export default function ServiceCalendarView({
  category,
  categoryData,
  services,
  professionals,
  appointments,
  selectedDate,
  setSelectedDate,
  viewMode,
  setViewMode,
  onRefresh,
  categoryName
}: CalendarViewProps) {
  const supabase = createClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [draggedAppointment, setDraggedAppointment] = useState<any>(null);
  const [dragOverTime, setDragOverTime] = useState<string | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [formData, setFormData] = useState({
    service_id: '',
    professional_id: '',
    date: '',
    time: '',
    patient_email: '',
    patient_name: '',
    patient_phone: '',
    notes: ''
  });

  // Load patients from database
  useEffect(() => {
    const loadPatients = async () => {
      setLoadingPatients(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, phone')
          .order('full_name');

        if (error) throw error;
        
        if (data) {
          setPatients(data);
        }
      } catch (error) {
        console.error('Error loading patients:', error);
      } finally {
        setLoadingPatients(false);
      }
    };

    loadPatients();
  }, []);

  // Transform patients for combobox
  const patientOptions: ComboboxOption[] = patients.map(patient => ({
    value: patient.id,
    label: `${patient.full_name || 'Sin nombre'} - ${patient.email}`
  }));

  // Handle patient selection
  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setFormData({
        ...formData,
        patient_email: patient.email || '',
        patient_name: patient.full_name || '',
        patient_phone: patient.phone || ''
      });
    }
  };

  // Obtener fechas para la vista
  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getMonthDates = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates = [];

    // Días del mes anterior para completar la primera semana
    const startDay = firstDay.getDay();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      dates.push(new Date(year, month - 1, prevMonthLastDay - i));
    }

    // Días del mes actual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push(new Date(year, month, i));
    }

    // Días del siguiente mes para completar la última semana
    const remainingDays = 42 - dates.length;
    for (let i = 1; i <= remainingDays; i++) {
      dates.push(new Date(year, month + 1, i));
    }

    return dates;
  };

  const dates = viewMode === 'week' ? getWeekDates() : getMonthDates();

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.appointment_date === dateStr);
  };

  const handlePrevPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setSelectedDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleAddAppointment = () => {
    setSelectedAppointment(null);
    setSelectedPatientId('');
    setFormData({
      service_id: services[0]?.id || '',
      professional_id: '',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      patient_email: '',
      patient_name: '',
      patient_phone: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEditAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setSelectedPatientId(appointment.user_id || '');
    setFormData({
      service_id: appointment.service_id || '',
      professional_id: appointment.professional_id || '',
      date: appointment.appointment_date,
      time: appointment.appointment_time,
      patient_email: appointment.patient?.email || '',
      patient_name: appointment.patient?.full_name || '',
      patient_phone: appointment.patient?.phone || '',
      notes: appointment.notes || ''
    });
    setShowModal(true);
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta cita?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Cancelado por administrador'
        })
        .eq('id', appointmentId);

      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Error al cancelar la cita');
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
    setShowDayModal(true);
  };

  const handleDragStart = (e: React.DragEvent, appointment: any) => {
    setDraggedAppointment(appointment);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (time: string) => {
    setDragOverTime(time);
  };

  const handleDragLeave = () => {
    setDragOverTime(null);
  };

  const handleDrop = async (e: React.DragEvent, newDate: string, newTime: string) => {
    e.preventDefault();
    setDragOverTime(null);

    if (!draggedAppointment) return;

    try {
      const service = services.find(s => s.id === draggedAppointment.service_id);
      const duration = service?.duration_minutes || 60;
      
      // Calculate new end time
      const [hours, minutes] = newTime.split(':').map(Number);
      const endTime = new Date();
      endTime.setHours(hours, minutes + duration);
      const endTimeStr = endTime.toTimeString().slice(0, 5);

      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: newDate,
          appointment_time: newTime,
          end_time: endTimeStr
        })
        .eq('id', draggedAppointment.id);

      if (error) throw error;
      
      onRefresh();
      setDraggedAppointment(null);
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Error al actualizar la cita');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Buscar o crear el paciente
      let userId;
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.patient_email)
        .single();

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Crear nuevo usuario
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.patient_email,
          password: Math.random().toString(36).slice(-8), // Contraseña temporal
        });
        
        if (authError) throw authError;
        userId = authData.user?.id;

        // Actualizar perfil
        if (userId) {
          await supabase
            .from('profiles')
            .update({
              full_name: formData.patient_name,
              phone: formData.patient_phone
            })
            .eq('id', userId);
        }
      }

      // Obtener duración del servicio
      const service = services.find(s => s.id === formData.service_id);
      const duration = service?.duration_minutes || 60;
      
      // Calcular hora de fin
      const [hours, minutes] = formData.time.split(':').map(Number);
      const endTime = new Date();
      endTime.setHours(hours, minutes + duration);
      const endTimeStr = endTime.toTimeString().slice(0, 5);

      const appointmentData = {
        user_id: userId,
        service_id: formData.service_id,
        professional_id: formData.professional_id === 'unassigned' ? null : formData.professional_id,
        appointment_date: formData.date,
        appointment_time: formData.time,
        end_time: endTimeStr,
        duration_minutes: duration,
        status: 'confirmed',
        notes: formData.notes,
        total_amount: service?.base_price || 0,
        payment_status: 'pending'
      };

      if (selectedAppointment) {
        // Actualizar cita existente
        const { error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', selectedAppointment.id);
        
        if (error) throw error;
      } else {
        // Crear nueva cita
        const { error } = await supabase
          .from('appointments')
          .insert([appointmentData]);
        
        if (error) throw error;
      }

      setShowModal(false);
      onRefresh();
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert('Error al guardar la cita');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-700 bg-green-50 border border-green-200';
      case 'completed': return 'text-blue-700 bg-blue-50 border border-blue-200';
      case 'cancelled': return 'text-red-700 bg-red-50 border border-red-200';
      case 'pending': return 'text-amber-700 bg-amber-50 border border-amber-200';
      default: return 'text-gray-700 bg-gray-50 border border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Título de la categoría */}
      {categoryName && (
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 ${categoryData.bgColor} rounded-xl`}>
            <Calendar className={`h-6 w-6 ${categoryData.color}`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Calendario de {categoryName}</h2>
            <p className="text-gray-600">Gestiona las citas y horarios de este servicio</p>
          </div>
        </div>
      )}

      {/* Header con controles */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPeriod}
                  className="hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                  className="hover:bg-gray-100 transition-colors"
                >
                  Hoy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPeriod}
                  className="hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <h2 className="text-lg font-semibold">
                {viewMode === 'week' 
                  ? `Semana del ${dates[0].toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} al ${dates[6].toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`
                  : selectedDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
                }
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="px-3 py-1 transition-all"
                >
                  Semana
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="px-3 py-1 transition-all"
                >
                  Mes
                </Button>
              </div>
              
              <Button 
                onClick={handleAddAppointment}
                className="bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cita
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendario */}
      <Card>
        <CardContent className="p-0">
          {viewMode === 'week' ? (
            // Vista de semana
            <div className="grid grid-cols-8 border-b">
              <div className="p-3 border-r font-medium text-sm text-gray-600">
                Hora
              </div>
              {dates.map((date, index) => (
                <div 
                  key={index}
                  onClick={() => handleDayClick(date)}
                  className={`p-3 border-r text-center cursor-pointer hover:bg-gray-50 transition-colors ${
                    date.toDateString() === new Date().toDateString() 
                      ? 'bg-green-50 hover:bg-green-100' 
                      : ''
                  }`}
                >
                  <div className="text-sm text-gray-600">
                    {date.toLocaleDateString('es-CO', { weekday: 'short' })}
                  </div>
                  <div className="font-semibold">
                    {date.getDate()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Vista de mes
            <div>
              <div className="grid grid-cols-7 border-b">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                  <div key={day} className="p-3 text-center font-medium text-sm text-gray-600 border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {dates.map((date, index) => {
                  const dayAppointments = getAppointmentsForDate(date);
                  const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={index}
                      onClick={() => handleDayClick(date)}
                      onDragOver={handleDragOver}
                      onDragEnter={() => handleDragEnter(date.toISOString().split('T')[0])}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => {
                        e.stopPropagation();
                        const firstAppointment = dayAppointments[0];
                        const defaultTime = firstAppointment ? firstAppointment.appointment_time : '09:00';
                        handleDrop(e, date.toISOString().split('T')[0], defaultTime);
                      }}
                      className={`min-h-[100px] p-2 border-r border-b last:border-r-0 cursor-pointer hover:bg-gray-100 transition-colors ${
                        !isCurrentMonth ? 'bg-gray-50' : ''
                      } ${isToday ? 'bg-green-50 hover:bg-green-100' : ''} ${
                        dragOverTime === date.toISOString().split('T')[0] ? 'bg-blue-50 border-blue-300' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">
                          {date.getDate()}
                        </span>
                        {dayAppointments.length > 0 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {dayAppointments.length}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 2).map((apt) => (
                          <div
                            key={apt.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              handleDragStart(e, apt);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAppointment(apt);
                            }}
                            className={`text-xs p-1 rounded cursor-pointer hover:shadow-md transition-all duration-200 transform hover:scale-105 ${
                              getStatusColor(apt.status)
                            } ${draggedAppointment?.id === apt.id ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                apt.status === 'confirmed' ? 'bg-green-600' :
                                apt.status === 'pending' ? 'bg-yellow-600' :
                                apt.status === 'cancelled' ? 'bg-red-600' :
                                'bg-blue-600'
                              }`} />
                              <span className="font-medium truncate">
                                {apt.appointment_time}
                              </span>
                            </div>
                            <div className="truncate pl-2.5">
                              {apt.patient?.full_name}
                            </div>
                          </div>
                        ))}
                        {dayAppointments.length > 2 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dayAppointments.length - 2} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'week' && (
            // Horas para vista de semana
            <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
              {Array.from({ length: 15 }, (_, i) => i + 6).map(hour => (
                <div key={hour} className="grid grid-cols-8 border-b">
                  <div className="p-3 border-r text-sm text-gray-600">
                    {hour}:00
                  </div>
                  {dates.map((date, dateIndex) => {
                    const dayAppointments = getAppointmentsForDate(date)
                      .filter(apt => {
                        const aptHour = parseInt(apt.appointment_time.split(':')[0]);
                        return aptHour === hour;
                      });
                    
                    return (
                      <div 
                        key={dateIndex} 
                        className={`p-2 border-r relative ${
                          dragOverTime === `${date.toISOString().split('T')[0]}-${hour}:00` 
                            ? 'bg-blue-50' 
                            : ''
                        }`}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(`${date.toISOString().split('T')[0]}-${hour}:00`)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, date.toISOString().split('T')[0], `${hour}:00`)}
                      >
                        {dayAppointments.map(apt => (
                          <div
                            key={apt.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, apt)}
                            onClick={() => handleEditAppointment(apt)}
                            className={`mb-1 p-2 rounded text-xs cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:scale-105 ${
                              getStatusColor(apt.status)
                            } ${draggedAppointment?.id === apt.id ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-center gap-1">
                              <GripVertical className="h-3 w-3 text-gray-400 cursor-move" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium">{apt.appointment_time}</span>
                                  {getStatusIcon(apt.status)}
                                </div>
                                <div className="font-medium truncate">
                                  {apt.patient?.full_name}
                                </div>
                                <div className="text-gray-600 truncate">
                                  {apt.service?.name}
                                </div>
                                {apt.professional && (
                                  <div className="text-gray-500 truncate">
                                    Dr. {apt.professional.full_name}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de día seleccionado */}
      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                Citas del {selectedDay?.toLocaleDateString('es-CO', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setShowDayModal(false);
                  setFormData({
                    ...formData,
                    date: selectedDay?.toISOString().split('T')[0] || ''
                  });
                  setSelectedPatientId('');
                  setShowModal(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                Nueva Cita
              </Button>
            </DialogTitle>
            <DialogDescription>
              Ver, editar o agregar nuevas citas para el día seleccionado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {selectedDay && getAppointmentsForDate(selectedDay).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No hay citas programadas para este día</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setShowDayModal(false);
                    setFormData({
                      ...formData,
                      date: selectedDay.toISOString().split('T')[0]
                    });
                    setShowModal(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agendar Primera Cita
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDay && getAppointmentsForDate(selectedDay)
                  .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
                  .map((appointment) => (
                    <div
                      key={appointment.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setShowDayModal(false);
                        handleEditAppointment(appointment);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                              getStatusColor(appointment.status)
                            }`}>
                              {getStatusIcon(appointment.status)}
                              <span>
                                {appointment.status === 'confirmed' ? 'Confirmada' :
                                 appointment.status === 'pending' ? 'Pendiente' :
                                 appointment.status === 'cancelled' ? 'Cancelada' :
                                 appointment.status === 'completed' ? 'Completada' :
                                 appointment.status}
                              </span>
                            </div>
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {appointment.appointment_time} - {appointment.end_time || 'N/A'}
                            </Badge>
                          </div>
                          
                          <h4 className="font-semibold text-lg mb-1">
                            {appointment.patient?.full_name}
                          </h4>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4" />
                              <span>{appointment.service?.name}</span>
                            </div>
                            {appointment.professional && (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>Dr. {appointment.professional.full_name}</span>
                              </div>
                            )}
                            {appointment.patient?.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>{appointment.patient.email}</span>
                              </div>
                            )}
                            {appointment.patient?.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{appointment.patient.phone}</span>
                              </div>
                            )}
                            {appointment.notes && (
                              <div className="mt-2 p-2 bg-gray-50 rounded">
                                <p className="text-xs font-medium text-gray-700 mb-1">Notas:</p>
                                <p className="text-sm">{appointment.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="secondary">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {new Intl.NumberFormat('es-CO', { 
                              style: 'currency', 
                              currency: 'COP',
                              minimumFractionDigits: 0
                            }).format(appointment.total_amount || 0)}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDayModal(false);
                              handleEditAppointment(appointment);
                            }}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de cita */}
      <Dialog 
        open={showModal} 
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) {
            setSelectedPatientId('');
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAppointment ? 'Editar Cita' : 'Nueva Cita'}
            </DialogTitle>
            <DialogDescription>
              {selectedAppointment 
                ? 'Modifica los detalles de la cita existente' 
                : 'Completa la información para agendar una nueva cita'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Servicio
                </Label>
                <Select
                  value={formData.service_id}
                  onValueChange={(value) => setFormData({ ...formData, service_id: value })}
                >
                  <SelectTrigger className="w-full hover:border-gray-400 transition-colors">
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem 
                        key={service.id} 
                        value={service.id}
                        className="hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{service.name}</span>
                          <Badge variant="secondary" className="ml-2">
                            {service.duration_minutes} min
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profesional
                </Label>
                <Select
                  value={formData.professional_id}
                  onValueChange={(value) => setFormData({ ...formData, professional_id: value })}
                >
                  <SelectTrigger className="w-full hover:border-gray-400 transition-colors">
                    <SelectValue placeholder="Seleccionar profesional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned" className="hover:bg-gray-50">
                      <span className="text-gray-500">Sin asignar</span>
                    </SelectItem>
                    {professionals.map(prof => (
                      <SelectItem 
                        key={prof.id} 
                        value={prof.id}
                        className="hover:bg-gray-50"
                      >
                        Dr. {prof.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha
                </Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="hover:border-gray-400 transition-colors"
                  required
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hora
                </Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="hover:border-gray-400 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Información del Paciente</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Buscar paciente existente</Label>
                  {loadingPatients ? (
                    <div className="flex items-center justify-center p-3 border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-gray-500">Cargando pacientes...</span>
                    </div>
                  ) : (
                    <Combobox
                      options={patientOptions}
                      value={selectedPatientId}
                      onValueChange={handlePatientSelect}
                      placeholder="Buscar por nombre o email..."
                      searchPlaceholder="Escriba para buscar..."
                      emptyText="No se encontraron pacientes"
                    />
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">O agregar nuevo paciente</span>
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nombre completo
                  </Label>
                  <Input
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    placeholder="Nombre del paciente"
                    className="hover:border-gray-400 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={formData.patient_email}
                      onChange={(e) => setFormData({ ...formData, patient_email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                      className="hover:border-gray-400 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Teléfono
                    </Label>
                    <Input
                      value={formData.patient_phone}
                      onChange={(e) => setFormData({ ...formData, patient_phone: e.target.value })}
                      placeholder="+57 300 123 4567"
                      className="hover:border-gray-400 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-between pt-4">
              {selectedAppointment && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    handleCancelAppointment(selectedAppointment.id);
                    setShowModal(false);
                  }}
                  className="hover:bg-red-700 transition-colors"
                >
                  Cancelar Cita
                </Button>
              )}
              
              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Cerrar
                </Button>
                <Button 
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white transition-colors"
                >
                  {selectedAppointment ? 'Actualizar' : 'Crear'} Cita
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}