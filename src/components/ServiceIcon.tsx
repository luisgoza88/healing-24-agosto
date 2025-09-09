import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../constants/colors';

interface ServiceIconProps {
  serviceId: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export const ServiceIcon: React.FC<ServiceIconProps> = ({ 
  serviceId, 
  size = 24, 
  color = Colors.text.secondary,
  backgroundColor = 'rgba(0,0,0,0.08)'
}) => {
  const getIcon = () => {
    switch (serviceId) {
      case 'medicina-funcional':
        return <FontAwesome5 name="briefcase-medical" size={size} color={color} />;
      case 'medicina-estetica':
        return <MaterialCommunityIcons name="face-woman-shimmer-outline" size={size} color={color} />;
      case 'medicina-regenerativa':
        return <MaterialCommunityIcons name="dna" size={size} color={color} />;
      case 'faciales':
        return <MaterialCommunityIcons name="face-woman-outline" size={size} color={color} />;
      case 'masajes':
        return <MaterialCommunityIcons name="spa-outline" size={size} color={color} />;
      case 'wellness-integral':
        return <MaterialCommunityIcons name="heart-pulse" size={size} color={color} />;
      case 'sueroterapia':
        return <MaterialCommunityIcons name="iv-bag" size={size} color={color} />;
      case 'bano-helado':
        return <MaterialCommunityIcons name="snowflake" size={size} color={color} />;
      case 'camara-hiperbarica':
        return <MaterialCommunityIcons name="air-filter" size={size} color={color} />;
      default:
        return <MaterialCommunityIcons name="leaf" size={size} color={color} />;
    }
  };

  // Si el componente padre ya proporciona el contenedor (como en AppointmentsScreen),
  // solo devolver el icono sin contenedor adicional
  return getIcon();
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});