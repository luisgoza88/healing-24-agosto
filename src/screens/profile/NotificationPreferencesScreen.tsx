import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface NotificationPreferences {
  appointments_reminder: boolean;
  appointments_confirmation: boolean;
  promotions: boolean;
  hot_studio_updates: boolean;
  payment_notifications: boolean;
  reminder_hours_before: number;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
}

export const NotificationPreferencesScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    appointments_reminder: true,
    appointments_confirmation: true,
    promotions: true,
    hot_studio_updates: true,
    payment_notifications: true,
    reminder_hours_before: 24,
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Cargar preferencias
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = No rows found
        throw error;
      }

      if (data) {
        setPreferences({
          appointments_reminder: data.appointments_reminder,
          appointments_confirmation: data.appointments_confirmation,
          promotions: data.promotions,
          hot_studio_updates: data.hot_studio_updates,
          payment_notifications: data.payment_notifications,
          reminder_hours_before: data.reminder_hours_before,
          email_notifications: data.email_notifications,
          push_notifications: data.push_notifications,
          sms_notifications: data.sms_notifications
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'No se pudieron cargar las preferencias');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Usar upsert para crear o actualizar
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences
        });

      if (error) throw error;

      Alert.alert('Éxito', 'Preferencias guardadas correctamente');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'No se pudieron guardar las preferencias');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean | number) => {
    setPreferences({ ...preferences, [key]: value });
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
      <View style={styles.navigationHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferencias de Notificación</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Personaliza tus notificaciones</Text>
          <Text style={styles.subtitle}>
            Elige cómo y cuándo recibir actualizaciones
          </Text>
        </View>

        {/* Canales de notificación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Canales de Notificación</Text>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <View style={styles.preferenceNameRow}>
                <MaterialCommunityIcons name="email" size={20} color={Colors.primary.dark} style={styles.preferenceIcon} />
                <Text style={styles.preferenceName}>Notificaciones por Email</Text>
              </View>
              <Text style={styles.preferenceDescription}>
                Recibe notificaciones en tu correo electrónico
              </Text>
            </View>
            <Switch
              value={preferences.email_notifications}
              onValueChange={(value) => updatePreference('email_notifications', value)}
              trackColor={{ false: Colors.ui.disabled, true: Colors.primary.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <View style={styles.preferenceNameRow}>
                <MaterialCommunityIcons name="cellphone" size={20} color={Colors.primary.dark} style={styles.preferenceIcon} />
                <Text style={styles.preferenceName}>Notificaciones Push</Text>
              </View>
              <Text style={styles.preferenceDescription}>
                Recibe notificaciones en tu dispositivo móvil
              </Text>
            </View>
            <Switch
              value={preferences.push_notifications}
              onValueChange={(value) => updatePreference('push_notifications', value)}
              trackColor={{ false: Colors.ui.disabled, true: Colors.primary.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <View style={styles.preferenceNameRow}>
                <MaterialCommunityIcons name="message-text" size={20} color={Colors.primary.dark} style={styles.preferenceIcon} />
                <Text style={styles.preferenceName}>SMS</Text>
              </View>
              <Text style={styles.preferenceDescription}>
                Recibe mensajes de texto (pueden aplicar cargos)
              </Text>
            </View>
            <Switch
              value={preferences.sms_notifications}
              onValueChange={(value) => updatePreference('sms_notifications', value)}
              trackColor={{ false: Colors.ui.disabled, true: Colors.primary.green }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Tipos de notificación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipos de Notificación</Text>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceName}>Recordatorios de Citas</Text>
              <Text style={styles.preferenceDescription}>
                Recibe recordatorios antes de tus citas
              </Text>
            </View>
            <Switch
              value={preferences.appointments_reminder}
              onValueChange={(value) => updatePreference('appointments_reminder', value)}
              trackColor={{ false: Colors.ui.disabled, true: Colors.primary.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceName}>Confirmaciones de Citas</Text>
              <Text style={styles.preferenceDescription}>
                Recibe confirmaciones cuando agendes una cita
              </Text>
            </View>
            <Switch
              value={preferences.appointments_confirmation}
              onValueChange={(value) => updatePreference('appointments_confirmation', value)}
              trackColor={{ false: Colors.ui.disabled, true: Colors.primary.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceName}>Notificaciones de Pago</Text>
              <Text style={styles.preferenceDescription}>
                Recibe confirmaciones y recordatorios de pago
              </Text>
            </View>
            <Switch
              value={preferences.payment_notifications}
              onValueChange={(value) => updatePreference('payment_notifications', value)}
              trackColor={{ false: Colors.ui.disabled, true: Colors.primary.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceName}>Promociones y Ofertas</Text>
              <Text style={styles.preferenceDescription}>
                Recibe ofertas especiales y descuentos
              </Text>
            </View>
            <Switch
              value={preferences.promotions}
              onValueChange={(value) => updatePreference('promotions', value)}
              trackColor={{ false: Colors.ui.disabled, true: Colors.primary.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceName}>Actualizaciones Hot Studio</Text>
              <Text style={styles.preferenceDescription}>
                Nuevas clases y cambios en horarios
              </Text>
            </View>
            <Switch
              value={preferences.hot_studio_updates}
              onValueChange={(value) => updatePreference('hot_studio_updates', value)}
              trackColor={{ false: Colors.ui.disabled, true: Colors.primary.green }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Configuración de recordatorios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración de Recordatorios</Text>
          
          <View style={styles.reminderOptions}>
            {[12, 24, 48].map((hours) => (
              <TouchableOpacity
                key={hours}
                style={[
                  styles.reminderOption,
                  preferences.reminder_hours_before === hours && styles.reminderOptionSelected
                ]}
                onPress={() => updatePreference('reminder_hours_before', hours)}
              >
                <Text
                  style={[
                    styles.reminderOptionText,
                    preferences.reminder_hours_before === hours && styles.reminderOptionTextSelected
                  ]}
                >
                  {hours}h antes
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Guardar preferencias"
            onPress={savePreferences}
            loading={saving}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.divider,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  preferenceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  preferenceIcon: {
    marginRight: 8,
  },
  preferenceName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  preferenceDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  reminderOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  reminderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.ui.divider,
    alignItems: 'center',
  },
  reminderOptionSelected: {
    backgroundColor: Colors.primary.green,
    borderColor: Colors.primary.green,
  },
  reminderOptionText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  reminderOptionTextSelected: {
    color: '#FFFFFF',
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
});