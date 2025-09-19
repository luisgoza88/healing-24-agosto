import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { logger, withLogging } from '../utils/logger';

// Configuración de PayU para Colombia
const PAYU_CONFIG = {
  merchantId: process.env.EXPO_PUBLIC_PAYU_MERCHANT_ID || '',
  accountId: process.env.EXPO_PUBLIC_PAYU_ACCOUNT_ID || '',
  apiKey: process.env.EXPO_PUBLIC_PAYU_API_KEY || '',
  apiLogin: process.env.EXPO_PUBLIC_PAYU_API_LOGIN || '',
  publicKey: process.env.EXPO_PUBLIC_PAYU_PUBLIC_KEY || '',
  test: process.env.EXPO_PUBLIC_PAYU_TEST === 'true',
  baseUrl: process.env.EXPO_PUBLIC_PAYU_TEST === 'true' 
    ? 'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu-latam/app'
    : 'https://checkout.payulatam.com/ppp-web-gateway-payu-latam/app',
  apiUrl: process.env.EXPO_PUBLIC_PAYU_TEST === 'true'
    ? 'https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi'
    : 'https://api.payulatam.com/payments-api/4.0/service.cgi'
};

// Verificar configuración
if (!PAYU_CONFIG.merchantId || !PAYU_CONFIG.apiKey) {
  logger.warn('PayU configuration incomplete', 'PaymentService', {
    hasMerchantId: !!PAYU_CONFIG.merchantId,
    hasApiKey: !!PAYU_CONFIG.apiKey,
    isTest: PAYU_CONFIG.test
  });
}

export interface PaymentData {
  appointmentId: string;
  amount: number;
  description: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  userDocument?: string;
  transactionId?: string;
  paymentMethod?: string;
}

export interface PaymentMethod {
  type: 'credit_card' | 'pse' | 'cash';
  brand?: string;
  lastFour?: string;
}

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  reference?: string;
  status: 'pending' | 'approved' | 'rejected' | 'error';
  message: string;
  paymentUrl?: string;
}

class PaymentService {
  // Generar referencia única para la transacción
  generateReference(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `HF_${timestamp}_${random}`;
  }

  // Generar firma MD5 para PayU
  async generateSignature(reference: string, amount: number, currency: string = 'COP'): Promise<string> {
    const { apiKey, merchantId } = PAYU_CONFIG;
    const formattedAmount = amount.toFixed(2);
    const signatureString = `${apiKey}~${merchantId}~${reference}~${formattedAmount}~${currency}`;
    
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.MD5,
      signatureString
    );
    
