import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfMonth, endOfWeek, formatISO, parseISO, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useSupabase } from '@/lib/supabase';

type ServiceDashboardViewMode = 'day' | 'week' | 'month';

type DateRange = {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
};

export interface ServiceCalendarEvent {
  appointmentId: string;
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  subServiceId: string | null;
  subServiceName: string | null;
  status: string;
  paymentStatus: string | null;
  totalAmount: number;
  amountPaid: number;
  patient: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
  };
  professional: {
    id: string | null;
    name: string | null;
    email: string | null;
    title: string | null;
  };
  notes: string | null;
  start: Date;
  end: Date;
  durationMinutes: number;
  raw: any;
}

export interface ServicePatientSummary {
  patientId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  activeAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalAppointments: number;
  professionalsSeen: number;
  firstAppointmentOn: string | null;
  lastAppointmentOn: string | null;
  totalAmount: number;
  totalPaid: number;
}

export interface ServiceDailyMetric {
  appointmentDate: string;
  totals: {
    appointments: number;
    confirmed: number;
    completed: number;
    pending: number;
    cancelled: number;
    noShow: number;
    uniquePatients: number;
    uniqueProfessionals: number;
  };
  revenue: {
    total: number;
    paid: number;
  };
}

export interface ServiceProfessionalMetric {
  professionalId: string | null;
  professionalName: string | null;
  professionalEmail: string | null;
  totals: {
    appointments: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
  revenue: {
    total: number;
    paid: number;
  };
  span: {
    firstAppointmentOn: string | null;
    lastAppointmentOn: string | null;
  };
}

export interface ServiceSubServiceMetric {
  subServiceId: string | null;
  subServiceName: string | null;
  totals: {
    appointments: number;
    completed: number;
  };
  revenue: {
    total: number;
    paid: number;
  };
  span: {
    firstAppointmentOn: string | null;
    lastAppointmentOn: string | null;
  };
}

export interface ServiceDashboardData {
  calendar: ServiceCalendarEvent[];
  patients: ServicePatientSummary[];
  metrics: ServiceDailyMetric[];
  professionals: ServiceProfessionalMetric[];
  subServices: ServiceSubServiceMetric[];
}

export interface ServiceDashboardFilters {
  date?: Date;
  viewMode?: ServiceDashboardViewMode;
}

interface ReschedulePayload {
  appointmentId: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm:ss
  durationMinutes?: number;
  professionalId?: string | null;
  subServiceId?: string | null;
}

interface CancelPayload {
  appointmentId: string;
  reason?: string;
}

interface UpdateStatusPayload {
  appointmentId: string;
  status: string;
}

const VIEW_MODE_DEFAULT: ServiceDashboardViewMode = 'week';

const formatCurrencyValue = (value: number | null | undefined) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const normaliseString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return null;
};

const buildDateRange = (viewMode: ServiceDashboardViewMode, referenceDate: Date): DateRange => {
  const localeOptions = { weekStartsOn: 1 } as const;
  switch (viewMode) {
    case 'day': {
      const start = formatISO(startOfDay(referenceDate), { representation: 'date' });
      return { start, end: start };
    }
    case 'week': {
      const start = formatISO(startOfWeek(referenceDate, localeOptions), { representation: 'date' });
      const end = formatISO(endOfWeek(referenceDate, localeOptions), { representation: 'date' });
      return { start, end };
    }
    case 'month':
    default: {
      const start = formatISO(startOfMonth(referenceDate), { representation: 'date' });
      const end = formatISO(endOfMonth(referenceDate), { representation: 'date' });
      return { start, end };
    }
  }
};

const composeDate = (date: string | null, time: string | null) => {
  if (!date || !time) {
    return null;
  }
  try {
    return new Date(`${date}T${time}`);
  } catch (error) {
    return null;
  }
};

const computeEndDate = (start: Date | null, endTime: string | null, durationMinutes: number | null | undefined) => {
  if (!start) {
    return null;
  }
  if (endTime) {
    const end = new Date(`${formatISO(start, { representation: 'date' })}T${endTime}`);
    if (!Number.isNaN(end.getTime())) {
      return end;
    }
  }
  const duration = typeof durationMinutes === 'number' && Number.isFinite(durationMinutes)
    ? durationMinutes
    : 60;
  return new Date(start.getTime() + duration * 60 * 1000);
};

