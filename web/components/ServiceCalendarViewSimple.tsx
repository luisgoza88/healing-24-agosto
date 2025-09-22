'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/ui/button';
import { ServiceCalendarEvent, ServiceDashboardViewMode } from '@/hooks/useServiceDashboard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ServiceCalendarViewProps {
  serviceId: string;
  serviceName: string;
  referenceDate: Date;
  viewMode: ServiceDashboardViewMode;
  events: ServiceCalendarEvent[];
}

export default function ServiceCalendarView({
  serviceId,
  serviceName,
  referenceDate,
  viewMode,
  events
}: ServiceCalendarViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<ServiceCalendarEvent | null>(null);

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
          icon: <AlertCircle className="h-4 w-4" />,
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
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const dateKey = format(event.start, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, ServiceCalendarEvent[]>);

  // Sort events by time
  Object.keys(eventsByDate).forEach(date => {
    eventsByDate[date].sort((a, b) => a.start.getTime() - b.start.getTime());
  });

  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(referenceDate);
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

  const weekDates = viewMode === 'week' ? getWeekDates() : [];

  return (
    <div className="space-y-6">
      {viewMode === 'week' ? (
        // Week view
        <Card padding="none">
          <div className="grid grid-cols-8 border-b border-border">
            <div className="p-3 border-r border-border font-medium text-sm text-muted-foreground">
              Hora
            </div>
            {weekDates.map((date, index) => (
              <div 
                key={index}
                className={cn(
                  "p-3 border-r border-border text-center",
                  format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && "bg-primary/5"
                )}
              >
                <div className="text-sm text-muted-foreground">
                  {format(date, 'EEE', { locale: es })}
                </div>
                <div className="font-semibold text-foreground">
                  {format(date, 'd')}
                </div>
              </div>
            ))}
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {Array.from({ length: 12 }, (_, i) => i + 7).map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b border-border">
                <div className="p-3 border-r border-border text-sm text-muted-foreground">
                  {hour}:00
                </div>
                {weekDates.map((date, dateIndex) => {
                  const dateKey = format(date, 'yyyy-MM-dd');
                  const hourEvents = (eventsByDate[dateKey] || []).filter(event => {
                    const eventHour = event.start.getHours();
                    return eventHour === hour;
                  });

                  return (
                    <div 
                      key={dateIndex} 
                      className="p-2 border-r border-border min-h-[80px]"
                    >
                      {hourEvents.map((event, eventIndex) => {
                        const statusConfig = getStatusConfig(event.status);
                        return (
                          <motion.div
                            key={event.appointmentId}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: eventIndex * 0.05 }}
                            onClick={() => setSelectedEvent(event)}
                            className={cn(
                              "mb-2 p-2 rounded-md border cursor-pointer transition-all hover:shadow-md",
                              statusConfig.color
                            )}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              {statusConfig.icon}
                              <span className="text-xs font-medium">
                                {format(event.start, 'HH:mm')}
                              </span>
                            </div>
                            <p className="text-xs font-medium truncate">
                              {event.patient.name || 'Sin nombre'}
                            </p>
                            {event.subServiceName && (
                              <p className="text-xs text-muted-foreground truncate">
                                {event.subServiceName}
                              </p>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      ) : (
        // List view for day/month
        <div className="space-y-4">
          {Object.entries(eventsByDate).map(([date, dateEvents], dateIndex) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dateIndex * 0.1 }}
            >
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {format(new Date(date), 'EEEE, d \'de\' MMMM', { locale: es })}
              </h3>
              <div className="space-y-2">
                {dateEvents.map((event, eventIndex) => {
                  const statusConfig = getStatusConfig(event.status);
                  return (
                    <motion.div
                      key={event.appointmentId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + eventIndex * 0.05 }}
                    >
                      <Card
                        onClick={() => setSelectedEvent(event)}
                        className="cursor-pointer hover:shadow-md transition-all"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
                                  statusConfig.color
                                )}>
                                  {statusConfig.icon}
                                  {statusConfig.text}
                                </div>
                                <span className="text-sm font-medium text-foreground">
                                  {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                                </span>
                              </div>

                              <div className="grid gap-2">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium text-foreground">
                                    {event.patient.name || 'Sin nombre'}
                                  </span>
                                </div>

                                {event.patient.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                      {event.patient.phone}
                                    </span>
                                  </div>
                                )}

                                {event.patient.email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                      {event.patient.email}
                                    </span>
                                  </div>
                                )}

                                {event.subServiceName && (
                                  <p className="text-sm text-muted-foreground">
                                    Servicio: {event.subServiceName}
                                  </p>
                                )}

                                {event.professional.name && (
                                  <p className="text-sm text-muted-foreground">
                                    Profesional: {event.professional.name}
                                  </p>
                                )}

                                {event.notes && (
                                  <div className="mt-2 p-2 bg-muted rounded-md">
                                    <p className="text-xs text-muted-foreground">Notas:</p>
                                    <p className="text-sm">{event.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="ml-4 text-right">
                              <p className="text-lg font-semibold text-foreground">
                                {formatCurrency(event.totalAmount)}
                              </p>
                              {event.paymentStatus && (
                                <p className="text-xs text-muted-foreground">
                                  {event.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
          
          {events.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay citas en este período</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Selected Event Details Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
          >
            <CardHeader>
              <CardTitle>Detalles de la Cita</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <h3 className="font-medium mb-2">Información del Paciente</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Nombre:</span> {selectedEvent.patient.name || 'Sin nombre'}
                    </p>
                    {selectedEvent.patient.email && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Email:</span> {selectedEvent.patient.email}
                      </p>
                    )}
                    {selectedEvent.patient.phone && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Teléfono:</span> {selectedEvent.patient.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Detalles de la Cita</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Fecha:</span> {format(selectedEvent.start, 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Hora:</span> {format(selectedEvent.start, 'HH:mm')} - {format(selectedEvent.end, 'HH:mm')}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Duración:</span> {selectedEvent.durationMinutes} minutos
                    </p>
                    {selectedEvent.subServiceName && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Servicio:</span> {selectedEvent.subServiceName}
                      </p>
                    )}
                    {selectedEvent.professional.name && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Profesional:</span> {selectedEvent.professional.name}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Estado:</span>
                      {(() => {
                        const config = getStatusConfig(selectedEvent.status);
                        return (
                          <div className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
                            config.color
                          )}>
                            {config.icon}
                            {config.text}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Información de Pago</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Monto total:</span> {formatCurrency(selectedEvent.totalAmount)}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Monto pagado:</span> {formatCurrency(selectedEvent.amountPaid)}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Estado de pago:</span> {selectedEvent.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                    </p>
                  </div>
                </div>

                {selectedEvent.notes && (
                  <div>
                    <h3 className="font-medium mb-2">Notas</h3>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">{selectedEvent.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedEvent(null)}
                >
                  Cerrar
                </Button>
                <Button
                  leftIcon={<Edit className="h-4 w-4" />}
                >
                  Editar Cita
                </Button>
              </div>
            </CardContent>
          </motion.div>
        </div>
      )}
    </div>
  );
}