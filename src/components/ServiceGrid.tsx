import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { ServiceIcon } from './ServiceIcon';
import { Colors } from '../constants/colors';

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
        <View style={styles.iconContainer}>
          <ServiceIcon 
            serviceId={service.id} 
            size={28} 
            color="#FFFFFF"
            backgroundColor="rgba(255,255,255,0.2)"
          />
        </View>
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
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    minHeight: 125,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    marginBottom: 12,
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