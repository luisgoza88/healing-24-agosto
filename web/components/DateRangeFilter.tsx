"use client";

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import Button from '@/components/ui/button';

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const presetRanges = [
  {
    label: 'Últimos 7 días',
    getValue: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
      label: 'Últimos 7 días'
    })
  },
  {
    label: 'Últimos 30 días',
    getValue: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
      label: 'Últimos 30 días'
    })
  },
  {
    label: 'Este mes',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
      label: 'Este mes'
    })
  },
  {
    label: 'Mes pasado',
    getValue: () => {
      const lastMonth = subDays(startOfMonth(new Date()), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
        label: 'Mes pasado'
      };
    }
  },
  {
    label: 'Este año',
    getValue: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date()),
      label: 'Este año'
    })
  }
];

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const handlePresetClick = (preset: typeof presetRanges[0]) => {
    onChange(preset.getValue());
    setIsOpen(false);
  };

  const handleCustomRange = () => {
    if (customFrom && customTo) {
      onChange({
        from: new Date(customFrom),
        to: new Date(customTo),
        label: `${format(new Date(customFrom), 'dd MMM', { locale: es })} - ${format(new Date(customTo), 'dd MMM', { locale: es })}`
      });
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        leftIcon={<Calendar className="h-4 w-4" />}
        rightIcon={<ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      >
        {value.label}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-lg shadow-lg z-50"
            >
              <div className="p-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground mb-3">Rango de fechas</h3>
                
                {/* Preset ranges */}
                <div className="space-y-1">
                  {presetRanges.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handlePresetClick(preset)}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent/10 transition-colors text-foreground/80 hover:text-foreground"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom range */}
                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-sm font-medium text-foreground">Personalizado</p>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="text-muted-foreground self-center">-</span>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleCustomRange}
                    disabled={!customFrom || !customTo}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}