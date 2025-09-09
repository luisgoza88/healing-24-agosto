import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Definir categorías de notificaciones con acciones
async function setNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('appointment_reminder', [
    {
      identifier: 'confirm',
      buttonTitle: '✅ Confirmar asistencia',
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'cancel',
      buttonTitle: '❌ Cancelar cita',
      options: {
        opensAppToForeground: true,
        isDestructive: true,
      },
    },
  ]);

  await Notifications.setNotificationCategoryAsync('class_reminder', [
    {
      identifier: 'view',
      buttonTitle: '👁️ Ver detalles',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'cancel_enrollment',
      buttonTitle: '❌ Cancelar inscripción',
      options: {
        opensAppToForeground: true,
        isDestructive: true,
      },
    },
  ]);

  await Notifications.setNotificationCategoryAsync('class_available', [
    {
      identifier: 'enroll',
      buttonTitle: '✅ Inscribirme',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'view_class',
      buttonTitle: '👁️ Ver clase',
      options: {
        opensAppToForeground: true,
      },
    },
  ]);
}

// Inicializar categorías al cargar el servicio
setNotificationCategories();

export class NotificationService {
  private static instance: NotificationService;
  
  private constructor() {}
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Registrar para notificaciones push
  async registerForPushNotifications(): Promise<string | null> {
    let token = null;

    // Las notificaciones push solo funcionan en dispositivos físicos
    if (!Device.isDevice) {
      console.log('Las notificaciones push requieren un dispositivo físico');
      return null;
    }

    try {
      // Verificar permisos existentes
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Solicitar permisos si no los tenemos
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permiso para notificaciones denegado');
        return null;
      }

      // Obtener el token de Expo
      let tokenData;
      try {
        tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId || 'healing-forest-temp-id'
        });
        token = tokenData.data;
      } catch (tokenError) {
        console.log('No se pudo obtener token de Expo, usando token local');
        // En desarrollo, usar un token de prueba
        token = `ExponentPushToken[development-${Date.now()}]`;
      }

      // Configurar canal de notificaciones para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (error) {
      console.error('Error obteniendo token de notificaciones:', error);
      return null;
    }
  }

  // Guardar token en Supabase
  async saveTokenToDatabase(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: user.id,
          token,
          platform: Platform.OS,
          device_id: Device.deviceName || 'unknown',
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,token'
        });

      if (error) {
        console.error('Error guardando token:', error);
      }
    } catch (error) {
      console.error('Error en saveTokenToDatabase:', error);
    }
  }

  // Programar notificación local
  async scheduleLocalNotification(
    title: string,
    body: string,
    data: any = {},
    trigger: Date | Notifications.NotificationTriggerInput,
    categoryIdentifier?: string
  ): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        categoryIdentifier,
      },
      trigger: trigger instanceof Date ? { date: trigger } : trigger,
    });

    return notificationId;
  }

  // Programar recordatorio de cita
  async scheduleAppointmentReminder(
    appointmentId: string,
    serviceName: string,
    appointmentDate: Date,
    hoursBeforeText: string = '24 horas'
  ): Promise<void> {
    const title = '🏥 Recordatorio de Cita';
    const body = `Tu cita de ${serviceName} es en ${hoursBeforeText}`;
    
    await this.scheduleLocalNotification(
      title,
      body,
      { 
        type: 'appointment_reminder',
        appointmentId,
        navigateTo: 'AppointmentDetail'
      },
      appointmentDate,
      'appointment_reminder' // Categoría con acciones
    );
  }

  // Programar recordatorio de clase
  async scheduleClassReminder(
    classId: string,
    className: string,
    classDate: Date,
    hoursBeforeText: string = '2 horas'
  ): Promise<void> {
    const title = '🧘‍♀️ Recordatorio de Clase';
    const body = `Tu clase de ${className} es en ${hoursBeforeText}`;
    
    await this.scheduleLocalNotification(
      title,
      body,
      { 
        type: 'class_reminder',
        classId,
        navigateTo: 'ClassDetail'
      },
      classDate,
      'class_reminder' // Categoría con acciones
    );
  }

  // Cancelar notificación
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Cancelar todas las notificaciones
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Obtener notificaciones programadas
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Marcar notificación como leída
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_history')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marcando notificación como leída:', error);
      }
    } catch (error) {
      console.error('Error en markNotificationAsRead:', error);
    }
  }

  // Obtener historial de notificaciones
  async getNotificationHistory(limit: number = 20): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error obteniendo historial:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error en getNotificationHistory:', error);
      return [];
    }
  }

  // Obtener conteo de notificaciones no leídas
  async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('notification_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Error obteniendo conteo:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error en getUnreadCount:', error);
      return 0;
    }
  }

  // Enviar notificación remota
  async sendRemoteNotification(
    title: string,
    body: string,
    data: any = {},
    categoryId?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener el token del usuario
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!tokens || tokens.length === 0) return;

      // Obtener el token de sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Enviar notificación a través de la Edge Function
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          to: tokens.map(t => t.token),
          title,
          body,
          data,
          categoryId
        })
      });

      if (!response.ok) {
        console.error('Error enviando notificación remota:', await response.text());
      }
    } catch (error) {
      console.error('Error en sendRemoteNotification:', error);
    }
  }

  // Confirmar asistencia a cita
  async confirmAppointmentAttendance(appointmentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed_attendance' })
        .eq('id', appointmentId);

      if (error) {
        console.error('Error confirmando asistencia:', error);
      }
    } catch (error) {
      console.error('Error en confirmAppointmentAttendance:', error);
    }
  }

  // Manejar acciones de notificaciones
  async handleNotificationAction(
    actionIdentifier: string,
    notification: Notifications.Notification
  ): Promise<void> {
    const data = notification.request.content.data;

    switch (actionIdentifier) {
      case 'confirm':
        // Confirmar asistencia a cita
        if (data.appointmentId) {
          await this.confirmAppointmentAttendance(data.appointmentId);
          // Enviar notificación de confirmación
          await this.scheduleLocalNotification(
            '✅ Asistencia confirmada',
            'Tu asistencia ha sido confirmada exitosamente',
            { type: 'confirmation' },
            new Date()
          );
        }
        break;

      case 'cancel':
        // La cancelación requiere abrir la app para confirmar
        // Esto se maneja en el hook useNotifications
        break;

      case 'cancel_enrollment':
        // Similar a cancel, requiere confirmación en la app
        break;

      default:
        break;
    }
  }
}

export const notificationService = NotificationService.getInstance();