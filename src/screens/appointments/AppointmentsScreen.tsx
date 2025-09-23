import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { SERVICES } from '../../constants/services';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ServiceIcon } from '../../components/ServiceIcon';
import { getServiceConstantId } from '../../utils/serviceMapping';
import { processCancellationWithCredits } from '../../utils/creditsManager';

const getClassColor = (className: string) => {
  const colors: { [key: string]: string } = {
    'WildPower': '#B8604D',
    'GutReboot': '#879794',
    'FireRush': '#5E3532',
    'BloomBeat': '#ECD0B6',
    'WindMove': '#B2B8B0',
    'ForestFire': '#3E5444',
    'StoneBarre': '#879794',
    'OmRoot': '#3E5444',
    'HazeRocket': '#61473B',
    'MoonRelief': '#1F2E3B',
    'WindFlow': '#879794',
    'WaveMind': '#61473B'
  };
  return colors[className] || '#879794';
};

const getClassIcon = (className: string) => {
  const icons: { [key: string]: string } = {
    'WildPower': 'fire',
    'GutReboot': 'leaf',
    'FireRush': 'fire',
    'BloomBeat': 'flower',
    'WindMove': 'weather-windy',
    'ForestFire': 'fire',
    'StoneBarre': 'dumbbell',
    'OmRoot': 'meditation',
    'HazeRocket': 'rocket',
    'MoonRelief': 'moon-waning-crescent',
    'WindFlow': 'weather-windy',
    'WaveMind': 'waves'
  };
  return <MaterialCommunityIcons name={icons[className] || 'yoga'} size={24} color="#FFFFFF" />;
};

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string; // Agregado el campo appointment_time
  status: string;
  total_amount: number;
  notes: string;
  service_id: string;
  professional_id: string;
  created_at: string;
  hyperbaric_chamber_id?: string; // Campo para identificar citas de cámara hiperbárica
  professional?: {
    name: string;
    avatar?: string;
  };
  service?: any;
  subService?: any;
  // Para clases de Hot Studio
  isHotStudioClass?: boolean;
  class?: {
    id: string;
    class_date: string;
    start_time: string;
    end_time: string;
    class_type?: {
      name: string;
      icon: string;
      color: string;
    };
    instructor?: {
      name: string;
    };
  };
}

