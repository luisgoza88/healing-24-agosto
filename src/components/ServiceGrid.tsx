import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { ServiceIcon } from './ServiceIcon';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 4;
const CONTAINER_PADDING = 18;
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
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <ServiceIcon 
              serviceId={service.id} 
              size={37} 
              color="#FFFFFF"
              backgroundColor="rgba(255,255,255,0.2)"
            />
          </View>
          <View style={styles.textContainer}>
            <Text 
              style={[
                styles.serviceName,
                service.id === 'medicina-regenerativa' && styles.serviceNameSmall
              ]} 
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {service.name}
            </Text>
          </View>
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
    borderRadius: 20,
    marginBottom: 16,
    height: 115, // Altura fija para todos
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    marginBottom: 4, // 1mm aprox desde el borde inferior
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
    textAlign: 'center',
  },
  serviceNameSmall: {
    fontSize: 13,
  },
  serviceDescription: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.85,
    lineHeight: 14,
  },
});
