'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/utils/supabase/client';
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
  DollarSign
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
  onRefresh
}: CalendarViewProps) {
  const supabase = createClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
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
        professional_id: formData.professional_id || null,
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
      case 'confirmed': return 'text-green-600 bg-green-50';
      case 'completed': return 'text-blue-600 bg-blue-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
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
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                >
                  Hoy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPeriod}
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
                  className="px-3 py-1"
                >
                  Semana
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="px-3 py-1"
                >
                  Mes
                </Button>
              </div>
              
              <Button onClick={handleAddAppointment}>
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
                  className={`p-3 border-r text-center ${
                    date.toDateString() === new Date().toDateString() 
                      ? 'bg-green-50' 
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
                      className={`min-h-[100px] p-2 border-r border-b last:border-r-0 ${
                        !isCurrentMonth ? 'bg-gray-50' : ''
                      } ${isToday ? 'bg-green-50' : ''}`}
                    >
                      <div className="font-semibold text-sm mb-1">
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 3).map((apt) => (
                          <div
                            key={apt.id}
                            onClick={() => handleEditAppointment(apt)}
                            className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${
                              getStatusColor(apt.status)
                            }`}
                          >
                            <div className="font-medium truncate">
                              {apt.appointment_time} - {apt.patient?.full_name}
                            </div>
                            <div className="truncate">
                              {apt.service?.name}
                            </div>
                          </div>
                        ))}
                        {dayAppointments.length > 3 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dayAppointments.length - 3} más
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
                      <div key={dateIndex} className="p-2 border-r relative">
                        {dayAppointments.map(apt => (
                          <div
                            key={apt.id}
                            onClick={() => handleEditAppointment(apt)}
                            className={`mb-1 p-2 rounded text-xs cursor-pointer hover:shadow-md transition-shadow ${
                              getStatusColor(apt.status)
                            }`}
                          >
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

      {/* Modal de cita */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAppointment ? 'Editar Cita' : 'Nueva Cita'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Servicio</Label>
                <Select
                  value={formData.service_id}
                  onValueChange={(value) => setFormData({ ...formData, service_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} ({service.duration_minutes} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Profesional</Label>
                <Select
                  value={formData.professional_id}
                  onValueChange={(value) => setFormData({ ...formData, professional_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar profesional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map(prof => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Información del Paciente</h3>
              
              <div>
                <Label>Nombre completo</Label>
                <Input
                  value={formData.patient_name}
                  onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.patient_email}
                    onChange={(e) => setFormData({ ...formData, patient_email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.patient_phone}
                    onChange={(e) => setFormData({ ...formData, patient_phone: e.target.value })}
                  />
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
                <Button type="submit">
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