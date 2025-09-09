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
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatPrice } from '../../constants/breatheMovePricing';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'test_payment',
    name: 'Pago de Prueba',
    icon: 'flask-empty',
    description: 'Simula el pago para pruebas (temporal)'
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

export const ClassPaymentScreen = ({ navigation, route }: any) => {
  const { classDetails, paymentType, packageId } = route.params;
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const getPrice = () => {
    if (paymentType === 'single') {
      return 65000; // Precio clase individual
    }
    // Aquí calcularías el precio del paquete si es necesario
    return 0;
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Por favor selecciona un método de pago');
      return;
    }

    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión para continuar');
        return;
      }

      // Simular procesamiento de pago
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Si es una clase temporal, crear primero la clase en Supabase
      let finalClassId = classDetails.id;
      
      if (classDetails.id.startsWith('temp_') && selectedMethod !== 'test_payment') {
        // Extraer instructor del horario
        const { SEPTEMBER_2025_SCHEDULE } = require('../../constants/breatheMoveSchedule');
        const scheduleEntry = SEPTEMBER_2025_SCHEDULE.find(
          (s: any) => s.className === classDetails.class_name && 
                      s.time === classDetails.start_time
        );

        // Crear la clase en Supabase
        const { data: newClass, error: createError } = await supabase
          .from('breathe_move_classes')
          .insert({
            class_name: classDetails.class_name,
            instructor: scheduleEntry?.instructor || classDetails.instructor,
            class_date: classDetails.class_date,
            start_time: classDetails.start_time,
            end_time: classDetails.end_time,
            max_capacity: classDetails.max_capacity,
            current_capacity: classDetails.current_capacity,
            status: 'scheduled',
            intensity: scheduleEntry?.intensity
          })
          .select()
          .single();

        if (createError) throw createError;
        finalClassId = newClass.id;
      } else if (classDetails.id.startsWith('temp_') && selectedMethod === 'test_payment') {
        // Para pagos de prueba, no crear la clase, solo simular
        finalClassId = classDetails.id; // Mantener el ID temporal
      }

      // Crear la inscripción solo si no es un pago de prueba con clase temporal
      if (!(selectedMethod === 'test_payment' && classDetails.id.startsWith('temp_'))) {
        const { error: enrollError } = await supabase
          .from('breathe_move_enrollments')
          .insert({
            user_id: user.id,
            class_id: finalClassId,
            package_id: paymentType === 'package' ? packageId : null,
            status: 'confirmed'
          });

        if (enrollError) throw enrollError;
      }

      // Registrar el pago
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: getPrice(),
          payment_method: selectedMethod,
          status: 'completed',
          description: `${classDetails.class_name} - ${format(parseISO(classDetails.class_date), 'd MMMM yyyy', { locale: es })}`,
          metadata: {
            type: 'breathe_move_class',
            class_id: finalClassId,
            payment_type: paymentType
          }
        });

      if (paymentError) throw paymentError;

      Alert.alert(
        selectedMethod === 'test_payment' ? '¡Pago de prueba exitoso!' : '¡Pago exitoso!',
        selectedMethod === 'test_payment' 
          ? 'Reserva de prueba realizada (no se guardó en base de datos)'
          : 'Te has inscrito correctamente en la clase',
        [
          {
            text: 'Ver mis clases',
            onPress: () => {
              navigation.reset({
                index: 1,
                routes: [
                  { name: 'MainTabs' },
                  { name: 'BreatheAndMove' }
                ],
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'No se pudo procesar el pago');
    } finally {
      setProcessing(false);
    }
  };

  const renderPaymentMethod = (method: PaymentMethod) => {
    const isSelected = selectedMethod === method.id;
    
    return (
      <TouchableOpacity
        key={method.id}
        style={[styles.paymentMethod, isSelected && styles.paymentMethodSelected]}
        onPress={() => setSelectedMethod(method.id)}
        activeOpacity={0.8}
      >
        <View style={styles.paymentMethodIcon}>
          <Ionicons 
            name={method.icon as any} 
            size={24} 
            color={isSelected ? Colors.primary.dark : Colors.text.secondary} 
          />
        </View>
        <View style={styles.paymentMethodInfo}>
          <Text style={[styles.paymentMethodName, isSelected && styles.textSelected]}>
            {method.name}
          </Text>
          <Text style={styles.paymentMethodDescription}>
            {method.description}
          </Text>
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
          onPress={() => navigation.goBack()}
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
            <Text style={styles.className}>{classDetails.class_name}</Text>
            <View style={styles.summaryDetails}>
              <View style={styles.summaryRow}>
                <MaterialCommunityIcons name="calendar" size={16} color={Colors.text.secondary} />
                <Text style={styles.summaryText}>
                  {format(parseISO(classDetails.class_date), "d 'de' MMMM yyyy", { locale: es })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <MaterialCommunityIcons name="clock" size={16} color={Colors.text.secondary} />
                <Text style={styles.summaryText}>
                  {classDetails.start_time} - {classDetails.end_time}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <MaterialCommunityIcons name="account" size={16} color={Colors.text.secondary} />
                <Text style={styles.summaryText}>{classDetails.instructor}</Text>
              </View>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.priceLabel}>
                {paymentType === 'single' ? 'Clase individual' : 'Con paquete'}
              </Text>
              <Text style={styles.priceAmount}>{formatPrice(getPrice())}</Text>
            </View>
          </View>
        </View>

        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Selecciona método de pago</Text>
          {PAYMENT_METHODS.map(renderPaymentMethod)}
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
                  Pagar {formatPrice(getPrice())}
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
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  bottomSpacing: {
    height: 90, // Espacio para la barra de navegación
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
  className: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 12,
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
});