export const AppointmentsScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      console.log('Loading appointments for user:', user.id);

      // First load regular appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          user_id,
          service_id,
          sub_service_id,
          professional_id,
          appointment_date,
          appointment_time,
          end_time,
          status,
          total_amount,
          duration,
          notes,
          created_at,
          updated_at,
          hyperbaric_chamber_id,
          sub_services (
            id,
            name,
            service_id
          )
        `)
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      console.log('Appointments query result:', { appointmentsData, appointmentsError });

      if (appointmentsError) throw appointmentsError;

      // Then load Breathe & Move bookings
      const { data: classesData, error: classesError } = await supabase
        .from('breathe_move_bookings')
        .select(`
          id,
          created_at,
          status,
          breathe_move_classes!inner(
            id,
            class_date,
            start_time,
            end_time,
            class_type_id,
            instructor_id,
            max_capacity,
            current_capacity,
            breathe_move_class_types!inner(
              name,
              color
            ),
            breathe_move_instructors!inner(
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      let allAppointments: Appointment[] = [];

      // Process regular appointments
      if (appointmentsData) {
        const regularAppointments = await Promise.all(appointmentsData.map(async (apt) => {
          const serviceId = apt.service_id;
          const constantServiceId = getServiceConstantId(serviceId);
          let serviceData = SERVICES.find(s => s.id === constantServiceId);
          
          // If service is not found in constants, fetch from database
          if (!serviceData || constantServiceId === 'otros') {
            const { data: dbService } = await supabase
              .from('services')
              .select('id, name, code, base_price, duration_minutes')
              .eq('id', serviceId)
              .single();
              
            if (dbService) {
              serviceData = {
                id: dbService.code || serviceId,
                name: dbService.name,
                color: '#1F2E3B',
                icon: 'medical-services',
                description: dbService.name,
                subServices: [{
                  id: 'default',
                  name: dbService.name,
                  duration: dbService.duration_minutes || 60,
                  price: Number(dbService.base_price) || 0
                }]
              };
            }
          }
          
          // Detectar si es Cámara Hiperbárica por hyperbaric_chamber_id
          let subService = serviceData?.subServices?.find(ss => ss.id === apt.sub_service_id);
          
          // Si tiene hyperbaric_chamber_id, es Cámara Hiperbárica
          if (apt.hyperbaric_chamber_id) {
            // Sobreescribir el servicio para que aparezca como Cámara Hiperbárica
            serviceData = {
              id: 'camara-hiperbarica',
              name: 'Cámara Hiperbárica',
              color: '#1F2E3B',
              icon: 'heart-pulse',
              description: 'Oxigenoterapia hiperbárica',
              subServices: [{
                id: 'camara-hiperbarica-sesion',
                name: 'Sesión de 60 minutos',
                duration: 60,
                price: 180000
              }]
            };
            subService = serviceData.subServices[0];
          } else if (!subService) {
            subService = serviceData?.subServices?.[0];
          }
          
          // Try to load professional data separately
          let professional = { name: 'Profesional' };
          if (apt.professional_id) {
            const { data: profData } = await supabase
              .from('professionals')
              .select('full_name')
              .eq('id', apt.professional_id)
              .single();
            if (profData) {
              professional = { name: profData.full_name };
            }
          }
          
          // Check if this is a Breathe & Move appointment created by admin
          if (serviceData?.name === 'Breathe & Move') {
            // Use sub_services data if loaded from DB
            const subServiceFromDB = apt.sub_services;
            const className = subServiceFromDB?.name || subService?.name || 'Clase';
            
            // Extract instructor name from notes if available
            const instructorMatch = apt.notes?.match(/con\s+([^-]+)\s+-/);
            const instructorName = instructorMatch ? instructorMatch[1].trim() : 'Instructor';
            
            const processedApt = {
              ...apt,
              professional,
              service: serviceData,
              subService: subServiceFromDB || subService,
              isHotStudioClass: true,
              class: {
                id: apt.id,
                class_date: apt.appointment_date,
                start_time: apt.appointment_time,
                end_time: apt.end_time,
                class_type: {
                  name: className,
                  icon: 'yoga',
                  color: getClassColor(className)
                },
                instructor: {
                  name: instructorName
                }
              }
            };
            console.log('Processed Breathe & Move appointment:', processedApt.id, 'class:', className);
            return processedApt;
          }
          
          const processedApt = {
            ...apt,
            professional,
            service: serviceData,
            subService: subService
          };
          console.log('Processed appointment:', processedApt.id, 'service:', serviceData?.name, 'date:', processedApt.appointment_date, 'time:', processedApt.appointment_time);
          return processedApt;
        }));
        allAppointments = [...regularAppointments];
      }

      // Process Breathe & Move classes as appointments
      if (classesData) {
        const classAppointments = classesData.map(booking => {
          const classData = booking.breathe_move_classes;
          
          return {
            id: booking.id,
            appointment_date: `${classData.class_date}T${classData.start_time}`,
            status: booking.status,
            total_amount: 60000, // Default price for Breathe & Move classes
            notes: '',
            service_id: 'breathe-move',
            professional_id: classData.instructor_id,
            created_at: booking.created_at,
            isHotStudioClass: true,
            class: {
              id: classData.id,
              class_date: classData.class_date,
              start_time: classData.start_time,
              end_time: classData.end_time,
              class_type: {
                name: classData.breathe_move_class_types.name,
                icon: 'yoga',
                color: classData.breathe_move_class_types.color
              },
              instructor: {
                name: classData.breathe_move_instructors.name
              }
            }
          };
        });
        
        allAppointments = [...allAppointments, ...classAppointments];
      }

      // Sort all appointments by date and time (ascending - más cercana primero)
      allAppointments.sort((a, b) => {
        // Comparar por fecha
        const dateA = new Date(a.appointment_date).getTime();
        const dateB = new Date(b.appointment_date).getTime();
        
        if (dateA !== dateB) {
          return dateA - dateB; // Fecha más cercana primero
        }
        
        // Si las fechas son iguales, comparar por hora
        const timeA = a.appointment_time || a.class?.start_time || '00:00';
        const timeB = b.appointment_time || b.class?.start_time || '00:00';
        
        return timeA.localeCompare(timeB);
      });

      console.log('Final appointments to display:', allAppointments.length, allAppointments);
      setAppointments(allAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Error', 'No se pudieron cargar las citas');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const handleCancelAppointment = async (appointment: Appointment) => {
    Alert.alert(
      'Cancelar cita',
      '¿Estás seguro de que deseas cancelar esta cita?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              if (appointment.isHotStudioClass) {
                // Handle Breathe & Move class cancellation
                const { error } = await supabase
                  .from('breathe_move_bookings')
                  .update({ status: 'cancelled' })
                  .eq('id', appointment.id);

                if (error) throw error;

                // Update class capacity
                await supabase.rpc('decrement_class_capacity', {
                  p_class_id: appointment.class?.id
                });

                // Process credits for cancellation (if within policy)
                const classDateTime = `${appointment.class?.class_date}T${appointment.class?.start_time}`;
                const result = await processCancellationWithCredits(
                  user.id, 
                  appointment.id, 
                  classDateTime,
                  appointment.total_amount,
                  'Breathe & Move'
                );
                
                if (result.creditAmount && result.creditAmount > 0) {
                  console.log(`Crédito generado: $${result.creditAmount}`);
                }
              } else {
                // Handle regular appointment cancellation
                const { error } = await supabase
                  .from('appointments')
                  .update({ status: 'cancelled' })
                  .eq('id', appointment.id);

                if (error) throw error;

                // Process credits for cancellation
                const appointmentDateTime = appointment.appointment_date;
                const serviceName = `${appointment.service?.name || 'Servicio'} - ${appointment.subService?.name || ''}`;
                const result = await processCancellationWithCredits(
                  user.id, 
                  appointment.id, 
                  appointmentDateTime,
                  appointment.total_amount,
                  serviceName
                );
                
                if (result.creditAmount && result.creditAmount > 0) {
                  console.log(`Crédito generado: $${result.creditAmount}`);
                }
              }

              Alert.alert('Éxito', 'Cita cancelada correctamente');
              await loadAppointments();
            } catch (error: any) {
              console.error('Error cancelling appointment:', error);
              
              // Manejar errores específicos del backend
              if (error.code === 'P0001') {
                // Error de validación del backend
                const errorMessage = error.message || 'No se pudo cancelar la cita';
                Alert.alert('No se puede cancelar', errorMessage);
              } else if (error.code === 'PGRST116') {
                // Error de permisos
                Alert.alert('Error', 'No tienes permisos para cancelar esta cita');
              } else {
                // Error genérico
                Alert.alert('Error', 'No se pudo cancelar la cita. Por favor intenta nuevamente.');
              }
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    console.log('formatDate called with:', dateString);
    
    // Crear fecha sin zona horaria para evitar conversiones automáticas
    const parts = dateString.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Los meses en JavaScript van de 0-11
    const dayOfMonth = parseInt(parts[2]);
    
    const date = new Date(year, month, dayOfMonth);
    console.log('Created date object:', date);
    
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    const day = days[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];
    
    console.log('formatDate result:', { day, dayNum, month: monthName });
    return { day, dayNum, month: monthName };
  };

  const formatTime = (timeString: string | null | undefined) => {
    console.log('formatTime called with:', timeString, 'type:', typeof timeString);
    if (!timeString || timeString === null || timeString === undefined) {
      console.log('No valid timeString provided, returning default');
      return 'Hora no disponible';
    }
    
    // Limpiar el string y asegurar que tenga el formato correcto
    const cleanTime = timeString.toString().trim();
    const [hours, minutes] = cleanTime.split(':');
    
    if (!hours || !minutes) {
      console.log('Invalid time format:', cleanTime);
      return 'Formato inválido';
    }
    
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const result = `${displayHour}:${minutes} ${ampm}`;
    console.log('formatTime result:', result);
    return result;
  };

  const isUpcoming = (dateString: string, timeString?: string) => {
    // Si hay tiempo, combinar fecha y hora para comparación precisa
    if (timeString) {
      const appointmentDateTime = new Date(`${dateString}T${timeString}`);
      const now = new Date();
      console.log('Comparing appointment:', appointmentDateTime, 'vs now:', now, 'isUpcoming:', appointmentDateTime > now);
      return appointmentDateTime > now;
    }
    
    // Si no hay tiempo, solo comparar fechas
    const appointmentDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    appointmentDate.setHours(0, 0, 0, 0); // Reset time to start of day
    return appointmentDate >= today;
  };

  const filteredAppointments = appointments.filter(apt => {
    if (activeTab === 'upcoming') {
      // Para citas regulares, usar appointment_time. Para clases, usar el tiempo de la clase
      const timeToCheck = apt.isHotStudioClass && apt.class ? apt.class.start_time : apt.appointment_time;
      const upcoming = isUpcoming(apt.appointment_date, timeToCheck);
      const notCancelled = apt.status !== 'cancelled';
      console.log('Filtering appointment:', apt.id, 'upcoming:', upcoming, 'notCancelled:', notCancelled);
      return upcoming && notCancelled;
    } else {
      // Para citas regulares, usar appointment_time. Para clases, usar el tiempo de la clase
      const timeToCheck = apt.isHotStudioClass && apt.class ? apt.class.start_time : apt.appointment_time;
      return (!isUpcoming(apt.appointment_date, timeToCheck) || apt.status === 'cancelled');
    }
  });

  const renderAppointment = (appointment: Appointment) => {
    if (appointment.isHotStudioClass && appointment.class) {
      const { day, dayNum, month } = formatDate(appointment.class.class_date);
      const classColor = getClassColor(appointment.class.class_type?.name || '');
      
      return (
        <View key={appointment.id} style={styles.appointmentCard}>
          <TouchableOpacity
            style={styles.appointmentContent}
            onPress={() => {
            // TODO: Implementar pantalla de detalles
            // navigation.navigate('AppointmentDetail', { appointment })
          }}
          >
            <View style={styles.dateContainer}>
              <Text style={styles.dayText}>{day}</Text>
              <Text style={styles.dayNumText}>{dayNum}</Text>
              <Text style={styles.monthText}>{month}</Text>
            </View>
            
            <View style={styles.appointmentInfo}>
              <View style={styles.appointmentHeader}>
                <View style={[styles.serviceIconContainer, { backgroundColor: classColor }]}>
                  {getClassIcon(appointment.class.class_type?.name || '')}
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.serviceName}>Breathe & Move</Text>
                  <Text style={styles.subServiceName}>{appointment.class.class_type?.name || 'Clase'}</Text>
                </View>
              </View>
              
              <View style={styles.appointmentDetails}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.text.secondary} />
                  <Text style={styles.detailText}>
                    {formatTime(appointment.class.start_time)} - {formatTime(appointment.class.end_time)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="account" size={16} color={Colors.text.secondary} />
                  <Text style={styles.detailText}>{appointment.class.instructor?.name}</Text>
                </View>
              </View>
              
              {appointment.status === 'cancelled' && (
                <View style={styles.cancelledBadge}>
                  <Text style={styles.cancelledText}>Cancelada</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          
          {activeTab === 'upcoming' && appointment.status !== 'cancelled' && (
            <TouchableOpacity
              style={styles.cancelButtonBottom}
              onPress={() => handleCancelAppointment(appointment)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Regular appointment rendering
    const { day, dayNum, month } = formatDate(appointment.appointment_date);
    
    return (
      <View key={appointment.id} style={styles.appointmentCard}>
        <TouchableOpacity
          style={styles.appointmentContent}
          onPress={() => {
            // TODO: Implementar pantalla de detalles
            // navigation.navigate('AppointmentDetail', { appointment })
          }}
        >
          <View style={styles.dateContainer}>
            <Text style={styles.dayText}>{day}</Text>
            <Text style={styles.dayNumText}>{dayNum}</Text>
            <Text style={styles.monthText}>{month}</Text>
          </View>
          
          <View style={styles.appointmentInfo}>
            <View style={styles.appointmentHeader}>
              {appointment.service && (
                <View style={styles.serviceIconContainer}>
                  <ServiceIcon 
                    serviceId={appointment.service.id} 
                    size={24}
                    color={Colors.primary.dark}
                  />
                </View>
              )}
              <View style={styles.headerTextContainer}>
                <Text style={styles.serviceName}>{appointment.service?.name || 'Servicio'}</Text>
                <Text style={styles.subServiceName}>{appointment.subService?.name || ''}</Text>
              </View>
            </View>
            
            <View style={styles.appointmentDetails}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.text.secondary} />
                <Text style={styles.detailText}>
                  {(() => {
                    console.log('Rendering appointment time for:', appointment.id, 'appointment_time:', appointment.appointment_time);
                    return formatTime(appointment.appointment_time);
                  })()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="doctor" size={16} color={Colors.text.secondary} />
                <Text style={styles.detailText}>{appointment.professional?.name || 'Profesional'}</Text>
              </View>
              {appointment.total_amount > 0 && (
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="cash" size={16} color={Colors.text.secondary} />
                  <Text style={styles.detailText}>
                    ${appointment.total_amount.toLocaleString('es-CO')}
                  </Text>
                </View>
              )}
            </View>
            
            {appointment.status === 'cancelled' && (
              <View style={styles.cancelledBadge}>
                <Text style={styles.cancelledText}>Cancelada</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        {activeTab === 'upcoming' && appointment.status !== 'cancelled' && (
          <TouchableOpacity
            style={styles.cancelButtonBottom}
            onPress={() => handleCancelAppointment(appointment)}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.dark} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Citas</Text>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Próximas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Pasadas
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary.green}
            colors={[Colors.primary.green]}
          />
        }
      >
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name={activeTab === 'upcoming' ? 'calendar-blank' : 'calendar-check'} 
              size={80} 
              color={Colors.ui.border} 
            />
            <Text style={styles.emptyStateText}>
              {activeTab === 'upcoming' 
                ? 'No tienes citas próximas' 
                : 'No tienes citas pasadas'}
            </Text>
            {activeTab === 'upcoming' && (
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.bookButtonText}>Agendar cita</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {filteredAppointments.map(renderAppointment)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.ui.border,
  },
  activeTab: {
    borderBottomColor: Colors.primary.dark,
  },
  tabText: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.primary.dark,
    fontWeight: '600',
  },
  appointmentsList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  appointmentContent: {
    flexDirection: 'row',
    padding: 16,
  },
  dateContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.ui.border,
    paddingRight: 16,
    marginRight: 16,
  },
  dayText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
  },
  dayNumText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginVertical: 2,
  },
  monthText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIcon: {
    marginRight: 12,
  },
  serviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.ui.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 2,
  },
  subServiceName: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  appointmentDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  cancelButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.ui.error + '10',
  },
  cancelButtonText: {
    fontSize: 12,
    color: Colors.ui.error,
    fontWeight: '600',
  },
  cancelButtonBottom: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.border,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    alignItems: 'center',
  },
  cancelledBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.ui.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cancelledText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 48,
  },
  emptyStateText: {
    fontSize: 18,
    color: Colors.text.secondary,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  bookButton: {
    backgroundColor: Colors.primary.dark,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  classTypeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
});