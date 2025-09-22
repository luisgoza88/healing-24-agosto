import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ImageBackground,
  Animated,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../constants/colors';
import { SERVICES } from '../../constants/services';
import { supabase } from '../../lib/supabase';
import { ServiceGrid } from '../../components/ServiceGrid';
import { useNotifications } from '../../hooks/useNotifications';
import { ServiceDetailScreen } from '../services/ServiceDetailScreen';
import { DripsService } from '../../services/dripsService';
import { getRealServiceId } from '../../utils/serviceMapping';
import { scheduleAppointmentNotifications } from '../../utils/notificationScheduler';
import { BookingCalendarScreen } from '../booking/BookingCalendarScreen';
import { SelectProfessionalScreen } from '../booking/SelectProfessionalScreen';
import { BookingConfirmationScreen } from '../booking/BookingConfirmationScreen';
import { PaymentMethodScreen } from '../payment/PaymentMethodScreen';

const { width } = Dimensions.get('window');

import { CAROUSEL_IMAGES, BREATHE_AND_MOVE_IMAGE, preloadImages } from '../../utils/imageCache';
import { CachedImage } from '../../components/CachedImage';

const backgroundImages = CAROUSEL_IMAGES;

export const HomeScreen = ({ navigation }: any) => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const { unreadCount, scheduleAppointmentNotifications } = useNotifications();
  const [selectedSubService, setSelectedSubService] = useState<any>(null);
  const [currentService, setCurrentService] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>({
    date: '',
    time: '',
    professional: null
  });
  const [currentStep, setCurrentStep] = useState<'services' | 'calendar' | 'professional' | 'confirmation' | 'payment'>('services');
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loadingUser, setLoadingUser] = useState(true);
  
  // Estados para el carrusel
  const [images, setImages] = useState([...backgroundImages, backgroundImages[0]]); // Duplicar primera imagen al final
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  // Cargar información del usuario y precargar imágenes
  useEffect(() => {
    loadUserInfo();
    // Precargar todas las imágenes críticas al montar el componente
    preloadImages();
  }, []);

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Primero intentar obtener el nombre del perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, full_name')
          .eq('id', user.id)
          .single();
        
        if (profile && profile.first_name) {
          // Usar el primer nombre directamente
          setUserName(profile.first_name);
        } else if (profile && profile.full_name) {
          // Si no hay first_name pero sí full_name, obtener el primer nombre del full_name
          const firstName = profile.full_name.split(' ')[0];
          setUserName(firstName);
        } else if (user.email) {
          // Si no hay nombre, usar la parte antes del @ del email
          const emailName = user.email.split('@')[0];
          // Capitalizar la primera letra
          const capitalizedName = emailName.charAt(0).toUpperCase() + emailName.slice(1).toLowerCase();
          setUserName(capitalizedName);
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    } finally {
      setLoadingUser(false);
    }
  };

  // Efecto para el carrusel automático con deslizamiento continuo
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentIndex < backgroundImages.length) {
        // Deslizar a la siguiente imagen más lentamente
        Animated.timing(scrollX, {
          toValue: -(currentIndex + 1) * width,
          duration: 2000, // 2 segundos para el deslizamiento
          useNativeDriver: true,
        }).start();
        
        if (currentIndex === backgroundImages.length - 1) {
          // Si es la última imagen, preparar el loop
          setTimeout(() => {
            scrollX.setValue(0);
            setCurrentIndex(0);
          }, 2000);
        } else {
          setCurrentIndex(currentIndex + 1);
        }
      }
    }, 4000); // 4 segundos antes de cada deslizamiento

    return () => clearTimeout(timer);
  }, [currentIndex, scrollX]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleServicePress = (service: any) => {
    setSelectedService(service.id);
  };

  const handleSubServicePress = (service: any, subService: any) => {
    setCurrentService(service);
    setSelectedSubService(subService);
    
    // Para DRIPS, saltar directamente al calendario sin seleccionar profesional
    if (service.id === 'drips') {
      // Asignar el profesional genérico para DRIPS
      setBookingData({ 
        ...bookingData, 
        professional: {
          id: 'b8f5a516-5b6a-4c89-a8f5-64de1c72f3d9',
          full_name: 'Enfermera de Turno',
          title: 'Enfermera',
          specialties: ['DRIPS', 'Sueroterapia', 'Terapias IV']
        }
      });
      setCurrentStep('calendar');
    } else {
      setCurrentStep('professional');
    }
  };

  const handleProfessionalSelected = (professional: any) => {
    setBookingData({ ...bookingData, professional });
    setCurrentStep('calendar');
  };

  const handleDateTimeSelected = (date: string, time: string) => {
    setBookingData({ ...bookingData, date, time });
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
      
      // Obtener el ID real del servicio desde Supabase
      const realServiceId = getRealServiceId(currentService.id);
      
      let appointment;
      let error;

      // Si es un servicio DRIPS, usar el servicio especializado
      if (currentService.id === 'drips') {
        try {
          appointment = await DripsService.createDripsAppointment(
            user.id,
            realServiceId,
            null, // subServiceId - necesitamos agregarlo si usas sub_services
            new Date(bookingData.date),
            bookingData.time,
            bookingData.professional.id,
            selectedSubService.duration
          );
          error = null;
        } catch (e) {
          error = e;
          appointment = null;
        }
      } else {
        // Para otros servicios, usar el proceso normal
        const result = await supabase
          .from('appointments')
          .insert({
            user_id: user.id,
            service_id: realServiceId,
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
        
        appointment = result.data;
        error = result.error;
      }

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
      case 'professional':
        setSelectedSubService(null);
        setCurrentStep('services');
        break;
      case 'calendar':
        // Si es DRIPS, volver directo a servicios
        if (currentService?.id === 'drips') {
          setSelectedSubService(null);
          setCurrentStep('services');
        } else {
          setCurrentStep('professional');
        }
        break;
      case 'confirmation':
        setCurrentStep('calendar');
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
  if (currentStep === 'professional' && selectedSubService && currentService) {
    return (
      <SelectProfessionalScreen
        service={currentService}
        subService={selectedSubService}
        onBack={handleBack}
        onNext={handleProfessionalSelected}
      />
    );
  }

  if (currentStep === 'calendar' && selectedSubService && currentService && bookingData.professional) {
    return (
      <BookingCalendarScreen
        service={currentService}
        subService={selectedSubService}
        professional={bookingData.professional}
        onBack={handleBack}
        onNext={handleDateTimeSelected}
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
          <View style={styles.carouselContainer}>
            {/* Contenedor de imágenes deslizables */}
            <Animated.View
              style={[
                styles.imageSlider,
                {
                  transform: [{ translateX: scrollX }],
                },
              ]}
            >
              {images.map((image, index) => (
                <CachedImage
                  key={index}
                  uri={image}
                  style={styles.slideImage}
                  priority="high"
                  resizeMode="cover"
                />
              ))}
            </Animated.View>
            
            {/* Contenido superpuesto */}
            <View style={styles.contentOverlay}>
              <Text style={styles.greeting}>
                {loadingUser ? '¡Hola!' : userName ? `¡Hola ${userName}!` : '¡Hola!'}
              </Text>
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
          </View>
        </View>

        {/* Breathe & Move Section */}
        <TouchableOpacity 
          style={styles.breatheAndMoveSection}
          onPress={() => navigation.navigate('BreatheAndMove')}
          activeOpacity={0.9}
        >
          <View style={styles.breatheAndMoveBackground}>
            <Image
              source={{ uri: BREATHE_AND_MOVE_IMAGE }}
              style={[StyleSheet.absoluteFillObject, styles.breatheAndMoveImage]}
              resizeMode="cover"
            />
            <View style={styles.breatheAndMoveOverlay}>
              <View style={styles.breatheAndMoveContent}>
                <Text style={styles.breatheAndMoveBrand}>Breathe & Move</Text>
                <TouchableOpacity 
                  style={styles.breatheAndMoveButton}
                  onPress={() => navigation.navigate('BreatheAndMove')}
                >
                  <Text style={styles.breatheAndMoveButtonText}>Ver Clases</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  welcomeSection: {
    backgroundColor: Colors.primary.dark,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    minHeight: 280, // Aumentado ~2cm (aprox 75px)
    overflow: 'hidden',
  },
  carouselContainer: {
    height: 280,
    overflow: 'hidden',
    position: 'relative',
  },
  imageSlider: {
    flexDirection: 'row',
    height: '100%',
  },
  slideImage: {
    width: width,
    height: 280,
  },
  backgroundImageStyle: {
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    resizeMode: 'cover',
  },
  contentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 14, // 3.5mm de margen inferior
    justifyContent: 'flex-end',
  },
  greeting: {
    fontSize: 26,
    fontWeight: '600',
    color: Colors.text.inverse,
    marginBottom: 2, // Solo 2px de separación
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.inverse,
    opacity: 0.9,
    marginBottom: 4, // 0.5mm más antes de los botones
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 0, // Sin margen inferior
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: Colors.ui.background,
    paddingVertical: 14,
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
    paddingHorizontal: 18,
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
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 16,
    height: 156,
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
  breatheAndMoveBackground: {
    flex: 1,
    height: '100%',
  },
  breatheAndMoveImage: {
    borderRadius: 16,
    resizeMode: 'cover',
  },
  breatheAndMoveOverlay: {
    flex: 1,
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
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
