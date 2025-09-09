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

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  total_amount: number;
  notes: string;
  service_id: string;
  professional_id: string;
  created_at: string;
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
      console.log('=== LOADING APPOINTMENTS ===');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user in AppointmentsScreen:', userError);
        return;
      }
      
      if (!user) {
        console.log('No user found in AppointmentsScreen');
        return;
      }
      
      console.log('Loading appointments for user:', user.id, user.email);

      // Cargar citas médicas
      const { data: medicalAppointments, error: medicalError } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: false });

      if (medicalError) {
        console.error('Error loading medical appointments:', medicalError);
        throw medicalError;
      }
      
      console.log('Medical appointments loaded:', medicalAppointments?.length || 0);
      console.log('First appointment:', medicalAppointments?.[0]);

      // Cargar clases de Hot Studio
      const { data: hotStudioEnrollments, error: hotStudioError } = await supabase
        .from('class_enrollments')
        .select(`
          *,
          class:classes(
            *,
            class_type:class_types(*),
            instructor:instructors(*)
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['enrolled', 'attended', 'cancelled'])
        .order('created_at', { ascending: false });

      if (hotStudioError) throw hotStudioError;

      // Procesar citas médicas
      const processedMedicalAppointments = (medicalAppointments || []).map(apt => {
        const service = SERVICES.find(s => s.id === apt.service_id);
        let subService = null;
        
        if (service && apt.notes) {
          const subServiceName = apt.notes.split(' - ')[1];
          subService = service.subServices?.find(ss => ss.name === subServiceName);
        }

        const professional = {
          name: 'Dra. Estefanía González'
        };

        return {
          ...apt,
          service,
          subService,
          professional,
          isHotStudioClass: false
        };
      });

      // Procesar clases de Hot Studio como citas
      const processedHotStudioAppointments = (hotStudioEnrollments || []).map(enrollment => {
        const classData = enrollment.class;
        if (!classData) return null;

        // Combinar fecha y hora de la clase
        const appointmentDate = new Date(`${classData.class_date}T${classData.start_time}`);

        return {
          id: enrollment.id,
          appointment_date: appointmentDate.toISOString(),
          status: enrollment.status === 'enrolled' ? 'confirmed' : 
                  enrollment.status === 'attended' ? 'completed' : 'cancelled',
          total_amount: 0, // Las clases se pagan con membresía
          notes: classData.class_type?.name || 'Clase Hot Studio',
          service_id: 'hot-studio',
          professional_id: classData.instructor_id,
          created_at: enrollment.created_at,
          isHotStudioClass: true,
          class: classData,
          professional: {
            name: classData.instructor?.name || 'Instructor'
          }
        };
      }).filter(Boolean);

      // Combinar y ordenar todas las citas
      const allAppointments = [
        ...processedMedicalAppointments,
        ...processedHotStudioAppointments
      ].sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());

      setAppointments(allAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Error', 'No se pudieron cargar las citas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const isUpcoming = (dateStr: string) => {
    const appointmentDate = new Date(dateStr);
    return appointmentDate > new Date();
  };

  const filteredAppointments = appointments.filter(apt => {
    const upcoming = isUpcoming(apt.appointment_date);
    return activeTab === 'upcoming' ? upcoming : !upcoming;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return Colors.ui.success;
      case 'pending_payment':
        return Colors.ui.warning;
      case 'cancelled':
        return Colors.ui.error;
      default:
        return Colors.text.secondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'pending_payment':
        return 'Pago pendiente';
      case 'cancelled':
        return 'Cancelada';
      case 'completed':
        return 'Completada';
      default:
        return status;
    }
  };

  const handleCancelAppointment = (appointment: Appointment) => {
    Alert.alert(
      'Cancelar cita',
      '¿Estás seguro de que deseas cancelar esta cita?',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => cancelAppointment(appointment.id)
        }
      ]
    );
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      // Buscar si es una cita de Hot Studio
      const appointment = appointments.find(a => a.id === appointmentId);
      
      if (appointment?.isHotStudioClass) {
        // Cancelar inscripción a clase
        const { error } = await supabase
          .from('class_enrollments')
          .update({ status: 'cancelled' })
          .eq('id', appointmentId);

        if (error) throw error;
        Alert.alert('Éxito', 'Tu inscripción a la clase ha sido cancelada');
      } else {
        // Cancelar cita médica
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointmentId);

        if (error) throw error;
        Alert.alert('Éxito', 'La cita ha sido cancelada');
      }

      loadAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Alert.alert('Error', 'No se pudo cancelar');
    }
  };

  const handleReschedule = (appointment: Appointment) => {
    // Navegar al calendario con los datos de la cita para reprogramar
    navigation.navigate('RescheduleAppointment', { appointment });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const renderAppointmentCard = (appointment: Appointment) => {
    const canCancel = appointment.status !== 'cancelled' && 
                      appointment.status !== 'completed' &&
                      isUpcoming(appointment.appointment_date);

    // Si es una clase de Hot Studio
    if (appointment.isHotStudioClass && appointment.class) {
      const classData = appointment.class;
      
      return (
        <TouchableOpacity 
          key={appointment.id} 
          style={styles.appointmentCard}
          onPress={() => navigation.navigate('ClassDetail', { classId: classData.id })}
        >
          <View style={styles.appointmentHeader}>
            <View style={[styles.serviceIcon, { backgroundColor: classData.class_type?.color || Colors.primary.green }]}>
              <MaterialCommunityIcons name="yoga" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.appointmentInfo}>
              <Text style={styles.serviceName}>
                {classData.class_type?.name || 'Clase Hot Studio'}
              </Text>
              <Text style={styles.serviceCategory}>Hot Studio</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                {getStatusText(appointment.status)}
              </Text>
            </View>
          </View>

          <View style={styles.appointmentDetails}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="calendar" size={16} color={Colors.text.secondary} style={styles.detailIconView} />
              <Text style={styles.detailText}>{formatDate(appointment.appointment_date)}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.text.secondary} style={styles.detailIconView} />
              <Text style={styles.detailText}>
                {classData.start_time.slice(0, 5)} - {classData.end_time.slice(0, 5)}
              </Text>
            </View>
            {classData.instructor && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="account" size={16} color={Colors.text.secondary} style={styles.detailIconView} />
                <Text style={styles.detailText}>{classData.instructor.name}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="ticket-confirmation" size={16} color={Colors.text.secondary} style={styles.detailIconView} />
              <Text style={styles.detailText}>Incluido en membresía</Text>
            </View>
          </View>

          {canCancel && appointment.status === 'confirmed' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.viewButton]}
                onPress={() => navigation.navigate('ClassDetail', { classId: classData.id })}
              >
                <Text style={styles.viewButtonText}>Ver detalles</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // Citas médicas regulares
    return (
      <View key={appointment.id} style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={[styles.serviceIcon, { 
            backgroundColor: appointment.notes?.includes('Breathe & Move') 
              ? Colors.primary.dark 
              : (appointment.service?.color || Colors.primary.green) 
          }]}>
            {appointment.notes?.includes('Breathe & Move') ? (
              <MaterialCommunityIcons name="yoga" size={24} color="#FFFFFF" />
            ) : (
              <ServiceIcon 
                serviceId={appointment.service?.id || ''} 
                size={24} 
                color="#FFFFFF"
              />
            )}
          </View>
          <View style={styles.appointmentInfo}>
            <Text style={styles.serviceName}>
              {appointment.notes?.includes('Breathe & Move') 
                ? appointment.notes.split(' - ')[1] 
                : (appointment.subService?.name || appointment.notes)}
            </Text>
            <Text style={styles.serviceCategory}>
              {appointment.notes?.includes('Breathe & Move') 
                ? 'Breathe & Move' 
                : appointment.service?.name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
              {getStatusText(appointment.status)}
            </Text>
          </View>
        </View>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={16} color={Colors.text.secondary} style={styles.detailIcon} />
            <Text style={styles.detailText}>{formatDate(appointment.appointment_date)}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.text.secondary} style={styles.detailIcon} />
            <Text style={styles.detailText}>
              {appointment.appointment_time 
                ? `${appointment.appointment_time.slice(0, 5)} - ${appointment.end_time?.slice(0, 5) || ''}`
                : formatTime(appointment.appointment_date)}
            </Text>
          </View>
          {appointment.professional && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="doctor" size={16} color={Colors.text.secondary} style={styles.detailIcon} />
              <Text style={styles.detailText}>{appointment.professional.name}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="cash" size={16} color={Colors.text.secondary} style={styles.detailIcon} />
            <Text style={styles.detailText}>
              {appointment.total_amount === 0 && appointment.notes?.includes('paquete') 
                ? 'Incluido en paquete' 
                : `$${appointment.total_amount.toLocaleString('es-CO')} COP`}
            </Text>
          </View>
        </View>

        {canCancel && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rescheduleButton]}
              onPress={() => handleReschedule(appointment)}
            >
              <Text style={styles.rescheduleButtonText}>Reprogramar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelAppointment(appointment)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.green} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Citas</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
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
            onRefresh={onRefresh}
            colors={[Colors.primary.green]}
          />
        }
      >
        <View style={styles.content}>
          {filteredAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons 
                name={activeTab === 'upcoming' ? 'calendar-clock' : 'calendar-check'} 
                size={64} 
                color={Colors.text.secondary} 
                style={{ marginBottom: 16 }}
              />
              <Text style={styles.emptyTitle}>
                No tienes citas {activeTab === 'upcoming' ? 'próximas' : 'pasadas'}
              </Text>
              <Text style={styles.emptyDescription}>
                {activeTab === 'upcoming' 
                  ? 'Agenda una nueva cita desde Inicio o inscríbete en clases de Hot Studio'
                  : 'Aquí aparecerán tus citas y clases completadas'}
              </Text>
            </View>
          ) : (
            filteredAppointments.map(renderAppointmentCard)
          )}
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.ui.divider,
  },
  activeTab: {
    borderBottomColor: Colors.primary.green,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  activeTabText: {
    color: Colors.primary.green,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  appointmentCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceIconText: {
    fontSize: 24,
  },
  appointmentInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rescheduleButton: {
    backgroundColor: Colors.primary.beige,
  },
  rescheduleButtonText: {
    color: Colors.primary.dark,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: Colors.ui.error + '10',
  },
  cancelButtonText: {
    color: Colors.ui.error,
    fontWeight: '600',
  },
  viewButton: {
    backgroundColor: Colors.primary.green,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});