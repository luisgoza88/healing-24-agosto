import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Colors } from '../../constants/colors';

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
  onBack: () => void;
  onNext: (date: string, time: string) => void;
}

export const BookingCalendarScreen: React.FC<BookingCalendarScreenProps> = ({
  service,
  subService,
  onBack,
  onNext
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  
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
    const endHour = 19; // 7 PM
    const duration = subService.duration; // en minutos
    
    // Calcular el último horario posible para que termine antes de las 7 PM
    const lastPossibleStart = endHour - (duration / 60);
    
    for (let hour = startHour; hour <= lastPossibleStart; hour += 0.5) {
      const h = Math.floor(hour);
      const m = (hour % 1) * 60;
      const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      
      // Verificar que la cita termine antes de las 7 PM
      const endTime = hour + (duration / 60);
      if (endTime <= endHour) {
        slots.push(timeString);
      }
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const handleDateSelect = (date: any) => {
    setSelectedDate(date.dateString);
    setSelectedTime(''); // Reset time when date changes
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
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Atrás</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{subService.name}</Text>
          <View style={styles.serviceDetails}>
            <Text style={styles.detailText}>⏱ {subService.duration} minutos</Text>
            <Text style={styles.detailText}>
              💰 ${subService.price.toLocaleString('es-CO')}
            </Text>
          </View>
        </View>

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
                selectedColor: Colors.primary.green,
              }
            }}
            theme={{
              backgroundColor: Colors.ui.background,
              calendarBackground: Colors.ui.background,
              textSectionTitleColor: Colors.text.secondary,
              selectedDayBackgroundColor: Colors.primary.green,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: Colors.primary.green,
              dayTextColor: Colors.text.primary,
              textDisabledColor: Colors.text.light,
              dotColor: Colors.primary.green,
              selectedDotColor: '#FFFFFF',
              arrowColor: Colors.primary.green,
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
            <Text style={styles.dateSelected}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
            <View style={styles.timeGrid}>
              {timeSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    selectedTime === time && styles.timeSlotSelected
                  ]}
                  onPress={() => handleTimeSelect(time)}
                >
                  <Text
                    style={[
                      styles.timeText,
                      selectedTime === time && styles.timeTextSelected
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {selectedDate && selectedTime && (
          <View style={styles.confirmSection}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumen de tu cita</Text>
              <Text style={styles.summaryText}>📅 {selectedDate}</Text>
              <Text style={styles.summaryText}>⏰ {selectedTime}</Text>
              <Text style={styles.summaryText}>⏱ Duración: {subService.duration} min</Text>
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
  serviceInfo: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: 20,
  },
  detailText: {
    fontSize: 16,
    color: Colors.text.secondary,
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
  dateSelected: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlot: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: Colors.ui.surface,
    borderWidth: 1,
    borderColor: Colors.ui.surface,
  },
  timeSlotSelected: {
    backgroundColor: Colors.primary.green,
    borderColor: Colors.primary.green,
  },
  timeText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  timeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  summaryText: {
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  confirmButton: {
    backgroundColor: Colors.primary.green,
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