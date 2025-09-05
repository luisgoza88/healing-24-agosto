import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../../services/notificationService';
import { remoteNotificationService } from '../../services/remoteNotificationService';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../hooks/useNotifications';

export const TestNotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { expoPushToken } = useNotifications();
  const [loading, setLoading] = useState(false);

  const testLocalNotification = async () => {
    try {
      setLoading(true);
      await notificationService.scheduleLocalNotification(
        '🧪 Prueba Local',
        'Esta es una notificación local de prueba',
        { test: true, type: 'test' },
        new Date(Date.now() + 5000) // 5 segundos
      );
      Alert.alert('Éxito', 'Notificación local programada para 5 segundos');
    } catch (error) {
      Alert.alert('Error', 'No se pudo programar la notificación');
    } finally {
      setLoading(false);
    }
  };

  const testRemoteNotification = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }

      await remoteNotificationService.sendToUser(
        user.id,
        '🚀 Prueba Remota',
        'Esta notificación viene del servidor',
        { test: true, type: 'remote_test' }
      );
      Alert.alert('Éxito', 'Notificación remota enviada');
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar la notificación remota');
    } finally {
      setLoading(false);
    }
  };

  const testAppointmentReminder = async () => {
    try {
      setLoading(true);
      await notificationService.scheduleLocalNotification(
        '🏥 Recordatorio de Cita',
        'Tu cita de Medicina General es mañana a las 10:00 AM',
        { 
          type: 'appointment_reminder',
          appointmentId: 'test-123'
        },
        new Date(Date.now() + 10000), // 10 segundos
        'appointment_reminder' // Categoría con acciones
      );
      Alert.alert('Éxito', 'Recordatorio con acciones programado para 10 segundos');
    } catch (error) {
      Alert.alert('Error', 'No se pudo programar el recordatorio');
    } finally {
      setLoading(false);
    }
  };

  const testClassReminder = async () => {
    try {
      setLoading(true);
      await notificationService.scheduleLocalNotification(
        '🧘‍♀️ Recordatorio de Clase',
        'Tu clase de Yoga es en 2 horas',
        { 
          type: 'class_reminder',
          classId: 'test-class-123'
        },
        new Date(Date.now() + 8000), // 8 segundos
        'class_reminder' // Categoría con acciones
      );
      Alert.alert('Éxito', 'Recordatorio de clase programado para 8 segundos');
    } catch (error) {
      Alert.alert('Error', 'No se pudo programar el recordatorio');
    } finally {
      setLoading(false);
    }
  };

  const testClassAvailable = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }

      await remoteNotificationService.sendToUser(
        user.id,
        '🎉 ¡Cupo disponible!',
        'Se liberó un cupo en Yoga. ¡Inscríbete ahora!',
        { 
          type: 'class_available',
          classId: 'test-available-123'
        },
        'class_available' // Categoría con acciones
      );
      Alert.alert('Éxito', 'Notificación de cupo disponible enviada');
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar la notificación');
    } finally {
      setLoading(false);
    }
  };

  const checkPushToken = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }

      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', user.id);

      if (tokens && tokens.length > 0) {
        Alert.alert(
          'Tokens guardados',
          `Tienes ${tokens.length} token(s) guardado(s):\n\n${tokens.map(t => 
            `${t.platform}: ${t.token.substring(0, 20)}...`
          ).join('\n')}`
        );
      } else {
        Alert.alert('Sin tokens', 'No hay tokens guardados para este usuario');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron obtener los tokens');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prueba de Notificaciones</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>Push Token:</Text>
          <Text style={styles.tokenText}>
            {expoPushToken ? `${expoPushToken.substring(0, 30)}...` : 'No disponible'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificaciones Básicas</Text>
          
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={testLocalNotification}
            disabled={loading}
          >
            <Ionicons name="notifications" size={24} color="#fff" />
            <Text style={styles.buttonText}>Probar Notificación Local</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
            onPress={testRemoteNotification}
            disabled={loading}
          >
            <Ionicons name="cloud-upload" size={24} color="#fff" />
            <Text style={styles.buttonText}>Probar Notificación Remota</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificaciones con Acciones</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.buttonSuccess, loading && styles.buttonDisabled]}
            onPress={testAppointmentReminder}
            disabled={loading}
          >
            <Ionicons name="calendar" size={24} color="#fff" />
            <Text style={styles.buttonText}>Recordatorio de Cita</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonWarning, loading && styles.buttonDisabled]}
            onPress={testClassReminder}
            disabled={loading}
          >
            <Ionicons name="fitness" size={24} color="#fff" />
            <Text style={styles.buttonText}>Recordatorio de Clase</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonInfo, loading && styles.buttonDisabled]}
            onPress={testClassAvailable}
            disabled={loading}
          >
            <Ionicons name="sparkles" size={24} color="#fff" />
            <Text style={styles.buttonText}>Cupo Disponible</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Utilidades</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.buttonDark, loading && styles.buttonDisabled]}
            onPress={checkPushToken}
            disabled={loading}
          >
            <Ionicons name="key" size={24} color="#fff" />
            <Text style={styles.buttonText}>Verificar Tokens</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Instrucciones:</Text>
          <Text style={styles.instructionsText}>
            • Las notificaciones locales aparecerán en los segundos indicados{'\n'}
            • Las notificaciones remotas requieren Edge Functions configuradas{'\n'}
            • En iOS: mantén presionada la notificación para ver acciones{'\n'}
            • En Android: las acciones aparecen expandiendo la notificación
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tokenContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  tokenLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  tokenText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7653',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  buttonSecondary: {
    backgroundColor: '#6C63FF',
  },
  buttonSuccess: {
    backgroundColor: '#00BFA5',
  },
  buttonWarning: {
    backgroundColor: '#FFA726',
  },
  buttonInfo: {
    backgroundColor: '#29B6F6',
  },
  buttonDark: {
    backgroundColor: '#424242',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  instructions: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
});