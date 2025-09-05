import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

interface BookingConfirmationScreenProps {
  service: any;
  subService: any;
  date: string;
  time: string;
  professional: any;
  onBack: () => void;
  onConfirm: () => void;
}

export const BookingConfirmationScreen: React.FC<BookingConfirmationScreenProps> = ({
  service,
  subService,
  date,
  time,
  professional,
  onBack,
  onConfirm
}) => {
  // Formatear fecha
  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calcular hora de finalización
  const calculateEndTime = () => {
    const [hours, minutes] = time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + subService.duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
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
        <View style={styles.content}>
          <Text style={styles.title}>Confirma tu cita</Text>
          <Text style={styles.subtitle}>
            Revisa los detalles antes de proceder al pago
          </Text>

          {/* Resumen del servicio */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Servicio</Text>
            <View style={styles.serviceCard}>
              <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
                <Text style={styles.serviceIconText}>
                  {service.id === 'medicina-funcional' ? '🩺' :
                   service.id === 'medicina-estetica' ? '✨' :
                   service.id === 'medicina-regenerativa' ? '🧬' :
                   service.id === 'faciales' ? '🧖‍♀️' : '💆‍♀️'}
                </Text>
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{subService.name}</Text>
                <Text style={styles.serviceCategory}>{service.name}</Text>
              </View>
            </View>
          </View>

          {/* Fecha y hora */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fecha y hora</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📅</Text>
                <Text style={styles.infoText}>{formattedDate}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>⏰</Text>
                <Text style={styles.infoText}>
                  {time} - {calculateEndTime()} ({subService.duration} min)
                </Text>
              </View>
            </View>
          </View>

          {/* Profesional */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profesional</Text>
            <View style={styles.professionalCard}>
              <Text style={styles.professionalAvatar}>{professional.avatar}</Text>
              <View style={styles.professionalInfo}>
                <Text style={styles.professionalName}>{professional.name}</Text>
                <Text style={styles.professionalSpecialty}>
                  {professional.specialties[0]}
                </Text>
              </View>
            </View>
          </View>

          {/* Precio */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Total a pagar</Text>
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Valor del servicio</Text>
              <Text style={styles.priceAmount}>
                ${subService.price.toLocaleString('es-CO')}
              </Text>
            </View>
          </View>

          {/* Política de cancelación */}
          <View style={styles.policyCard}>
            <Text style={styles.policyTitle}>📌 Política de cancelación</Text>
            <Text style={styles.policyText}>
              Puedes cancelar o reprogramar tu cita hasta 24 horas antes sin costo.
            </Text>
          </View>

          {/* Botón de confirmación */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={onConfirm}
          >
            <Text style={styles.confirmButtonText}>Proceder al pago</Text>
          </TouchableOpacity>
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
  content: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    padding: 16,
    borderRadius: 12,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceIconText: {
    fontSize: 24,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  infoCard: {
    backgroundColor: Colors.ui.surface,
    padding: 16,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    fontSize: 16,
    color: Colors.text.primary,
    textTransform: 'capitalize',
  },
  professionalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    padding: 16,
    borderRadius: 12,
  },
  professionalAvatar: {
    fontSize: 32,
    marginRight: 16,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 4,
  },
  professionalSpecialty: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  priceCard: {
    backgroundColor: Colors.primary.beige + '30',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  policyCard: {
    backgroundColor: Colors.ui.info + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 8,
  },
  policyText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: Colors.primary.green,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 40,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});