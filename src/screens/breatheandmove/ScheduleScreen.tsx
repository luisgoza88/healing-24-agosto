import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../constants/colors';
import { SEPTEMBER_2025_SCHEDULE, getClassesByDay } from '../../constants/breatheMoveSchedule';

const { width } = Dimensions.get('window');

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
    'WildPower': '#B8604D', // Pantone 7523C - Terracota
    'GutReboot': '#879794', // Pantone 5497C - Gris verde
    'FireRush': '#5E3532', // Pantone 7630C - Vino/Borgoña
    'BloomBeat': '#ECD0B6', // Pantone 475C - Coral suave
    'WindMove': '#B2B8B0', // Pantone 5655C - Gris claro
    'ForestFire': '#3E5444', // Pantone 7736C - Verde bosque
    'StoneBarre': '#879794', // Pantone 5497C - Gris verde
    'OmRoot': '#3E5444', // Pantone 7736C - Verde bosque
    'HazeRocket': '#61473B', // Pantone 411C - Café oscuro
    'MoonRelief': '#1F2E3B', // Pantone 532C - Azul marino
    'WindFlow': '#879794', // Pantone 5497C - Gris verde
    'WaveMind': '#61473B' // Pantone 411C - Café oscuro
  };
  return colors[className] || '#879794';
};

export const ScheduleScreen = ({ navigation }: any) => {
  const [selectedDay, setSelectedDay] = useState(1); // Lunes por defecto
  const dayClasses = getClassesByDay(selectedDay);

  const renderClassItem = (classItem: any) => {
    const color = getClassColor(classItem.className);
    
    return (
      <TouchableOpacity
        key={classItem.id}
        style={[styles.classCard, { backgroundColor: color }]}
        activeOpacity={0.8}
        onPress={() => {
          // Generar un ID temporal para la clase
          const tempId = `temp_${classItem.className}_2025-09-0${selectedDay}_${classItem.time.replace(':', '_')}`;
          navigation.navigate('BreatheAndMoveClassEnrollment', { classId: tempId });
        }}
      >
        <View style={styles.classTime}>
          <Text style={styles.timeText}>{classItem.time}</Text>
        </View>
        <View style={styles.classInfo}>
          <Text style={styles.className}>{classItem.className}</Text>
          <Text style={styles.instructor}>{classItem.instructor}</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Horarios Septiembre 2025</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.monthHeader}>
        <MaterialCommunityIcons name="calendar-month" size={24} color={Colors.primary.dark} />
        <Text style={styles.monthText}>SEPTIEMBRE 2025</Text>
      </View>

      <View style={styles.daySelector}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daySelectorContent}
        >
          {DAYS.map(day => (
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
                styles.dayName,
                selectedDay === day.id && styles.dayNameActive
              ]}>
                {day.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.classesContainer}
      >
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>
            {DAYS.find(d => d.id === selectedDay)?.name}
          </Text>
          <Text style={styles.classCount}>
            {dayClasses.length} clases
          </Text>
        </View>

        {dayClasses.map(renderClassItem)}

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
  headerRight: {
    width: 40,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
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
  },
  intensityBadge: {
    width: 30,
    alignItems: 'center',
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