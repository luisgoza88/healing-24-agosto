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
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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

      // Debug: verificar los datos antes de insertar
      console.log('Datos a insertar:', {
        service: currentService,
        professional: bookingData.professional,
        subService: selectedSubService,
        date: bookingData.date,
        time: bookingData.time
      });

      // Crear la cita en Supabase
      // Combinar fecha y hora en un solo timestamp
      const appointmentDateTime = new Date(`${bookingData.date}T${bookingData.time}:00`);
      
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          service_id: currentService.id,
          professional_id: bookingData.professional.id,
          appointment_date: bookingData.date,
          appointment_time: bookingData.time + ':00',
          end_time: new Date(appointmentDateTime.getTime() + selectedSubService.duration * 60000).toTimeString().slice(0, 8),
          duration: selectedSubService.duration,
          status: 'pending',
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
      <View style={styles.topHeader}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>HF</Text>
        </View>
        <Text style={styles.brandName}>Healing{'\n'}Forest</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.langButton}>
            <Text style={styles.langText}>ES</Text>
            <Ionicons name="globe-outline" size={20} color={Colors.primary.dark} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.primary.dark} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>¡Hola Luis!</Text>
          <Text style={styles.subtitle}>Tu bienestar es nuestra prioridad</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Appointments')}
            >
              <Ionicons name="calendar" size={24} color={Colors.secondary.green} />
              <Text style={styles.quickActionText}>Citas</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Messages')}
            >
              <Ionicons name="chatbubble" size={24} color={Colors.secondary.green} />
              <Text style={styles.quickActionText}>Mensajes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Breathe & Move Section */}
        <TouchableOpacity 
          style={styles.breatheAndMoveSection}
          onPress={() => navigation.navigate('BreatheAndMove')}
          activeOpacity={0.9}
        >
          <View style={styles.breatheAndMoveContent}>
            <Text style={styles.breatheAndMoveBrand}>Breathe & Move</Text>
            <TouchableOpacity 
              style={styles.breatheAndMoveButton}
              onPress={() => navigation.navigate('BreatheAndMove')}
            >
              <Text style={styles.breatheAndMoveButtonText}>Ver Clases</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nuestros Servicios</Text>
          <ServiceGrid 
            services={SERVICES} 
            onServicePress={handleServicePress}
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.ui.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.secondary.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    lineHeight: 24,
    flex: 1,
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  langText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary.dark,
  },
  welcomeSection: {
    backgroundColor: Colors.primary.dark,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.text.inverse,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.inverse,
    opacity: 0.8,
    marginBottom: 24,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: Colors.ui.background,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  section: {
    marginBottom: 32,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
    paddingHorizontal: 24,
    letterSpacing: -0.3,
  },
  classCard: {
    width: 180,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  classIconContainer: {
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
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  breatheAndMoveSection: {
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 16,
    backgroundColor: Colors.primary.dark,
    borderRadius: 16,
    height: 140,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  breatheAndMoveContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  breatheAndMoveBrand: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  breatheAndMoveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  breatheAndMoveButtonText: {
    color: Colors.primary.dark,
    fontSize: 14,
    fontWeight: '600',
  },
});