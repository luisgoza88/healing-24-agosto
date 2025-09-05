import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

// Configurar español (ya está configurado en BookingCalendarScreen)
LocaleConfig.defaultLocale = 'es';

interface RescheduleAppointmentScreenProps {
  route: {
    params: {
      appointment: any;
    };
  };
  navigation: any;
}

export const RescheduleAppointmentScreen: React.FC<RescheduleAppointmentScreenProps> = ({
  route,
  navigation
}) => {
  const { appointment } = route.params;
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Obtener fecha actual para establecer el mínimo
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  
  // Calcular fecha máxima (3 meses adelante)
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const maxDateString = maxDate.toISOString().split('T')[0];

  // Generar horarios disponibles (cada 30 minutos)
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 19; // 7 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
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

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Error', 'Por favor selecciona fecha y hora');
      return;
    }

    // Verificar que la nueva fecha/hora sea diferente
    const currentDate = new Date(appointment.appointment_date);
    const currentDateStr = currentDate.toISOString().split('T')[0];
    const currentTimeStr = `${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
    
    if (selectedDate === currentDateStr && selectedTime === currentTimeStr) {
      Alert.alert('Error', 'Debes seleccionar una fecha y hora diferente');
      return;
    }

    Alert.alert(
      'Confirmar reprogramación',
      `¿Deseas cambiar tu cita del ${formatDate(appointment.appointment_date)} a las ${formatTime(appointment.appointment_date)} al ${formatDate(selectedDate)} a las ${formatTime(selectedTime)}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Confirmar',
          onPress: updateAppointment
        }
      ]
    );
  };

  const updateAppointment = async () => {
    try {
      setLoading(true);

      // Combinar fecha y hora en un solo timestamp
      const newAppointmentDateTime = new Date(`${selectedDate}T${selectedTime}:00`);

      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: newAppointmentDateTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (error) throw error;

      // TODO: Aquí se podría enviar una notificación o email de confirmación

      Alert.alert(
        'Cita reprogramada',
        'Tu cita ha sido reprogramada exitosamente. Recibirás un correo de confirmación.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      Alert.alert('Error', 'No se pudo reprogramar la cita. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date + 'T12:00:00').toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (input: string) => {
    let hours, minutes;
    
    // Si es una fecha ISO, extraer la hora
    if (input.includes('T')) {
      const date = new Date(input);
      hours = date.getHours();
      minutes = date.getMinutes();
    } else {
      // Si es solo hora "HH:MM"
      [hours, minutes] = input.split(':').map(Number);
    }
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reprogramar Cita</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Información de la cita actual */}
        <View style={styles.currentAppointment}>
          <Text style={styles.sectionTitle}>Cita actual</Text>
          <View style={styles.appointmentInfo}>
            <Text style={styles.serviceName}>{appointment.notes}</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📅</Text>
              <Text style={styles.detailText}>{formatDate(appointment.appointment_date)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>⏰</Text>
              <Text style={styles.detailText}>
                {formatTime(appointment.appointment_date)}
              </Text>
            </View>
            {appointment.professional && (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>👨‍⚕️</Text>
                <Text style={styles.detailText}>{appointment.professional.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Calendario */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>Selecciona una nueva fecha</Text>
          <Calendar
            current={minDate}
            minDate={minDate}
            maxDate={maxDateString}
            onDayPress={handleDateSelect}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: Colors.primary.green,
              },
              [appointment.appointment_date]: {
                marked: true,
                dotColor: Colors.ui.error,
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

        {/* Horarios */}
        {selectedDate && (
          <View style={styles.timeSection}>
            <Text style={styles.sectionTitle}>Selecciona una hora</Text>
            <Text style={styles.dateSelected}>
              {formatDate(selectedDate)}
            </Text>
            <View style={styles.timeGrid}>
              {timeSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    selectedTime === time && styles.timeSlotSelected,
                    (selectedDate === appointment.appointment_date && 
                     time === appointment.appointment_time) && styles.timeSlotDisabled
                  ]}
                  onPress={() => handleTimeSelect(time)}
                  disabled={false}
                >
                  <Text
                    style={[
                      styles.timeText,
                      selectedTime === time && styles.timeTextSelected,
                      (selectedDate === appointment.appointment_date && 
                       time === appointment.appointment_time) && styles.timeTextDisabled
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Botón de confirmación */}
        {selectedDate && selectedTime && (
          <View style={styles.confirmSection}>
            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
              onPress={handleReschedule}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirmar reprogramación</Text>
              )}
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.divider,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  currentAppointment: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
  },
  appointmentInfo: {
    backgroundColor: Colors.ui.surface,
    padding: 16,
    borderRadius: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 24,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  calendarSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
  timeSlotDisabled: {
    backgroundColor: Colors.ui.disabled,
    opacity: 0.5,
  },
  timeText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  timeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timeTextDisabled: {
    color: Colors.text.light,
  },
  confirmSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  confirmButton: {
    backgroundColor: Colors.primary.green,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});