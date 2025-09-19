import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient, useSupabase } from '../lib/supabase';
import { startOfMonth, startOfQuarter, startOfYear, subMonths, subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface DashboardMetrics {
  totalRevenue: number;
  totalAppointments: number;
  activePatients: number;
  completionRate: number;
  revenueGrowth: number;
  appointmentGrowth: number;
  averageTicket: number;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  appointmentsByStatus: Array<{ status: string; count: number; percentage: number }>;
  professionalPerformance: Array<{ name: string; appointments: number; revenue: number }>;
}

type DateRangeType = 'week' | 'month' | 'quarter' | 'year';

function getStartDate(dateRange: DateRangeType): Date {
  const today = new Date();
  switch (dateRange) {
    case 'week':
      return subDays(today, 7);
    case 'month':
      return startOfMonth(today);
    case 'quarter':
      return startOfQuarter(today);
    case 'year':
      return startOfYear(today);
    default:
      return startOfMonth(today);
  }
}

// Hook principal para métricas del dashboard
export function useReportMetrics(dateRange: DateRangeType = 'month') {
  return useQuery({
    queryKey: ['report-metrics', dateRange],
    queryFn: async (): Promise<DashboardMetrics> => {
      const supabase = useSupabase();
      console.log('[useReportMetrics] Iniciando consulta...', { dateRange });
      const today = new Date();
      const startDate = getStartDate(dateRange);
      const previousStartDate = subMonths(startDate, 1);

      // Obtener citas del período actual
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          total_amount,
          payment_status,
          user_id,
          service_id,
          professional_id
        `)
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', today.toISOString());

      if (appointmentsError) {
        console.error('[useReportMetrics] Error:', appointmentsError);
        throw appointmentsError;
      }

      console.log('[useReportMetrics] Citas obtenidas:', appointments?.length || 0);

      // Obtener citas del período anterior para comparación
      const { data: previousAppointments } = await supabase
        .from('appointments')
        .select('id, total_amount, payment_status')
        .gte('appointment_date', previousStartDate.toISOString())
        .lt('appointment_date', startDate.toISOString());

      // Obtener datos relacionados si hay citas
      let servicesMap = new Map();
      let professionalsMap = new Map();
      
      if (appointments && appointments.length > 0) {
        const serviceIds = [...new Set(appointments.map(a => a.service_id).filter(Boolean))];
        const professionalIds = [...new Set(appointments.map(a => a.professional_id).filter(Boolean))];
        
        const [services, professionals] = await Promise.all([
          serviceIds.length > 0 
            ? supabase.from('services').select('id, name').in('id', serviceIds)
            : { data: [] },
          professionalIds.length > 0
            ? supabase.from('professionals').select('id, full_name').in('id', professionalIds)
            : { data: [] }
        ]);
        
        servicesMap = new Map(services.data?.map(s => [s.id, s]) || []);
        professionalsMap = new Map(professionals.data?.map(p => [p.id, p]) || []);
      }

      // Calcular métricas principales
      const totalAppointments = appointments?.length || 0;
      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
      const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

      // Calcular ingresos
      const totalRevenue = appointments?.reduce((sum, apt) => {
        if (apt.payment_status === 'paid') {
          return sum + (apt.total_amount || 0);
        }
        return sum;
      }, 0) || 0;

      const previousRevenue = previousAppointments?.reduce((sum, apt) => {
        if (apt.payment_status === 'paid') {
          return sum + (apt.total_amount || 0);
        }
        return sum;
      }, 0) || 0;

      // Calcular crecimiento
      const revenueGrowth = previousRevenue > 0 
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      const appointmentGrowth = previousAppointments?.length 
        ? ((totalAppointments - previousAppointments.length) / previousAppointments.length) * 100 
        : 0;

      // Ticket promedio
      const paidAppointments = appointments?.filter(a => a.payment_status === 'paid').length || 0;
      const averageTicket = paidAppointments > 0 ? totalRevenue / paidAppointments : 0;

      // Pacientes activos únicos
      const uniquePatients = new Set(appointments?.map(a => a.user_id) || []);
      const activePatients = uniquePatients.size;

      // Top servicios
      const serviceStats = appointments?.reduce((acc: any, apt) => {
        const service = servicesMap.get(apt.service_id);
        const serviceName = service?.name || 'Servicio General';
        if (!acc[serviceName]) {
          acc[serviceName] = { name: serviceName, count: 0, revenue: 0 };
        }
        acc[serviceName].count++;
        if (apt.payment_status === 'paid') {
          acc[serviceName].revenue += apt.total_amount || 0;
        }
        return acc;
      }, {});

      const topServices = Object.values(serviceStats || {})
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 5) as Array<{ name: string; count: number; revenue: number }>;

      // Ingresos mensuales
      const monthlyRevenueMap = appointments?.reduce((acc: any, apt) => {
        if (apt.payment_status === 'paid') {
          const month = format(new Date(apt.appointment_date), 'MMM', { locale: es });
          if (!acc[month]) {
            acc[month] = 0;
          }
          acc[month] += apt.total_amount || 0;
        }
        return acc;
      }, {});

      const monthlyRevenue = Object.entries(monthlyRevenueMap || {}).map(([month, revenue]) => ({
        month,
        revenue: revenue as number
      }));

      // Citas por estado
      const statusCounts = appointments?.reduce((acc: any, apt) => {
        const status = apt.status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const appointmentsByStatus = Object.entries(statusCounts || {}).map(([status, count]) => ({
        status: getStatusLabel(status),
        count: count as number,
        percentage: totalAppointments > 0 ? ((count as number) / totalAppointments) * 100 : 0
      }));

      // Rendimiento por profesional
      const professionalStats = appointments?.reduce((acc: any, apt) => {
        const professional = professionalsMap.get(apt.professional_id);
        const name = professional?.full_name || 'Sin asignar';
        if (!acc[name]) {
          acc[name] = { name, appointments: 0, revenue: 0 };
        }
        acc[name].appointments++;
        if (apt.payment_status === 'paid') {
          acc[name].revenue += apt.total_amount || 0;
        }
        return acc;
      }, {});

      const professionalPerformance = Object.values(professionalStats || {})
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10) as Array<{ name: string; appointments: number; revenue: number }>;

      return {
        totalRevenue,
        totalAppointments,
        activePatients,
        completionRate,
        revenueGrowth,
        appointmentGrowth,
        averageTicket,
        topServices,
        monthlyRevenue,
        appointmentsByStatus,
        professionalPerformance
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
  });
}

// Hook para exportar datos
export function useExportReportData(dateRange: DateRangeType) {
  const queryClient = useQueryClient();

  return async () => {
    const data = queryClient.getQueryData<DashboardMetrics>(['report-metrics', dateRange]);
    
    if (!data) {
      alert('No hay datos para exportar. Por favor, espere a que se carguen los datos.');
      return;
    }

    // Crear CSV con los datos
    const csvData = [
      ['Reporte de Métricas', format(new Date(), 'dd/MM/yyyy HH:mm')],
      [],
      ['Métricas Principales'],
      ['Total de Ingresos', formatCurrency(data.totalRevenue)],
      ['Total de Citas', data.totalAppointments],
      ['Pacientes Activos', data.activePatients],
      ['Tasa de Completación', `${data.completionRate.toFixed(1)}%`],
      ['Crecimiento de Ingresos', `${data.revenueGrowth.toFixed(1)}%`],
      ['Crecimiento de Citas', `${data.appointmentGrowth.toFixed(1)}%`],
      ['Ticket Promedio', formatCurrency(data.averageTicket)],
      [],
      ['Top Servicios'],
      ['Servicio', 'Cantidad', 'Ingresos'],
      ...data.topServices.map(s => [s.name, s.count, formatCurrency(s.revenue)]),
      [],
      ['Estado de Citas'],
      ['Estado', 'Cantidad', 'Porcentaje'],
      ...data.appointmentsByStatus.map(s => [s.status, s.count, `${s.percentage.toFixed(1)}%`]),
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_${dateRange}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'confirmed': return 'Confirmada';
    case 'pending': return 'Pendiente';
    case 'completed': return 'Completada';
    case 'cancelled': return 'Cancelada';
    case 'no_show': return 'No asistió';
    default: return status;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount);
}