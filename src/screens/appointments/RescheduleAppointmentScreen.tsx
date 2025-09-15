import React, { useState, useEffect } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const { appointment } = route.params || {};
  
  // Validar que appointment existe
  if (!appointment) {
    Alert.alert('Error', 'No se pudo cargar la información de la cita');
    navigation.goBack();
    return null;
  }

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
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>(generateTimeSlots());
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Obtener fecha actual para establecer el mínimo
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  
  // Calcular fecha máxima (3 meses adelante)
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const maxDateString = maxDate.toISOString().split('T')[0];

  const timeSlots = generateTimeSlots();

  // Función para verificar disponibilidad de horarios
  const checkAvailability = async (date: string) => {
    setLoadingSlots(true);
    try {
      // Si no hay profesional asignado, todos los horarios están disponibles
      if (!appointment.professional_id) {
        setAvailableSlots(timeSlots);
        return;
      }

      const dayOfWeek = new Date(date + 'T12:00:00').getDay();
      
      // Obtener disponibilidad del profesional para ese día
      const { data: availability, error: availError } = await supabase
        .from('professional_availability')
        .select('start_time, end_time')
        .eq('professional_id', appointment.professional_id)
        .eq('day_of_week', dayOfWeek)
        .eq('active', true);

      if (availError) {
        console.error('Error al obtener disponibilidad:', availError);
        // En caso de error, mostrar todos los slots
        setAvailableSlots(timeSlots);
        return;
      }

      // Si el profesional no tiene horario configurado para ese día, no hay disponibilidad
      if (!availability || availability.length === 0) {
        // Para servicios generales sin horario específico, todos están disponibles
        setAvailableSlots(timeSlots);
        return;
      }

      // Obtener citas existentes para ese día
      const { data: existingAppointments, error: apptError } = await supabase
        .from('appointments')
        .select('appointment_time, duration_minutes')
        .eq('professional_id', appointment.professional_id)
        .eq('appointment_date', date)
        .in('status', ['confirmed', 'pending'])
        .neq('id', appointment.id); // Excluir la cita actual

      if (apptError) {
        console.error('Error al obtener citas:', apptError);
        setAvailableSlots(timeSlots);
        return;
      }

      // Filtrar slots disponibles
      const available = timeSlots.filter(slot => {
        // Verificar si está dentro del horario del profesional
        const isInSchedule = availability.some(schedule => {
          const slotTime = slot;
          const startTime = schedule.start_time ? schedule.start_time.substring(0, 5) : '09:00';
          const endTime = schedule.end_time ? schedule.end_time.substring(0, 5) : '19:00';
          
          return slotTime >= startTime && slotTime < endTime;
        });

        if (!isInSchedule) return false;

        // Verificar si no hay conflicto con otras citas
        const hasConflict = existingAppointments && existingAppointments.length > 0 && 
          existingAppointments.some(appt => {
            if (!appt.appointment_time) return false;
            
            const apptTime = appt.appointment_time.substring(0, 5);
            const duration = appt.duration_minutes || 60;
            
            // Convertir todo a minutos para facilitar la comparación
            const [slotHour, slotMin] = slot.split(':').map(Number);
            const slotMinutes = slotHour * 60 + slotMin;
            
            const [apptHour, apptMin] = apptTime.split(':').map(Number);
            const apptStartMinutes = apptHour * 60 + apptMin;
            const apptEndMinutes = apptStartMinutes + duration;
            
            // El slot tiene conflicto si comienza durante otra cita
            return slotMinutes >= apptStartMinutes && slotMinutes < apptEndMinutes;
          });

        return !hasConflict;
      });

      setAvailableSlots(available);
    } catch (error) {
      console.error('Error verificando disponibilidad:', error);
      // En caso de error general, mostrar todos los slots como disponibles
      setAvailableSlots(timeSlots);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      checkAvailability(selectedDate);
    }
  }, [selectedDate]);

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
    if (!input) return '';
    
    let hours, minutes;
    
    try {
      // Si es una fecha ISO, extraer la hora
      if (input.includes('T')) {
        const date = new Date(input);
        if (isNaN(date.getTime())) return '';
        hours = date.getHours();
        minutes = date.getMinutes();
      } else if (input.includes(':')) {
        // Si es solo hora "HH:MM"
        const parts = input.split(':');
        if (parts.length !== 2) return '';
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1], 10);
        if (isNaN(hours) || isNaN(minutes)) return '';
      } else {
        return '';
      }
      
      // Validar que hours y minutes sean números válidos
      if (hours === undefined || minutes === undefined || isNaN(hours) || isNaN(minutes)) {
        return '';
      }
      
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
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
              <MaterialCommunityIcons name="calendar" size={16} color={Colors.text.secondary} style={styles.detailIcon} />
              <Text style={styles.detailText}>{formatDate(appointment.appointment_date)}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.text.secondary} style={styles.detailIcon} />
              <Text style={styles.detailText}>
                {formatTime(appointment.appointment_time || appointment.appointment_date)}
              </Text>
            </View>
            {appointment.professional && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="doctor" size={16} color={Colors.text.secondary} style={styles.detailIcon} />
                <Text style={styles.detailText}>{appointment.professional.full_name || appointment.professional.name}</Text>
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
                selectedColor: Colors.primary.dark,
              },
              [appointment.appointment_date]: {
                marked: true,
                dotColor: Colors.secondary.terracotta,
              }
            }}
            theme={{
              backgroundColor: Colors.ui.background,
              calendarBackground: Colors.ui.surface,
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
              textDayFontWeight: '500',
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
            {loadingSlots ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary.dark} />
              </View>
            ) : (
              <View style={styles.timeGrid}>
                {timeSlots.map((time) => {
                  const isAvailable = availableSlots.includes(time);
                  const isCurrentTime = selectedDate === appointment.appointment_date && 
                                       time === appointment.appointment_time;
                  const isDisabled = !isAvailable || isCurrentTime;
                  
                  return (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeSlot,
                        selectedTime === time && styles.timeSlotSelected,
                        isDisabled && styles.timeSlotDisabled
                      ]}
                      onPress={() => handleTimeSelect(time)}
                      disabled={isDisabled}
                    >
                      <Text
                        style={[
                          styles.timeText,
                          selectedTime === time && styles.timeTextSelected,
                          isDisabled && styles.timeTextDisabled
                        ]}
                      >
                        {time}
                      </Text>
                      {isCurrentTime && (
                        <Text style={styles.currentTimeLabel}>Actual</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Botón de confirmación */}
        {selectedDate && selectedTime && (
          <TouchableOpacity
            style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
            onPress={handleReschedule}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.confirmButtonText}>Confirmar reprogramación</Text>
                <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" style={styles.confirmIcon} />
              </>
            )}
          </TouchableOpacity>
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
    color: Colors.primary.dark,
    marginRight: 4,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary.dark,
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
    marginHorizontal: -4,
  },
  timeSlot: {
    width: '31%',
    marginHorizontal: '1.16%',
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.ui.surface,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timeSlotSelected: {
    backgroundColor: Colors.primary.dark,
    borderColor: Colors.primary.dark,
  },
  timeSlotDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.6,
  },
  timeText: {
    fontSize: 15,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  timeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timeTextDisabled: {
    color: '#9CA3AF',
  },
  currentTimeLabel: {
    position: 'absolute',
    bottom: 2,
    fontSize: 10,
    color: Colors.secondary.terracotta,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: Colors.primary.dark,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginBottom: 40,
    marginTop: 20,
    shadowColor: Colors.primary.dark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  confirmIcon: {
    marginLeft: 4,
  },
});