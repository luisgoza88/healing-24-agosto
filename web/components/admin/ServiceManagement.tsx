'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { differenceInMinutes, format as formatDateFns } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useServicesAdmin } from '@/hooks/useServicesAdmin';
import {
  useServiceDashboard,
  serviceDashboardDateRangeLabel,
  type ServiceDashboardViewMode,
  type ServiceCalendarEvent,
} from '@/hooks/useServiceDashboard';
import ServiceCalendarPanel from './ServiceCalendarPanel';
import {
  Activity,
  Calendar,
  ChevronRight,
  Package,
  Users,
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-200 text-gray-700',
};

const paymentFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const formatDateTime = (date: Date | null) => {
  if (!date || Number.isNaN(date.getTime())) {
    return '--';
  }
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return '--';
  }
  try {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

export default function ServiceManagement() {
  const supabase = useSupabase();
  const { dashboardStats, loading, error } = useServicesAdmin(supabase);

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [calendarViewMode, setCalendarViewMode] = useState<ServiceDashboardViewMode>('week');
  const [calendarReferenceDate, setCalendarReferenceDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('appointments');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<ServiceCalendarEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const runAppointmentAction = async (
    appointmentId: string,
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    try {
      setActionLoadingId(appointmentId);
      await action();
      showFeedback('success', successMessage);
      return true;
    } catch (error) {
      console.error(error);
      showFeedback('error', error instanceof Error ? error.message : 'No se pudo actualizar la cita');
      return false;
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeService = useMemo(() => {
    if (!dashboardStats.length) {
      return null;
    }
    if (selectedServiceId) {
      return dashboardStats.find((service) => service.id === selectedServiceId) ?? dashboardStats[0];
    }
    return dashboardStats[0];
  }, [dashboardStats, selectedServiceId]);

  useEffect(() => {
    if (!selectedServiceId && dashboardStats.length) {
      setSelectedServiceId(dashboardStats[0].id);
    }
  }, [dashboardStats, selectedServiceId]);

  useEffect(() => {
    setSelectedAppointmentId(null);
  }, [activeService?.id]);

  const serviceDashboard = useServiceDashboard(activeService?.id, {
    date: calendarReferenceDate,
    viewMode: calendarViewMode,
  });

  const dashboardRangeLabel = useMemo(
    () => serviceDashboardDateRangeLabel(serviceDashboard.range),
    [serviceDashboard.range]
  );

  const totalAppointmentsInRange = useMemo(
    () => serviceDashboard.data.calendar.length,
    [serviceDashboard.data.calendar]
  );

  const statusSummary = useMemo(() => {
    const summary: Record<string, number> = {
      confirmed: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };
    serviceDashboard.data.calendar.forEach((event) => {
      const key = (event.status ?? 'pending') as keyof typeof summary;
      if (summary[key] !== undefined) {
        summary[key] += 1;
      } else {
        summary.pending += 1;
      }
    });
    return summary;
  }, [serviceDashboard.data.calendar]);

  const revenueSummary = useMemo(() => (
    serviceDashboard.data.calendar.reduce(
      (acc, event) => {
        acc.expected += event.totalAmount ?? 0;
        acc.paid += event.amountPaid ?? 0;
        return acc;
      },
      { expected: 0, paid: 0 },
    )
  ), [serviceDashboard.data.calendar]);

  const uniquePatientsInRange = useMemo(() => {
    const set = new Set<string>();
    serviceDashboard.data.calendar.forEach((event) => {
      if (event.patient.id) {
        set.add(event.patient.id);
      }
    });
    return set.size;
  }, [serviceDashboard.data.calendar]);

  const topSubServices = useMemo(() =>
    [...serviceDashboard.data.subServices]
      .sort((a, b) => b.revenue.paid - a.revenue.paid)
      .slice(0, 3),
  [serviceDashboard.data.subServices]);

  const topProfessionals = useMemo(() =>
    [...serviceDashboard.data.professionals]
      .sort((a, b) => b.revenue.paid - a.revenue.paid)
      .slice(0, 3),
  [serviceDashboard.data.professionals]);

  const handleSelectEvent = (event: ServiceCalendarEvent) => {
    setSelectedAppointmentId(event.appointmentId);
    setActiveTab('appointments');
  };

  const rescheduleAppointment = async (payload: { event: ServiceCalendarEvent; start: Date; end: Date }) => {
    const { event, start, end } = payload;
    const confirmed = window.confirm(`¿Reprogramar la cita al ${formatDateTime(start)}?`);
    if (!confirmed) {
      return;
    }

    const newDate = formatDateFns(start, 'yyyy-MM-dd');
    const newTime = formatDateFns(start, 'HH:mm:ss');
    const effectiveEnd = end ?? new Date(start.getTime() + (event.durationMinutes ?? 60) * 60 * 1000);
    const duration = Math.max(differenceInMinutes(effectiveEnd, start), event.durationMinutes ?? 60);

    await runAppointmentAction(
      event.appointmentId,
      () =>
        serviceDashboard.rescheduleAppointment({
          appointmentId: event.appointmentId,
          appointmentDate: newDate,
          appointmentTime: newTime,
          durationMinutes: duration,
          professionalId: event.professional.id ?? null,
          subServiceId: event.subServiceId ?? null,
        }),
      'Cita reprogramada exitosamente',
    );

    setSelectedAppointmentId(event.appointmentId);
    setActiveTab('appointments');
  };

  const handleEventDrop = async (args: { event: ServiceCalendarEvent; start: Date; end: Date }) => {
    await rescheduleAppointment(args);
  };

  const handleEventResize = async (args: { event: ServiceCalendarEvent; start: Date; end: Date }) => {
    await rescheduleAppointment(args);
  };

  const handleCancelAppointment = (appointment: ServiceCalendarEvent) => {
    const reason = window.prompt('Motivo de cancelación', '');
    if (reason === null) {
      return;
    }

    setSelectedAppointmentId(appointment.appointmentId);
    setSelectedAppointment(appointment);
    setDetailOpen(true);
    setActiveTab('appointments');

    void runAppointmentAction(
      appointment.appointmentId,
      () =>
        serviceDashboard.cancelAppointment({
          appointmentId: appointment.appointmentId,
          reason: reason || undefined,
        }),
      'Cita cancelada',
    ).then((success) => {
      if (success) {
        setDetailOpen(false);
      }
    });
  };

  const handleConfirmAppointment = (appointment: ServiceCalendarEvent) => {
    setSelectedAppointmentId(appointment.appointmentId);
    setSelectedAppointment(appointment);
    setDetailOpen(true);
    setActiveTab('appointments');

    void runAppointmentAction(
      appointment.appointmentId,
      () =>
        serviceDashboard.updateAppointmentStatus({
          appointmentId: appointment.appointmentId,
          status: 'confirmed',
        }),
      'Cita confirmada',
    ).then((success) => {
      if (success) {
        setDetailOpen(false);
      }
    });
  };

  const handleCompleteAppointment = (appointment: ServiceCalendarEvent) => {
    setSelectedAppointmentId(appointment.appointmentId);
    setSelectedAppointment(appointment);
    setDetailOpen(true);
    setActiveTab('appointments');

    void runAppointmentAction(
      appointment.appointmentId,
      () =>
        serviceDashboard.updateAppointmentStatus({
          appointmentId: appointment.appointmentId,
          status: 'completed',
        }),
      'Cita marcada como completada',
    ).then((success) => {
      if (success) {
        setDetailOpen(false);
      }
    });
  };

  const handleCalendarViewChange = (mode: ServiceDashboardViewMode) => {
    setCalendarViewMode(mode);
  };

  const handleCalendarNavigate = (date: Date) => {
    setCalendarReferenceDate(new Date(date));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Gestión de Servicios</h1>
        <p className="text-muted-foreground">
          Explora calendarios, citas, pacientes y métricas por cada servicio.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {feedback && (
        <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total servicios</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.length}</div>
            <p className="text-xs text-muted-foreground">Registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sub-servicios</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats.reduce((acc, service) => acc + (service.sub_service_count ?? 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Configurados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profesionales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats.reduce((acc, service) => acc + (service.professional_count ?? 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Asignaciones totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas futuras</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats.reduce((acc, service) => acc + (service.upcoming_appointments ?? 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Confirmadas y pendientes</p>
          </CardContent>
        </Card>
      </div>

      {activeService && (
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Calendario de {activeService.name}
                </CardTitle>
                <CardDescription>
                  Rango: {dashboardRangeLabel}
                  {serviceDashboard.isFetching ? ' · actualizando…' : ''}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(['day', 'week', 'month'] as ServiceDashboardViewMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={calendarViewMode === mode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleCalendarViewChange(mode)}
                    disabled={serviceDashboard.isLoading}
                  >
                    {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes'}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div className="rounded-lg border bg-gray-50 p-3">
                <p className="text-xs uppercase text-muted-foreground">Total en rango</p>
                <p className="text-lg font-semibold text-gray-900">{serviceDashboard.isLoading ? '…' : totalAppointmentsInRange}</p>
              </div>
              <div className="rounded-lg border bg-green-50 p-3">
                <p className="text-xs uppercase text-green-700">Confirmadas</p>
                <p className="text-lg font-semibold text-green-900">{serviceDashboard.isLoading ? '…' : statusSummary.confirmed}</p>
              </div>
              <div className="rounded-lg border bg-amber-50 p-3">
                <p className="text-xs uppercase text-amber-700">Pendientes</p>
                <p className="text-lg font-semibold text-amber-900">{serviceDashboard.isLoading ? '…' : statusSummary.pending}</p>
              </div>
              <div className="rounded-lg border bg-blue-50 p-3">
                <p className="text-xs uppercase text-blue-700">Ingresos esperados</p>
                <p className="text-lg font-semibold text-blue-900">
                  {serviceDashboard.isLoading ? '…' : paymentFormatter.format(revenueSummary.expected)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ServiceCalendarPanel
              events={serviceDashboard.data.calendar}
              loading={serviceDashboard.isLoading || serviceDashboard.isFetching}
              viewMode={calendarViewMode}
              referenceDate={calendarReferenceDate}
              onViewChange={handleCalendarViewChange}
              onNavigate={handleCalendarNavigate}
              onSelectEvent={handleSelectEvent}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Servicios</CardTitle>
              <CardDescription>Selecciona un servicio para explorar sus datos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Cargando…</div>
              ) : (
                dashboardStats.map((service, index) => {
                  const itemKey = service.id || service.code || `service-${index}`;
                  const isActive = activeService?.id === service.id;
                  return (
                    <button
                      key={itemKey}
                      type="button"
                      onClick={() => setSelectedServiceId(service.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isActive ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{service.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {service.sub_service_count ?? 0} sub-servicios · {service.professional_count ?? 0} profesionales
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <CardHeader className="pb-0">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <CardTitle className="text-lg font-semibold">Panel del servicio</CardTitle>
                  <TabsList>
                    <TabsTrigger value="appointments">Citas</TabsTrigger>
                    <TabsTrigger value="patients">Pacientes</TabsTrigger>
                    <TabsTrigger value="professionals">Profesionales</TabsTrigger>
                    <TabsTrigger value="reports">Reportes</TabsTrigger>
                    <TabsTrigger value="settings">Configuración</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <TabsContent value="appointments">
                  {serviceDashboard.isLoading ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">Cargando citas…</div>
                  ) : serviceDashboard.data.calendar.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">Sin citas en el rango seleccionado.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2">Fecha y hora</th>
                            <th className="px-4 py-2">Paciente</th>
                            <th className="px-4 py-2">Profesional</th>
                            <th className="px-4 py-2">Servicio</th>
                            <th className="px-4 py-2">Estado</th>
                            <th className="px-4 py-2">Pago</th>
                            <th className="px-4 py-2">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {serviceDashboard.data.calendar.map((appointment) => {
                            const statusClass = STATUS_STYLES[appointment.status] ?? STATUS_STYLES.pending;
                            const isSelected = selectedAppointmentId === appointment.appointmentId;
                            const rowClasses = cn(
                              'cursor-pointer bg-white transition-colors',
                              isSelected && 'bg-primary/10',
                            );

                            const canConfirm = appointment.status === 'pending';
                            const canComplete = appointment.status === 'confirmed';
                            const canCancel = appointment.status === 'pending' || appointment.status === 'confirmed';

                            return (
                              <tr
                                key={appointment.appointmentId}
                                className={rowClasses}
                                onClick={() => {
                                  setSelectedAppointmentId(appointment.appointmentId);
                                  setActiveTab('appointments');
                                }}
                              >
                                <td className="px-4 py-3 align-top">
                                  <div className="font-medium text-foreground">{formatDateTime(appointment.start)}</div>
                                  <div className="text-xs text-muted-foreground">Duración: {appointment.durationMinutes} min</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="font-medium text-foreground">{appointment.patient.name ?? 'Sin nombre'}</div>
                                  <div className="text-xs text-muted-foreground">{appointment.patient.email ?? '—'}</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="font-medium text-foreground">{appointment.professional.name ?? 'Por asignar'}</div>
                                  <div className="text-xs text-muted-foreground">{appointment.professional.title ?? ''}</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="font-medium text-foreground">{appointment.subServiceName ?? appointment.serviceName}</div>
                                  <div className="text-xs text-muted-foreground">{paymentFormatter.format(appointment.totalAmount ?? 0)}</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <Badge className={`${statusClass} border border-transparent capitalize`}>
                                    {appointment.status.replace('_', ' ')}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="font-medium text-foreground">{paymentFormatter.format(appointment.amountPaid ?? 0)}</div>
                                  <div className="text-xs text-muted-foreground">{appointment.paymentStatus ?? 'pending'}</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="flex flex-wrap gap-2">
                                    {canConfirm && (
                                      <Button
                                        variant="outline"
                                        size="xs"
                                        disabled={actionLoadingId === appointment.appointmentId}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleConfirmAppointment(appointment);
                                        }}
                                      >
                                        Confirmar
                                      </Button>
                                    )}
                                    {canComplete && (
                                      <Button
                                        variant="outline"
                                        size="xs"
                                        disabled={actionLoadingId === appointment.appointmentId}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleCompleteAppointment(appointment);
                                        }}
                                      >
                                        Finalizar
                                      </Button>
                                    )}
                                    {canCancel && (
                                      <Button
                                        variant="destructive"
                                        size="xs"
                                        disabled={actionLoadingId === appointment.appointmentId}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleCancelAppointment(appointment);
                                        }}
                                      >
                                        Cancelar
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="patients">
                  {serviceDashboard.isLoading ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">Cargando pacientes…</div>
                  ) : serviceDashboard.data.patients.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">Aún no hay pacientes asociados a este servicio.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2">Paciente</th>
                            <th className="px-4 py-2">Contacto</th>
                            <th className="px-4 py-2">Citas</th>
                            <th className="px-4 py-2">Profesionales</th>
                            <th className="px-4 py-2">Ingresos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {serviceDashboard.data.patients.map((patient) => (
                            <tr key={patient.patientId} className="bg-white">
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-foreground">{patient.name ?? 'Sin nombre'}</div>
                                <div className="text-xs text-muted-foreground">Primera cita: {formatDate(patient.firstAppointmentOn)}</div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="text-sm text-muted-foreground">{patient.email ?? '—'}</div>
                                <div className="text-xs text-muted-foreground">{patient.phone ?? ''}</div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-foreground">{patient.activeAppointments} activas</div>
                                <div className="text-xs text-muted-foreground">{patient.totalAppointments} totales</div>
                              </td>
                              <td className="px-4 py-3 align-top">{patient.professionalsSeen}</td>
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-foreground">{paymentFormatter.format(patient.totalPaid)}</div>
                                <div className="text-xs text-muted-foreground">Facturado: {paymentFormatter.format(patient.totalAmount)}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="professionals">
                  {serviceDashboard.isLoading ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">Cargando profesionales…</div>
                  ) : serviceDashboard.data.professionals.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">No hay profesionales asignados en este rango.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2">Profesional</th>
                            <th className="px-4 py-2">Citas</th>
                            <th className="px-4 py-2">Estado</th>
                            <th className="px-4 py-2">Ingresos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {serviceDashboard.data.professionals.map((professional) => (
                            <tr key={professional.professionalId ?? professional.professionalEmail} className="bg-white">
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-foreground">{professional.professionalName ?? 'Sin asignar'}</div>
                                <div className="text-xs text-muted-foreground">{professional.professionalEmail ?? ''}</div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-foreground">{professional.totals.appointments}</div>
                                <div className="text-xs text-muted-foreground">Completadas: {professional.totals.completed}</div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="text-xs text-muted-foreground">Confirmadas: {professional.totals.confirmed}</div>
                                <div className="text-xs text-muted-foreground">Canceladas: {professional.totals.cancelled}</div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-foreground">{paymentFormatter.format(professional.revenue.paid)}</div>
                                <div className="text-xs text-muted-foreground">Total esperado: {paymentFormatter.format(professional.revenue.total)}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="reports">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold">Resumen del período</CardTitle>
                        <CardDescription>Datos agregados con base en las citas cargadas.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Pacientes únicos en rango</span>
                          <span className="font-semibold text-foreground">{uniquePatientsInRange}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Ingresos cobrados</span>
                          <span className="font-semibold text-foreground">{paymentFormatter.format(revenueSummary.paid)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Ingresos pendientes</span>
                          <span className="font-semibold text-foreground">{paymentFormatter.format(revenueSummary.expected - revenueSummary.paid)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold">Top sub-servicios</CardTitle>
                        <CardDescription>Basado en ingresos pagados.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        {topSubServices.length === 0 ? (
                          <div className="text-muted-foreground">Sin información disponible.</div>
                        ) : (
                          topSubServices.map((item) => (
                            <div key={item.subServiceId ?? item.subServiceName} className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-foreground">{item.subServiceName ?? 'Sin nombre'}</div>
                                <div className="text-xs text-muted-foreground">
                                  {item.totals.appointments} citas · completadas {item.totals.completed}
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-foreground">{paymentFormatter.format(item.revenue.paid)}</div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold">Top profesionales</CardTitle>
                        <CardDescription>Ranking por ingresos cobrados.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        {topProfessionals.length === 0 ? (
                          <div className="text-muted-foreground">Sin información disponible.</div>
                        ) : (
                          topProfessionals.map((professional) => (
                            <div key={professional.professionalId ?? professional.professionalEmail} className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-foreground">{professional.professionalName ?? 'Sin nombre'}</div>
                                <div className="text-xs text-muted-foreground">{professional.totals.appointments} citas</div>
                              </div>
                              <div className="text-sm font-semibold text-foreground">{paymentFormatter.format(professional.revenue.paid)}</div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold">Métricas diarias</CardTitle>
                        <CardDescription>Totales por fecha en el rango.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {serviceDashboard.data.metrics.length === 0 ? (
                          <div className="text-muted-foreground">Aún no hay datos para este rango.</div>
                        ) : (
                          serviceDashboard.data.metrics.map((metric) => (
                            <div key={metric.appointmentDate} className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                              <div>
                                <div className="font-medium text-foreground">{formatDate(metric.appointmentDate)}</div>
                                <div className="text-xs text-muted-foreground">
                                  Confirmadas {metric.totals.confirmed} · Canceladas {metric.totals.cancelled}
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-foreground">{paymentFormatter.format(metric.revenue.paid)}</div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="settings">
                  <div className="space-y-2 rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                    <p>El panel de configuración heredado se reemplazará por controles específicos (recordatorios, horarios, reglas de reservas, etc.).</p>
                    <p className="text-foreground">En los próximos sprints integraremos estas opciones aquí.</p>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
