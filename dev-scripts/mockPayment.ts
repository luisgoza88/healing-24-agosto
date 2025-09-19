// Sistema de pagos simulado para desarrollo y pruebas
export interface MockPaymentConfig {
  // Simular diferentes escenarios
  simulateFailure?: boolean;
  failureReason?: 'insufficient_funds' | 'card_declined' | 'network_error' | 'timeout';
  delayMs?: number; // Simular latencia de red
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  timestamp?: string;
}

// Generar ID de transacción simulado
const generateTransactionId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `MOCK_${timestamp}_${random}`.toUpperCase();
};

// Simular procesamiento de pago
export const processMockPayment = async (
  amount: number,
  method: string,
  config?: MockPaymentConfig
): Promise<PaymentResult> => {
  // Simular delay de red
  const delay = config?.delayMs || Math.random() * 2000 + 1000; // 1-3 segundos
  await new Promise(resolve => setTimeout(resolve, delay));

  // Si se configuró para fallar
  if (config?.simulateFailure) {
    const errorMessages: Record<string, string> = {
      insufficient_funds: 'Fondos insuficientes en la cuenta',
      card_declined: 'Tarjeta rechazada por el banco',
      network_error: 'Error de conexión. Intenta nuevamente',
      timeout: 'El pago tardó demasiado tiempo. Por favor intenta de nuevo'
    };

    return {
      success: false,
      error: errorMessages[config.failureReason || 'network_error'],
      timestamp: new Date().toISOString()
    };
  }

  // Simular éxito
  return {
    success: true,
    transactionId: generateTransactionId(),
    timestamp: new Date().toISOString()
  };
};

// Verificar estado de transacción (simulado)
export const checkTransactionStatus = async (transactionId: string): Promise<'pending' | 'completed' | 'failed'> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Para transacciones mock, siempre retornar completed
  if (transactionId.startsWith('MOCK_')) {
    return 'completed';
  }
  
  return 'pending';
};

// Simular reembolso
export const processMockRefund = async (transactionId: string, amount: number): Promise<PaymentResult> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    success: true,
    transactionId: `REFUND_${transactionId}`,
    timestamp: new Date().toISOString()
  };
};