import { paymentService } from '../../src/services/paymentService';
import { supabase } from '../../src/lib/supabase';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';

jest.mock('../../src/lib/supabase');
jest.mock('expo-crypto');
jest.mock('expo-linking');

describe('Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_PAYU_MERCHANT_ID = '508029';
    process.env.EXPO_PUBLIC_PAYU_API_KEY = 'test-api-key';
    process.env.EXPO_PUBLIC_PAYU_TEST = 'true';
  });
  
  describe('generateReference', () => {
    it('should generate unique reference with HF prefix', () => {
      const ref1 = paymentService.generateReference();
      const ref2 = paymentService.generateReference();
      
      expect(ref1).toMatch(/^HF_\d+_\w+$/);
      expect(ref2).toMatch(/^HF_\d+_\w+$/);
      expect(ref1).not.toBe(ref2);
    });
  });
  
  describe('generateSignature', () => {
    it('should generate MD5 signature correctly', async () => {
      const reference = 'HF_123_abc';
      const amount = 100000;
      
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('mocked-signature');
      
      const signature = await paymentService.generateSignature(reference, amount);
      
      expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
        Crypto.CryptoDigestAlgorithm.MD5,
        'test-api-key~508029~HF_123_abc~100000.00~COP'
      );
      expect(signature).toBe('mocked-signature');
    });
  });
  
  describe('createPaymentUrl', () => {
    it('should create payment URL successfully', async () => {
      const mockUser = { id: 'user-123' };
      const mockTransaction = {
        id: 'trans-123',
        provider_reference: 'HF_123_abc'
      };
      
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser }
      });
      
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTransaction, error: null })
      });
      
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('test-signature');
      (Linking.createURL as jest.Mock).mockReturnValue('healing-forest://payment-response');
      
      const paymentData = {
        appointmentId: 'apt-123',
        amount: 100000,
        description: 'Test payment',
        userEmail: 'test@example.com',
        userName: 'Test User'
      };
      
      const result = await paymentService.createPaymentUrl(paymentData);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('pending');
      expect(result.paymentUrl).toContain('sandbox.checkout.payulatam.com');
      expect(result.paymentUrl).toContain('merchantId=508029');
      expect(result.paymentUrl).toContain('amount=100000');
    });
    
    it('should handle errors gracefully', async () => {
      (supabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Auth error'));
      
      const result = await paymentService.createPaymentUrl({
        appointmentId: 'apt-123',
        amount: 100000,
        description: 'Test payment',
        userEmail: 'test@example.com',
        userName: 'Test User'
      });
      
      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.message).toBe('Error al generar el enlace de pago');
    });
  });
  
  describe('processPaymentResponse', () => {
    it('should process approved payment correctly', async () => {
      const params = {
        referenceCode: 'HF_123_abc',
        TX_VALUE: '100000.00',
        currency: 'COP',
        transactionState: '4', // Approved
        signature: 'valid-signature',
        reference_pol: 'pol-123',
        transactionId: 'trans-123',
        message: 'Payment approved'
      };
      
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('valid-signature');
      
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      });
      
      const result = await paymentService.processPaymentResponse(params);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('approved');
      expect(result.message).toBe('Payment approved');
    });
    
    it('should reject payment with invalid signature', async () => {
      const params = {
        referenceCode: 'HF_123_abc',
        TX_VALUE: '100000.00',
        currency: 'COP',
        transactionState: '4',
        signature: 'invalid-signature',
        reference_pol: 'pol-123',
        transactionId: 'trans-123'
      };
      
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('valid-signature');
      
      const result = await paymentService.processPaymentResponse(params);
      
      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.message).toBe('Firma de seguridad inválida');
    });
  });
  
  describe('getPSEBanks', () => {
    it('should return sorted list of Colombian banks', async () => {
      const banks = await paymentService.getPSEBanks();
      
      expect(banks.length).toBeGreaterThan(0);
      expect(banks[0]).toHaveProperty('code');
      expect(banks[0]).toHaveProperty('name');
      
      // Check if sorted alphabetically
      for (let i = 1; i < banks.length; i++) {
        expect(banks[i].name.localeCompare(banks[i-1].name)).toBeGreaterThanOrEqual(0);
      }
    });
  });
  
  describe('openPaymentUrl', () => {
    it('should open payment URL when supported', async () => {
      const url = 'https://payment.example.com';
      
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
      
      await expect(paymentService.openPaymentUrl(url)).resolves.not.toThrow();
      
      expect(Linking.canOpenURL).toHaveBeenCalledWith(url);
      expect(Linking.openURL).toHaveBeenCalledWith(url);
    });
    
    it('should throw error when URL cannot be opened', async () => {
      const url = 'https://payment.example.com';
      
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);
      
      await expect(paymentService.openPaymentUrl(url)).rejects.toThrow('No se puede abrir el enlace de pago');
    });
  });
});