    return digest;
  }

  // Crear URL de pago para PayU Webcheckout
  async createPaymentUrl(paymentData: PaymentData): Promise<TransactionResult> {
    return withLogging(
      'createPaymentUrl',
      'PaymentService',
      async () => {
    try {
      logger.info('Creating payment URL', 'PaymentService', {
        appointmentId: paymentData.appointmentId,
        amount: paymentData.amount
      });
      const reference = this.generateReference();
      const signature = await this.generateSignature(reference, paymentData.amount);
      
      // Guardar transacción en Supabase
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          appointment_id: paymentData.appointmentId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          amount: paymentData.amount,
          payment_method: 'pending',
          payment_provider: 'payu',
          provider_reference: reference,
          status: 'pending',
          metadata: {
            description: paymentData.description,
            userName: paymentData.userName,
            userEmail: paymentData.userEmail
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Construir URL con parámetros
      const params = new URLSearchParams({
        merchantId: PAYU_CONFIG.merchantId,
        accountId: PAYU_CONFIG.accountId,
        description: paymentData.description,
        referenceCode: reference,
        amount: paymentData.amount.toString(),
        tax: '0',
        taxReturnBase: '0',
        currency: 'COP',
        signature: signature,
        test: PAYU_CONFIG.test ? '1' : '0',
        buyerEmail: paymentData.userEmail,
        buyerFullName: paymentData.userName,
        responseUrl: Linking.createURL('payment-response'),
        confirmationUrl: `${process.env.EXPO_PUBLIC_API_URL}/webhooks/payu`
      });

      if (paymentData.userPhone) {
        params.append('telephone', paymentData.userPhone);
      }

      const paymentUrl = `${PAYU_CONFIG.baseUrl}?${params.toString()}`;

      return {
        success: true,
        transactionId: transaction.id,
        reference: reference,
        status: 'pending',
        message: 'URL de pago generada exitosamente',
        paymentUrl
      };
    } catch (error) {
      logger.error('Error creating payment URL', 'PaymentService', error as Error);
      return {
        success: false,
        status: 'error',
        message: 'Error al generar el enlace de pago'
      };
    }
    });
  }

  // Procesar respuesta de PayU
  async processPaymentResponse(params: any): Promise<TransactionResult> {
    try {
      const {
        referenceCode,
        TX_VALUE,
        currency,
        transactionState,
        signature,
        reference_pol,
        transactionId,
        description,
        lapResponseCode,
        message
      } = params;

      // Verificar firma
      const expectedSignature = await this.generateSignature(
        referenceCode,
        parseFloat(TX_VALUE),
        currency
      );

      if (signature !== expectedSignature) {
        logger.error('Invalid payment signature', 'PaymentService', undefined, {
          received: signature,
          expected: expectedSignature,
          reference: referenceCode
        });
        return {
          success: false,
          status: 'error',
          message: 'Firma de seguridad inválida'
        };
      }

      // Mapear estado de transacción
      let status: 'approved' | 'rejected' | 'pending' | 'error' = 'pending';
      if (transactionState === '4') status = 'approved';
      else if (transactionState === '6') status = 'rejected';
      else if (transactionState === '104') status = 'error';

      // Actualizar transacción en Supabase
      const { error } = await supabase
        .from('transactions')
        .update({
          status,
          response_code: lapResponseCode,
          response_message: message,
          metadata: {
            reference_pol,
            transactionId,
            description
          }
        })
        .eq('provider_reference', referenceCode);

      if (error) throw error;

      return {
        success: status === 'approved',
        transactionId,
        reference: referenceCode,
        status,
        message: message || 'Transacción procesada'
      };
    } catch (error) {
      logger.error('Error processing payment response', 'PaymentService', error as Error);
      return {
        success: false,
        status: 'error',
        message: 'Error al procesar la respuesta del pago'
      };
    }
  }

  // Iniciar pago con PSE
  async initiatePSEPayment(paymentData: PaymentData, bankCode: string): Promise<TransactionResult> {
    try {
      const reference = this.generateReference();
      
      // Guardar transacción inicial
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          appointment_id: paymentData.appointmentId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          amount: paymentData.amount,
          payment_method: 'pse',
          payment_provider: 'payu',
          provider_reference: reference,
          status: 'pending',
          metadata: {
            description: paymentData.description,
            bankCode
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Para PSE, también usamos el webcheckout pero con parámetros adicionales
      const signature = await this.generateSignature(reference, paymentData.amount);
      
      const params = new URLSearchParams({
        merchantId: PAYU_CONFIG.merchantId,
        accountId: PAYU_CONFIG.accountId,
        description: paymentData.description,
        referenceCode: reference,
        amount: paymentData.amount.toString(),
        tax: '0',
        taxReturnBase: '0',
        currency: 'COP',
        signature: signature,
        test: PAYU_CONFIG.test ? '1' : '0',
        buyerEmail: paymentData.userEmail,
        buyerFullName: paymentData.userName,
        paymentMethod: 'PSE',
        pseBankCode: bankCode,
        responseUrl: Linking.createURL('payment-response'),
        confirmationUrl: `${process.env.EXPO_PUBLIC_API_URL}/webhooks/payu`
      });

      const paymentUrl = `${PAYU_CONFIG.baseUrl}?${params.toString()}`;

      return {
        success: true,
        transactionId: transaction.id,
        reference: reference,
        status: 'pending',
        message: 'Redirigiendo a PSE',
        paymentUrl
      };
    } catch (error) {
      logger.error('Error initiating PSE payment', 'PaymentService', error as Error);
      return {
        success: false,
        status: 'error',
        message: 'Error al iniciar pago con PSE'
      };
    }
  }

  // Obtener lista de bancos PSE
  async getPSEBanks(): Promise<Array<{ code: string; name: string }>> {
    // En producción, esto debería venir de la API de PayU
    // Por ahora retornamos una lista estática de bancos colombianos
    return [
      { code: '1007', name: 'Bancolombia' },
      { code: '1032', name: 'Banco Caja Social' },
      { code: '1019', name: 'BANCO COLPATRIA' },
      { code: '1040', name: 'Banco Agrario' },
      { code: '1052', name: 'Banco AV Villas' },
      { code: '1001', name: 'Banco Bogotá' },
      { code: '1023', name: 'Banco Davivienda' },
      { code: '1062', name: 'Banco Falabella' },
      { code: '1012', name: 'Banco GNB Sudameris' },
      { code: '1006', name: 'Banco Itaú' },
      { code: '1002', name: 'Banco Popular' },
      { code: '1058', name: 'Banco Procredit' },
      { code: '1005', name: 'Banco Santander' },
      { code: '1022', name: 'Banco Unión antes Giros' },
      { code: '1013', name: 'Banco BBVA' },
      { code: '1009', name: 'Citibank' },
      { code: '1014', name: 'Helm Bank' },
      { code: '1010', name: 'HSBC' },
      { code: '1065', name: 'Banco Coomeva' },
      { code: '1024', name: 'Banco de Occidente' },
      { code: '1121', name: 'Banco Serfinanza' },
      { code: '1059', name: 'Bancamía' },
      { code: '1060', name: 'Banco Pichincha' },
      { code: '1063', name: 'Banco W' },
      { code: '1066', name: 'Banco Cooperativo Coopcentral' },
      { code: '1051', name: 'Banco Corpbanca' }
    ].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Abrir URL de pago en el navegador
  async openPaymentUrl(url: string): Promise<void> {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      throw new Error('No se puede abrir el enlace de pago');
    }
  }
}

export const paymentService = new PaymentService();