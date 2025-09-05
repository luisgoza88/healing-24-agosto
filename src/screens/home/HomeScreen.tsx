import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { SERVICES, HOT_STUDIO_CLASSES } from '../../constants/services';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { ServiceGrid } from '../../components/ServiceGrid';
import { useNotifications } from '../../hooks/useNotifications';
import { ServiceDetailScreen } from '../services/ServiceDetailScreen';
import { BookingCalendarScreen } from '../booking/BookingCalendarScreen';
import { SelectProfessionalScreen } from '../booking/SelectProfessionalScreen';
import { BookingConfirmationScreen } from '../booking/BookingConfirmationScreen';
import { PaymentMethodScreen } from '../payment/PaymentMethodScreen';

const { width } = Dimensions.get('window');

export const HomeScreen = ({ navigation }: any) => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const { unreadCount, scheduleAppointmentNotifications, scheduleClassNotifications } = useNotifications();
  const [selectedSubService, setSelectedSubService] = useState<any>(null);
  const [currentService, setCurrentService] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>({
    date: '',
    time: '',
    professional: null
  });
  const [currentStep, setCurrentStep] = useState<'services' | 'calendar' | 'professional' | 'confirmation' | 'payment'>('services');
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleServicePress = (service: any) => {
    setSelectedService(service.id);
  };

  const handleSubServicePress = (service: any, subService: any) => {
    setCurrentService(service);
    setSelectedSubService(subService);
    setCurrentStep('calendar');
  };

  const handleDateTimeSelected = (date: string, time: string) => {
    setBookingData({ ...bookingData, date, time });
    setCurrentStep('professional');
  };

  const handleProfessionalSelected = (professional: any) => {
    setBookingData({ ...bookingData, professional });
    setCurrentStep('confirmation');
  };

  const handleConfirmBooking = async () => {
    try {
      // Guardar la cita en Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión para continuar');
        return;
      }

      // Crear la cita en Supabase
      // Combinar fecha y hora en un solo timestamp
      const appointmentDateTime = new Date(`${bookingData.date}T${bookingData.time}:00`);
      
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          service_id: currentService.id,
          professional_id: bookingData.professional.id,
          appointment_date: appointmentDateTime.toISOString(),
          status: 'pending_payment',
          total_amount: selectedSubService.price,
          notes: `${currentService.name} - ${selectedSubService.name} - ${selectedSubService.duration} min`
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating appointment:', error);
        Alert.alert('Error', 'No se pudo crear la cita. Por favor intenta nuevamente.');
        return;
      }

      // Guardar el ID de la cita y continuar al pago
      setAppointmentId(appointment.id);
      setCurrentStep('payment');
      
      // Programar notificaciones para la cita
      await scheduleAppointmentNotifications(
        appointment.id,
        `${currentService.name} - ${selectedSubService.name}`,
        appointmentDateTime
      );
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error al procesar tu solicitud');
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'calendar':
        setSelectedSubService(null);
        setCurrentStep('services');
        break;
      case 'professional':
        setCurrentStep('calendar');
        break;
      case 'confirmation':
        setCurrentStep('professional');
        break;
      case 'payment':
        setCurrentStep('confirmation');
        break;
    }
  };

  const handlePaymentSuccess = () => {
    Alert.alert(
      '¡Pago exitoso!',
      'Tu cita ha sido confirmada. Recibirás un correo con los detalles.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Resetear todo
            setSelectedService(null);
            setSelectedSubService(null);
            setCurrentService(null);
            setBookingData({ date: '', time: '', professional: null });
            setCurrentStep('services');
            setAppointmentId(null);
          }
        }
      ]
    );
  };

  // Renderizar según el paso actual del flujo de reserva
  if (currentStep === 'calendar' && selectedSubService && currentService) {
    return (
      <BookingCalendarScreen
        service={currentService}
        subService={selectedSubService}
        onBack={handleBack}
        onNext={handleDateTimeSelected}
      />
    );
  }

  if (currentStep === 'professional' && selectedSubService && currentService) {
    return (
      <SelectProfessionalScreen
        service={currentService}
        subService={selectedSubService}
        date={bookingData.date}
        time={bookingData.time}
        onBack={handleBack}
        onNext={handleProfessionalSelected}
      />
    );
  }

  if (currentStep === 'confirmation' && selectedSubService && currentService && bookingData.professional) {
    return (
      <BookingConfirmationScreen
        service={currentService}
        subService={selectedSubService}
        date={bookingData.date}
        time={bookingData.time}
        professional={bookingData.professional}
        onBack={handleBack}
        onConfirm={handleConfirmBooking}
      />
    );
  }

  if (currentStep === 'payment' && selectedSubService && currentService && appointmentId) {
    return (
      <PaymentMethodScreen
        service={currentService}
        subService={selectedSubService}
        date={bookingData.date}
        time={bookingData.time}
        professional={bookingData.professional}
        appointmentId={appointmentId}
        onBack={handleBack}
        onSuccess={handlePaymentSuccess}
      />
    );
  }

  // Si hay un servicio seleccionado, mostrar su detalle
  if (selectedService) {
    return (
      <ServiceDetailScreen
        serviceId={selectedService}
        onBack={() => setSelectedService(null)}
        onSubServicePress={handleSubServicePress}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Hola, Luis Miguel 👋</Text>
              <Text style={styles.subtitle}>¿Qué servicio te gustaría agendar hoy?</Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={styles.notificationIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nuestros Servicios</Text>
          <ServiceGrid 
            services={SERVICES} 
            onServicePress={handleServicePress}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hot Studio</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {HOT_STUDIO_CLASSES.map((clase) => (
              <TouchableOpacity
                key={clase.id}
                style={[styles.classCard, { backgroundColor: clase.color }]}
                activeOpacity={0.8}
              >
                <Text style={styles.classIcon}>
                  {clase.id === 'yoga' ? '🧘‍♀️' : 
                   clase.id === 'pilates' ? '🤸‍♀️' : 
                   clase.id === 'breathwork' ? '🌬️' : '🎵'}
                </Text>
                <Text style={styles.className}>{clase.name}</Text>
                <Text style={styles.classDescription} numberOfLines={2}>
                  {clase.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.logoutContainer}>
          <Button
            title="Cerrar Sesión"
            onPress={handleLogout}
            variant="outline"
            color={Colors.ui.error}
          />
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
    padding: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  classCard: {
    width: 180,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  classIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  classDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  logoutContainer: {
    padding: 24,
    marginTop: 16,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.ui.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.ui.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});