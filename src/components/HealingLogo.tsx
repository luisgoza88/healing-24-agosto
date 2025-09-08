import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface HealingLogoProps {
  size?: number;
  showText?: boolean;
}

export const HealingLogo: React.FC<HealingLogoProps> = ({ 
  size = 50, 
  showText = true 
}) => {
  return (
    <View style={styles.container}>
      <View style={[styles.logoCircle, { width: size, height: size }]}>
        <Text style={[styles.logoText, { fontSize: size * 0.4 }]}>HF</Text>
        <View style={styles.greenAccent} />
      </View>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={styles.healingText}>Healing</Text>
          <Text style={styles.forestText}>Forest</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.text.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  logoText: {
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  greenAccent: {
    position: 'absolute',
    top: -2,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary.green,
  },
  textContainer: {
    marginLeft: 12,
  },
  healingText: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.text.secondary,
    letterSpacing: -0.5,
  },
  forestText: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.text.secondary,
    letterSpacing: -0.5,
    marginTop: -4,
  },
});