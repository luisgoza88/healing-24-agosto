"use client";

import { motion } from 'framer-motion';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  title: string;
  message?: string;
  onClose: () => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    className: 'border-green-500/20 bg-green-500/10',
    iconClass: 'text-green-500'
  },
  error: {
    icon: XCircle,
    className: 'border-red-500/20 bg-red-500/10',
    iconClass: 'text-red-500'
  },
  warning: {
    icon: AlertCircle,
    className: 'border-yellow-500/20 bg-yellow-500/10',
    iconClass: 'text-yellow-500'
  },
  info: {
    icon: Info,
    className: 'border-blue-500/20 bg-blue-500/10',
    iconClass: 'text-blue-500'
  }
};

export default function Toast({ type, title, message, onClose }: ToastProps) {
  const config = toastConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={cn(
        "min-w-[300px] max-w-md bg-card border rounded-lg shadow-lg p-4",
        "backdrop-blur-sm",
        config.className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", config.iconClass)} />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {message && (
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          )}
        </div>

        <button
          onClick={onClose}
          className="ml-4 inline-flex text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 5, ease: "linear" }}
        className="absolute bottom-0 left-0 right-0 h-1 bg-current opacity-20 origin-left"
        style={{ backgroundColor: config.iconClass.replace('text-', '') }}
      />
    </motion.div>
  );
}