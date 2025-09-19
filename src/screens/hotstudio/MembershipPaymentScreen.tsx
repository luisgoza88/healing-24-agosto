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
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { getUserCreditBalance, useCreditsForAppointment } from '../../utils/creditsManager';

interface MembershipPaymentScreenProps {
  route: {
    params: {
      membership: {
        id: string;
        name: string;
        description: string;
        type: string;
        class_count: number | null;
        duration_days: number;
        price: number;
      };
      userMembershipId: string;
    };
  };
  navigation: any;
}

export const MembershipPaymentScreen: React.FC<MembershipPaymentScreenProps> = ({ route, navigation }) => {
  const { membership, userMembershipId } = route.params;
  const [selectedMethod, setSelectedMethod] = useState<'test_payment' | 'credit_card' | 'pse' | 'credits' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    loadCreditBalance();
  }, []);

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

  const getPaymentMethods = (creditBalance: number, totalAmount: number) => {
    const methods = [];
    
    // Solo mostrar créditos si hay balance suficiente
    if (creditBalance >= totalAmount) {
      methods.push({
        id: 'credits',
        name: 'Pagar con créditos',
        description: `Usar tus créditos ($${creditBalance.toLocaleString('es-CO')} disponibles)`,
        icon: '🎁',
        brands: [`Balance disponible: $${creditBalance.toLocaleString('es-CO')}`]
      });
    }
    
    methods.push(
    {
      id: 'test_payment',
      name: 'Pago de Prueba',
      description: 'Simula el pago para pruebas (temporal)',
      icon: '🧪',
      brands: ['Modo desarrollo - No se cobra']
    },
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
    });
    
    return methods;
  };

  const paymentMethods = getPaymentMethods(creditBalance, membership.price);

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Por favor selecciona un método de pago');
      return;
    }

    setProcessing(true);

    try {
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
          userMembershipId,
          membership.price
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

      // Actualizar el estado de pago de la membresía
      const { error } = await supabase
        .from('user_memberships')
        .update({ 
          payment_status: selectedMethod === 'test_payment' ? 'test_paid' : selectedMethod === 'credits' ? 'paid_with_credits' : 'paid',
          payment_method: selectedMethod
        })
        .eq('id', userMembershipId);

      if (error) throw error;

      Alert.alert(
        selectedMethod === 'test_payment' ? '¡Pago de prueba exitoso!' : 
        selectedMethod === 'credits' ? '¡Pago con créditos exitoso!' : '¡Pago exitoso!',
        selectedMethod === 'test_payment' 
          ? `Tu membresía ${membership.name} ha sido activada en modo prueba.`
          : selectedMethod === 'credits'
          ? `Has usado $${membership.price.toLocaleString('es-CO')} en créditos para activar tu membresía ${membership.name}.`
          : `Tu membresía ${membership.name} ha sido activada.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navegar de vuelta al Hot Studio
              navigation.navigate('MainTabs', { screen: 'HotStudio' });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'No se pudo procesar el pago');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Completar pago</Text>
          
          {/* Resumen de la membresía */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen de tu membresía</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Membresía:</Text>
              <Text style={styles.summaryValue}>{membership.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duración:</Text>
              <Text style={styles.summaryValue}>{membership.duration_days} días</Text>
            </View>
            {membership.class_count && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Clases incluidas:</Text>
                <Text style={styles.summaryValue}>{membership.class_count}</Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total a pagar:</Text>
              <Text style={styles.totalValue}>
                ${membership.price.toLocaleString('es-CO')} COP
              </Text>
            </View>
          </View>

          {/* Métodos de pago */}
          <Text style={styles.sectionTitle}>Método de pago</Text>
          <View style={styles.methodsContainer}>
            {loadingBalance ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary.green} />
                <Text style={styles.loadingText}>Cargando métodos de pago...</Text>
              </View>
            ) : (
              paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodCard,
                  selectedMethod === method.id && styles.methodCardSelected
                ]}
                onPress={() => setSelectedMethod(method.id as 'test_payment' | 'credit_card' | 'pse' | 'credits')}
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
              ))
            )}
          </View>

          {/* Información de seguridad */}
          <View style={styles.securityInfo}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityText}>
              Todos los pagos son procesados de forma segura a través de PayU Latam
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Botón de pago */}
      <View style={styles.bottomContainer}>
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
            <Text style={styles.payButtonText}>
              Pagar ${membership.price.toLocaleString('es-CO')} COP
            </Text>
          )}
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
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: Colors.primary.beige + '30',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  summaryValue: {
    fontSize: 16,
    color: Colors.primary.dark,
    fontWeight: '500',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.ui.divider,
    marginVertical: 16,
  },
  totalLabel: {
    fontSize: 18,
    color: Colors.primary.dark,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 24,
    color: Colors.primary.dark,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
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
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.ui.background,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.divider,
  },
  payButton: {
    backgroundColor: Colors.primary.green,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: Colors.text.light,
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