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
import { useNotifications } from '../../hooks/useNotifications';

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

interface UserMembership {
  id: string;
  membership_type_id: string;
  classes_remaining: number | null;
  membership_type?: {
    name: string;
    type: string;
  };
}

export const ClassEnrollmentScreen = ({ route, navigation }: any) => {
  const { classId } = route.params;
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [userMembership, setUserMembership] = useState<UserMembership | null>(null);
  const { scheduleClassNotifications } = useNotifications();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadClassDetail(),
        loadUserMembership()
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

  const loadUserMembership = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_memberships')
        .select(`
          *,
          membership_type:membership_types(name, type)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setUserMembership(data);
    } catch (error) {
      console.error('Error loading membership:', error);
    }
  };

  const handleEnroll = async () => {
    if (!userMembership) {
      Alert.alert(
        'Membresía requerida',
        'Necesitas una membresía activa para inscribirte.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver membresías', onPress: () => navigation.navigate('Memberships') }
        ]
      );
      return;
    }

    if (userMembership.classes_remaining !== null && userMembership.classes_remaining <= 0) {
      Alert.alert(
        'Sin clases disponibles',
        'No tienes clases disponibles en tu membresía actual.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Renovar membresía', onPress: () => navigation.navigate('Memberships') }
        ]
      );
      return;
    }

    setEnrolling(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Inscribir al usuario en la clase
      const { error } = await supabase
        .from('class_enrollments')
        .insert({
          class_id: classId,
          user_id: user.id,
          membership_id: userMembership.id,
          status: 'enrolled'
        });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Ya inscrito', 'Ya estás inscrito en esta clase');
        } else {
          throw error;
        }
        return;
      }

      // Programar notificaciones para la clase
      if (classDetail) {
        const classDateTime = new Date(`${classDetail.class_date}T${classDetail.start_time}`);
        await scheduleClassNotifications(
          classId,
          classDetail.class_type?.name || 'Clase Hot Studio',
          classDateTime
        );
      }

      Alert.alert(
        '¡Inscripción exitosa!',
        'Te has inscrito correctamente en la clase.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error enrolling in class:', error);
      Alert.alert('Error', 'No se pudo completar la inscripción');
    } finally {
      setEnrolling(false);
    }
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
  const spotsAvailable = classDetail.max_capacity - classDetail.current_capacity;

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
          <Text style={styles.classDescription}>
            {classDetail.class_type?.description}
          </Text>
        </View>

        <View style={styles.content}>
          {/* Información de fecha y hora */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📅</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Fecha</Text>
                <Text style={styles.infoValue}>
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
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>⏱️</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Duración</Text>
                <Text style={styles.infoValue}>
                  {classDetail.class_type?.duration} minutos
                </Text>
              </View>
            </View>
          </View>

          {/* Información del instructor */}
          {classDetail.instructor && (
            <View style={styles.instructorCard}>
              <Text style={styles.sectionTitle}>Instructor</Text>
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
                    <Text style={styles.instructorBio} numberOfLines={2}>
                      {classDetail.instructor.bio}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Capacidad */}
          <View style={styles.capacityCard}>
            <Text style={styles.sectionTitle}>Disponibilidad</Text>
            <View style={styles.capacityInfo}>
              <View style={styles.capacityBar}>
                <View 
                  style={[
                    styles.capacityFill,
                    { width: `${(classDetail.current_capacity / classDetail.max_capacity) * 100}%` }
                  ]}
                />
              </View>
              <Text style={styles.capacityText}>
                {spotsAvailable} cupos disponibles de {classDetail.max_capacity}
              </Text>
            </View>
          </View>

          {/* Información de membresía */}
          {userMembership && (
            <View style={styles.membershipInfo}>
              <Text style={styles.membershipLabel}>Tu membresía:</Text>
              <Text style={styles.membershipName}>
                {userMembership.membership_type?.name}
              </Text>
              {userMembership.classes_remaining !== null && (
                <Text style={styles.classesRemaining}>
                  {userMembership.classes_remaining} clases restantes
                </Text>
              )}
            </View>
          )}

          {/* Notas especiales */}
          {classDetail.notes && (
            <View style={styles.notesCard}>
              <Text style={styles.notesTitle}>Notas importantes</Text>
              <Text style={styles.notesText}>{classDetail.notes}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.enrollButton,
            (enrolling || spotsAvailable === 0) && styles.enrollButtonDisabled
          ]}
          onPress={handleEnroll}
          disabled={enrolling || spotsAvailable === 0}
        >
          {enrolling ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.enrollButtonText}>
              {spotsAvailable === 0 ? 'Clase llena' : 'Inscribirme en esta clase'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  classDescription: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
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
  capacityCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  capacityInfo: {
    gap: 12,
  },
  capacityBar: {
    height: 8,
    backgroundColor: Colors.ui.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    backgroundColor: Colors.primary.green,
  },
  capacityText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  membershipInfo: {
    backgroundColor: Colors.primary.beige + '30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  membershipLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  membershipName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.dark,
  },
  classesRemaining: {
    fontSize: 14,
    color: Colors.primary.green,
    marginTop: 4,
  },
  notesCard: {
    backgroundColor: Colors.ui.info + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 100,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.ui.background,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.divider,
  },
  enrollButton: {
    backgroundColor: Colors.primary.green,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  enrollButtonDisabled: {
    backgroundColor: Colors.text.light,
  },
  enrollButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});