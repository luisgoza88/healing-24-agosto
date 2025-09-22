"use client";

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { format, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import DateRangeFilter, { DateRange } from '@/components/DateRangeFilter';
import { subDays } from 'date-fns';
import { Download, Image, FileText } from 'lucide-react';
import { exportChartAsImage, exportChartAsPDF, exportChartData } from '@/utils/chartExport';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/button';

interface ChartData {
  date: string;
  appointments: number;
  revenue: number;
}

interface InteractiveChartProps {
  data: ChartData[];
  title?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-popover border border-border rounded-lg shadow-lg p-3"
      >
        <p className="text-sm font-medium text-foreground mb-2">
          {format(new Date(label), 'dd MMM', { locale: es })}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">
              {entry.name === 'appointments' ? 'Citas:' : 'Ingresos:'}
            </span>
            <span className="font-medium text-foreground">
              {entry.name === 'appointments' 
                ? entry.value 
                : new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0
                  }).format(entry.value as number)
              }
            </span>
          </div>
        ))}
      </motion.div>
    );
  }
  return null;
};

export default function InteractiveChart({ data, title = "Tendencia Semanal" }: InteractiveChartProps) {
  const { resolvedTheme } = useTheme();
  const { showToast } = useToast();
  const [activeChart, setActiveChart] = useState<'both' | 'appointments' | 'revenue'>('both');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
    label: 'Últimos 30 días'
  });
  const [isExporting, setIsExporting] = useState(false);

  // Filtrar datos por rango de fecha
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const itemDate = new Date(item.date);
      return isWithinInterval(itemDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [data, dateRange]);

  const chartColors = {
    appointments: resolvedTheme === 'dark' ? '#22c55e' : '#16a34a',
    revenue: resolvedTheme === 'dark' ? '#3b82f6' : '#2563eb',
    grid: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb',
    text: resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280'
  };

  const handleExportImage = async () => {
    setIsExporting(true);
    try {
      await exportChartAsImage('interactive-chart', `${title}-${dateRange.label}`);
      showToast('success', 'Gráfico exportado como imagen');
    } catch (error) {
      showToast('error', 'Error al exportar el gráfico');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportChartAsPDF('interactive-chart', `${title}-${dateRange.label}`);
      showToast('success', 'Gráfico exportado como PDF');
    } catch (error) {
      showToast('error', 'Error al exportar el gráfico');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportData = () => {
    try {
      exportChartData(filteredData, `${title}-${dateRange.label}-datos`);
      showToast('success', 'Datos exportados como CSV');
    } catch (error) {
      showToast('error', 'Error al exportar los datos');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-card border border-border rounded-lg p-6"
      id="interactive-chart"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <div className="flex gap-2">
          <button
            onClick={() => setActiveChart('both')}
            className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
              activeChart === 'both' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Ambos
          </button>
          <button
            onClick={() => setActiveChart('appointments')}
            className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
              activeChart === 'appointments' 
                ? 'bg-green-500 text-white' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Citas
          </button>
          <button
            onClick={() => setActiveChart('revenue')}
            className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
              activeChart === 'revenue' 
                ? 'bg-blue-500 text-white' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Ingresos
          </button>
        </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportImage}
              disabled={isExporting}
              title="Exportar como imagen"
            >
              <Image className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              title="Exportar como PDF"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportData}
              disabled={isExporting}
              title="Exportar datos CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.appointments} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColors.appointments} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.revenue} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColors.revenue} stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={chartColors.grid}
              className="opacity-50"
            />
            
            <XAxis 
              dataKey="date" 
              stroke={chartColors.text}
              fontSize={12}
              tickFormatter={(value) => format(new Date(value), 'dd MMM', { locale: es })}
            />
            
            <YAxis 
              stroke={chartColors.text}
              fontSize={12}
              yAxisId="left"
              orientation="left"
              label={{ value: 'Citas', angle: -90, position: 'insideLeft', style: { fill: chartColors.text } }}
            />
            
            {activeChart !== 'appointments' && (
              <YAxis 
                stroke={chartColors.text}
                fontSize={12}
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `$${(value / 1000)}k`}
                label={{ value: 'Ingresos', angle: 90, position: 'insideRight', style: { fill: chartColors.text } }}
              />
            )}
            
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ fill: resolvedTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
            />
            
            {(activeChart === 'both' || activeChart === 'appointments') && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="appointments"
                stroke={chartColors.appointments}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAppointments)"
                animationDuration={1000}
                name="appointments"
              />
            )}
            
            {(activeChart === 'both' || activeChart === 'revenue') && (
              <Area
                yAxisId={activeChart === 'revenue' ? 'left' : 'right'}
                type="monotone"
                dataKey="revenue"
                stroke={chartColors.revenue}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                animationDuration={1000}
                animationDelay={200}
                name="revenue"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}