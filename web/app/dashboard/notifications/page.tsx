'use client'

import { useState, useEffect } from 'react'
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock, 
  Calendar,
  User,
  CreditCard,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Trash2,
  Filter
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'

interface Notification {
  id: string
  type: 'appointment' | 'payment' | 'system' | 'alert'
  title: string
  message: string
  read: boolean
  created_at: string
  action_url?: string
  metadata?: Record<string, any>
}

const notificationIcons = {
  appointment: { icon: Calendar, color: 'text-blue-500' },
  payment: { icon: CreditCard, color: 'text-green-500' },
  system: { icon: Info, color: 'text-gray-500' },
  alert: { icon: AlertCircle, color: 'text-red-500' }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { user } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    if (!user) return
    
    fetchNotifications()
    
    // Suscribirse a nuevas notificaciones
    const subscription = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
          showToast('info', 'Nueva notificación', payload.new.title)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user, showToast])

  const fetchNotifications = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
      showToast('error', 'Error al cargar notificaciones')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      )
      showToast('success', 'Todas las notificaciones marcadas como leídas')
    } catch (error) {
      console.error('Error marking all as read:', error)
      showToast('error', 'Error al marcar notificaciones')
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== id))
      showToast('success', 'Notificación eliminada')
    } catch (error) {
      console.error('Error deleting notification:', error)
      showToast('error', 'Error al eliminar notificación')
    }
  }

  const clearAll = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar todas las notificaciones?')) return

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user?.id)

      if (error) throw error

      setNotifications([])
      showToast('success', 'Todas las notificaciones eliminadas')
    } catch (error) {
      console.error('Error clearing notifications:', error)
      showToast('error', 'Error al eliminar notificaciones')
    }
  }

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-7 h-7" />
            Notificaciones
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              leftIcon={<CheckCheck className="w-4 h-4" />}
            >
              Marcar todas como leídas
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Limpiar todo
            </Button>
          )}
        </div>
      </motion.div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === 'all' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === 'unread' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Sin leer ({unreadCount})
            </button>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-2">
        <AnimatePresence>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
              </p>
            </motion.div>
          ) : (
            filteredNotifications.map((notification, index) => {
              const { icon: Icon, color } = notificationIcons[notification.type]
              
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Card
                    hover
                    className={`${!notification.read ? 'border-primary/30 bg-primary/5' : ''}`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg bg-background ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(notification.created_at), { 
                                  addSuffix: true, 
                                  locale: es 
                                })}
                              </span>
                              {!notification.read && (
                                <span className="text-xs text-primary font-medium">
                                  Nueva
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {notification.read ? (
                              <CheckCheck className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}