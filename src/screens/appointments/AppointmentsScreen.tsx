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

      // Cargar citas médicas (incluye Breathe & Move) - excluir canceladas
      const { data: medicalAppointments, error: medicalError } = await supabase
        .from('appointments')
        .select(`
          *,
          professional:professionals(
            id,
            full_name
          )
        `)
        .eq('user_id', user.id)
        .neq('status', 'cancelled')
        .order('appointment_date', { ascending: false });

      if (medicalError) {
        console.error('Error loading medical appointments:', medicalError);
        throw medicalError;
      }
      
      console.log('Medical appointments loaded:', medicalAppointments?.length || 0);
      console.log('First appointment:', medicalAppointments?.[0]);
      
      // Log all appointment IDs
      console.log('All appointment IDs:', medicalAppointments?.map(apt => apt.id));
      
      // Log para ver si hay citas de Breathe & Move
      const breatheMoveAppointments = medicalAppointments?.filter(apt => 
        apt.notes && apt.notes.includes('Breathe & Move')
      );
      console.log('Breathe & Move appointments:', breatheMoveAppointments?.length || 0);
      console.log('Breathe & Move details:', breatheMoveAppointments);
      
      // Debug para fechas
      breatheMoveAppointments?.forEach(apt => {
        console.log(`DEBUG - Appointment ID: ${apt.id}`);
        console.log(`  - appointment_date: ${apt.appointment_date}`);
        console.log(`  - appointment_time: ${apt.appointment_time}`);
        console.log(`  - notes: ${apt.notes}`);
        console.log(`  - professional: ${apt.professional?.full_name}`);
      });

      // Cargar clases de Hot Studio - excluir canceladas
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
        .in('status', ['enrolled', 'attended'])
        .order('created_at', { ascending: false });

      if (hotStudioError) throw hotStudioError;

      // Procesar citas médicas
      const processedMedicalAppointments = (medicalAppointments || []).map(apt => {
        // Convertir UUID a ID de constante
        const serviceConstantId = getServiceConstantId(apt.service_id);
        const service = SERVICES.find(s => s.id === serviceConstantId);
        let subService = null;
        
        if (service && apt.notes) {
          const subServiceName = apt.notes.split(' - ')[1];
          subService = service.subServices?.find(ss => ss.name === subServiceName);
        }

        // Si es una cita de Breathe & Move, usar el instructor real
        const professional = apt.professional ? {
          name: apt.professional.full_name
        } : {
          name: 'Instructor' // Fallback genérico
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
    // Para fechas sin tiempo (YYYY-MM-DD), añadir tiempo para evitar problemas de timezone
    const dateToCheck = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
    const appointmentDate = new Date(dateToCheck);
    const now = new Date();
    
    // Para comparación de fechas, usar solo la fecha sin hora
    const appointmentDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const isUpcomingResult = appointmentDateOnly >= nowDateOnly;
    
    console.log('isUpcoming check:', {
      original: dateStr,
      appointmentDate: appointmentDateOnly.toLocaleDateString(),
      now: nowDateOnly.toLocaleDateString(),
      isUpcoming: isUpcomingResult
    });
    
    return isUpcomingResult;
  };

  const filteredAppointments = appointments.filter(apt => {
    // Excluir citas canceladas completamente
    if (apt.status === 'cancelled') {
      return false;
    }
    
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
    console.log('=== handleCancelAppointment called ===');
    console.log('Appointment to cancel:', appointment);
    
    Alert.alert(
      'Cancelar cita',
      '¿Estás seguro de que deseas cancelar esta cita?',
      [
        {
          text: 'No',
          style: 'cancel',
          onPress: () => console.log('User cancelled the cancellation')
        },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => {
            console.log('User confirmed cancellation, calling cancelAppointment()');
            cancelAppointment(appointment.id);
          }
        }
      ]
    );
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      console.log('=== STARTING CANCELLATION PROCESS ===');
      console.log('Appointment ID to cancel:', appointmentId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('ERROR: No user found');
        return;
      }
      
      console.log('User ID:', user.id);

      // Buscar si es una cita de Hot Studio o Breathe & Move
      const appointment = appointments.find(a => a.id === appointmentId);
      console.log('Appointment found:', appointment);
      console.log('Appointment notes:', appointment?.notes);
      console.log('Is Breathe & Move?', appointment?.notes?.includes('Breathe & Move'));
      
      if (appointment?.isHotStudioClass) {
        // Cancelar inscripción a clase de Hot Studio
        const { error } = await supabase
          .from('class_enrollments')
          .update({ status: 'cancelled' })
          .eq('id', appointmentId);

        if (error) throw error;
        Alert.alert('Éxito', 'Tu inscripción a la clase ha sido cancelada');
      } else if (appointment?.notes?.includes('Breathe & Move')) {
        // Para Breathe & Move, devolver la clase al paquete y eliminar
        console.log('DEBUG - Canceling Breathe & Move appointment:', appointmentId);
        
        try {
          console.log('=== BREATHE & MOVE CANCELLATION LOGIC ===');
          
          // 1. Verificar que la cita existe en la base de datos
          const { data: existingAppointment } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', appointmentId)
            .single();
            
          console.log('Existing appointment in DB:', existingAppointment);
          
          // 2. Primero eliminar la cita
          console.log('Attempting to delete appointment with ID:', appointmentId);
          
          // First check if we can see the appointment
          const { data: appointmentToDelete, error: fetchError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', appointmentId)
            .single();
            
          console.log('Appointment before delete:', appointmentToDelete);
          console.log('Fetch error:', fetchError);
          
          // Usar UPDATE con status='cancelled' en lugar de DELETE debido a RLS
          const { error: cancelError, data: cancelledData } = await supabase
            .from('appointments')
            .update({ 
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancelled_by: user.id,
              cancellation_reason: 'Usuario canceló la clase'
            })
            .eq('id', appointmentId)
            .eq('user_id', user.id)
            .select();

          console.log('Cancel result:', { 
            error: cancelError, 
            data: cancelledData,
            appointmentId: appointmentId
          });

          if (cancelError) {
            console.error('CRITICAL ERROR cancelling appointment:', cancelError);
            Alert.alert('Error', `No se pudo cancelar la cita: ${cancelError.message}`);
            return;
          }

          console.log('SUCCESS - Appointment cancelled in DB');

          // 3. Buscar todos los paquetes activos del usuario
          console.log('=== SEARCHING FOR ACTIVE PACKAGES ===');
          const { data: activePackages, error: packagesError } = await supabase
            .from('breathe_move_packages')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active');

          console.log('All active packages query result:', { data: activePackages, error: packagesError });
          
          if (packagesError) {
            console.error('Error fetching packages:', packagesError);
          }

          // 4. Si hay paquetes activos, devolver una clase al más reciente que tenga clases usadas
          const packagesWithUsedClasses = activePackages?.filter(pkg => pkg.classes_used > 0) || [];
          console.log('Packages with used classes:', packagesWithUsedClasses);
          
          if (packagesWithUsedClasses.length > 0) {
            const packageToUpdate = packagesWithUsedClasses.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];

            console.log('Package selected for update:', packageToUpdate);
            console.log('Current classes_used:', packageToUpdate.classes_used);

            const newClassesUsed = Math.max(0, packageToUpdate.classes_used - 1);
            console.log('New classes_used will be:', newClassesUsed);
            
            const { error: updatePackageError, data: updateResult } = await supabase
              .from('breathe_move_packages')
              .update({ classes_used: newClassesUsed })
              .eq('id', packageToUpdate.id)
              .select();

            console.log('Package update result:', { error: updatePackageError, data: updateResult });

            if (updatePackageError) {
              console.error('CRITICAL ERROR updating package:', updatePackageError);
              Alert.alert('Error', `No se pudo actualizar el paquete: ${updatePackageError.message}`);
            } else {
              console.log('SUCCESS - Package updated successfully');
              console.log('Classes used changed from', packageToUpdate.classes_used, 'to', newClassesUsed);
            }
          } else {
            console.log('WARNING - No packages found with used classes to decrement');
          }

          // 5. Buscar y cancelar enrollments relacionados
          console.log('=== CLEANING UP ENROLLMENTS ===');
          
          // Buscar enrollments vinculados a esta cita
          const { data: linkedEnrollments, error: enrollmentError } = await supabase
            .from('breathe_move_enrollments')
            .select('*')
            .eq('appointment_id', appointmentId)
            .eq('status', 'confirmed');
          
          console.log('Found linked enrollments:', linkedEnrollments);
          
          if (linkedEnrollments && linkedEnrollments.length > 0) {
            for (const enrollment of linkedEnrollments) {
              const { error: updateError } = await supabase
                .from('breathe_move_enrollments')
                .update({ 
                  status: 'cancelled',
                  cancelled_at: new Date().toISOString()
                })
                .eq('id', enrollment.id);
                
              if (updateError) {
                console.log('Error cancelling enrollment:', updateError);
              } else {
                console.log('Successfully cancelled enrollment:', enrollment.id);
              }
            }
          }
          
          // Buscar enrollments para la misma fecha (fallback para enrollments antiguos sin appointment_id)
          if (existingAppointment && (!linkedEnrollments || linkedEnrollments.length === 0)) {
            const { data: enrollments } = await supabase
              .from('breathe_move_enrollments')
              .select('*, breathe_move_classes!inner(*)')
              .eq('user_id', user.id)
              .eq('status', 'confirmed')
              .eq('breathe_move_classes.class_date', existingAppointment.appointment_date);
            
            console.log('Found enrollments by date (fallback):', enrollments);
            
            // Cancelar cada enrollment encontrado
            if (enrollments && enrollments.length > 0) {
              for (const enrollment of enrollments) {
                const { error: updateError } = await supabase
                  .from('breathe_move_enrollments')
                  .update({ 
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString()
                  })
                  .eq('id', enrollment.id);
                  
                if (updateError) {
                  console.log('Error cancelling enrollment:', updateError);
                } else {
                  console.log('Successfully cancelled enrollment:', enrollment.id);
                }
              }
            }
          }

          console.log('=== RELOADING APPOINTMENTS ===');
          await loadAppointments();
          console.log('=== APPOINTMENTS RELOADED ===');

          Alert.alert('Éxito', 'Tu clase ha sido cancelada y la clase se devolvió a tu paquete');

        } catch (error) {
          console.error('FATAL ERROR in Breathe & Move cancellation:', error);
          Alert.alert('Error', `No se pudo cancelar la clase: ${error.message}`);
        }
      } else {
        // Cancelar cita médica
        const { error } = await supabase
          .from('appointments')
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          })
          .eq('id', appointmentId);

        if (error) throw error;
        Alert.alert('Éxito', 'La cita ha sido cancelada');
      }

      console.log('=== FINAL RELOAD OF APPOINTMENTS ===');
      await loadAppointments();
      console.log('=== CANCELLATION PROCESS COMPLETE ===');
    } catch (error) {
      console.error('FATAL ERROR in cancellation process:', error);
      Alert.alert('Error', `No se pudo cancelar: ${error.message}`);
      
      // Reload appointments even if there was an error
      try {
        await loadAppointments();
      } catch (reloadError) {
        console.error('Error reloading appointments:', reloadError);
      }
    }
  };

  const handleReschedule = (appointment: Appointment) => {
    // Si es una cita de Breathe & Move, usar flujo especial
    if (appointment.notes?.includes('Breathe & Move')) {
      Alert.alert(
        'Reprogramar clase',
        '¿Quieres cancelar esta clase y seleccionar una nueva?',
        [
          {
            text: 'No',
            style: 'cancel'
          },
          {
            text: 'Sí, reprogramar',
            onPress: () => rescheduleBreatheMoveClass(appointment)
          }
        ]
      );
    } else {
      // Navegar al calendario con los datos de la cita para reprogramar
      navigation.navigate('RescheduleAppointment', { appointment });
    }
  };

  const rescheduleBreatheMoveClass = async (appointment: Appointment) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('DEBUG - Rescheduling Breathe & Move appointment:', appointment.id);

      // 1. Cancelar la cita actual
      const { error: cancelAppointmentError } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Reprogramada por el usuario'
        })
        .eq('id', appointment.id);

      if (cancelAppointmentError) {
        console.error('Error cancelling appointment for reschedule:', cancelAppointmentError);
        throw cancelAppointmentError;
      }

      // 2. Devolver clase al paquete
      const { data: activePackages } = await supabase
        .from('breathe_move_packages')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('classes_used', 0);

      if (activePackages && activePackages.length > 0) {
        const packageToUpdate = activePackages.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        const newClassesUsed = Math.max(0, packageToUpdate.classes_used - 1);
        
        await supabase
          .from('breathe_move_packages')
          .update({ classes_used: newClassesUsed })
          .eq('id', packageToUpdate.id);

        console.log('DEBUG - Package updated for reschedule. Classes used:', packageToUpdate.classes_used, '->', newClassesUsed);
      }

      // 3. Recargar appointments y navegar
      loadAppointments();
      navigation.navigate('BreatheAndMove');
      
      Alert.alert(
        'Clase eliminada',
        'Tu clase ha sido eliminada y la clase se devolvió a tu paquete. Ahora puedes seleccionar una nueva fecha y hora.'
      );

    } catch (error) {
      console.error('Error rescheduling Breathe & Move class:', error);
      Alert.alert('Error', 'No se pudo reprogramar la clase. Inténtalo de nuevo.');
    }
  };

  const formatDate = (dateStr: string) => {
    // Para Breathe & Move, usar solo la fecha sin convertir a timestamp
    if (dateStr && !dateStr.includes('T')) {
      // Es solo una fecha YYYY-MM-DD
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
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
    
    console.log('Rendering appointment:', {
      id: appointment.id,
      status: appointment.status,
      date: appointment.appointment_date,
      isUpcoming: isUpcoming(appointment.appointment_date),
      canCancel: canCancel,
      notes: appointment.notes
    });

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

    // Citas médicas regulares y Breathe & Move
    return (
      <View 
        key={appointment.id} 
        style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={[styles.serviceIcon, { 
            backgroundColor: appointment.notes?.includes('Breathe & Move') 
              ? getClassColor(appointment.notes.split(' - ')[1] || '') 
              : (appointment.service?.color || '#879794') 
          }]}>
            {appointment.notes?.includes('Breathe & Move') ? (
              getClassIcon(appointment.notes.split(' - ')[1] || '')
            ) : (
              <ServiceIcon 
                serviceId={appointment.service?.id || getServiceConstantId(appointment.service_id)} 
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

        {canCancel ? (
          console.log('Rendering cancel/reschedule buttons for appointment:', appointment.id) || (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rescheduleButton]}
              onPress={() => {
                console.log('Reschedule button pressed for:', appointment.id);
                handleReschedule(appointment);
              }}
            >
              <Text style={styles.rescheduleButtonText}>Reprogramar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                console.log('Cancel button pressed for:', appointment.id);
                console.log('Button styles:', styles.actionButton, styles.cancelButton);
                handleCancelAppointment(appointment);
              }}
              onPressIn={() => console.log('Cancel button PRESSED IN')}
              onPressOut={() => console.log('Cancel button PRESSED OUT')}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )) : console.log('NOT rendering buttons for appointment:', appointment.id, 'canCancel:', canCancel)}
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
  detailIconView: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  rescheduleButton: {
    backgroundColor: Colors.primary.beige || '#F5E6D3',
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.dark,
  },
  rescheduleButtonText: {
    color: Colors.primary.dark,
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: '#FFE5E5',
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: Colors.ui.error,
    fontWeight: '600',
    fontSize: 14,
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