const mapCalendarEvent = (row: any): ServiceCalendarEvent => {
  const start = composeDate(row.appointment_date, row.appointment_time);
  const end = computeEndDate(start, row.end_time, row.duration_minutes);

  return {
    appointmentId: row.appointment_id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    serviceCode: row.service_code,
    subServiceId: row.sub_service_id ?? null,
    subServiceName: row.sub_service_name ?? null,
    status: row.status,
    paymentStatus: row.payment_status ?? null,
    totalAmount: formatCurrencyValue(row.total_amount),
    amountPaid: formatCurrencyValue(row.amount_paid),
    notes: normaliseString(row.notes),
    patient: {
      id: row.patient_id,
      name: normaliseString(row.patient_name),
      email: normaliseString(row.patient_email),
      phone: normaliseString(row.patient_phone),
      avatarUrl: normaliseString(row.patient_avatar_url),
    },
    professional: {
      id: row.professional_id ?? null,
      name: normaliseString(row.professional_name),
      email: normaliseString(row.professional_email),
      title: normaliseString(row.professional_title),
    },
    start: start ?? new Date(),
    end: end ?? (start ? new Date(start.getTime() + 60 * 60 * 1000) : new Date()),
    durationMinutes: typeof row.duration_minutes === 'number' ? row.duration_minutes : 60,
    raw: row,
  };
};

const mapPatientSummary = (row: any): ServicePatientSummary => ({
  patientId: row.patient_id,
  name: normaliseString(row.patient_name),
  email: normaliseString(row.patient_email),
  phone: normaliseString(row.patient_phone),
  avatarUrl: normaliseString(row.patient_avatar_url),
  activeAppointments: Number(row.active_appointments ?? 0),
  completedAppointments: Number(row.completed_appointments ?? 0),
  cancelledAppointments: Number(row.cancelled_appointments ?? 0),
  totalAppointments: Number(row.total_appointments ?? 0),
  professionalsSeen: Number(row.professionals_seen ?? 0),
  firstAppointmentOn: row.first_appointment_on ?? null,
  lastAppointmentOn: row.last_appointment_on ?? null,
  totalAmount: formatCurrencyValue(row.total_amount),
  totalPaid: formatCurrencyValue(row.total_paid),
});

const mapDailyMetric = (row: any): ServiceDailyMetric => ({
  appointmentDate: row.appointment_date,
  totals: {
    appointments: Number(row.total_appointments ?? 0),
    confirmed: Number(row.confirmed_appointments ?? 0),
    completed: Number(row.completed_appointments ?? 0),
    pending: Number(row.pending_appointments ?? 0),
    cancelled: Number(row.cancelled_appointments ?? 0),
    noShow: Number(row.no_show_appointments ?? 0),
    uniquePatients: Number(row.unique_patients ?? 0),
    uniqueProfessionals: Number(row.unique_professionals ?? 0),
  },
  revenue: {
    total: formatCurrencyValue(row.total_amount),
    paid: formatCurrencyValue(row.total_paid),
  },
});

const mapProfessionalMetric = (row: any): ServiceProfessionalMetric => ({
  professionalId: row.professional_id ?? null,
  professionalName: normaliseString(row.professional_name),
  professionalEmail: normaliseString(row.professional_email),
  totals: {
    appointments: Number(row.total_appointments ?? 0),
    confirmed: Number(row.confirmed_appointments ?? 0),
    completed: Number(row.completed_appointments ?? 0),
    cancelled: Number(row.cancelled_appointments ?? 0),
  },
  revenue: {
    total: formatCurrencyValue(row.total_amount),
    paid: formatCurrencyValue(row.total_paid),
  },
  span: {
    firstAppointmentOn: row.first_appointment_on ?? null,
    lastAppointmentOn: row.last_appointment_on ?? null,
  },
});

const mapSubServiceMetric = (row: any): ServiceSubServiceMetric => ({
  subServiceId: row.sub_service_id ?? null,
  subServiceName: normaliseString(row.sub_service_name),
  totals: {
    appointments: Number(row.total_appointments ?? 0),
    completed: Number(row.completed_appointments ?? 0),
  },
  revenue: {
    total: formatCurrencyValue(row.total_amount),
    paid: formatCurrencyValue(row.total_paid),
  },
  span: {
    firstAppointmentOn: row.first_appointment_on ?? null,
    lastAppointmentOn: row.last_appointment_on ?? null,
  },
});

