import { supabase } from '../lib/supabase';

export class RemoteNotificationService {
  private static instance: RemoteNotificationService;
  
  private constructor() {}
  
  static getInstance(): RemoteNotificationService {
    if (!RemoteNotificationService.instance) {
      RemoteNotificationService.instance = new RemoteNotificationService();
    }
    return RemoteNotificationService.instance;
  }

  // Enviar notificación remota a un usuario específico
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data: any = {},
    categoryId?: string
  ): Promise<void> {
    try {
      // Obtener tokens del usuario
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!tokens || tokens.length === 0) return;

      // Obtener sesión para autenticación
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Enviar notificación
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`,
        {
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
        }
      );

      if (!response.ok) {
        console.error('Error sending remote notification:', await response.text());
      }
    } catch (error) {
      console.error('Error in sendToUser:', error);
    }
  }

  // Enviar notificación a múltiples usuarios
  async sendToMultipleUsers(
    userIds: string[],
    title: string,
    body: string,
    data: any = {},
    categoryId?: string
  ): Promise<void> {
    try {
      // Obtener todos los tokens
      const { data: tokenRecords } = await supabase
        .from('push_tokens')
        .select('token')
        .in('user_id', userIds)
        .eq('is_active', true);

      if (!tokenRecords || tokenRecords.length === 0) return;

      const tokens = tokenRecords.map(t => t.token);

      // Obtener sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Enviar notificación
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            to: tokens,
            title,
            body,
            data,
            categoryId
          })
        }
      );

      if (!response.ok) {
        console.error('Error sending notifications:', await response.text());
      }
    } catch (error) {
      console.error('Error in sendToMultipleUsers:', error);
    }
  }

  // Notificar nuevo cupo disponible
  async notifyClassAvailable(classId: string): Promise<void> {
    try {
      // Obtener información de la clase
      const { data: classInfo } = await supabase
        .from('classes')
        .select(`
          *,
          class_type:class_types(name, icon)
        `)
        .eq('id', classId)
        .single();

      if (!classInfo) return;

      // Obtener usuarios en lista de espera
      const { data: waitlistUsers } = await supabase
        .from('class_waitlist')
        .select('user_id')
        .eq('class_id', classId)
        .order('position')
        .limit(5);

      if (!waitlistUsers || waitlistUsers.length === 0) return;

      const userIds = waitlistUsers.map(w => w.user_id);

      await this.sendToMultipleUsers(
        userIds,
        `${classInfo.class_type.icon} ¡Cupo disponible!`,
        `Se liberó un cupo en ${classInfo.class_type.name}. ¡Inscríbete ahora!`,
        {
          type: 'class_available',
          classId
        },
        'class_available'
      );
    } catch (error) {
      console.error('Error in notifyClassAvailable:', error);
    }
  }

  // Notificar cambio en cita
  async notifyAppointmentChange(
    appointmentId: string,
    userId: string,
    changeType: 'rescheduled' | 'cancelled'
  ): Promise<void> {
    try {
      const { data: appointment } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (!appointment) return;

      const title = changeType === 'rescheduled' 
        ? '📅 Cita reprogramada'
        : '❌ Cita cancelada';
        
      const body = changeType === 'rescheduled'
        ? `Tu cita ha sido reprogramada. Revisa los nuevos detalles.`
        : `Tu cita ha sido cancelada.`;

      await this.sendToUser(
        userId,
        title,
        body,
        {
          type: `appointment_${changeType}`,
          appointmentId
        }
      );
    } catch (error) {
      console.error('Error in notifyAppointmentChange:', error);
    }
  }

  // Notificar promociones o anuncios
  async sendBroadcast(
    title: string,
    body: string,
    data: any = {}
  ): Promise<void> {
    try {
      // Obtener todos los tokens activos
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('is_active', true);

      if (!tokens || tokens.length === 0) return;

      // Dividir en lotes de 100 para no sobrecargar
      const batchSize = 100;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize).map(t => t.token);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) continue;

        await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              to: batch,
              title,
              body,
              data: { ...data, type: 'broadcast' }
            })
          }
        );

        // Pequeña pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error in sendBroadcast:', error);
    }
  }
}

export const remoteNotificationService = RemoteNotificationService.getInstance();