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
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ServiceIcon } from '../../components/ServiceIcon';

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
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
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
                <ServiceIcon 
                  icon={service.icon} 
                  size={24} 
                  color="#FFFFFF"
                />
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
                <MaterialCommunityIcons name="calendar" size={20} color={Colors.secondary.green} />
                <Text style={styles.infoText}>{formattedDate}</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={Colors.secondary.green} />
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
              <View style={styles.professionalAvatarContainer}>
                <MaterialCommunityIcons name="doctor" size={32} color={Colors.secondary.green} />
              </View>
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
            <View style={styles.policyHeader}>
              <MaterialCommunityIcons name="information-outline" size={20} color={Colors.primary.dark} />
              <Text style={styles.policyTitle}>Política de cancelación</Text>
            </View>
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
    backgroundColor: Colors.primary.dark,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: Colors.text.inverse,
    fontWeight: '500',
    marginLeft: 8,
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
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
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
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  professionalAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary.beige,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: Colors.secondary.green + '15',
    padding: 24,
    borderRadius: 20,
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
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary.dark,
  },
  policyText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: Colors.primary.dark,
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