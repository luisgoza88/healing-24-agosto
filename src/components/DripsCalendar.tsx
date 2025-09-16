import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { Colors } from '../constants/colors';
import { DripsService, TimeSlot } from '../services/dripsService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface DripsCalendarProps {
  selectedDate: Date;
  durationMinutes: number;
  onTimeSelect: (time: string) => void;
  selectedTime?: string;
}

export const DripsCalendar: React.FC<DripsCalendarProps> = ({
  selectedDate,
  durationMinutes,
  onTimeSelect,
  selectedTime
}) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailability();
  }, [selectedDate, durationMinutes]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const slots = await DripsService.getAvailableSlots(selectedDate, durationMinutes);
      setTimeSlots(slots);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum || 12;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const getSlotColor = (slot: TimeSlot) => {
    if (!slot.available) return Colors.ui.disabled;
    return Colors.primary.green; // Verde cuando está disponible
  };

  const renderTimeSlot = (slot: TimeSlot) => {
    const isSelected = selectedTime === slot.time;
    const slotColor = getSlotColor(slot);

    return (
      <TouchableOpacity
        key={slot.time}
        style={[
          styles.timeSlot,
          !slot.available && styles.disabledSlot,
          isSelected && styles.selectedSlot
        ]}
        onPress={() => slot.available && onTimeSelect(slot.time)}
        disabled={!slot.available}
      >
        <Text style={[
          styles.timeText,
          !slot.available && styles.disabledText,
          isSelected && styles.selectedText
        ]}>
          {formatTime(slot.time)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
        <Text style={styles.loadingText}>Cargando disponibilidad...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="calendar-clock" size={24} color={Colors.primary.main} />
        <Text style={styles.headerText}>
          {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.timeSection}>
          <View style={styles.slotsGrid}>
            {timeSlots.map(renderTimeSlot)}
          </View>
        </View>
      </ScrollView>

      <View style={styles.infoContainer}>
        <MaterialCommunityIcons name="information" size={20} color={Colors.primary.main} />
        <Text style={styles.infoText}>
          Los horarios muestran la disponibilidad para un tratamiento de {durationMinutes} minutos
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    textTransform: 'capitalize',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.ui.card,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  timeSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    backgroundColor: Colors.ui.card,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: '30%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  disabledSlot: {
    backgroundColor: Colors.ui.disabled,
    opacity: 0.5,
  },
  selectedSlot: {
    backgroundColor: Colors.primary.main,
    borderColor: Colors.primary.main,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  disabledText: {
    color: Colors.text.light,
  },
  selectedText: {
    color: '#FFFFFF',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primary.light + '20',
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary.main,
    lineHeight: 18,
  },
});