import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { seedTestAppointments, clearUserAppointments } from '../../utils/seedTestData';
import { supabase } from '../../lib/supabase';

export const DevToolsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);

  const handleSeedData = async () => {
    Alert.alert(
      'Crear datos de prueba',
      '¿Deseas crear citas de prueba? Esto agregará 6 citas de ejemplo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Crear',
          onPress: async () => {
            try {
              setLoading(true);
              await seedTestAppointments();
              Alert.alert('Éxito', 'Citas de prueba creadas correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudieron crear las citas de prueba');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleClearData = async () => {
    Alert.alert(
      'Eliminar datos',
      '¿Estás seguro de eliminar todas tus citas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await clearUserAppointments();
              Alert.alert('Éxito', 'Citas eliminadas correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudieron eliminar las citas');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRunMigration = async () => {
    Alert.alert(
      'Ejecutar migración',
      'Esto agregará la columna appointment_time si no existe. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ejecutar',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Ejecutar la migración directamente
              const { error } = await supabase.rpc('exec_sql', {
                sql: `
                  ALTER TABLE appointments 
                  ADD COLUMN IF NOT EXISTS appointment_time TIME NOT NULL DEFAULT '09:00:00';
                  
                  ALTER TABLE appointments 
                  ALTER COLUMN appointment_date TYPE DATE USING appointment_date::DATE;
                `
              });

              if (error) throw error;

              Alert.alert('Éxito', 'Migración ejecutada correctamente');
            } catch (error) {
              // Si falla, intentamos una alternativa
              try {
                // Verificar si la columna ya existe
                const { data, error: checkError } = await supabase
                  .from('appointments')
                  .select('appointment_time')
                  .limit(1);

                if (checkError && checkError.message.includes('appointment_time')) {
                  Alert.alert(
                    'Información',
                    'La columna appointment_time no existe. Por favor, ejecuta esta migración en el dashboard de Supabase:\n\n' +
                    'ALTER TABLE appointments ADD COLUMN appointment_time TIME NOT NULL DEFAULT \'09:00:00\';'
                  );
                } else {
                  Alert.alert('Info', 'La columna ya existe o la migración se completó');
                }
              } catch (e) {
                Alert.alert('Error', 'No se pudo ejecutar la migración');
              }
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const testCreateAppointment = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }

      const testAppointment = {
        user_id: user.id,
        service_id: 'medicina-funcional',
        professional_id: '1',
        appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        appointment_time: '14:00:00',
        duration: 60,
        status: 'confirmed',
        total_amount: 250000,
        notes: 'Medicina Funcional - Consulta de prueba'
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert(testAppointment)
        .select()
        .single();

      if (error) {
        console.error('Error detallado:', error);
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Éxito', 'Cita de prueba creada correctamente');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Error al crear la cita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Herramientas de Desarrollo</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Base de Datos</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleRunMigration}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🔧 Ejecutar migración appointments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.successButton]}
            onPress={handleSeedData}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🌱 Crear citas de prueba</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={testCreateAppointment}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🧪 Probar crear una cita</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleClearData}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🗑️ Eliminar todas las citas</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Las citas de prueba incluyen:
              {'\n'}• 3 citas futuras (confirmadas y pendientes)
              {'\n'}• 3 citas pasadas (completadas y canceladas)
              {'\n'}• Diferentes servicios y profesionales
              {'\n'}• Diferentes estados y fechas
            </Text>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary.green} />
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.divider,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary.green,
  },
  successButton: {
    backgroundColor: Colors.ui.success,
  },
  warningButton: {
    backgroundColor: Colors.ui.warning,
  },
  dangerButton: {
    backgroundColor: Colors.ui.error,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: Colors.ui.surface,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});