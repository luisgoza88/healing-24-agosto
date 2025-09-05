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
          name: 'Dra. María González',
          specialties: ['Medicina Funcional', 'Medicina Integrativa'],
          bio: 'Especialista en medicina funcional con 15 años de experiencia',
          avatar: '👩‍⚕️'
        },
        {
          id: '2',
          name: 'Dr. Carlos Rodríguez',
          specialties: ['Medicina Funcional', 'Nutrición Clínica'],
          bio: 'Experto en optimización hormonal y nutrición personalizada',
          avatar: '👨‍⚕️'
        },
        {
          id: '3',
          name: 'Dra. Ana Martínez',
          specialties: ['Medicina Estética', 'Dermatología'],
          bio: 'Especialista en tratamientos estéticos no invasivos',
          avatar: '👩‍⚕️'
        }
      ];

      // Filtrar según el servicio
      const filtered = mockProfessionals.filter(prof => {
        if (service.id === 'medicina-funcional') {
          return prof.specialties.some(s => s.includes('Medicina Funcional'));
        }
        if (service.id === 'medicina-estetica') {
          return prof.specialties.some(s => s.includes('Medicina Estética'));
        }
        // Para otros servicios, mostrar todos por ahora
        return true;
      });

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
            <Text style={styles.infoText}>📅 {date}</Text>
            <Text style={styles.infoText}>⏰ {time}</Text>
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
                  <Text style={styles.avatar}>{professional.avatar}</Text>
                  <View style={styles.professionalInfo}>
                    <Text style={styles.professionalName}>{professional.name}</Text>
                    <Text style={styles.specialties}>
                      {professional.specialties.join(' • ')}
                    </Text>
                  </View>
                  {selectedProfessional?.id === professional.id && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
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
    marginBottom: 20,
  },
  appointmentInfo: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
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
    borderColor: Colors.primary.green,
    backgroundColor: Colors.primary.beige + '20',
  },
  professionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    fontSize: 40,
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
    backgroundColor: Colors.primary.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: Colors.primary.green,
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