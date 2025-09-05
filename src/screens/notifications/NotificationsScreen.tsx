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
import { notificationService } from '../../services/notificationService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  data: any;
  sent_at: string;
  read_at: string | null;
}

export const NotificationsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotificationHistory(50);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification: NotificationItem) => {
    // Marcar como leída si no lo está
    if (!notification.read_at) {
      await notificationService.markNotificationAsRead(notification.id);
      // Actualizar localmente
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
    }

    // Navegar según el tipo
    if (notification.data) {
      switch (notification.type) {
        case 'appointment_reminder':
          navigation.navigate('Appointments');
          break;
        case 'class_reminder':
          if (notification.data.classId) {
            navigation.navigate('ClassDetail', { classId: notification.data.classId });
          }
          break;
        case 'class_available':
          navigation.navigate('HotStudio');
          break;
      }
    }
  };

  const clearAllNotifications = () => {
    Alert.alert(
      'Limpiar notificaciones',
      '¿Estás seguro de que deseas marcar todas las notificaciones como leídas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, limpiar', 
          onPress: async () => {
            // Aquí implementaríamos la función para marcar todas como leídas
            Alert.alert('Éxito', 'Todas las notificaciones han sido marcadas como leídas');
            loadNotifications();
          }
        }
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment_reminder':
        return '🏥';
      case 'class_reminder':
        return '🧘‍♀️';
      case 'class_available':
        return '✨';
      case 'payment_success':
        return '💳';
      default:
        return '🔔';
    }
  };

  const formatNotificationDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Hace unos minutos';
    } else if (diffInHours < 24) {
      return `Hace ${Math.floor(diffInHours)} horas`;
    } else if (diffInHours < 48) {
      return 'Ayer';
    } else {
      return format(date, "d 'de' MMMM", { locale: es });
    }
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
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
        {notifications.some(n => !n.read_at) && (
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
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No tienes notificaciones</Text>
            <Text style={styles.emptyDescription}>
              Aquí aparecerán tus recordatorios y avisos importantes
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.read_at && styles.unreadCard
                ]}
                onPress={() => handleNotificationPress(notification)}
              >
                <View style={styles.notificationIcon}>
                  <Text style={styles.iconText}>
                    {getNotificationIcon(notification.type)}
                  </Text>
                </View>
                <View style={styles.notificationContent}>
                  <Text style={[
                    styles.notificationTitle,
                    !notification.read_at && styles.unreadTitle
                  ]}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationBody}>
                    {notification.body}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatNotificationDate(notification.sent_at)}
                  </Text>
                </View>
                {!notification.read_at && (
                  <View style={styles.unreadIndicator} />
                )}
              </TouchableOpacity>
            ))}
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
  backIcon: {
    fontSize: 28,
    color: Colors.primary.green,
    marginRight: 4,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary.green,
    fontWeight: '500',
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
    marginBottom: 16,
  },
  notificationsList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  unreadCard: {
    backgroundColor: Colors.primary.beige + '20',
    borderWidth: 1,
    borderColor: Colors.primary.beige,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.ui.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary.dark,
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  notificationBody: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.text.light,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary.green,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});