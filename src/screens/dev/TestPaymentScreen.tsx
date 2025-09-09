import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { processMockPayment } from '../../utils/mockPayment';

export const TestPaymentScreen = ({ navigation }: any) => {
  
  const testCreateAppointmentAndPay = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión primero');
        return;
      }

      // Crear una cita de prueba
      const appointmentData = {
        user_id: user.id,
        service_id: '1d1e6c10-4844-4e87-bac3-d6e7992a8e84', // Medicina Funcional
        professional_id: '41c11692-012f-4e78-9276-abf80b20e0b9', // Dra. Estefanía
        appointment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 días en el futuro
        appointment_time: '10:00:00',
        end_time: '11:00:00',
        duration: 60,
        status: 'pending',
        total_amount: 150000,
        notes: 'Cita de prueba para testing de pagos'
      };

      console.log('Creating test appointment:', appointmentData);

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (appointmentError) {
        Alert.alert('Error', `No se pudo crear la cita: ${appointmentError.message}`);
        return;
      }

      console.log('Appointment created:', appointment);

      // Simular pago
      const mockResult = await processMockPayment(appointmentData.total_amount, 'test_payment');
      
      if (!mockResult.success) {
        Alert.alert('Error', mockResult.error || 'Error en el pago');
        return;
      }

      // Actualizar cita como pagada
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'test_payment',
          paid_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (updateError) {
        Alert.alert('Error', `No se pudo actualizar la cita: ${updateError.message}`);
        return;
      }

      // Crear registro de pago
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          appointment_id: appointment.id,
          amount: appointmentData.total_amount,
          payment_method: 'test_payment',
          status: 'completed',
          transaction_id: mockResult.transactionId,
          description: 'Pago de prueba para cita médica'
        });

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        // No es crítico, continuar
      }

      Alert.alert(
        '¡Éxito!', 
        `Cita creada y pagada exitosamente\n\nID: ${appointment.id}\nFecha: ${appointmentData.appointment_date}\nHora: ${appointmentData.appointment_time}`,
        [
          {
            text: 'Ver Mis Citas',
            onPress: () => navigation.navigate('Appointments')
          }
        ]
      );

    } catch (error) {
      console.error('Test payment error:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Prueba de Pagos</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Esta pantalla te permite probar el flujo completo de crear una cita y pagarla.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={testCreateAppointmentAndPay}
        >
          <Text style={styles.buttonText}>Crear Cita y Pagar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  description: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: Colors.primary.dark,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.ui.surface,
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  secondaryButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});