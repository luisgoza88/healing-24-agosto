'use client';

import { useMemo } from 'react';
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type View,
} from 'react-big-calendar';
import withDragAndDrop, {
  type EventInteractionArgs,
  type EventResizeArgs,
} from 'react-big-calendar/lib/addons/dragAndDrop';
import {
  format,
  parse,
  startOfWeek,
  getDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { ServiceCalendarEvent, ServiceDashboardViewMode } from '@/hooks/useServiceDashboard';
import { cn } from '@/lib/utils';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const locales = {
  es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

const DragAndDropCalendar = withDragAndDrop<BigCalendar>(BigCalendar as any);

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 border-green-300 text-green-800',
  pending: 'bg-amber-100 border-amber-300 text-amber-800',
  completed: 'bg-blue-100 border-blue-300 text-blue-800',
  cancelled: 'bg-red-100 border-red-300 text-red-800',
  no_show: 'bg-gray-200 border-gray-300 text-gray-700',
};

const VIEW_MAP: Record<ServiceDashboardViewMode, View> = {
  day: 'day',
  week: 'week',
  month: 'month',
};

interface ServiceCalendarPanelProps {
  events: ServiceCalendarEvent[];
  loading?: boolean;
  viewMode: ServiceDashboardViewMode;
  referenceDate: Date;
  onViewChange: (view: ServiceDashboardViewMode) => void;
  onNavigate: (date: Date) => void;
  onSelectEvent?: (event: ServiceCalendarEvent) => void;
  onEventDrop?: (payload: { event: ServiceCalendarEvent; start: Date; end: Date }) => void;
  onEventResize?: (payload: { event: ServiceCalendarEvent; start: Date; end: Date }) => void;
  onSelectSlot?: (payload: { start: Date; end: Date }) => void;
}

export default function ServiceCalendarPanel({
  events,
  loading = false,
  viewMode,
  referenceDate,
  onViewChange,
  onNavigate,
  onSelectEvent,
  onEventDrop,
  onEventResize,
  onSelectSlot,
}: ServiceCalendarPanelProps) {
  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        title: event.patient.name
          ? `${event.patient.name}${event.subServiceName ? ` · ${event.subServiceName}` : ''}`
          : event.subServiceName ?? event.serviceName,
        start: event.start,
        end: event.end,
      })),
    [events]
  );

  const defaultEventStyle = (event: ServiceCalendarEvent) => {
    const palette = STATUS_COLORS[event.status] ?? STATUS_COLORS.pending;
    return {
      className: cn('border rounded-md px-2 py-1 text-xs leading-tight', palette),
      style: {
        opacity: loading ? 0.6 : 1,
      },
    };
  };

  const handleViewChange = (nextView: View) => {
    const entry = Object.entries(VIEW_MAP).find(([, value]) => value === nextView);
    if (!entry) {
      return;
    }
    const [mapped] = entry;
    onViewChange(mapped as ServiceDashboardViewMode);
  };

  return (
    <div className="h-[600px] rounded-lg border bg-white p-2">
      <DragAndDropCalendar
        localizer={localizer}
        events={calendarEvents}
        defaultView={VIEW_MAP[viewMode]}
        view={VIEW_MAP[viewMode]}
        date={referenceDate}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onView={handleViewChange}
        onNavigate={onNavigate}
        onSelectEvent={(event) => onSelectEvent?.(event as ServiceCalendarEvent)}
        messages={{
          today: 'Hoy',
          previous: 'Anterior',
          next: 'Siguiente',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
          agenda: 'Agenda',
          date: 'Fecha',
          time: 'Hora',
          event: 'Cita',
          noEventsInRange: loading ? 'Cargando…' : 'Sin citas en este rango',
        }}
        draggableAccessor={() => true}
        resizable
        selectable
        onEventDrop={(args: EventInteractionArgs<ServiceCalendarEvent>) =>
          onEventDrop?.({
            event: args.event,
            start: args.start,
            end: args.end,
          })
        }
        onEventResize={(args: EventResizeArgs<ServiceCalendarEvent>) =>
          onEventResize?.({
            event: args.event,
            start: args.start,
            end: args.end,
          })
        }
        onSelectSlot={(slot) =>
          onSelectSlot?.({
            start: slot.start,
            end: slot.end,
          })
        }
        eventPropGetter={(event) => defaultEventStyle(event as ServiceCalendarEvent)}
      />
    </div>
  );
}
