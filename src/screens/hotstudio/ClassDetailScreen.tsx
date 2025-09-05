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
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClassDetail {
  id: string;
  class_type_id: string;
  instructor_id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_capacity: number;
  status: string;
  notes?: string;
  class_type?: {
    name: string;
    description: string;
    duration: number;
    color: string;
    icon: string;
  };
  instructor?: {
    name: string;
    bio?: string;
    avatar_url?: string;
  };
}

interface Enrollment {
  id: string;
  status: string;
  created_at: string;
}

export const ClassDetailScreen = ({ route, navigation }: any) => {
  const { classId } = route.params;
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadClassDetail(),
        loadEnrollment()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudo cargar la información de la clase');
    } finally {
      setLoading(false);
    }
  };

  const loadClassDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          class_type:class_types(*),
          instructor:instructors(*)
        `)
        .eq('id', classId)
        .single();

      if (error) throw error;
      setClassDetail(data);
    } catch (error) {
      console.error('Error loading class detail:', error);
    }
  };

  const loadEnrollment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('class_enrollments')
        .select('*')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setEnrollment(data);
    } catch (error) {
      console.error('Error loading enrollment:', error);
    }
  };

  const handleCancelEnrollment = () => {
    Alert.alert(
      'Cancelar inscripción',
      '¿Estás seguro de que deseas cancelar tu inscripción a esta clase?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: cancelEnrollment }
      ]
    );
  };

  const cancelEnrollment = async () => {
    if (!enrollment) return;

    setCancelling(true);
    try {
      const { error } = await supabase
        .from('class_enrollments')
        .update({ status: 'cancelled' })
        .eq('id', enrollment.id);

      if (error) throw error;

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

  const addToCalendar = () => {
    Alert.alert(
      'Agregar al calendario',
      'Esta función estará disponible próximamente',
      [{ text: 'OK' }]
    );
  };

  if (loading || !classDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.green} />
        </View>
      </SafeAreaView>
    );
  }

  const classDate = new Date(classDetail.class_date);
  const isToday = format(classDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isPast = classDate < new Date();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View 
          style={[
            styles.classHeader,
            { backgroundColor: classDetail.class_type?.color || Colors.primary.green }
          ]}
        >
          <Text style={styles.classIcon}>{classDetail.class_type?.icon}</Text>
          <Text style={styles.className}>{classDetail.class_type?.name}</Text>
          {enrollment && (
            <View style={styles.enrollmentBadge}>
              <Text style={styles.enrollmentText}>✓ Inscrito</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Información de fecha y hora */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📅</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Fecha</Text>
                <Text style={styles.infoValue}>
                  {isToday ? 'Hoy, ' : ''}
                  {format(classDate, "EEEE d 'de' MMMM", { locale: es })}
                </Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>⏰</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Horario</Text>
                <Text style={styles.infoValue}>
                  {classDetail.start_time.slice(0, 5)} - {classDetail.end_time.slice(0, 5)}
                </Text>
              </View>
            </View>
          </View>

          {/* Información del instructor */}
          {classDetail.instructor && (
            <View style={styles.instructorCard}>
              <Text style={styles.sectionTitle}>Tu instructor</Text>
              <View style={styles.instructorInfo}>
                <View style={styles.instructorAvatar}>
                  <Text style={styles.instructorInitial}>
                    {classDetail.instructor.name[0]}
                  </Text>
                </View>
                <View style={styles.instructorDetails}>
                  <Text style={styles.instructorName}>
                    {classDetail.instructor.name}
                  </Text>
                  {classDetail.instructor.bio && (
                    <Text style={styles.instructorBio}>
                      {classDetail.instructor.bio}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Participantes */}
          <View style={styles.participantsCard}>
            <Text style={styles.sectionTitle}>Participantes</Text>
            <Text style={styles.participantsText}>
              {classDetail.current_capacity} de {classDetail.max_capacity} inscritos
            </Text>
            <View style={styles.participantsBar}>
              <View 
                style={[
                  styles.participantsFill,
                  { width: `${(classDetail.current_capacity / classDetail.max_capacity) * 100}%` }
                ]}
              />
            </View>
          </View>

          {/* Qué traer */}
          <View style={styles.whatToBringCard}>
            <Text style={styles.sectionTitle}>Qué traer</Text>
            <View style={styles.itemRow}>
              <Text style={styles.itemIcon}>🧘‍♀️</Text>
              <Text style={styles.itemText}>Mat de yoga</Text>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.itemIcon}>💧</Text>
              <Text style={styles.itemText}>Botella de agua</Text>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.itemIcon}>🧖‍♀️</Text>
              <Text style={styles.itemText}>Toalla pequeña</Text>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.itemIcon}>👕</Text>
              <Text style={styles.itemText}>Ropa cómoda</Text>
            </View>
          </View>

          {/* Botones de acción */}
          {!isPast && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.calendarButton}
                onPress={addToCalendar}
              >
                <Text style={styles.calendarButtonText}>
                  📅 Agregar al calendario
                </Text>
              </TouchableOpacity>

              {enrollment && enrollment.status === 'enrolled' && (
                <TouchableOpacity
                  style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
                  onPress={handleCancelEnrollment}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <ActivityIndicator color={Colors.ui.error} />
                  ) : (
                    <Text style={styles.cancelButtonText}>
                      Cancelar inscripción
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: Colors.primary.green,
    marginRight: 4,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary.green,
    fontWeight: '500',
  },
  classHeader: {
    padding: 32,
    alignItems: 'center',
  },
  classIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  className: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  enrollmentBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  enrollmentText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 24,
  },
  infoCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.primary.dark,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.ui.divider,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
  },
  instructorCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  instructorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  instructorInitial: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  instructorDetails: {
    flex: 1,
  },
  instructorName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 4,
  },
  instructorBio: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  participantsCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  participantsText: {
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  participantsBar: {
    height: 8,
    backgroundColor: Colors.ui.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  participantsFill: {
    height: '100%',
    backgroundColor: Colors.primary.green,
  },
  whatToBringCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
  },
  itemText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  actions: {
    gap: 12,
    marginBottom: 40,
  },
  calendarButton: {
    backgroundColor: Colors.primary.green,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  calendarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: Colors.ui.error,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: Colors.ui.error,
    fontSize: 16,
    fontWeight: '600',
  },
});