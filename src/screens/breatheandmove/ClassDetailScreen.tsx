import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { format, parseISO, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClassDetails {
  id: string;
  class_name: string;
  instructor: string;
  class_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_capacity: number;
  status: string;
  intensity?: string;
}

interface Enrollment {
  id: string;
  status: string;
  enrolled_at: string;
}

export const BreatheAndMoveClassDetailScreen = ({ navigation, route }: any) => {
  const { classId } = route.params;
  const [loading, setLoading] = useState(true);
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadClassDetails();
  }, [classId]);

  const loadClassDetails = async () => {
    try {
      setLoading(true);

      // Si es una clase temporal, mostrar datos locales
      if (classId.startsWith('temp_')) {
        const parts = classId.split('_');
        const className = parts[1];
        const date = parts[2];
        const time = parts[3] + ':' + parts[4];
        
        setClassDetails({
          id: classId,
          class_name: className,
          instructor: 'INSTRUCTOR',
          class_date: date,
          start_time: time,
          end_time: calculateEndTime(time),
          max_capacity: 12,
          current_capacity: 8,
          status: 'scheduled'
        });

        // Para clases temporales, simular inscripción
        setEnrollment({
          id: 'temp_enrollment',
          status: 'confirmed',
          enrolled_at: new Date().toISOString()
        });
      } else {
        // Cargar desde Supabase
        const { data: classData, error: classError } = await supabase
          .from('breathe_move_classes')
          .select('*')
          .eq('id', classId)
          .single();

        if (classError) throw classError;
        setClassDetails(classData);

        // Cargar inscripción del usuario
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: enrollmentData } = await supabase
            .from('breathe_move_enrollments')
            .select('*')
            .eq('class_id', classId)
            .eq('user_id', user.id)
            .single();

          if (enrollmentData) {
            setEnrollment(enrollmentData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading class details:', error);
      Alert.alert('Error', 'No se pudo cargar la información de la clase');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const calculateEndTime = (startTime: string): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = minutes + 50 >= 60 ? hours + 1 : hours;
    const endMinutes = (minutes + 50) % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const handleCancelEnrollment = () => {
    if (!classDetails) return;

    const classDateTime = new Date(`${classDetails.class_date}T${classDetails.start_time}`);
    const twoHoursBefore = addMinutes(classDateTime, -120);
    const now = new Date();

    if (now > twoHoursBefore) {
      Alert.alert(
        'No se puede cancelar',
        'Las cancelaciones deben hacerse con al menos 2 horas de anticipación.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Cancelar inscripción',
      '¿Estás seguro de que deseas cancelar tu inscripción a esta clase?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: confirmCancellation }
      ]
    );
  };

  const confirmCancellation = async () => {
    try {
      setCancelling(true);

      if (classId.startsWith('temp_')) {
        // Para clases temporales, simular cancelación
        Alert.alert(
          'Inscripción cancelada',
          'Tu inscripción ha sido cancelada exitosamente.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Actualizar estado de inscripción
      const { error } = await supabase
        .from('breathe_move_enrollments')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('class_id', classId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Si la inscripción usó un paquete, devolver la clase
      if (enrollment?.package_id) {
        await supabase.rpc('restore_package_class', {
          package_id: enrollment.package_id
        });
      }

      Alert.alert(
        'Inscripción cancelada',
        'Tu inscripción ha sido cancelada exitosamente.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error cancelling enrollment:', error);
      Alert.alert('Error', 'No se pudo cancelar la inscripción');
    } finally {
      setCancelling(false);
    }
  };

  const handleAddToCalendar = () => {
    Alert.alert(
      'Añadir al calendario',
      'Esta función estará disponible próximamente',
      [{ text: 'OK' }]
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

  if (!classDetails || !enrollment) return null;

  const classDateTime = new Date(`${classDetails.class_date}T${classDetails.start_time}`);
  const isPast = classDateTime < new Date();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles de la clase</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.classCard}>
          <View style={styles.enrollmentStatus}>
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color={Colors.primary.green} 
            />
            <Text style={styles.enrollmentText}>Inscrito</Text>
          </View>

          <Text style={styles.className}>{classDetails.class_name}</Text>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons 
                name="account" 
                size={20} 
                color={Colors.text.secondary} 
              />
              <Text style={styles.detailLabel}>Instructor</Text>
              <Text style={styles.detailValue}>{classDetails.instructor}</Text>
            </View>

            <View style={styles.detailItem}>
              <MaterialCommunityIcons 
                name="calendar" 
                size={20} 
                color={Colors.text.secondary} 
              />
              <Text style={styles.detailLabel}>Fecha</Text>
              <Text style={styles.detailValue}>
                {format(parseISO(classDetails.class_date), "d 'de' MMMM", { locale: es })}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <MaterialCommunityIcons 
                name="clock" 
                size={20} 
                color={Colors.text.secondary} 
              />
              <Text style={styles.detailLabel}>Horario</Text>
              <Text style={styles.detailValue}>
                {classDetails.start_time} - {classDetails.end_time}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <MaterialCommunityIcons 
                name="timer" 
                size={20} 
                color={Colors.text.secondary} 
              />
              <Text style={styles.detailLabel}>Duración</Text>
              <Text style={styles.detailValue}>50 minutos</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleAddToCalendar}
          >
            <Ionicons name="calendar-outline" size={20} color={Colors.primary.dark} />
            <Text style={styles.actionButtonText}>Añadir al calendario</Text>
          </TouchableOpacity>

          {!isPast && (
            <TouchableOpacity 
              style={[styles.cancelButton, cancelling && styles.buttonDisabled]}
              onPress={handleCancelEnrollment}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator color={Colors.ui.error} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color={Colors.ui.error} />
                  <Text style={styles.cancelButtonText}>Cancelar inscripción</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Información importante</Text>
          <View style={styles.infoItem}>
            <Ionicons name="location" size={16} color={Colors.text.secondary} />
            <Text style={styles.infoText}>
              Healing Forest - Sala de yoga y movimiento
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="shirt" size={16} color={Colors.text.secondary} />
            <Text style={styles.infoText}>
              Usar ropa cómoda para movimiento
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="water" size={16} color={Colors.text.secondary} />
            <Text style={styles.infoText}>
              Traer botella de agua y toalla personal
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={16} color={Colors.text.secondary} />
            <Text style={styles.infoText}>
              Llegar 10 minutos antes del inicio
            </Text>
          </View>
        </View>

        {enrollment.status === 'confirmed' && !isPast && (
          <View style={styles.reminderSection}>
            <MaterialCommunityIcons 
              name="bell-ring" 
              size={24} 
              color={Colors.primary.green} 
            />
            <Text style={styles.reminderText}>
              Te enviaremos un recordatorio 24 horas antes de la clase
            </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.ui.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 40,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  enrollmentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  enrollmentText: {
    fontSize: 16,
    color: Colors.primary.green,
    fontWeight: '600',
    marginLeft: 8,
  },
  className: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 24,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  detailItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.text.light,
    marginTop: 4,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  actionsContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.primary.dark,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginLeft: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.ui.error,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ui.error,
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoSection: {
    backgroundColor: Colors.ui.surface,
    marginHorizontal: 24,
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 12,
    flex: 1,
  },
  reminderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.success + '20',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
  },
  reminderText: {
    fontSize: 14,
    color: Colors.primary.green,
    marginLeft: 12,
    flex: 1,
  },
});