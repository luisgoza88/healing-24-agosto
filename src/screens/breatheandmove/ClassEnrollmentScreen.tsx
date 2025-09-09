import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatPrice } from '../../constants/breatheMovePricing';

interface ClassDetails {
  id: string;
  class_name: string;
  instructor: string;
  class_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_capacity: number;
  status: string;
  intensity?: string;
}

interface UserPackage {
  id: string;
  package_type: string;
  classes_total: number;
  classes_used: number;
  valid_until: string;
}

export const ClassEnrollmentScreen = ({ navigation, route }: any) => {
  const { classId } = route.params;
  const [loading, setLoading] = useState(true);
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [userPackages, setUserPackages] = useState<UserPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    loadData();
  }, [classId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (classId) {
        // Cargar detalles de la clase desde Supabase
        const { data: classData, error: classError } = await supabase
          .from('breathe_move_classes')
          .select('*')
          .eq('id', classId)
          .single();

        if (classError) {
          console.error('Error loading class:', classError);
          Alert.alert('Error', 'No se pudo cargar la información de la clase');
          navigation.goBack();
          return;
        }

        setClassDetails(classData);

        // Cargar paquetes activos del usuario
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('Loading packages for user:', user.id);
          
          const { data: packages, error: packagesError } = await supabase
            .from('breathe_move_packages')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .gte('valid_until', new Date().toISOString());

          console.log('Packages query result:', { packages, packagesError });

          if (packages) {
            // Filtrar solo paquetes con clases disponibles
            const activePackages = packages.filter(pkg => 
              (pkg.classes_total - pkg.classes_used) > 0
            );
            console.log('Active packages after filter:', activePackages);
            setUserPackages(activePackages);
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar la información');
    } finally {
      setLoading(false);
    }
  };


  const handleEnrollWithPackage = async () => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Por favor selecciona un paquete');
      return;
    }

    try {
      setEnrolling(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión para continuar');
        return;
      }


      // Crear inscripción
      const { error: enrollError } = await supabase
        .from('breathe_move_enrollments')
        .insert({
          user_id: user.id,
          class_id: classDetails?.id,
          package_id: selectedPackage,
          status: 'confirmed'
        });

      if (enrollError) {
        if (enrollError.code === '23505') {
          Alert.alert('Aviso', 'Ya estás inscrito en esta clase');
        } else if (enrollError.message?.includes('Solo puedes inscribirte a una clase por día')) {
          Alert.alert(
            'Límite de clases', 
            'Solo puedes inscribirte a una clase por día. Ya tienes una clase reservada para este día.'
          );
        } else {
          throw enrollError;
        }
        return;
      }

      // El paquete se actualiza automáticamente por el trigger en la base de datos
      // cuando se crea una inscripción, así que no necesitamos actualizarlo manualmente

      Alert.alert(
        '¡Inscripción exitosa!',
        'Te has inscrito correctamente en la clase',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error enrolling:', error);
      Alert.alert('Error', 'No se pudo completar la inscripción');
    } finally {
      setEnrolling(false);
    }
  };

  const handlePayPerClass = () => {
    navigation.navigate('ClassPayment', {
      classDetails,
      paymentType: 'single'
    });
  };

  const handleBuyPackage = () => {
    navigation.navigate('Packages');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.dark} />
        </View>
      </SafeAreaView>
    );
  }

  if (!classDetails) return null;

  const spotsAvailable = classDetails.max_capacity - classDetails.current_capacity;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inscripción a Clase</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.classInfoCard}>
          <Text style={styles.className}>{classDetails.class_name}</Text>
          <View style={styles.classDetails}>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="account" size={20} color={Colors.text.secondary} />
              <Text style={styles.detailText}>{classDetails.instructor}</Text>
            </View>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="calendar" size={20} color={Colors.text.secondary} />
              <Text style={styles.detailText}>
                {format(parseISO(classDetails.class_date), "EEEE d 'de' MMMM", { locale: es })}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="clock" size={20} color={Colors.text.secondary} />
              <Text style={styles.detailText}>
                {classDetails.start_time} - {classDetails.end_time}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="account-group" size={20} color={Colors.text.secondary} />
              <Text style={styles.detailText}>
                {spotsAvailable} lugares disponibles
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opciones de pago</Text>
          
          {userPackages.length > 0 ? (
            <>
              <Text style={styles.sectionSubtitle}>Usar un paquete activo:</Text>
              {userPackages.map(pkg => (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.packageOption,
                    selectedPackage === pkg.id && styles.packageSelected
                  ]}
                  onPress={() => setSelectedPackage(pkg.id)}
                >
                  <View style={styles.radioButton}>
                    {selectedPackage === pkg.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageType}>{pkg.package_type}</Text>
                    <Text style={styles.packageDetails}>
                      {pkg.classes_total - pkg.classes_used} clases restantes • Vence {format(parseISO(pkg.valid_until), 'd MMM yyyy', { locale: es })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={[styles.primaryButton, !selectedPackage && styles.buttonDisabled]}
                onPress={handleEnrollWithPackage}
                disabled={!selectedPackage || enrolling}
              >
                {enrolling ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Inscribirse con paquete</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider} />
              <Text style={styles.orText}>O</Text>
            </>
          ) : (
            <>
              <View style={styles.noPackageCard}>
                <MaterialCommunityIcons name="package-variant" size={48} color={Colors.text.light} />
                <Text style={styles.noPackageText}>
                  No tienes paquetes activos
                </Text>
                <TouchableOpacity
                  style={styles.buyPackageButton}
                  onPress={handleBuyPackage}
                >
                  <Text style={styles.buyPackageButtonText}>Comprar paquete</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.orText}>O</Text>
            </>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handlePayPerClass}
          >
            <Text style={styles.secondaryButtonText}>
              Pagar clase individual • {formatPrice(65000)}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Política de cancelación</Text>
          <Text style={styles.infoText}>
            Puedes cancelar tu inscripción hasta 2 horas antes del inicio de la clase sin penalización.
          </Text>
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
  bottomSpacing: {
    height: 90, // Espacio para la barra de navegación
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 40,
  },
  classInfoCard: {
    backgroundColor: Colors.primary.dark,
    margin: 24,
    padding: 24,
    borderRadius: 16,
  },
  className: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  classDetails: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 12,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  packageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.ui.border,
  },
  packageSelected: {
    borderColor: Colors.primary.dark,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary.dark,
  },
  packageInfo: {
    flex: 1,
  },
  packageType: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  packageDetails: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  primaryButton: {
    backgroundColor: Colors.primary.dark,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.ui.border,
    marginVertical: 24,
  },
  orText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  noPackageCard: {
    backgroundColor: Colors.ui.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  noPackageText: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginVertical: 12,
  },
  buyPackageButton: {
    backgroundColor: Colors.primary.green,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 8,
  },
  buyPackageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.primary.dark,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.primary.dark,
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: Colors.ui.surface,
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
});