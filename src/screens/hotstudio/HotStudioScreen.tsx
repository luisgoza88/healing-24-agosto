import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClassType {
  id: string;
  name: string;
  description: string;
  duration: number;
  max_capacity: number;
  color: string;
  icon: string;
}

interface Class {
  id: string;
  class_type_id: string;
  instructor_id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_capacity: number;
  status: string;
  class_type?: ClassType;
  instructor?: {
    name: string;
  };
}

interface UserMembership {
  id: string;
  membership_type_id: string;
  start_date: string;
  end_date: string;
  classes_remaining: number | null;
  status: string;
  membership_type?: {
    name: string;
    type: string;
  };
}

export const HotStudioScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [classes, setClasses] = useState<Class[]>([]);
  const [userMembership, setUserMembership] = useState<UserMembership | null>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [weekStart]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadClasses(),
        loadUserMembership(),
        loadUserEnrollments()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudieron cargar las clases');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadClasses = async () => {
    try {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          class_type:class_types(*),
          instructor:instructors(name)
        `)
        .gte('class_date', startDate)
        .lte('class_date', endDate)
        .eq('status', 'scheduled')
        .order('class_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
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

  const loadUserEnrollments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('status', 'enrolled');

      if (error) throw error;
      setEnrolledClasses((data || []).map(e => e.class_id));
    } catch (error) {
      console.error('Error loading enrollments:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePreviousWeek = () => {
    const newWeekStart = addDays(weekStart, -7);
    setWeekStart(newWeekStart);
    setSelectedDate(addDays(newWeekStart, selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1));
  };

  const handleNextWeek = () => {
    const newWeekStart = addDays(weekStart, 7);
    setWeekStart(newWeekStart);
    setSelectedDate(addDays(newWeekStart, selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1));
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleClassPress = (classItem: Class) => {
    if (!userMembership) {
      Alert.alert(
        'Membresía requerida',
        'Necesitas una membresía activa para inscribirte en las clases.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver membresías', onPress: () => navigation.navigate('Memberships') }
        ]
      );
      return;
    }

    if (enrolledClasses.includes(classItem.id)) {
      navigation.navigate('ClassDetail', { classId: classItem.id });
    } else if (classItem.current_capacity >= classItem.max_capacity) {
      Alert.alert(
        'Clase llena',
        '¿Deseas unirte a la lista de espera?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Sí', onPress: () => joinWaitlist(classItem.id) }
        ]
      );
    } else {
      navigation.navigate('ClassEnrollment', { classId: classItem.id });
    }
  };

  const joinWaitlist = async (classId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('class_waitlist')
        .insert({
          class_id: classId,
          user_id: user.id,
          position: 1 // Esto debería calcularse basado en la posición actual
        });

      if (error) throw error;
      Alert.alert('Éxito', 'Te has unido a la lista de espera');
    } catch (error) {
      console.error('Error joining waitlist:', error);
      Alert.alert('Error', 'No se pudo unir a la lista de espera');
    }
  };

  const renderWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const isSelected = isSameDay(date, selectedDate);
      const dayClasses = classes.filter(c => c.class_date === format(date, 'yyyy-MM-dd'));

      days.push(
        <TouchableOpacity
          key={i}
          style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
          onPress={() => handleDateSelect(date)}
        >
          <Text style={[styles.dayName, isSelected && styles.dayTextSelected]}>
            {format(date, 'EEE', { locale: es }).toUpperCase()}
          </Text>
          <Text style={[styles.dayNumber, isSelected && styles.dayTextSelected]}>
            {format(date, 'd')}
          </Text>
          {dayClasses.length > 0 && (
            <View style={[styles.dayIndicator, isSelected && styles.dayIndicatorSelected]} />
          )}
        </TouchableOpacity>
      );
    }
    return days;
  };

  const getClassStyle = (className: string) => {
    const classStyles: { [key: string]: { color: string, icon: string, iconComponent: any } } = {
      'Yoga': { 
        color: Colors.secondary.green, 
        icon: 'yoga',
        iconComponent: MaterialCommunityIcons
      },
      'Pilates': { 
        color: Colors.secondary.grey, 
        icon: 'human',
        iconComponent: MaterialCommunityIcons
      },
      'Breathwork': { 
        color: Colors.secondary.terracotta, 
        icon: 'meditation',
        iconComponent: MaterialCommunityIcons
      },
      'Sound Healing': { 
        color: Colors.secondary.brown, 
        icon: 'music-note',
        iconComponent: MaterialCommunityIcons
      },
      'Breath & Sound': { 
        color: Colors.secondary.brown, 
        icon: 'music-note',
        iconComponent: MaterialCommunityIcons
      }
    };
    
    return classStyles[className] || { 
      color: Colors.primary.lightGray, 
      icon: 'leaf',
      iconComponent: MaterialCommunityIcons
    };
  };

  const renderClassCard = (classItem: Class) => {
    const isEnrolled = enrolledClasses.includes(classItem.id);
    const isFull = classItem.current_capacity >= classItem.max_capacity;
    const classStyle = getClassStyle(classItem.class_type?.name || '');
    const IconComponent = classStyle.iconComponent;

    return (
      <TouchableOpacity
        key={classItem.id}
        style={[
          styles.classCard,
          { backgroundColor: classStyle.color }
        ]}
        onPress={() => handleClassPress(classItem)}
        activeOpacity={0.8}
      >
        <View style={styles.classHeader}>
          <View style={styles.classIconContainer}>
            <IconComponent name={classStyle.icon} size={28} color="#FFFFFF" />
          </View>
          <View style={styles.classInfo}>
            <Text style={styles.className}>{classItem.class_type?.name}</Text>
            <Text style={styles.classTime}>
              {classItem.start_time.slice(0, 5)} - {classItem.end_time.slice(0, 5)}
            </Text>
          </View>
          {isEnrolled && (
            <View style={styles.enrolledBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={styles.enrolledText}>Inscrito</Text>
            </View>
          )}
        </View>

        <View style={styles.classDetails}>
          <Text style={styles.instructorName}>
            {classItem.instructor?.name || 'Instructor'}
          </Text>
          <View style={styles.capacityContainer}>
            <Text style={styles.capacityText}>
              {classItem.current_capacity}/{classItem.max_capacity} cupos
            </Text>
            {isFull && <Text style={styles.fullText}>LLENO</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const selectedDayClasses = classes.filter(
    c => c.class_date === format(selectedDate, 'yyyy-MM-dd')
  );

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
        <Text style={styles.title}>Hot Studio</Text>
        {userMembership && (
          <TouchableOpacity
            style={styles.membershipBadge}
            onPress={() => navigation.navigate('MyMembership')}
          >
            <Text style={styles.membershipText}>
              {userMembership.membership_type?.name}
            </Text>
            {userMembership.classes_remaining !== null && (
              <Text style={styles.classesRemaining}>
                {userMembership.classes_remaining} clases
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.weekNavigation}>
        <TouchableOpacity onPress={handlePreviousWeek} style={styles.weekButton}>
          <Text style={styles.weekButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.weekTitle}>
          {format(weekStart, 'MMMM yyyy', { locale: es })}
        </Text>
        <TouchableOpacity onPress={handleNextWeek} style={styles.weekButton}>
          <Text style={styles.weekButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekDays}>
        {renderWeekDays()}
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
          {classes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={Colors.text.light} />
              <Text style={styles.emptyTitle}>
                No hay clases programadas
              </Text>
              <Text style={styles.emptyDescription}>
                Parece que aún no hay clases creadas en el sistema.
                Contacta al administrador para programar las clases.
              </Text>
            </View>
          ) : selectedDayClasses.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="yoga" size={64} color={Colors.text.light} />
              <Text style={styles.emptyTitle}>
                No hay clases programadas para este día
              </Text>
            </View>
          ) : (
            selectedDayClasses.map(renderClassCard)
          )}
        </View>
      </ScrollView>

      {!userMembership && (
        <TouchableOpacity
          style={styles.getMembershipButton}
          onPress={() => navigation.navigate('Memberships')}
        >
          <Text style={styles.getMembershipText}>
            Obtén tu membresía para empezar
          </Text>
        </TouchableOpacity>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  membershipBadge: {
    backgroundColor: Colors.primary.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  membershipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  classesRemaining: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 2,
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  weekButton: {
    padding: 8,
  },
  weekButtonText: {
    fontSize: 24,
    color: Colors.primary.green,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
    textTransform: 'capitalize',
  },
  weekDays: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  dayButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 2,
    borderRadius: 12,
    backgroundColor: Colors.ui.surface,
  },
  dayButtonSelected: {
    backgroundColor: Colors.primary.green,
  },
  dayName: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 16,
    color: Colors.primary.dark,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  dayIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary.green,
    marginTop: 4,
  },
  dayIndicatorSelected: {
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  classCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  classIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  classTime: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  enrolledBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  enrolledText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  classDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instructorName: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  capacityContainer: {
    alignItems: 'flex-end',
  },
  capacityText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  fullText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.text.light,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  getMembershipButton: {
    backgroundColor: Colors.primary.green,
    margin: 24,
    padding: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  getMembershipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});