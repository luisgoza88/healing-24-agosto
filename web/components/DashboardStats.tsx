"use client";

import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number;
  trendLabel?: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  delay?: number;
}

const colorVariants = {
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-400/10',
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'text-blue-500 dark:text-blue-400'
  },
  green: {
    bg: 'bg-green-500/10 dark:bg-green-400/10',
    text: 'text-green-600 dark:text-green-400',
    icon: 'text-green-500 dark:text-green-400'
  },
  yellow: {
    bg: 'bg-yellow-500/10 dark:bg-yellow-400/10',
    text: 'text-yellow-600 dark:text-yellow-400',
    icon: 'text-yellow-500 dark:text-yellow-400'
  },
  purple: {
    bg: 'bg-purple-500/10 dark:bg-purple-400/10',
    text: 'text-purple-600 dark:text-purple-400',
    icon: 'text-purple-500 dark:text-purple-400'
  }
};

function StatsCard({ title, value, icon, trend, trendLabel, color, delay = 0 }: StatsCardProps) {
  const colors = colorVariants[color];
  
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend > 0) return <ArrowUp className="w-4 h-4" />;
    if (trend < 0) return <ArrowDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };
  
  const getTrendColor = () => {
    if (!trend) return 'text-muted-foreground';
    return trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
      className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
                {getTrendIcon()}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          {trendLabel && (
            <p className="text-xs text-muted-foreground">{trendLabel}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colors.bg}`}>
          <div className={colors.icon}>
            {icon}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface DashboardStatsProps {
  stats: {
    todayAppointments: number;
    totalPatients: number;
    todayRevenue: number;
    monthlyRevenue: number;
  };
  previousStats?: {
    todayAppointments: number;
    totalPatients: number;
    todayRevenue: number;
    monthlyRevenue: number;
  };
}

export default function DashboardStats({ stats, previousStats }: DashboardStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateTrend = (current: number, previous?: number) => {
    if (!previous || previous === 0) return undefined;
    return Math.round(((current - previous) / previous) * 100);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Citas Hoy"
        value={stats.todayAppointments}
        icon={<Calendar className="h-6 w-6" />}
        trend={calculateTrend(stats.todayAppointments, previousStats?.todayAppointments)}
        trendLabel="vs ayer"
        color="blue"
        delay={0}
      />
      
      <StatsCard
        title="Total Pacientes"
        value={stats.totalPatients}
        icon={<Users className="h-6 w-6" />}
        trend={calculateTrend(stats.totalPatients, previousStats?.totalPatients)}
        trendLabel="este mes"
        color="green"
        delay={0.1}
      />
      
      <StatsCard
        title="Ingresos Hoy"
        value={formatCurrency(stats.todayRevenue)}
        icon={<DollarSign className="h-6 w-6" />}
        trend={calculateTrend(stats.todayRevenue, previousStats?.todayRevenue)}
        trendLabel="vs ayer"
        color="yellow"
        delay={0.2}
      />
      
      <StatsCard
        title="Ingresos del Mes"
        value={formatCurrency(stats.monthlyRevenue)}
        icon={<TrendingUp className="h-6 w-6" />}
        trend={calculateTrend(stats.monthlyRevenue, previousStats?.monthlyRevenue)}
        trendLabel="vs mes anterior"
        color="purple"
        delay={0.3}
      />
    </div>
  );
}