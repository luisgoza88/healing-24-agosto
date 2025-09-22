import React, { useState, useEffect } from 'react';
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
import { format, addDays, addMonths, addYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BREATHE_MOVE_PRICING, 
  formatPrice, 
  getValidityText,
  getClassesText 
} from '../../constants/breatheMovePricing';
import { getUserCreditBalance, useCreditsForAppointment } from '../../utils/creditsManager';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const getPaymentMethods = (creditBalance: number, totalAmount: number): PaymentMethod[] => {
  const methods: PaymentMethod[] = [];
  
  // Solo mostrar créditos si hay balance suficiente
  if (creditBalance >= totalAmount) {
    methods.push({
      id: 'credits',
      name: 'Pagar con créditos',
      icon: 'gift',
      description: `Usar tus créditos (${formatPrice(creditBalance)} disponibles)`
    });
  }
  
  methods.push(
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
  );
  
  return methods;
};

export const PackagePaymentScreen = ({ navigation, route }: any) => {
  const { packageId } = route.params;
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [dbPackageId, setDbPackageId] = useState<string | null>(null);

  const selectedPackage = BREATHE_MOVE_PRICING.find(pkg => pkg.id === packageId);

  if (!selectedPackage) {
    Alert.alert('Error', 'Paquete no encontrado');
    navigation.goBack();
    return null;
  }

  useEffect(() => {
    loadCreditBalance();
    loadPackageFromDB();
  }, []);

  const loadPackageFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('breathe_move_packages')
        .select('id')
        .eq('name', selectedPackage.name)
        .single();

      if (error) throw error;
      if (data) {
        setDbPackageId(data.id);
      }
    } catch (error) {
      console.error('Error loading package from DB:', error);
    }
  };

  const loadCreditBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const balance = await getUserCreditBalance(user.id);
        setCreditBalance(balance);
      }
    } catch (error) {
      console.error('Error loading credit balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const calculateExpiryDate = () => {
    const now = new Date();
    const { amount, unit } = selectedPackage.validity;

    switch (unit) {
      case 'days':
        return addDays(now, amount);
      case 'weeks':
        return addDays(now, amount * 7);
      case 'months':
        return addMonths(now, amount);
      case 'years':
        return addYears(now, amount);
      default:
        return now;
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Por favor selecciona un método de pago');
      return;
    }

    if (!dbPackageId) {
      Alert.alert('Error', 'No se pudo cargar la información del paquete');
      return;
    }

    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión para continuar');
        return;
      }

      // Procesar según el método de pago
      if (selectedMethod === 'credits') {
        // Usar créditos para el pago
        const creditsUsed = await useCreditsForAppointment(
          user.id,
          '', // Se actualizará con el ID del paquete creado
          selectedPackage.price
        );
        
        if (!creditsUsed) {
          Alert.alert('Error', 'No se pudieron aplicar los créditos');
          return;
        }
      } else if (selectedMethod === 'test_payment') {
        // Simular procesamiento de pago de prueba
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // Simular procesamiento de otros métodos de pago
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Crear el paquete para el usuario
      const expiryDate = calculateExpiryDate();
      
      // Usar la tabla antigua que existe en la base de datos
      const { data: newPackage, error: packageError } = await supabase
        .from('breathe_move_packages')
        .insert({
          user_id: user.id,
          package_type: selectedPackage.name,
          classes_included: selectedPackage.classes === 'unlimited' ? 999 : selectedPackage.classes,
          classes_remaining: selectedPackage.classes === 'unlimited' ? 999 : selectedPackage.classes,
          expires_at: expiryDate.toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (packageError) throw packageError;

      // Registrar el pago
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: selectedPackage.price,
          payment_method: selectedMethod,
          status: selectedMethod === 'test_payment' ? 'test_completed' : selectedMethod === 'credits' ? 'completed' : 'completed',
          payment_status: selectedMethod === 'test_payment' ? 'test_paid' : selectedMethod === 'credits' ? 'paid_with_credits' : 'paid',
          description: `Paquete ${selectedPackage.name} - Breathe & Move`,
          metadata: {
            type: 'breathe_move_package',
            package_id: newPackage.id,
            package_type: selectedPackage.id,
            classes_included: selectedPackage.classes
          }
        });

      if (paymentError) throw paymentError;

      // Enviar notificación o email de confirmación
      Alert.alert(
        selectedMethod === 'test_payment' ? '¡Compra de prueba exitosa!' : 
        selectedMethod === 'credits' ? '¡Pago con créditos exitoso!' : '¡Compra exitosa!',
        selectedMethod === 'test_payment' 
          ? `Has adquirido el paquete "${selectedPackage.name}" con ${getClassesText(selectedPackage.classes)} en modo prueba.`
          : selectedMethod === 'credits'
          ? `Has usado ${formatPrice(selectedPackage.price)} en créditos para adquirir el paquete "${selectedPackage.name}" con ${getClassesText(selectedPackage.classes)}.`
          : `Has adquirido el paquete "${selectedPackage.name}" con ${getClassesText(selectedPackage.classes)}.`,
        [
          {
            text: 'Ver mis paquetes',
            onPress: () => {
              navigation.reset({
                index: 1,
                routes: [
                  { name: 'MainTabs' },
                  { name: 'Profile' }
                ],
              });
            }
          },
          {
            text: 'Reservar clase',
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
      Alert.alert('Error', 'No se pudo procesar el pago. Por favor intenta nuevamente.');
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
            <View style={styles.packageHeader}>
              {selectedPackage.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>MÁS POPULAR</Text>
                </View>
              )}
              {selectedPackage.special && (
                <View style={styles.specialBadge}>
                  <MaterialCommunityIcons name="sale" size={16} color="#FFFFFF" />
                  <Text style={styles.specialText}>OFERTA</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.packageName}>{selectedPackage.name}</Text>
            <Text style={styles.packageDescription}>{getClassesText(selectedPackage.classes)}</Text>
            
            <View style={styles.packageDetails}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="calendar-clock" size={16} color={Colors.text.secondary} />
                <Text style={styles.detailText}>Vigencia: {getValidityText(selectedPackage.validity)}</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="information" size={16} color={Colors.text.secondary} />
                <Text style={styles.detailText}>Una clase por día máximo</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="clock-alert" size={16} color={Colors.text.secondary} />
                <Text style={styles.detailText}>Cancela con 2+ horas de anticipación</Text>
              </View>
            </View>

            <View style={styles.pricingRow}>
              {selectedPackage.originalPrice && (
                <Text style={styles.originalPrice}>{formatPrice(selectedPackage.originalPrice)}</Text>
              )}
              <Text style={styles.priceAmount}>{formatPrice(selectedPackage.price)}</Text>
            </View>
          </View>

          {selectedPackage.description && (
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{selectedPackage.description}</Text>
            </View>
          )}
        </View>

        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Selecciona método de pago</Text>
          {loadingBalance ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary.dark} />
              <Text style={styles.loadingText}>Cargando métodos de pago...</Text>
            </View>
          ) : (
            getPaymentMethods(creditBalance, selectedPackage.price).map(renderPaymentMethod)
          )}
        </View>

        <View style={styles.termsSection}>
          <View style={styles.termsItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary.green} />
            <Text style={styles.termsText}>
              Al comprar aceptas los términos y condiciones
            </Text>
          </View>
          <View style={styles.termsItem}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.primary.green} />
            <Text style={styles.termsText}>
              Tu pago es 100% seguro y encriptado
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
                  Pagar {formatPrice(selectedPackage.price)}
                </Text>
                <MaterialCommunityIcons name="lock" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
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
    position: 'relative',
  },
  packageHeader: {
    position: 'absolute',
    top: -12,
    right: 16,
  },
  popularBadge: {
    backgroundColor: Colors.primary.dark,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  specialBadge: {
    backgroundColor: Colors.primary.green,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  specialText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  packageName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  packageDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.border,
  },
  originalPrice: {
    fontSize: 20,
    color: Colors.text.light,
    textDecorationLine: 'line-through',
    marginRight: 12,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  descriptionCard: {
    backgroundColor: Colors.ui.success + '20',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.primary.green,
    fontStyle: 'italic',
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
    gap: 12,
  },
  termsItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 12,
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
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.text.secondary,
  },
});