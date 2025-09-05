import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { paymentService, PaymentData } from '../../services/paymentService';
import { supabase } from '../../lib/supabase';

interface PaymentMethodScreenProps {
  service: any;
  subService: any;
  date: string;
  time: string;
  professional: any;
  appointmentId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export const PaymentMethodScreen: React.FC<PaymentMethodScreenProps> = ({
  service,
  subService,
  date,
  time,
  professional,
  appointmentId,
  onBack,
  onSuccess
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'credit_card' | 'pse' | null>(null);
  const [loading, setLoading] = useState(false);

  const paymentMethods = [
    {
      id: 'credit_card',
      name: 'Tarjeta de crédito o débito',
      description: 'Paga de forma segura con tu tarjeta',
      icon: '💳',
      brands: ['Visa', 'Mastercard', 'American Express', 'Diners']
    },
    {
      id: 'pse',
      name: 'PSE - Débito bancario',
      description: 'Transfiere directamente desde tu banco',
      icon: '🏦',
      brands: ['Todos los bancos colombianos']
    }
  ];

  const handlePaymentMethodSelect = (methodId: 'credit_card' | 'pse') => {
    setSelectedMethod(methodId);
  };

  const handleContinue = async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Por favor selecciona un método de pago');
      return;
    }

    setLoading(true);

    try {
      // Obtener datos del usuario
      const { data: { user } } = await supabase.auth.getUser();
      
      const paymentData: PaymentData = {
        appointmentId,
        amount: subService.price,
        description: `${service.name} - ${subService.name}`,
        userEmail: user?.email || '',
        userName: user?.user_metadata?.full_name || 'Cliente',
        userPhone: user?.phone
      };

      if (selectedMethod === 'credit_card') {
        // Para desarrollo, simulamos un pago exitoso
        // En producción, aquí se integraría con PayU real
        
        // Actualizar el estado de la cita a confirmada
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ 
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', appointmentId);

        if (updateError) {
          console.error('Error updating appointment:', updateError);
          Alert.alert('Error', 'No se pudo confirmar la cita');
          return;
        }

        // Crear registro de transacción (comentado temporalmente)
        // TODO: Crear tabla transactions en Supabase si se necesita historial de pagos
        /*
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            appointment_id: appointmentId,
            user_id: user.id,
            amount: subService.price,
            payment_method: 'credit_card',
            payment_provider: 'payu',
            status: 'approved',
            provider_reference: `DEV_${Date.now()}`,
            response_message: 'Pago simulado para desarrollo'
          });

        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
        }
        */
        
        Alert.alert(
          '¡Pago exitoso!',
          'Tu cita ha sido confirmada. Recibirás un correo con los detalles.',
          [
            {
              text: 'OK',
              onPress: () => onSuccess()
            }
          ]
        );
      } else if (selectedMethod === 'pse') {
        // Para desarrollo, simulamos PSE también
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ 
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', appointmentId);

        if (updateError) {
          console.error('Error updating appointment:', updateError);
          Alert.alert('Error', 'No se pudo confirmar la cita');
          return;
        }

        // Crear registro de transacción (comentado temporalmente)
        // TODO: Crear tabla transactions en Supabase si se necesita historial de pagos
        /*
        await supabase
          .from('transactions')
          .insert({
            appointment_id: appointmentId,
            user_id: user.id,
            amount: subService.price,
            payment_method: 'pse',
            payment_provider: 'payu',
            status: 'approved',
            provider_reference: `PSE_DEV_${Date.now()}`,
            response_message: 'Pago PSE simulado para desarrollo'
          });
        */
        
        Alert.alert(
          '¡Pago exitoso!',
          'Tu cita ha sido confirmada mediante PSE. Recibirás un correo con los detalles.',
          [
            {
              text: 'OK',
              onPress: () => onSuccess()
            }
          ]
        );
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Ocurrió un error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Atrás</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Método de pago</Text>
          <Text style={styles.subtitle}>
            Selecciona cómo deseas pagar tu cita
          </Text>

          {/* Resumen del monto */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Total a pagar</Text>
            <Text style={styles.amountValue}>
              ${subService.price.toLocaleString('es-CO')} COP
            </Text>
          </View>

          {/* Métodos de pago */}
          <View style={styles.methodsContainer}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodCard,
                  selectedMethod === method.id && styles.methodCardSelected
                ]}
                onPress={() => handlePaymentMethodSelect(method.id as 'credit_card' | 'pse')}
                activeOpacity={0.7}
              >
                <View style={styles.methodHeader}>
                  <Text style={styles.methodIcon}>{method.icon}</Text>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <Text style={styles.methodDescription}>
                      {method.description}
                    </Text>
                  </View>
                  {selectedMethod === method.id && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </View>
                <View style={styles.brandsContainer}>
                  {method.brands.map((brand, index) => (
                    <Text key={index} style={styles.brandText}>
                      {brand}
                    </Text>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Información de seguridad */}
          <View style={styles.securityInfo}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityText}>
              Todos los pagos son procesados de forma segura a través de PayU Latam
            </Text>
          </View>

          {/* Botón continuar */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!selectedMethod || loading) && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!selectedMethod || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>
                Continuar al pago
              </Text>
            )}
          </TouchableOpacity>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    paddingVertical: 8,
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
  content: {
    paddingHorizontal: 24,
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
    marginBottom: 24,
  },
  amountCard: {
    backgroundColor: Colors.primary.beige + '30',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  methodsContainer: {
    marginBottom: 24,
  },
  methodCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.ui.surface,
  },
  methodCardSelected: {
    borderColor: Colors.primary.green,
    backgroundColor: Colors.primary.beige + '20',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  brandsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandText: {
    fontSize: 12,
    color: Colors.text.light,
    backgroundColor: Colors.ui.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.info + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  securityIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: Colors.primary.green,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 40,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.text.light,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});