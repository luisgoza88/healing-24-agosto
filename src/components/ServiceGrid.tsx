import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 8;
const CONTAINER_PADDING = 24;
const CARD_WIDTH = (width - CONTAINER_PADDING * 2 - CARD_MARGIN * 2) / 2;

interface Service {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
}

interface ServiceGridProps {
  services: Service[];
  onServicePress?: (service: Service) => void;
}

export const ServiceGrid: React.FC<ServiceGridProps> = ({ services, onServicePress }) => {
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

  const renderServiceCard = (service: Service, index: number) => {
    const isLeftCard = index % 2 === 0;
    
    return (
      <TouchableOpacity
        key={service.id}
        style={[
          styles.serviceCard,
          { 
            backgroundColor: service.color,
            marginLeft: isLeftCard ? 0 : CARD_MARGIN,
            marginRight: isLeftCard ? CARD_MARGIN : 0,
          }
        ]}
        activeOpacity={0.8}
        onPress={() => onServicePress?.(service)}
      >
        <Text style={styles.serviceIcon}>{getServiceIcon(service.id)}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.serviceDescription} numberOfLines={2}>
            {service.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {services.map((service, index) => renderServiceCard(service, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: CONTAINER_PADDING,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceCard: {
    width: CARD_WIDTH,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    minHeight: 115,
  },
  serviceIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  textContainer: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
    lineHeight: 18,
  },
  serviceDescription: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.85,
    lineHeight: 14,
  },
});