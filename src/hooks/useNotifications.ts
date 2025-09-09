import { useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabase';

export const useNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    // Intentar obtener navigation después de un pequeño delay
    setTimeout(() => {
      try {
        const nav = useNavigation();
        navigationRef.current = nav;
      } catch (e) {
        console.log('Navigation not ready yet');
      }
    }, 100);

    // Registrar para notificaciones push
    registerForPushNotificationsAsync();

    // Listener para cuando llega una notificación
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificación recibida:', notification);
      setNotification(notification);
      updateUnreadCount();
    });

    // Listener para cuando el usuario interactúa con la notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Respuesta a notificación:', response);
      handleNotificationResponse(response);
    });

    // Cargar conteo inicial
    updateUnreadCount();

    // Cleanup
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const registerForPushNotificationsAsync = async () => {
    const token = await notificationService.registerForPushNotifications();
    
    if (token) {
      setExpoPushToken(token);
      await notificationService.saveTokenToDatabase(token);
    }
  };

  const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    const actionIdentifier = response.actionIdentifier;
    
    // Si es una acción específica (botón de la notificación)
    if (actionIdentifier && actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      await handleNotificationAction(actionIdentifier, response.notification, data);
      return;
    }
    
    // Si es un tap normal en la notificación
    switch (data.type) {
      case 'appointment_reminder':
        if (data.appointmentId) {
          navigationRef.current?.navigate('Appointments');
        }
        break;
      case 'class_reminder':
        if (data.classId) {
          navigationRef.current?.navigate('ClassDetail', { classId: data.classId });
        }
        break;
      case 'class_available':
        navigationRef.current?.navigate('HotStudio');
        break;
      default:
        navigationRef.current?.navigate('Notifications');
    }
  };

  const handleNotificationAction = async (
    actionIdentifier: string, 
    notification: Notifications.Notification,
    data: any
  ) => {
    switch (actionIdentifier) {
      case 'confirm':
        // Confirmar asistencia
        await notificationService.handleNotificationAction(actionIdentifier, notification);
        break;
      
      case 'cancel':
        // Navegar a citas para cancelar
        if (data.appointmentId) {
          navigationRef.current?.navigate('Appointments');
        }
        break;
      
      case 'view':
        // Ver detalles de la clase
        if (data.classId) {
          navigationRef.current?.navigate('ClassDetail', { classId: data.classId });
        }
        break;
      
      case 'cancel_enrollment':
        // Navegar a detalles de clase para cancelar
        if (data.classId) {
          navigationRef.current?.navigate('ClassDetail', { classId: data.classId });
        }
        break;
      
      case 'enroll':
        // Inscribirse en la clase
        if (data.classId) {
          navigationRef.current?.navigate('ClassEnrollment', { classId: data.classId });
        }
        break;
      
      case 'view_class':
        // Ver clase disponible
        if (data.classId) {
          navigationRef.current?.navigate('ClassDetail', { classId: data.classId });
        }
        break;
      
      default:
        break;
    }
  };

  const updateUnreadCount = async () => {
    const count = await notificationService.getUnreadCount();
    setUnreadCount(count);
  };

  const scheduleAppointmentNotifications = async (
    appointmentId: string,
    serviceName: string,
    appointmentDate: Date
  ) => {
    // Recordatorio 24 horas antes
    const dayBefore = new Date(appointmentDate);
    dayBefore.setHours(dayBefore.getHours() - 24);
    
    if (dayBefore > new Date()) {
      await notificationService.scheduleAppointmentReminder(
        appointmentId,
        serviceName,
        dayBefore,
        '24 horas'
      );
    }

    // Recordatorio 2 horas antes
    const twoHoursBefore = new Date(appointmentDate);
    twoHoursBefore.setHours(twoHoursBefore.getHours() - 2);
    
    if (twoHoursBefore > new Date()) {
      await notificationService.scheduleAppointmentReminder(
        appointmentId,
        serviceName,
        twoHoursBefore,
        '2 horas'
      );
    }
  };

  const scheduleClassNotifications = async (
    classId: string,
    className: string,
    classDate: Date
  ) => {
    // Recordatorio 2 horas antes
    const twoHoursBefore = new Date(classDate);
    twoHoursBefore.setHours(twoHoursBefore.getHours() - 2);
    
    if (twoHoursBefore > new Date()) {
      await notificationService.scheduleClassReminder(
        classId,
        className,
        twoHoursBefore,
        '2 horas'
      );
    }

    // Recordatorio 30 minutos antes
    const halfHourBefore = new Date(classDate);
    halfHourBefore.setMinutes(halfHourBefore.getMinutes() - 30);
    
    if (halfHourBefore > new Date()) {
      await notificationService.scheduleClassReminder(
        classId,
        className,
        halfHourBefore,
        '30 minutos'
      );
    }
  };

  return {
    expoPushToken,
    notification,
    unreadCount,
    updateUnreadCount,
    scheduleAppointmentNotifications,
    scheduleClassNotifications,
  };
};