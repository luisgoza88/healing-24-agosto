'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Users,
  DollarSign,
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart,
  Download,
  Filter,
  CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/ui/button';
import { useServiceDashboard, ServiceDashboardViewMode, serviceDashboardDateRangeLabel } from '@/hooks/useServiceDashboard';
import InteractiveChart from '@/components/InteractiveChart';
import { format, parseISO, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import ServiceCalendarView from '@/components/ServiceCalendarViewSimple';

interface ServiceDashboardProps {
  serviceId: string;
  serviceName: string;
  serviceCode: string;
}

const VIEW_MODES: { value: ServiceDashboardViewMode; label: string; icon: typeof Calendar }[] = [
  { value: 'day', label: 'Día', icon: Calendar },
  { value: 'week', label: 'Semana', icon: CalendarDays },
  { value: 'month', label: 'Mes', icon: BarChart3 }
];

export default function ServiceDashboard({ serviceId, serviceName, serviceCode }: ServiceDashboardProps) {
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ServiceDashboardViewMode>('week');
  const [showCalendar, setShowCalendar] = useState(false);

  const { data, isLoading, range } = useServiceDashboard(serviceId, {
    date: referenceDate,
    viewMode
  });

  const navigateDate = (direction: 'prev' | 'next') => {
    const modifier = direction === 'prev' ? -1 : 1;
    switch (viewMode) {
      case 'day':
        setReferenceDate(current => addDays(current, modifier));
        break;
      case 'week':
        setReferenceDate(current => addWeeks(current, modifier));
        break;
      case 'month':
        setReferenceDate(current => addMonths(current, modifier));
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Calculate summary stats
  const totalAppointments = data.metrics.reduce((sum, metric) => sum + metric.totals.appointments, 0);
  const totalRevenue = data.metrics.reduce((sum, metric) => sum + metric.revenue.total, 0);
  const totalPaidRevenue = data.metrics.reduce((sum, metric) => sum + metric.revenue.paid, 0);
  const uniquePatients = new Set(data.calendar.map(event => event.patient.id)).size;
  const completionRate = totalAppointments > 0 
    ? (data.metrics.reduce((sum, metric) => sum + metric.totals.completed, 0) / totalAppointments) * 100 
    : 0;

  // Prepare chart data
  const chartData = data.metrics.map(metric => ({
    date: metric.appointmentDate,
    appointments: metric.totals.appointments,
    revenue: metric.revenue.total
  }));

  // Professional performance data
  const topProfessionals = data.professionals
    .filter(p => p.professionalId)
    .slice(0, 5)
    .map(p => ({
      name: p.professionalName || 'Sin asignar',
      appointments: p.totals.appointments,
      revenue: p.revenue.total,
      completionRate: p.totals.appointments > 0 
        ? (p.totals.completed / p.totals.appointments) * 100 
        : 0
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{serviceName}</h2>
          <p className="text-sm text-muted-foreground">Dashboard de servicio</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCalendar(!showCalendar)}
            leftIcon={<Calendar className="h-4 w-4" />}
          >
            {showCalendar ? 'Ver métricas' : 'Ver calendario'}
          </Button>
          
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {VIEW_MODES.map(mode => (
              <button
                key={mode.value}
                onClick={() => setViewMode(mode.value)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded transition-all",
                  viewMode === mode.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateDate('prev')}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
        >
          Anterior
        </Button>
        
        <span className="text-sm font-medium text-foreground min-w-[200px] text-center">
          {serviceDashboardDateRangeLabel(range)}
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateDate('next')}
          rightIcon={<ChevronRight className="h-4 w-4" />}
        >
          Siguiente
        </Button>
      </div>

      {showCalendar ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <ServiceCalendarView
            serviceId={serviceId}
            serviceName={serviceName}
            referenceDate={referenceDate}
            viewMode={viewMode}
            events={data.calendar}
          />
        </motion.div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Citas</p>
                      <p className="text-2xl font-bold text-foreground">{totalAppointments}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {completionRate.toFixed(0)}% completadas
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pacientes Únicos</p>
                      <p className="text-2xl font-bold text-foreground">{uniquePatients}</p>
                      <p className="text-xs text-muted-foreground mt-1">En el período</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Ingresos Totales</p>
                      <p className="text-xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {((totalPaidRevenue / totalRevenue) * 100).toFixed(0)}% cobrado
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Profesionales</p>
                      <p className="text-2xl font-bold text-foreground">{data.professionals.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">Activos</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Sub-servicios</p>
                      <p className="text-2xl font-bold text-foreground">{data.subServices.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">Disponibles</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <InteractiveChart
              data={chartData}
              title={`Tendencia de ${serviceName}`}
            />
          )}

          {/* Professional Performance */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Desempeño por Profesional</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProfessionals.map((professional, index) => (
                    <motion.div
                      key={professional.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{professional.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {professional.appointments} citas
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${professional.completionRate}%` }}
                          transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                          className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{professional.completionRate.toFixed(0)}% completadas</span>
                        <span>{formatCurrency(professional.revenue)}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Patients */}
            <Card>
              <CardHeader>
                <CardTitle>Pacientes Frecuentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.patients.slice(0, 5).map((patient, index) => (
                    <motion.div
                      key={patient.patientId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {patient.name || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {patient.totalAppointments} citas totales
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(patient.totalPaid)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {patient.completedAppointments} completadas
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}