import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Professional {
  id: string;
  name: string;
  specialties: string[];
  bio: string;
  avatar?: string;
}

interface SelectProfessionalScreenProps {
  service: any;
  subService: any;
  date: string;
  time: string;
  onBack: () => void;
  onNext: (professional: Professional) => void;
}

export const SelectProfessionalScreen: React.FC<SelectProfessionalScreenProps> = ({
  service,
  subService,
  date,
  time,
  onBack,
  onNext
}) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfessionals();
  }, []);

  const loadProfessionals = async () => {
    try {
      // Por ahora usamos datos de ejemplo
      // TODO: Cargar desde Supabase según el tipo de servicio
      const mockProfessionals: Professional[] = [
        {
          id: '1',
          name: 'Dra. Estefanía González',
          specialties: ['Medicina Funcional', 'Medicina Integrativa', 'Medicina Estética'],
          bio: 'Especialista en medicina funcional e integrativa con enfoque holístico',
          avatar: 'doctor'
        }
      ];

      // Por ahora mostrar la única profesional disponible para todos los servicios
      const filtered = mockProfessionals;

      setProfessionals(filtered);
      setLoading(false);
    } catch (error) {
      console.error('Error loading professionals:', error);
      setLoading(false);
    }
  };

  const handleSelectProfessional = (professional: Professional) => {
    setSelectedProfessional(professional);
  };

  const handleNext = () => {
    if (selectedProfessional) {
      onNext(selectedProfessional);
    }
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
          <Text style={styles.title}>Selecciona un profesional</Text>
          <Text style={styles.subtitle}>
            Elige quién te atenderá para {subService.name}
          </Text>

          <View style={styles.appointmentInfo}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="calendar" size={16} color={Colors.text.secondary} />
              <Text style={styles.infoText}>{date}</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.text.secondary} />
              <Text style={styles.infoText}>{time}</Text>
            </View>
          </View>

          <View style={styles.professionalsContainer}>
            {professionals.map((professional) => (
              <TouchableOpacity
                key={professional.id}
                style={[
                  styles.professionalCard,
                  selectedProfessional?.id === professional.id && styles.professionalCardSelected
                ]}
                onPress={() => handleSelectProfessional(professional)}
                activeOpacity={0.7}
              >
                <View style={styles.professionalHeader}>
                  <View style={styles.avatarContainer}>
                    <MaterialCommunityIcons name={professional.avatar} size={40} color={Colors.secondary.green} />
                  </View>
                  <View style={styles.professionalInfo}>
                    <Text style={styles.professionalName}>{professional.name}</Text>
                    <Text style={styles.specialties}>
                      {professional.specialties.join(' • ')}
                    </Text>
                  </View>
                  {selectedProfessional?.id === professional.id && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <Text style={styles.bio}>{professional.bio}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedProfessional && (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleNext}
            >
              <Text style={styles.continueButtonText}>Continuar</Text>
            </TouchableOpacity>
          )}
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
    color: Colors.primary.dark,
    marginRight: 4,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary.dark,
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
    marginBottom: 20,
  },
  appointmentInfo: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  professionalsContainer: {
    marginBottom: 24,
  },
  professionalCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.ui.surface,
  },
  professionalCardSelected: {
    borderColor: Colors.primary.dark,
    backgroundColor: Colors.primary.beige + '20',
  },
  professionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary.beige,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 4,
  },
  specialties: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  bio: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: Colors.primary.dark,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 40,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});