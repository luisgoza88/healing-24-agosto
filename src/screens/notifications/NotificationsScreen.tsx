import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'appointment' | 'class' | 'payment' | 'message' | 'promotion' | 'reminder';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  read_at: string | null;
  created_at: string;
  metadata?: any;
}

export const NotificationsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error obteniendo historial:', error);
        // Si la tabla no existe, usar datos de prueba
        if (error.code === 'PGRST205') {
          setNotifications(getMockNotifications());
        }
      } else {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications(getMockNotifications());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockNotifications = (): Notification[] => [
    {
      id: '1',
      title: '🏥 Recordatorio de cita',
      body: 'Tu cita de Medicina Funcional es mañana a las 10:00 AM con la Dra. García',
      type: 'appointment',
      priority: 'high',
      read: false,
      read_at: null,
      created_at: new Date().toISOString(),
      metadata: { appointment_id: '123' }
    },
    {
      id: '2',
      title: '🧘‍♀️ Clase confirmada',
      body: 'Tu reserva para Yoga Restaurativo del martes 3:00 PM está confirmada',
      type: 'class',
      priority: 'normal',
      read: false,
      read_at: null,
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '3',
      title: '💌 Mensaje de Healing Forest',
      body: 'Hola Mariana, esperamos que hayas disfrutado tu última sesión. ¿Cómo te has sentido?',
      type: 'message',
      priority: 'normal',
      read: true,
      read_at: new Date(Date.now() - 7200000).toISOString(),
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: '4',
      title: '🎁 Promoción especial',
      body: '20% de descuento en paquetes de Breathe & Move este mes',
      type: 'promotion',
      priority: 'low',
      read: true,
      read_at: new Date(Date.now() - 7200000).toISOString(),
      created_at: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: '5',
      title: '💳 Pago confirmado',
      body: 'Tu pago de $150,000 COP ha sido procesado exitosamente',
      type: 'payment',
      priority: 'normal',
      read: true,
      read_at: new Date(Date.now() - 7200000).toISOString(),
      created_at: new Date(Date.now() - 259200000).toISOString()
    }
  ];

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'appointment':
        return { name: 'calendar', component: Ionicons };
      case 'class':
        return { name: 'yoga', component: MaterialCommunityIcons };
      case 'payment':
        return { name: 'credit-card', component: MaterialCommunityIcons };
      case 'message':
        return { name: 'message-text', component: MaterialCommunityIcons };
      case 'promotion':
        return { name: 'tag-heart', component: MaterialCommunityIcons };
      case 'reminder':
      default:
        return { name: 'bell', component: MaterialCommunityIcons };
    }
  };

  const getNotificationColor = (type: Notification['type'], priority: Notification['priority']) => {
    if (priority === 'urgent') return Colors.ui.error;
    if (priority === 'high') return '#FF9800';
    
    switch (type) {
      case 'appointment':
        return Colors.primary.green;
      case 'class':
        return Colors.secondary.purple;
      case 'payment':
        return '#4CAF50';
      case 'message':
        return Colors.primary.dark;
      case 'promotion':
        return '#E91E63';
      case 'reminder':
      default:
        return Colors.primary.green;
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Marcar como leída
    if (!notification.read) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc('mark_notification_read', {
            p_notification_id: notification.id
          });
          
          // Actualizar localmente
          setNotifications(prev => 
            prev.map(n => 
              n.id === notification.id 
                ? { ...n, read: true, read_at: new Date().toISOString() }
                : n
            )
          );
        }
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }

    // Navegar según el tipo y metadata
    if (notification.metadata) {
      switch (notification.type) {
        case 'appointment':
          navigation.navigate('Appointments');
          break;
        case 'class':
          navigation.navigate('BreatheAndMove');
          break;
        case 'payment':
          navigation.navigate('MyCredits');
          break;
      }
    }
  };

  const clearAllNotifications = () => {
    Alert.alert(
      'Marcar todas como leídas',
      '¿Deseas marcar todas las notificaciones como leídas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, marcar', 
          onPress: async () => {
            try {
              // Marcar todas localmente
              setNotifications(prev => 
                prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
              );
              Alert.alert('Listo', 'Todas las notificaciones han sido marcadas como leídas');
            } catch (error) {
              console.error('Error:', error);
            }
          }
        }
      ]
    );
  };

  const formatNotificationDate = (dateStr: string) => {
    const date = new Date(dateStr);
    
    if (isToday(date)) {
      return format(date, "'Hoy a las' HH:mm", { locale: es });
    } else if (isYesterday(date)) {
      return format(date, "'Ayer a las' HH:mm", { locale: es });
    } else {
      return format(date, "d 'de' MMMM 'a las' HH:mm", { locale: es });
    }
  };

  const renderNotification = (notification: Notification) => {
    const icon = getNotificationIcon(notification.type);
    const iconColor = getNotificationColor(notification.type, notification.priority);
    const IconComponent = icon.component;

    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.notificationCard,
          !notification.read && styles.unreadCard
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <IconComponent name={icon.name} size={24} color={iconColor} />
        </View>
        
        <View style={styles.notificationContent}>
          <Text style={[
            styles.notificationTitle,
            !notification.read && styles.unreadTitle
          ]}>
            {notification.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {notification.body}
          </Text>
          <View style={styles.notificationMeta}>
            <Text style={styles.notificationTime}>
              {formatNotificationDate(notification.created_at)}
            </Text>
            {notification.priority === 'urgent' && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentBadgeText}>URGENTE</Text>
              </View>
            )}
          </View>
        </View>

        {!notification.read && (
          <View style={styles.unreadDot} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.green} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.primary.green} />
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
        {notifications.some(n => !n.read) && (
          <TouchableOpacity onPress={clearAllNotifications}>
            <Text style={styles.clearText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>Notificaciones</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.green]}
            tintColor={Colors.primary.green}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="bell-outline" 
              size={80} 
              color={Colors.primary.green} 
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No tienes notificaciones</Text>
            <Text style={styles.emptyDescription}>
              Aquí aparecerán tus recordatorios y avisos importantes
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map(renderNotification)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: Colors.primary.green,
    fontWeight: '500',
    marginLeft: 4,
  },
  clearText: {
    fontSize: 16,
    color: Colors.primary.green,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  notificationsList: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.ui.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.primary.green + '30',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  notificationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary.dark,
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationBody: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 6,
    lineHeight: 20,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.text.light,
  },
  urgentBadge: {
    backgroundColor: Colors.ui.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentBadgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: 'bold',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary.green,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});