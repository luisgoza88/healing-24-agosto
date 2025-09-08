import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

interface ClassItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconLibrary: 'MaterialCommunityIcons' | 'Ionicons';
  color: string;
  intensity: 'high' | 'medium' | 'low';
}

const BREATHE_MOVE_CLASSES: ClassItem[] = [
  {
    id: 'wildpower',
    name: 'WildPower',
    description: 'Pilates + funcional + pesas ligeras. Fuerza y resistencia sin impacto.',
    icon: 'dumbbell',
    iconLibrary: 'MaterialCommunityIcons',
    color: '#B8604D', // Pantone 7523C - Terracota
    intensity: 'high'
  },
  {
    id: 'gutreboot',
    name: 'GutReboot',
    description: 'Pilates suave + técnicas somáticas. Activa el core, mejora digestión y calma.',
    icon: 'stomach',
    iconLibrary: 'MaterialCommunityIcons',
    color: '#879794', // Pantone 5497C - Gris verde
    intensity: 'low'
  },
  {
    id: 'firerush',
    name: 'FireRush',
    description: 'Intervalos de cardio Pilates sin impacto. Resistencia y energía con control.',
    icon: 'fire',
    iconLibrary: 'MaterialCommunityIcons',
    color: '#5E3532', // Pantone 7630C - Vino/Borgoña
    intensity: 'high'
  },
  {
    id: 'bloombeat',
    name: 'BloomBeat',
    description: 'Flujos creativos con música. Presencia, fuerza y suavidad en movimiento.',
    icon: 'flower',
    iconLibrary: 'MaterialCommunityIcons',
    color: '#ECD0B6', // Pantone 475C - Coral suave (de paleta principal)
    intensity: 'medium'
  },
  {
    id: 'windmove',
    name: 'WindMove',
    description: 'Yoga + movilidad. Libera tensión y amplía rango de movimiento.',
    icon: 'weather-windy',
    iconLibrary: 'MaterialCommunityIcons',
    color: '#B2B8B0', // Pantone 5655C - Gris claro (de paleta principal)
    intensity: 'low'
  },
  {
    id: 'forestfire',
    name: 'ForestFire',
    description: 'La base del método. Estabilidad, control y postura desde el centro.',
    icon: 'pine-tree',
    iconLibrary: 'MaterialCommunityIcons',
    color: '#3E5444', // Pantone 7736C - Verde bosque
    intensity: 'medium'
  },
  {
    id: 'stonebarre',
    name: 'StoneBarre',
    description: 'Fusión Barre + Pilates. Esculpe, alarga y fortalece con precisión.',
    icon: 'human-handsup',
    iconLibrary: 'MaterialCommunityIcons',
    color: '#879794', // Pantone 5497C - Gris verde
    intensity: 'medium'
  },
  {
    id: 'omroot',
    name: 'OmRoot',
    description: 'Posturas esenciales y respiración. Alinea, fortalece y calma.',
    icon: 'spa',
    iconLibrary: 'MaterialCommunityIcons',
    color: '#3E5444', // Pantone 7736C - Verde bosque
    intensity: 'low'
  },
  {
    id: 'hazerocket',
    name: 'HazeRocket',
    description: 'Ashtanga moderno. Agilidad, fuerza y libertad en transiciones.',
    icon: 'rocket-launch',
    iconLibrary: 'MaterialCommunityIcons',
    color: '#61473B', // Pantone 411C - Café oscuro
    intensity: 'high'
  },
  {
    id: 'moonrelief',
    name: 'MoonRelief',
    description: 'Respiración guiada. Regula estrés y restaura energía vital.',
    icon: 'moon-waning-crescent',
    iconLibrary: 'MaterialCommunityIcons',
    color: '#1F2E3B', // Pantone 532C - Azul marino
    intensity: 'low'
  },
  {
    id: 'windflow',
    name: 'WindFlow',
    description: 'Secuencias dinámicas. Fluidez, energía y conexión en movimiento constante.',
    icon: 'air',
    iconLibrary: 'MaterialCommunityIcons',
    color: '#879794', // Pantone 5497C - Gris verde
    intensity: 'medium'
  }
];

export const BreatheAndMoveScreen = ({ navigation }: any) => {
  const handleClassPress = (classItem: ClassItem) => {
    navigation.navigate('ClassSchedule', { 
      className: classItem.name,
      classDescription: classItem.description 
    });
  };

  const renderClassCard = (classItem: ClassItem) => {
    const IconComponent = classItem.iconLibrary === 'MaterialCommunityIcons' 
      ? MaterialCommunityIcons 
      : Ionicons;

    return (
      <TouchableOpacity
        key={classItem.id}
        style={[styles.classCard, { backgroundColor: classItem.color }]}
        onPress={() => handleClassPress(classItem)}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          <View style={styles.iconIndicator}>
            <IconComponent name={classItem.icon} size={24} color="#FFFFFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.className}>{classItem.name}</Text>
            <Text style={styles.classDescription} numberOfLines={2}>{classItem.description}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Breathe & Move</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Elige tu práctica</Text>
          <Text style={styles.heroSubtitle}>
            Encuentra la clase perfecta para tu cuerpo y mente
          </Text>
          
          <View style={styles.buttonsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Schedule')}
            >
              <MaterialCommunityIcons name="calendar-clock" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Ver horarios</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Packages')}
            >
              <MaterialCommunityIcons name="ticket-percent" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Ver paquetes</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.myPackagesButton}
            onPress={() => navigation.navigate('MyPackages')}
          >
            <MaterialCommunityIcons name="package-variant" size={20} color={Colors.primary.dark} />
            <Text style={styles.myPackagesText}>Mis paquetes</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary.dark} />
          </TouchableOpacity>
        </View>

        <View style={styles.classesContainer}>
          {BREATHE_MOVE_CLASSES.map(renderClassCard)}
        </View>

        <View style={styles.bottomSpacing} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.ui.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.ui.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
  },
  headerRight: {
    width: 40,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  classesContainer: {
    paddingHorizontal: 24,
  },
  classCard: {
    width: width - 48,
    height: 100,
    borderRadius: 20,
    marginBottom: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardContent: {
    flex: 1,
    position: 'relative',
  },
  iconIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 30,
  },
  className: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  classDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 19,
  },
  bottomSpacing: {
    height: 32,
  },
  buttonsRow: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: Colors.primary.dark,
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.48,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  myPackagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  myPackagesText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary.dark,
    marginLeft: 12,
  },
});