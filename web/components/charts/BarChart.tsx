"use client";

import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  TooltipProps,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

interface BarChartData {
  name: string;
  [key: string]: any;
}

interface BarChartProps {
  data: BarChartData[];
  dataKeys: {
    key: string;
    name: string;
    color: string;
  }[];
  title?: string;
  showLegend?: boolean;
  stacked?: boolean;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-popover border border-border rounded-lg shadow-lg p-3"
      >
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {typeof entry.value === 'number' 
                ? entry.value.toLocaleString('es-CO')
                : entry.value
              }
            </span>
          </div>
        ))}
      </motion.div>
    );
  }
  return null;
};

export default function BarChart({ 
  data, 
  dataKeys,
  title,
  showLegend = true,
  stacked = false
}: BarChartProps) {
  const { resolvedTheme } = useTheme();
  
  const gridColor = resolvedTheme === 'dark' ? '#374151' : '#e5e7eb';
  const textColor = resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full"
    >
      {title && (
        <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={gridColor}
            className="opacity-50"
          />
          <XAxis 
            dataKey="name" 
            stroke={textColor}
            fontSize={12}
            tick={{ fill: textColor }}
          />
          <YAxis 
            stroke={textColor}
            fontSize={12}
            tick={{ fill: textColor }}
          />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ fill: resolvedTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
          />
          {showLegend && (
            <Legend 
              formatter={(value) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
            />
          )}
          {dataKeys.map((dataKey, index) => (
            <Bar
              key={dataKey.key}
              dataKey={dataKey.key}
              name={dataKey.name}
              fill={dataKey.color}
              stackId={stacked ? "stack" : undefined}
              animationDuration={800}
              animationBegin={index * 100}
              radius={[4, 4, 0, 0]}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}