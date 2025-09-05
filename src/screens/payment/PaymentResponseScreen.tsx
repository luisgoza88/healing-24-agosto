import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { paymentService } from '../../services/paymentService';
import { Button } from '../../components/Button';

export const PaymentResponseScreen = ({ navigation }: any) => {
  const route = useRoute();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    processPaymentResponse();
  }, []);

  const processPaymentResponse = async () => {
    try {
      const params = route.params || {};
      const result = await paymentService.processPaymentResponse(params);
      setResult(result);
    } catch (error) {
      console.error('Error processing payment:', error);
      setResult({
        success: false,
        status: 'error',
        message: 'Error al procesar el pago'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigation.navigate('Home');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.green} />
          <Text style={styles.loadingText}>Procesando tu pago...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSuccess = result?.status === 'approved';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>
            {isSuccess ? '✅' : '❌'}
          </Text>
        </View>

        <Text style={styles.title}>
          {isSuccess ? '¡Pago exitoso!' : 'Pago no completado'}
        </Text>

        <Text style={styles.message}>
          {result?.message || 'Tu transacción ha sido procesada'}
        </Text>

        {result?.transactionId && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>ID de transacción</Text>
            <Text style={styles.infoValue}>{result.transactionId}</Text>
          </View>
        )}

        {result?.reference && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Referencia</Text>
            <Text style={styles.infoValue}>{result.reference}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button
            title={isSuccess ? 'Ir al inicio' : 'Intentar nuevamente'}
            onPress={handleContinue}
            color={isSuccess ? Colors.primary.green : Colors.ui.error}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: Colors.ui.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 32,
    width: '100%',
  },
});