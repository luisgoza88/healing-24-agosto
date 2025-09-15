'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useState, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  id: string
  message: string
  type: ToastType
  duration?: number
  onClose: (id: string) => void
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info
}

const colors = {
  success: 'from-emerald-500 to-teal-500',
  error: 'from-red-500 to-pink-500',
  info: 'from-blue-500 to-indigo-500'
}

export function Toast({ id, message, type, duration = 5000, onClose }: ToastProps) {
  const Icon = icons[type]
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id)
    }, duration)
    
    return () => clearTimeout(timer)
  }, [id, duration, onClose])
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className="bg-white rounded-2xl shadow-2xl p-4 min-w-[300px] max-w-md"
    >
      <div className="flex items-start gap-3">
        <div className={`bg-gradient-to-br ${colors[type]} rounded-full p-2`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        
        <div className="flex-1">
          <p className="text-gray-800 font-medium">{message}</p>
        </div>
        
        <button
          onClick={() => onClose(id)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  )
}

// Toast Container
export function ToastContainer({ toasts }: { toasts: Array<{ id: string; message: string; type: ToastType }> }) {
  const [localToasts, setLocalToasts] = useState(toasts)
  
  useEffect(() => {
    setLocalToasts(toasts)
  }, [toasts])
  
  const removeToast = (id: string) => {
    setLocalToasts(prev => prev.filter(toast => toast.id !== id))
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {localToasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={removeToast}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}