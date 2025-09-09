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
import { format, addDays, startOfWeek, isSameDay, getDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { getClassesByType } from '../../constants/breatheMoveSchedule';

interface Class {
  id: string;
  className: string;
  instructor: string;
  time: string;
  class_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_capacity: number;
  status: string;
}

export const ClassScheduleScreen = ({ navigation, route }: any) => {
  const { className, classDescription } = route.params;
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const today = new Date();
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrolledClasses, setEnrolledClasses] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadClasses();
  }, [className]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      
      const startDate = format(today, 'yyyy-MM-dd');
      const endDate = format(addDays(today, 6), 'yyyy-MM-dd');
      
      const { data: supabaseClasses, error } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .eq('class_name', className)
        .gte('class_date', startDate)
        .lte('class_date', endDate)
        .order('class_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!error && supabaseClasses && supabaseClasses.length > 0) {
        // Si hay clases en Supabase, las usamos
        setClasses(supabaseClasses);
      } else {
        // Si no hay clases en Supabase, generar desde el horario
        const classesForType = getClassesByType(className);
        const weekClasses: Class[] = [];
        
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const currentDate = addDays(weekStart, dayOffset);
          const dayOfWeek = getDay(currentDate);
          const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Ajustar domingo
          
          // Filtrar las clases que corresponden a este día
          const dayClasses = classesForType.filter(c => c.dayOfWeek === adjustedDayOfWeek);
          
          // Crear objetos de clase para cada horario
          dayClasses.forEach(scheduleClass => {
            // Calcular la hora de fin (50 minutos después)
            const [hours, minutes] = scheduleClass.time.split(':').map(Number);
            const endHours = minutes + 50 >= 60 ? hours + 1 : hours;
            const endMinutes = (minutes + 50) % 60;
            const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
            
            weekClasses.push({
              id: `${format(currentDate, 'yyyy-MM-dd')}_${scheduleClass.id}`,
              className: scheduleClass.className,
              instructor: scheduleClass.instructor,
              time: scheduleClass.time,
              class_date: format(currentDate, 'yyyy-MM-dd'),
              start_time: scheduleClass.time,
              end_time: endTime,
              max_capacity: 12,
              current_capacity: Math.floor(Math.random() * 8),
              status: 'scheduled'
            });
          });
        }
        
        // Ordenar por fecha y hora
        weekClasses.sort((a, b) => {
          const dateCompare = a.class_date.localeCompare(b.class_date);
          if (dateCompare !== 0) return dateCompare;
          return a.start_time.localeCompare(b.start_time);
        });
        
        setClasses(weekClasses);
      }
      
      // Cargar inscripciones del usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: enrollments } = await supabase
          .from('breathe_move_enrollments')
          .select('class_id')
          .eq('user_id', user.id)
          .eq('status', 'confirmed');
        
        if (enrollments) {
          setEnrolledClasses(enrollments.map(e => e.class_id));
        }
      }
      
    } catch (error) {
      console.error('Error loading classes:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar las clases');
    } finally {
      setLoading(false);
    }
  };


  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleClassPress = (classItem: Class) => {
    if (enrolledClasses.includes(classItem.id)) {
      navigation.navigate('BreatheAndMoveClassDetail', { classId: classItem.id });
    } else {
      navigation.navigate('BreatheAndMoveClassEnrollment', { classId: classItem.id });
    }
  };

  const renderWeekDays = () => {
    return next7Days.map((date, i) => {
      const isSelected = isSameDay(date, selectedDate);
      const isTodayDate = isToday(date);
      const dayClasses = classes.filter(c => c.class_date === format(date, 'yyyy-MM-dd'));

      return (
        <TouchableOpacity
          key={i}
          style={[
            styles.dayButton,
            isSelected && styles.dayButtonSelected,
            isTodayDate && styles.dayButtonToday
          ]}
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
          {isTodayDate && (
            <Text style={[styles.todayLabel, isSelected && styles.todayLabelSelected]}>
              HOY
            </Text>
          )}
        </TouchableOpacity>
      );
    });
  };

  const renderClassCard = (classItem: Class) => {
    const isEnrolled = enrolledClasses.includes(classItem.id);
    const isFull = classItem.current_capacity >= classItem.max_capacity;

    return (
      <TouchableOpacity
        key={classItem.id}
        style={styles.classCard}
        onPress={() => handleClassPress(classItem)}
        activeOpacity={0.8}
      >
        <View style={styles.classHeader}>
          <View style={styles.classTime}>
            <Text style={styles.classTimeText}>
              {classItem.start_time}
            </Text>
            <Text style={styles.classDuration}>
              {classItem.end_time}
            </Text>
          </View>
          <View style={styles.classInfo}>
            <Text style={styles.instructorName}>
              {classItem.instructor}
            </Text>
            <View style={styles.capacityContainer}>
              <MaterialCommunityIcons 
                name="account-group" 
                size={16} 
                color={Colors.text.secondary} 
              />
              <Text style={styles.capacityText}>
                {classItem.current_capacity}/{classItem.max_capacity}
              </Text>
            </View>
          </View>
          {isEnrolled ? (
            <View style={styles.enrolledBadge}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.secondary.green} />
            </View>
          ) : isFull ? (
            <View style={styles.fullBadge}>
              <Text style={styles.fullText}>LLENO</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
          )}
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
          <ActivityIndicator size="large" color={Colors.primary.dark} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary.dark} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{className}</Text>
          <Text style={styles.headerSubtitle}>{classDescription}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.dateRangeHeader}>
        <Text style={styles.dateRangeText}>
          {className} - Próximos 7 días
        </Text>
        <Text style={styles.dateRangeSubtext}>
          {format(today, 'd MMM', { locale: es })} - {format(addDays(today, 6), 'd MMM yyyy', { locale: es })}
        </Text>
      </View>

      <View style={styles.weekDays}>
        {renderWeekDays()}
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadClasses().finally(() => setRefreshing(false));
            }}
            colors={[Colors.primary.dark]}
          />
        }
      >
        <View style={styles.content}>
          {selectedDayClasses.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons 
                name="calendar-blank" 
                size={64} 
                color={Colors.text.light} 
              />
              <Text style={styles.emptyTitle}>
                No hay clases programadas
              </Text>
              <Text style={styles.emptyDescription}>
                {className} no tiene clases este día
              </Text>
            </View>
          ) : (
            selectedDayClasses.map(renderClassCard)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 85, // Espacio para la barra de navegación
  },
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  dateRangeHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  dateRangeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  dateRangeSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
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
    backgroundColor: Colors.primary.dark,
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
  dayButtonToday: {
    borderWidth: 2,
    borderColor: Colors.primary.green,
  },
  todayLabel: {
    position: 'absolute',
    top: 2,
    fontSize: 8,
    fontWeight: 'bold',
    color: Colors.primary.green,
    letterSpacing: 0.5,
  },
  todayLabelSelected: {
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classTime: {
    marginRight: 16,
    alignItems: 'center',
  },
  classTimeText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
  },
  classDuration: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  classInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capacityText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 4,
  },
  enrolledBadge: {
    padding: 4,
  },
  fullBadge: {
    backgroundColor: Colors.ui.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  fullText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    color: Colors.text.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.text.light,
    textAlign: 'center',
  },
});