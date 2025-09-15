'use client'

import Link from 'next/link'
import { Calendar, Users, Heart, CreditCard, History, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

const quickActions = [
  {
    title: 'Agendar Cita',
    description: 'Reserva tu próxima consulta',
    icon: Calendar,
    href: '/appointments/new',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    title: 'Mis Clases',
    description: 'Ver y gestionar tus clases',
    icon: Users,
    href: '/classes/my-classes',
    color: 'from-purple-500 to-pink-500'
  },
  {
    title: 'Mi Salud',
    description: 'Historial y seguimiento',
    icon: Heart,
    href: '/health',
    color: 'from-red-500 to-orange-500'
  },
  {
    title: 'Pagos',
    description: 'Historial de transacciones',
    icon: CreditCard,
    href: '/payments',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    title: 'Historial',
    description: 'Citas y actividades pasadas',
    icon: History,
    href: '/history',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    title: 'Configuración',
    description: 'Preferencias y notificaciones',
    icon: Settings,
    href: '/settings',
    color: 'from-gray-600 to-gray-700'
  }
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {quickActions.map((action, index) => {
        const Icon = action.icon
        return (
          <motion.div
            key={action.href}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              href={action.href}
              className="group block"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                
                <div className={`inline-flex rounded-full bg-gradient-to-br ${action.color} p-3 mb-4`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-1">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {action.description}
                </p>
              </motion.div>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}