async function fetchServiceDashboard(
  supabase: SupabaseClient,
  serviceId: string,
  range: DateRange
): Promise<ServiceDashboardData> {
  const [calendar, patients, dailyMetrics, professionalMetrics, subServiceMetrics] = await Promise.all([
    supabase
      .from('service_calendar_view')
      .select('*')
      .eq('service_id', serviceId)
      .gte('appointment_date', range.start)
      .lte('appointment_date', range.end)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true }),
    supabase
      .from('service_patients_view')
      .select('*')
      .eq('service_id', serviceId)
      .order('last_appointment_on', { ascending: false }),
    supabase
      .from('service_daily_metrics_view')
      .select('*')
      .eq('service_id', serviceId)
      .gte('appointment_date', range.start)
      .lte('appointment_date', range.end)
      .order('appointment_date', { ascending: true }),
    supabase
      .from('service_professional_metrics_view')
      .select('*')
      .eq('service_id', serviceId)
      .order('total_appointments', { ascending: false }),
    supabase
      .from('service_subservice_metrics_view')
      .select('*')
      .eq('service_id', serviceId)
      .order('total_appointments', { ascending: false }),
  ]);

  const firstError = [calendar.error, patients.error, dailyMetrics.error, professionalMetrics.error, subServiceMetrics.error]
    .find(Boolean);

  if (firstError) {
    throw firstError;
  }

  return {
    calendar: (calendar.data ?? []).map(mapCalendarEvent),
    patients: (patients.data ?? []).map(mapPatientSummary),
    metrics: (dailyMetrics.data ?? []).map(mapDailyMetric),
    professionals: (professionalMetrics.data ?? []).map(mapProfessionalMetric),
    subServices: (subServiceMetrics.data ?? []).map(mapSubServiceMetric),
  };
}

export function useServiceDashboard(
  serviceId: string | undefined,
  filters?: ServiceDashboardFilters
) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const viewMode = filters?.viewMode ?? VIEW_MODE_DEFAULT;
  const referenceDate = filters?.date ?? new Date();

  const range = useMemo(() => buildDateRange(viewMode, referenceDate), [viewMode, referenceDate]);

  const query = useQuery<ServiceDashboardData>({
    queryKey: ['service-dashboard', serviceId, viewMode, range.start, range.end],
    enabled: Boolean(serviceId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!serviceId) {
        return {
          calendar: [],
          patients: [],
          metrics: [],
          professionals: [],
          subServices: [],
        };
      }
      return fetchServiceDashboard(supabase, serviceId, range);
    },
  });

  const rescheduleAppointment = async (payload: ReschedulePayload) => {
    const { appointmentId, appointmentDate, appointmentTime, durationMinutes, professionalId, subServiceId } = payload;
    const updateFields: Record<string, unknown> = {
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
    };

    if (typeof durationMinutes === 'number' && Number.isFinite(durationMinutes)) {
      updateFields.duration_minutes = durationMinutes;
    }

    if (typeof professionalId === 'string') {
      updateFields.professional_id = professionalId;
    }

    if (typeof subServiceId === 'string') {
      updateFields.sub_service_id = subServiceId;
    }

    const { error } = await supabase
      .from('appointments')
      .update(updateFields)
      .eq('id', appointmentId);

    if (error) {
      throw error;
    }

    await queryClient.invalidateQueries({ queryKey: ['service-dashboard', serviceId] });
  };

  const cancelAppointment = async (payload: CancelPayload) => {
    const { appointmentId, reason } = payload;
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', cancellation_reason: reason ?? null })
      .eq('id', appointmentId);

    if (error) {
      throw error;
    }

    await queryClient.invalidateQueries({ queryKey: ['service-dashboard', serviceId] });
  };

  const updateAppointmentStatus = async (payload: UpdateStatusPayload) => {
    const { appointmentId, status } = payload;
    const updates: Record<string, unknown> = {
      status,
    };

    if (status !== 'cancelled') {
      updates.cancellation_reason = null;
    }

    const { error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', appointmentId);

    if (error) {
      throw error;
    }

    await queryClient.invalidateQueries({ queryKey: ['service-dashboard', serviceId] });
  };

  return {
    ...query,
    data: query.data ?? {
      calendar: [],
      patients: [],
      metrics: [],
      professionals: [],
      subServices: [],
    },
    viewMode,
    range,
    rescheduleAppointment,
    cancelAppointment,
    updateAppointmentStatus,
  };
}

export const serviceDashboardDateRangeLabel = (range: DateRange) => {
  try {
    const start = parseISO(range.start);
    const end = parseISO(range.end);
    const formatter = new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    if (range.start === range.end) {
      return formatter.format(start);
    }

    return `${formatter.format(start)} – ${formatter.format(end)}`;
  } catch (error) {
    return `${range.start} – ${range.end}`;
  }
};

export type { ServiceDashboardViewMode };
