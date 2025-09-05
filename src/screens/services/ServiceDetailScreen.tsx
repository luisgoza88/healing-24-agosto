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
import { SERVICES } from '../../constants/services';

interface ServiceDetailScreenProps {
  serviceId: string;
  onBack: () => void;
  onSubServicePress: (service: any, subService: any) => void;
}

export const ServiceDetailScreen: React.FC<ServiceDetailScreenProps> = ({ 
  serviceId, 
  onBack,
  onSubServicePress 
}) => {
  const service = SERVICES.find(s => s.id === serviceId);
  
  if (!service) return null;

  const getServiceIcon = (serviceId: string) => {
    const icons: { [key: string]: string } = {
      'medicina-funcional': '🩺',
      'medicina-estetica': '✨',
      'medicina-regenerativa': '🧬',
      'faciales': '🧖‍♀️',
      'masajes': '💆‍♀️',
    };
    return icons[serviceId] || '🌿';
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
        <View style={styles.serviceHeader}>
          <View style={[styles.iconContainer, { backgroundColor: service.color }]}>
            <Text style={styles.icon}>{getServiceIcon(service.id)}</Text>
          </View>
          <Text style={styles.serviceTitle}>{service.name}</Text>
          <Text style={styles.serviceDescription}>{service.description}</Text>
        </View>

        <View style={styles.subServicesContainer}>
          <Text style={styles.sectionTitle}>Selecciona un tratamiento</Text>
          
          {service.subServices?.map((subService, index) => (
            <TouchableOpacity
              key={index}
              style={styles.subServiceCard}
              onPress={() => onSubServicePress(service, subService)}
              activeOpacity={0.7}
            >
              <View style={styles.subServiceContent}>
                <View style={styles.subServiceInfo}>
                  <Text style={styles.subServiceName}>{subService.name}</Text>
                  <View style={styles.subServiceDetails}>
                    <Text style={styles.duration}>⏱ {subService.duration} min</Text>
                    <Text style={styles.price}>
                      {subService.priceNote === 'desde' ? 'Desde ' : ''}
                      ${subService.price.toLocaleString('es-CO')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.arrow}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
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
  serviceHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  serviceTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  subServicesContainer: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 20,
  },
  subServiceCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  subServiceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subServiceInfo: {
    flex: 1,
  },
  subServiceName: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
    marginBottom: 6,
  },
  subServiceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  duration: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  price: {
    fontSize: 15,
    color: Colors.primary.green,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 20,
    color: Colors.text.light,
    marginLeft: 16,
  },
});