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
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../constants/colors';
import { paymentService, PaymentData } from '../../services/paymentService';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { processMockPayment } from '../../utils/mockPayment';
import { useUserCredits } from '../../hooks/useCredits';

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

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  iconFamily?: string;
  description: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'credits',
    name: '💰 Usar Créditos',
    icon: 'wallet',
    iconFamily: 'MaterialCommunityIcons',
    description: 'Paga con tus créditos disponibles'
  },
  {
    id: 'test_payment',
    name: '🧪 Pago de Prueba',
    icon: 'flask-outline',
    iconFamily: 'Ionicons',
    description: 'Simula un pago exitoso (solo para desarrollo)'
  },
  {
    id: 'nequi',
    name: 'Nequi',
    icon: 'phone-portrait',
    description: 'Paga con tu cuenta Nequi'
  },
  {
    id: 'daviplata',
    name: 'Daviplata',
    icon: 'phone-portrait',
    description: 'Paga con tu cuenta Daviplata'
  },
  {
    id: 'credit_card',
    name: 'Tarjeta de crédito',
    icon: 'card',
    description: 'Visa, Mastercard, American Express'
  },
  {
    id: 'debit_card',
    name: 'Tarjeta débito',
    icon: 'card-outline',
    description: 'PSE - Débito desde tu banco'
  },
  {
    id: 'cash',
    name: 'Efectivo',
    icon: 'cash',
    description: 'Paga en efectivo en recepción'
  }
];

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
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [useCreditsAmount, setUseCreditsAmount] = useState(0);
  const { credits, loading: creditsLoading } = useUserCredits();

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-CO')}`;
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Por favor selecciona un método de pago');
      return;
    }

    try {
      setProcessing(true);
      
      // Obtener datos del usuario
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión para continuar');
        setProcessing(false);
        return;
      }
      
      // Calcular montos
      const totalAmount = subService.price;
      const creditsToPay = selectedMethod === 'credits' ? Math.min(useCreditsAmount, totalAmount) : 0;
      const cashToPay = totalAmount - creditsToPay;

      // Verificar que el appointmentId sea válido
      if (!appointmentId || appointmentId === '1' || appointmentId.length < 10) {
        console.error('Invalid appointmentId:', appointmentId);
        Alert.alert('Error', 'ID de cita inválido. Por favor intenta nuevamente.');
        setProcessing(false);
        return;
      }

      console.log('Processing payment for appointment:', appointmentId);

      const paymentData: PaymentData = {
        appointmentId,
        amount: subService.price,
        description: `${service.name} - ${subService.name}`,
        userEmail: user?.email || '',
        userName: user?.user_metadata?.full_name || 'Cliente',
        userPhone: user?.phone
      };

      // Si se usan créditos, procesarlos primero
      if (creditsToPay > 0) {
        // Actualizar créditos del usuario
        const { error: creditsError } = await supabase
          .from('patient_credits')
          .update({
            available_credits: (credits?.available_credits || 0) - creditsToPay,
            total_used: (credits?.total_used || 0) + creditsToPay,
            updated_at: new Date().toISOString()
          })
          .eq('patient_id', user.id);
          
        if (creditsError) {
          console.error('Error updating credits:', creditsError);
          throw new Error('No se pudieron aplicar los créditos');
        }
        
        // Registrar transacción de créditos
        const { error: transactionError } = await supabase
          .from('credit_transactions')
          .insert({
            patient_id: user.id,
            appointment_id: appointmentId,
            amount: -creditsToPay,
            transaction_type: 'used',
            source: 'appointment_payment',
            description: `Pago de cita: ${service.name} - ${subService.name}`
          });
          
        if (transactionError) {
          console.error('Error creating credit transaction:', transactionError);
        }
      }
      
      // Si hay saldo restante por pagar en efectivo o es pago completo sin créditos
      if (cashToPay > 0 || (selectedMethod !== 'credits' && !selectedMethod?.startsWith('credits_plus_'))) {
        // Determinar el método de pago real
        let actualPaymentMethod = selectedMethod;
        if (selectedMethod?.startsWith('credits_plus_')) {
          actualPaymentMethod = selectedMethod.replace('credits_plus_', '');
        }
        
        // Si es pago de prueba, usar el sistema mock
        if (actualPaymentMethod === 'test_payment') {
          const mockResult = await processMockPayment(cashToPay > 0 ? cashToPay : totalAmount, actualPaymentMethod);
          
          if (!mockResult.success) {
            throw new Error(mockResult.error || 'Error en el pago de prueba');
          }
          
          // Guardar el ID de transacción mock
          paymentData.transactionId = mockResult.transactionId;
        } else if (actualPaymentMethod !== 'credits') {
          // Para otros métodos, simular por ahora
          await new Promise(resolve => setTimeout(resolve, 2000));
          paymentData.transactionId = `SIM_${Date.now()}`;
        }
      }

      // Actualizar el estado de la cita
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: selectedMethod,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (updateError) {
        console.error('Error updating appointment:', updateError);
        throw updateError;
      }

      // Registrar el pago
      const paymentMethod = creditsToPay > 0 && cashToPay === 0 ? 'credits' : selectedMethod;
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          appointment_id: appointmentId,
          amount: totalAmount,
          payment_method: paymentMethod,
          status: 'completed',
          transaction_id: paymentData.transactionId || `CREDITS_${Date.now()}`,
          description: `${service.name} - ${subService.name} - ${format(parseISO(date), 'd MMMM yyyy', { locale: es })}`,
          metadata: {
            type: 'appointment',
            appointment_id: appointmentId,
            service_name: service.name,
            subservice_name: subService.name,
            professional_name: professional.name,
            credits_used: creditsToPay,
            cash_paid: cashToPay
          }
        });

      if (paymentError) {
        console.error('Error recording payment:', paymentError);
      }

      let successMessage = '';
      if (creditsToPay > 0 && cashToPay === 0) {
        successMessage = `Tu cita ha sido confirmada. Se usaron ${formatPrice(creditsToPay)} de tus créditos.`;
      } else if (creditsToPay > 0 && cashToPay > 0) {
        successMessage = `Tu cita ha sido confirmada. Se usaron ${formatPrice(creditsToPay)} de créditos y se pagaron ${formatPrice(cashToPay)} en ${selectedMethod}.`;
      } else if (selectedMethod === 'test_payment') {
        successMessage = 'Tu cita ha sido confirmada en modo prueba. Este es solo para testing.';
      } else {
        successMessage = 'Tu cita ha sido confirmada. Recibirás un correo con los detalles.';
      }
      
      Alert.alert(
        selectedMethod === 'test_payment' ? '¡Pago de prueba exitoso!' : '¡Pago exitoso!',
        successMessage,
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'No se pudo procesar el pago. Por favor intenta nuevamente.');
    } finally {
      setProcessing(false);
    }
  };

  const renderPaymentMethod = (method: PaymentMethod) => {
    const isSelected = selectedMethod === method.id;
    const availableCredits = credits?.available_credits || 0;
    const isCreditsMethod = method.id === 'credits';
    const hasEnoughCredits = availableCredits >= subService.price;
    const isDisabled = isCreditsMethod && availableCredits === 0;
    
    return (
      <TouchableOpacity
        key={method.id}
        style={[
          styles.paymentMethod, 
          isSelected && styles.paymentMethodSelected,
          isDisabled && styles.paymentMethodDisabled
        ]}
        onPress={() => {
          if (!isDisabled) {
            setSelectedMethod(method.id);
            if (isCreditsMethod) {
              setUseCreditsAmount(Math.min(availableCredits, subService.price));
            }
          }
        }}
        activeOpacity={isDisabled ? 1 : 0.8}
        disabled={isDisabled}
      >
        <View style={styles.paymentMethodIcon}>
          {method.iconFamily === 'MaterialCommunityIcons' ? (
            <MaterialCommunityIcons 
              name={method.icon as any} 
              size={24} 
              color={isSelected ? Colors.primary.dark : Colors.text.secondary} 
            />
          ) : (
            <Ionicons 
              name={method.icon as any} 
              size={24} 
              color={isSelected ? Colors.primary.dark : Colors.text.secondary} 
            />
          )}
        </View>
        <View style={styles.paymentMethodInfo}>
          <Text style={[styles.paymentMethodName, isSelected && styles.textSelected, isDisabled && styles.textDisabled]}>
            {method.name}
          </Text>
          <Text style={[styles.paymentMethodDescription, isDisabled && styles.textDisabled]}>
            {isCreditsMethod ? (
              availableCredits > 0 ? (
                `Tienes ${formatPrice(availableCredits)} disponibles`
              ) : (
                'No tienes créditos disponibles'
              )
            ) : (
              method.description
            )}
          </Text>
          {isCreditsMethod && isSelected && availableCredits > 0 && availableCredits < subService.price && (
            <Text style={styles.creditsWarning}>
              Se usarán {formatPrice(availableCredits)} de créditos.
              Faltante: {formatPrice(subService.price - availableCredits)} a pagar con otro método.
            </Text>
          )}
        </View>
        <View style={styles.radioButton}>
          {isSelected && <View style={styles.radioButtonInner} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Método de pago</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.orderSummary}>
          <Text style={styles.sectionTitle}>Resumen del pedido</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.subServiceName}>{subService.name}</Text>
            
            <View style={styles.summaryDetails}>
              <View style={styles.summaryRow}>
                <MaterialCommunityIcons name="account" size={16} color={Colors.text.secondary} />
                <Text style={styles.summaryText}>{professional.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <MaterialCommunityIcons name="calendar" size={16} color={Colors.text.secondary} />
                <Text style={styles.summaryText}>
                  {format(parseISO(date), "d 'de' MMMM yyyy", { locale: es })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <MaterialCommunityIcons name="clock" size={16} color={Colors.text.secondary} />
                <Text style={styles.summaryText}>{time}</Text>
              </View>
              <View style={styles.summaryRow}>
                <MaterialCommunityIcons name="timer" size={16} color={Colors.text.secondary} />
                <Text style={styles.summaryText}>{subService.duration} minutos</Text>
              </View>
            </View>

            <View style={styles.pricingRow}>
              <Text style={styles.priceLabel}>Total a pagar</Text>
              <Text style={styles.priceAmount}>{formatPrice(subService.price)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Selecciona método de pago</Text>
          {PAYMENT_METHODS.map(renderPaymentMethod)}
          
          {/* Si se seleccionaron créditos pero no alcanzan, mostrar métodos de pago adicionales */}
          {selectedMethod === 'credits' && credits && credits.available_credits > 0 && credits.available_credits < subService.price && (
            <View style={styles.additionalPaymentSection}>
              <Text style={styles.additionalPaymentTitle}>
                Selecciona cómo pagar los {formatPrice(subService.price - credits.available_credits)} restantes:
              </Text>
              {PAYMENT_METHODS.filter(m => m.id !== 'credits').map(method => {
                const isAdditionalSelected = selectedMethod === 'credits_plus_' + method.id;
                return (
                  <TouchableOpacity
                    key={'additional_' + method.id}
                    style={[styles.paymentMethod, isAdditionalSelected && styles.paymentMethodSelected]}
                    onPress={() => setSelectedMethod('credits_plus_' + method.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.paymentMethodIcon}>
                      {method.iconFamily === 'MaterialCommunityIcons' ? (
                        <MaterialCommunityIcons 
                          name={method.icon as any} 
                          size={24} 
                          color={isAdditionalSelected ? Colors.primary.dark : Colors.text.secondary} 
                        />
                      ) : (
                        <Ionicons 
                          name={method.icon as any} 
                          size={24} 
                          color={isAdditionalSelected ? Colors.primary.dark : Colors.text.secondary} 
                        />
                      )}
                    </View>
                    <View style={styles.paymentMethodInfo}>
                      <Text style={[styles.paymentMethodName, isAdditionalSelected && styles.textSelected]}>
                        {method.name}
                      </Text>
                      <Text style={styles.paymentMethodDescription}>
                        {method.description}
                      </Text>
                    </View>
                    <View style={styles.radioButton}>
                      {isAdditionalSelected && <View style={styles.radioButtonInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.termsSection}>
          <View style={styles.termsItem}>
            <Ionicons name="information-circle" size={20} color={Colors.text.secondary} />
            <Text style={styles.termsText}>
              Al confirmar aceptas nuestros términos y política de cancelación
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.payButton,
              (!selectedMethod || processing) && styles.payButtonDisabled
            ]}
            onPress={handlePayment}
            disabled={!selectedMethod || processing}
          >
            {processing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.payButtonText}>
                  {selectedMethod === 'credits' && credits && credits.available_credits >= subService.price
                    ? `Pagar con créditos`
                    : selectedMethod === 'credits' && credits && credits.available_credits > 0
                    ? `Usar ${formatPrice(credits.available_credits)} de créditos`
                    : selectedMethod?.startsWith('credits_plus_')
                    ? `Pagar ${formatPrice(subService.price - (credits?.available_credits || 0))}`
                    : `Pagar ${formatPrice(subService.price)}`
                  }
                </Text>
                <MaterialCommunityIcons name="lock" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.securityText}>
            <MaterialCommunityIcons name="shield-check" size={14} color={Colors.text.light} />
            {' '}Pago seguro y encriptado
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.ui.surface,
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
  orderSummary: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 4,
  },
  subServiceName: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  summaryDetails: {
    gap: 8,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.border,
  },
  priceLabel: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  paymentSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.ui.border,
  },
  paymentMethodSelected: {
    borderColor: Colors.primary.dark,
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.ui.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  textSelected: {
    color: Colors.primary.dark,
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: Colors.text.light,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary.dark,
  },
  termsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  termsItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  termsText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  payButton: {
    backgroundColor: Colors.primary.dark,
    paddingVertical: 16,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  securityText: {
    fontSize: 12,
    color: Colors.text.light,
    textAlign: 'center',
  },
  paymentMethodDisabled: {
    opacity: 0.6,
    borderColor: Colors.ui.border,
  },
  textDisabled: {
    color: Colors.text.light,
  },
  creditsWarning: {
    fontSize: 12,
    color: Colors.ui.warning,
    marginTop: 4,
    fontStyle: 'italic',
  },
  additionalPaymentSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.border,
  },
  additionalPaymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
});