'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  CreditCard, 
  Wallet, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { getUserCreditBalance, useCreditsForAppointment } from '@/utils/creditsManager';

interface PaymentMethod {
  id: string;
  name: string;
  icon: any;
  description: string;
  disabled?: boolean;
}

interface BookingDetails {
  type: 'class' | 'service';
  id: string;
  name?: string;
  instructor?: string;
  date?: string;
  time?: string;
  duration?: number;
  price?: number;
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [creditBalance, setCreditBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);

  const type = searchParams.get('type');
  const id = searchParams.get('id');

  useEffect(() => {
    if (!type || !id) {
      router.push('/');
      return;
    }
    
    loadBookingDetails();
    loadCreditBalance();
  }, [type, id]);

  const loadCreditBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const balance = await getUserCreditBalance(user.id);
      setCreditBalance(balance);
    } catch (error) {
      console.error('Error loading credit balance:', error);
      setCreditBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadBookingDetails = async () => {
    try {
      if (type === 'class') {
        // Cargar detalles de la clase
        const { data: classData } = await supabase
          .from('breathe_move_classes')
          .select(`
            *,
            class_type:breathe_move_class_types(name),
            instructor:profiles(full_name)
          `)
          .eq('id', id)
          .single();

        if (classData) {
          setBookingDetails({
            type: 'class',
            id: classData.id,
            name: classData.class_type?.name || 'Clase',
            instructor: classData.instructor?.full_name || 'Instructor',
            date: classData.class_date,
            time: classData.start_time,
            duration: 60,
            price: 65000 // Precio fijo para clases individuales
          });
        }
      } else if (type === 'service') {
        // Cargar detalles del servicio médico
        const { data: serviceData } = await supabase
          .from('services')
          .select('*')
          .eq('id', id)
          .single();

        if (serviceData) {
          setBookingDetails({
            type: 'service',
            id: serviceData.id,
            name: serviceData.name,
            price: serviceData.base_price || 100000 // Precio base
          });
        }
      }
    } catch (error) {
      console.error('Error loading booking details:', error);
    }
  };

  const getPaymentMethods = (): PaymentMethod[] => {
    const methods: PaymentMethod[] = [];
    
    // Agregar opción de créditos solo si hay balance suficiente
    if (creditBalance >= (bookingDetails?.price || 0)) {
      methods.push({
        id: 'credits',
        name: 'Mis Créditos',
        icon: Wallet,
        description: `Usar créditos disponibles ($${creditBalance.toLocaleString('es-CO')} COP)`
      });
    }

    // Otros métodos de pago
    methods.push(
      {
        id: 'credit_card',
        name: 'Tarjeta de Crédito/Débito',
        icon: CreditCard,
        description: 'Visa, Mastercard, American Express'
      }
    );

    return methods;
  };

  const handlePayment = async () => {
    if (!selectedMethod || !bookingDetails) return;

    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Debes iniciar sesión para continuar');
        return;
      }

      if (selectedMethod === 'credits') {
        // Procesar pago con créditos
        const success = await useCreditsForAppointment(
          user.id, 
          bookingDetails.id, 
          bookingDetails.price || 0
        );

        if (!success) {
          alert('No se pudieron usar los créditos. Verifica tu saldo.');
          return;
        }

        // Actualizar estado de la reserva
        if (bookingDetails.type === 'class') {
          await supabase
            .from('breathe_move_enrollments')
            .update({ 
              payment_status: 'paid',
              payment_method: 'credits',
              paid_at: new Date().toISOString()
            })
            .eq('class_id', bookingDetails.id)
            .eq('user_id', user.id);
        }

        alert('¡Pago exitoso! Tu reserva ha sido confirmada usando créditos.');
        router.push('/appointments');
      } else {
        // Para otros métodos de pago (implementar más tarde)
        alert('Este método de pago aún no está implementado');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error al procesar el pago. Intenta nuevamente.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-CO')} COP`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!bookingDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          <span className="text-gray-600">Cargando detalles...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Resumen de la reserva */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Resumen de tu reserva
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">{bookingDetails.name}</h3>
                  {bookingDetails.instructor && (
                    <p className="text-gray-600 text-sm mt-1">
                      Con {bookingDetails.instructor}
                    </p>
                  )}
                </div>

                {bookingDetails.date && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">{formatDate(bookingDetails.date)}</span>
                  </div>
                )}

                {bookingDetails.time && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {bookingDetails.time}
                      {bookingDetails.duration && ` (${bookingDetails.duration} min)`}
                    </span>
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(bookingDetails.price || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Métodos de pago */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Método de pago
              </h2>

              {loadingBalance ? (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                  <span className="text-gray-600">Cargando métodos de pago...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {getPaymentMethods().map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedMethod === method.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${method.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        value={method.id}
                        checked={selectedMethod === method.id}
                        onChange={(e) => setSelectedMethod(e.target.value)}
                        disabled={method.disabled}
                        className="sr-only"
                      />
                      
                      <div className="flex items-center gap-3 flex-1">
                        <method.icon className={`h-6 w-6 ${
                          selectedMethod === method.id ? 'text-green-600' : 'text-gray-400'
                        }`} />
                        
                        <div>
                          <p className={`font-medium ${
                            selectedMethod === method.id ? 'text-green-900' : 'text-gray-900'
                          }`}>
                            {method.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {method.description}
                          </p>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedMethod === method.id
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedMethod === method.id && (
                          <CheckCircle className="h-3 w-3 text-white fill-current" />
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar de pago */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Total a pagar
              </h3>
              
              <div className="space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">
                    {formatCurrency(bookingDetails.price || 0)}
                  </span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(bookingDetails.price || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={!selectedMethod || processing}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  selectedMethod && !processing
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {processing ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Procesando...
                  </div>
                ) : (
                  'Confirmar pago'
                )}
              </button>

              <p className="text-xs text-gray-500 mt-4 text-center">
                Al confirmar el pago aceptas nuestros términos y condiciones
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}