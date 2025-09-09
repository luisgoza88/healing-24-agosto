import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { format, addDays, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { SEPTEMBER_2025_SCHEDULE } from '../../constants/breatheMoveSchedule';

const { width } = Dimensions.get('window');

interface BreatheMoveClass {
  id: string;
  class_name: string;
  instructor: string;
  class_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_capacity: number;
  status: string;
  intensity: string;
}

const DAYS = [
  { id: 1, name: 'Lunes', short: 'LUN' },
  { id: 2, name: 'Martes', short: 'MAR' },
  { id: 3, name: 'Miércoles', short: 'MIÉ' },
  { id: 4, name: 'Jueves', short: 'JUE' },
  { id: 5, name: 'Viernes', short: 'VIE' },
  { id: 6, name: 'Sábado', short: 'SÁB' }
];

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

export const ScheduleScreen = ({ navigation }: any) => {
  const [selectedDay, setSelectedDay] = useState(1);
  const [classes, setClasses] = useState<BreatheMoveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Semana actual

  useEffect(() => {
    loadClassesForWeek(weekStart);
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      
      // Primero intentar cargar clases de la semana actual desde Supabase
      const startDate = weekStart;
      const endDate = addDays(weekStart, 6);
      
      const { data, error } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .gte('class_date', format(startDate, 'yyyy-MM-dd'))
        .lte('class_date', format(endDate, 'yyyy-MM-dd'))
        .order('class_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!error && data && data.length > 0) {
        // Si hay clases en Supabase, las usamos
        setClasses(data);
      } else {
        // Si no hay clases en Supabase, generar desde el horario
        const generatedClasses: BreatheMoveClass[] = [];
        
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const currentDate = addDays(startDate, dayOffset);
          const dayOfWeek = getDay(currentDate);
          const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Ajustar domingo
          
          // Obtener clases del horario para este día
          const dayClasses = SEPTEMBER_2025_SCHEDULE.filter(c => c.dayOfWeek === adjustedDayOfWeek);
          
          dayClasses.forEach(scheduleClass => {
            // Calcular hora de fin (50 minutos después)
            const [hours, minutes] = scheduleClass.time.split(':').map(Number);
            const endHours = minutes + 50 >= 60 ? hours + 1 : hours;
            const endMinutes = (minutes + 50) % 60;
            const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
            
            generatedClasses.push({
              id: `${format(currentDate, 'yyyy-MM-dd')}_${scheduleClass.id}`,
              class_name: scheduleClass.className,
              instructor: scheduleClass.instructor,
              class_date: format(currentDate, 'yyyy-MM-dd'),
              start_time: scheduleClass.time,
              end_time: endTime,
              max_capacity: 12,
              current_capacity: Math.floor(Math.random() * 8),
              status: 'scheduled',
              intensity: scheduleClass.intensity
            });
          });
        }
        
        setClasses(generatedClasses);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClassesForWeek(weekStart).finally(() => setRefreshing(false));
  };

  const getClassesForDay = (dayNumber: number) => {
    // Calcular la fecha para el día seleccionado
    const targetDate = addDays(weekStart, dayNumber - 1);
    const dateString = format(targetDate, 'yyyy-MM-dd');
    
    return classes.filter(c => c.class_date === dateString);
  };

  const handleClassPress = (classItem: BreatheMoveClass) => {
    navigation.navigate('BreatheAndMoveClassEnrollment', { classId: classItem.id });
  };

  const renderClassItem = (classItem: BreatheMoveClass) => {
    const color = getClassColor(classItem.class_name);
    const spotsLeft = classItem.max_capacity - classItem.current_capacity;
    
    return (
      <TouchableOpacity
        key={classItem.id}
        style={[styles.classCard, { backgroundColor: color }]}
        activeOpacity={0.8}
        onPress={() => handleClassPress(classItem)}
      >
        <View style={styles.classTime}>
          <Text style={styles.timeText}>{classItem.start_time.slice(0, 5)}</Text>
        </View>
        <View style={styles.classInfo}>
          <Text style={styles.className}>{classItem.class_name}</Text>
          <Text style={styles.instructor}>{classItem.instructor}</Text>
          <Text style={styles.spotsLeft}>
            {spotsLeft > 0 ? `${spotsLeft} lugares disponibles` : 'Clase llena'}
          </Text>
        </View>
        <View style={styles.intensityBadge}>
          {classItem.intensity === 'high' && (
            <MaterialCommunityIcons name="fire" size={16} color="#FFFFFF" />
          )}
          {classItem.intensity === 'medium' && (
            <MaterialCommunityIcons name="fire" size={16} color="rgba(255,255,255,0.6)" />
          )}
          {classItem.intensity === 'low' && (
            <MaterialCommunityIcons name="leaf" size={16} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handlePreviousWeek = () => {
    const newWeekStart = addDays(weekStart, -7);
    setWeekStart(newWeekStart);
    loadClassesForWeek(newWeekStart);
  };

  const handleNextWeek = () => {
    const newWeekStart = addDays(weekStart, 7);
    setWeekStart(newWeekStart);
    loadClassesForWeek(newWeekStart);
  };

  const loadClassesForWeek = async (weekStartDate: Date) => {
    try {
      setLoading(true);
      
      const startDate = weekStartDate;
      const endDate = addDays(weekStartDate, 6);
      
      const { data, error } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .gte('class_date', format(startDate, 'yyyy-MM-dd'))
        .lte('class_date', format(endDate, 'yyyy-MM-dd'))
        .order('class_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!error && data && data.length > 0) {
        setClasses(data);
      } else {
        // Si no hay clases en Supabase, generar desde el horario
        const generatedClasses: BreatheMoveClass[] = [];
        
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const currentDate = addDays(startDate, dayOffset);
          const dayOfWeek = getDay(currentDate);
          const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
          
          const dayClasses = SEPTEMBER_2025_SCHEDULE.filter(c => c.dayOfWeek === adjustedDayOfWeek);
          
          dayClasses.forEach(scheduleClass => {
            const [hours, minutes] = scheduleClass.time.split(':').map(Number);
            const endHours = minutes + 50 >= 60 ? hours + 1 : hours;
            const endMinutes = (minutes + 50) % 60;
            const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
            
            generatedClasses.push({
              id: `${format(currentDate, 'yyyy-MM-dd')}_${scheduleClass.id}`,
              class_name: scheduleClass.className,
              instructor: scheduleClass.instructor,
              class_date: format(currentDate, 'yyyy-MM-dd'),
              start_time: scheduleClass.time,
              end_time: endTime,
              max_capacity: 12,
              current_capacity: Math.floor(Math.random() * 8),
              status: 'scheduled',
              intensity: scheduleClass.intensity
            });
          });
        }
        
        setClasses(generatedClasses);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const dayClasses = getClassesForDay(selectedDay);

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
        <Text style={styles.headerTitle}>Horarios</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={24} color={Colors.primary.dark} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekNavigation}>
        <TouchableOpacity 
          onPress={handlePreviousWeek}
          style={styles.weekArrow}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.primary.dark} />
        </TouchableOpacity>
        
        <View style={styles.monthHeader}>
          <MaterialCommunityIcons name="calendar-month" size={20} color={Colors.primary.dark} />
          <Text style={styles.monthText}>
            {format(weekStart, 'MMMM yyyy', { locale: es }).toUpperCase()}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={handleNextWeek}
          style={styles.weekArrow}
        >
          <Ionicons name="chevron-forward" size={24} color={Colors.primary.dark} />
        </TouchableOpacity>
      </View>

      <View style={styles.daySelector}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daySelectorContent}
        >
          {DAYS.map((day, index) => {
            const dayDate = addDays(weekStart, index);
            const hasClasses = classes.some(c => c.class_date === format(dayDate, 'yyyy-MM-dd'));
            
            return (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayButton,
                  selectedDay === day.id && styles.dayButtonActive
                ]}
                onPress={() => setSelectedDay(day.id)}
              >
                <Text style={[
                  styles.dayButtonText,
                  selectedDay === day.id && styles.dayButtonTextActive
                ]}>
                  {day.short}
                </Text>
                <Text style={[
                  styles.dayDate,
                  selectedDay === day.id && styles.dayDateActive
                ]}>
                  {format(dayDate, 'd')}
                </Text>
                {hasClasses && (
                  <View style={[
                    styles.dayIndicator,
                    selectedDay === day.id && styles.dayIndicatorActive
                  ]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.classesContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.dark]}
          />
        }
      >
        <View style={styles.dayHeader}>
          <View>
            <Text style={styles.dayTitle}>
              {DAYS.find(d => d.id === selectedDay)?.name}
            </Text>
            <Text style={styles.daySubtitle}>
              {format(addDays(weekStart, selectedDay - 1), "d 'de' MMMM", { locale: es })}
            </Text>
          </View>
          <Text style={styles.classCount}>
            {dayClasses.length} clases
          </Text>
        </View>

        {dayClasses.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank" size={48} color={Colors.text.light} />
            <Text style={styles.emptyTitle}>No hay clases este día</Text>
            <Text style={styles.emptyText}>
              Revisa otros días de la semana
            </Text>
          </View>
        ) : (
          dayClasses.map(renderClassItem)
        )}

        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={Colors.text.secondary} />
            <Text style={styles.infoText}>Todas las clases tienen una duración de 50 minutos</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="fire" size={20} color={Colors.text.secondary} />
            <Text style={styles.infoText}>Clases sin calor infrarrojo</Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.ui.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  weekArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.ui.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginLeft: 8,
    letterSpacing: 1,
  },
  daySelector: {
    height: 80,
    backgroundColor: Colors.ui.surface,
  },
  daySelectorContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  dayButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 25,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: Colors.primary.dark,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text.secondary,
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
  },
  dayName: {
    fontSize: 12,
    color: Colors.text.light,
    marginTop: 2,
  },
  dayNameActive: {
    color: '#FFFFFF',
  },
  dayDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 2,
  },
  dayDateActive: {
    color: '#FFFFFF',
  },
  dayIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary.green,
    position: 'absolute',
    bottom: 4,
  },
  dayIndicatorActive: {
    backgroundColor: '#FFFFFF',
  },
  classesContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  daySubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  classCount: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  classTime: {
    width: 60,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  classInfo: {
    flex: 1,
    marginLeft: 16,
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  instructor: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 2,
  },
  spotsLeft: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },
  intensityBadge: {
    width: 30,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.text.light,
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
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
});