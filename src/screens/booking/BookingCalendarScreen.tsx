import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Colors } from '../../constants/colors';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../../lib/supabase';

// Configurar español para el calendario
LocaleConfig.locales['es'] = {
  monthNames: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ],
  monthNamesShort: [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ],
  dayNames: [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

interface BookingCalendarScreenProps {
  service: any;
  subService: any;
  professional: any;
  onBack: () => void;
  onNext: (date: string, time: string) => void;
}

export const BookingCalendarScreen: React.FC<BookingCalendarScreenProps> = ({
  service,
  subService,
  professional,
  onBack,
  onNext
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [busySlots, setBusySlots] = useState<Array<{start_time: string, end_time: string}>>([]);
  const [loading, setLoading] = useState(false);
  
  // Obtener fecha actual para establecer el mínimo
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  
  // Calcular fecha máxima (3 meses adelante)
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const maxDateString = maxDate.toISOString().split('T')[0];

  // Generar horarios disponibles basados en la duración del servicio
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 19.25; // 7:15 PM
    const duration = subService.duration; // en minutos
    
    // Generar slots cada 30 minutos
    for (let hour = startHour; hour < endHour; hour += 0.5) {
      const h = Math.floor(hour);
      const m = (hour % 1) * 60;
      const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      
      // Verificar que la cita termine antes o a las 7 PM
      const endTime = hour + (duration / 60);
      if (endTime <= endHour) {
        slots.push(timeString);
      }
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Cargar horarios ocupados cuando se selecciona una fecha
  useEffect(() => {
    if (selectedDate && professional?.id) {
      loadBusySlots();
    }
  }, [selectedDate, professional?.id]);

  const loadBusySlots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_professional_busy_slots', {
          p_professional_id: professional.id,
          p_date: selectedDate
        });

      if (error) {
        console.error('Error loading busy slots:', error);
        return;
      }

      setBusySlots(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Verificar si un horario está ocupado
  const isTimeSlotBusy = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const slotStart = hours * 60 + minutes;
    const slotEnd = slotStart + subService.duration;

    return busySlots.some(busy => {
      const [busyStartHours, busyStartMinutes] = busy.start_time.split(':').map(Number);
      const [busyEndHours, busyEndMinutes] = busy.end_time.split(':').map(Number);
      const busyStart = busyStartHours * 60 + busyStartMinutes;
      const busyEnd = busyEndHours * 60 + busyEndMinutes;

      // Verificar si hay solapamiento
      return (slotStart < busyEnd && slotEnd > busyStart);
    });
  };

  const handleDateSelect = (date: any) => {
    setSelectedDate(date.dateString);
    setSelectedTime(''); // Reset time when date changes
    setBusySlots([]); // Reset busy slots
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleNext = () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Error', 'Por favor selecciona fecha y hora');
      return;
    }
    onNext(selectedDate, selectedTime);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary.dark} />
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>Selecciona una fecha</Text>
          <Calendar
            current={minDate}
            minDate={minDate}
            maxDate={maxDateString}
            onDayPress={handleDateSelect}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: Colors.primary.dark,
              }
            }}
            theme={{
              backgroundColor: Colors.ui.background,
              calendarBackground: Colors.ui.background,
              textSectionTitleColor: Colors.text.secondary,
              selectedDayBackgroundColor: Colors.primary.dark,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: Colors.primary.dark,
              dayTextColor: Colors.text.primary,
              textDisabledColor: Colors.text.light,
              dotColor: Colors.primary.dark,
              selectedDotColor: '#FFFFFF',
              arrowColor: Colors.primary.dark,
              monthTextColor: Colors.primary.dark,
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '400',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14
            }}
          />
        </View>

        {selectedDate && (
          <View style={styles.timeSection}>
            <Text style={styles.sectionTitle}>Selecciona una hora</Text>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary.dark} style={styles.loader} />
            ) : (
              <View style={styles.timeGrid}>
                {timeSlots.map((time) => {
                  const isBusy = isTimeSlotBusy(time);
                  return (
                    <View key={time} style={styles.timeSlotWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.timeSlot,
                          selectedTime === time && styles.timeSlotSelected,
                          isBusy && styles.timeSlotBusy
                        ]}
                        onPress={() => !isBusy && handleTimeSelect(time)}
                        disabled={isBusy}
                      >
                        <Text
                          style={[
                            styles.timeText,
                            selectedTime === time && styles.timeTextSelected,
                            isBusy && styles.timeTextBusy
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {selectedDate && selectedTime && (
          <View style={styles.confirmSection}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumen de tu cita</Text>
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="calendar" size={20} color={Colors.secondary.green} />
                <Text style={styles.summaryText}>{selectedDate}</Text>
              </View>
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={Colors.secondary.green} />
                <Text style={styles.summaryText}>{selectedTime}</Text>
              </View>
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="timer-outline" size={20} color={Colors.secondary.green} />
                <Text style={styles.summaryText}>Duración: {subService.duration} min</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleNext}
            >
              <Text style={styles.confirmButtonText}>Continuar</Text>
            </TouchableOpacity>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: Colors.primary.dark,
    fontWeight: '500',
    marginLeft: 8,
  },
  calendarSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  timeSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeSlotWrapper: {
    width: '25%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  timeSlot: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.ui.surface,
    borderWidth: 1,
    borderColor: Colors.ui.surface,
    alignItems: 'center',
  },
  timeSlotSelected: {
    backgroundColor: Colors.primary.dark,
    borderColor: Colors.primary.dark,
  },
  timeText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  timeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timeSlotBusy: {
    backgroundColor: Colors.ui.border,
    borderColor: Colors.ui.border,
    opacity: 0.7,
  },
  timeTextBusy: {
    color: Colors.text.light,
    opacity: 0.8,
  },
  loader: {
    marginVertical: 20,
  },
  confirmSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: Colors.ui.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 16,
    color: Colors.text.primary,
    flex: 1,
  },
  confirmButton: {
    backgroundColor: Colors.primary.dark,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});