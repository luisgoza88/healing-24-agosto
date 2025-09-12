import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  AppState,
  RefreshControl,
  AppStateStatus
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserCredits, formatCredits, getTransactionColor } from '../../hooks/useCredits';

interface ProfileData {
  full_name: string;
  phone: string;
  email: string;
  bio: string;
  date_of_birth: string;
  gender: string;
  address: string;
  city: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  medical_conditions: string;
  allergies: string;
  avatar_url: string;
}

export const ProfileScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [devTapCount, setDevTapCount] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    phone: '',
    email: '',
    bio: '',
    date_of_birth: '',
    gender: '',
    address: '',
    city: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_conditions: '',
    allergies: '',
    avatar_url: ''
  });
  
  // Hook para obtener los créditos del usuario
  const { credits, transactions, loading: creditsLoading, refresh: refreshCredits } = useUserCredits();

  useEffect(() => {
    loadProfile();

    // Listen for app state changes to refresh credits when app comes to foreground
    const appStateListener = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('App became active, refreshing credits...');
        refreshCredits();
      }
    });

    return () => {
      appStateListener.remove();
    };
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Cargar perfil
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!profileData) {
        // Si no existe el perfil, usar datos vacíos
        console.log('Profile not found, using empty data');
        setProfile({
          full_name: user.user_metadata?.full_name || '',
          phone: '',
          email: user.email || '',
          bio: '',
          date_of_birth: '',
          gender: '',
          address: '',
          city: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          medical_conditions: '',
          allergies: '',
          avatar_url: ''
        });
        
        // Intentar crear el perfil en segundo plano
        supabase
          .from('profiles')
          .insert({ 
            id: user.id,
            full_name: user.user_metadata?.full_name || '',
            email: user.email
          })
          .then(({ error }) => {
            if (error) {
              console.error('Error creating profile in background:', error);
            }
          });
        
        return;
      }

      setProfile({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        email: user.email || '',
        bio: profileData.bio || '',
        date_of_birth: profileData.date_of_birth || '',
        gender: profileData.gender || '',
        address: profileData.address || '',
        city: profileData.city || '',
        emergency_contact_name: profileData.emergency_contact_name || '',
        emergency_contact_phone: profileData.emergency_contact_phone || '',
        medical_conditions: profileData.medical_conditions || '',
        allergies: profileData.allergies || '',
        avatar_url: profileData.avatar_url || ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'No se pudo cargar tu perfil');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para cambiar la foto de perfil');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.Images],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Crear nombre único para la imagen
      const fileExt = uri.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Convertir URI a blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Subir a Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Actualizar perfil con nueva URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      Alert.alert('Éxito', 'Foto de perfil actualizada');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setProfile({ ...profile, date_of_birth: formattedDate });
    }
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('es-ES', options);
  };

  const getDateForPicker = () => {
    if (profile.date_of_birth) {
      return new Date(profile.date_of_birth);
    }
    // Fecha por defecto: hace 25 años
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 25);
    return defaultDate;
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Primero verificar si el perfil existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      const profileData = {
        full_name: profile.full_name,
        phone: profile.phone,
        bio: profile.bio,
        date_of_birth: profile.date_of_birth || null,
        gender: profile.gender || null,
        address: profile.address || null,
        city: profile.city || null,
        emergency_contact_name: profile.emergency_contact_name || null,
        emergency_contact_phone: profile.emergency_contact_phone || null,
        medical_conditions: profile.medical_conditions || null,
        allergies: profile.allergies || null
      };

      let error;
      
      if (existingProfile) {
        // Actualizar perfil existente
        const result = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id);
        error = result.error;
      } else {
        // Crear nuevo perfil
        const result = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            ...profileData
          });
        error = result.error;
      }

      if (error) throw error;

      Alert.alert('Éxito', 'Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.green} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await Promise.all([
                  loadProfile(),
                  refreshCredits()
                ]);
                setRefreshing(false);
              }}
              tintColor={Colors.primary.green}
              colors={[Colors.primary.green]}
              progressBackgroundColor="#ffffff"
            />
          }
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                setDevTapCount(devTapCount + 1);
                if (devTapCount >= 4) {
                  setDevTapCount(0);
                  navigation.navigate('DevTools');
                }
              }}
              activeOpacity={1}
            >
              <Text style={styles.title}>Mi Perfil</Text>
            </TouchableOpacity>
          </View>

          {/* Foto de perfil */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} disabled={uploading}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {profile.full_name ? profile.full_name[0].toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
              <View style={styles.cameraIcon}>
                <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Sección de Créditos - Versión Compacta */}
          <View style={styles.creditsSection}>
            <TouchableOpacity 
              style={styles.creditsCard}
              onPress={() => navigation.navigate('CreditsDetail')}
              activeOpacity={0.8}
            >
              <View style={styles.creditsCompactContent}>
                <View style={styles.creditsLeft}>
                  <MaterialCommunityIcons name="wallet" size={22} color={Colors.primary.green} />
                  <Text style={styles.creditsCompactTitle}>Mis Créditos</Text>
                </View>
                
                <View style={styles.creditsRight}>
                  {creditsLoading ? (
                    <ActivityIndicator size="small" color={Colors.primary.green} />
                  ) : (
                    <>
                      <Text style={styles.creditsCompactLabel}>Saldo</Text>
                      <Text style={styles.creditsCompactAmount}>
                        {credits ? formatCredits(credits.available_credits) : '$0'}
                      </Text>
                    </>
                  )}
                  <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.primary.green} style={{ marginLeft: 8 }} />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Información personal */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="account-outline" size={20} color={Colors.primary.dark} />
              <Text style={styles.sectionTitle}>Información Personal</Text>
            </View>
            
            <Input
              label="Nombre completo"
              value={profile.full_name}
              onChangeText={(text) => setProfile({ ...profile, full_name: text })}
              placeholder="Tu nombre completo"
            />

            <Input
              label="Correo electrónico"
              value={profile.email}
              editable={false}
              style={styles.disabledInput}
            />

            <Input
              label="Teléfono"
              value={profile.phone}
              onChangeText={(text) => setProfile({ ...profile, phone: text })}
              placeholder="Tu número de teléfono"
              keyboardType="phone-pad"
            />

            <Input
              label="Biografía"
              value={profile.bio}
              onChangeText={(text) => setProfile({ ...profile, bio: text })}
              placeholder="Cuéntanos sobre ti"
              multiline
              numberOfLines={3}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Fecha de nacimiento</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <MaterialCommunityIcons name="calendar" size={20} color={Colors.primary.green} />
                  <Text style={styles.datePickerText}>
                    {profile.date_of_birth 
                      ? formatDateDisplay(profile.date_of_birth) 
                      : 'Seleccionar fecha'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Género</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowGenderPicker(true)}
                >
                  <MaterialCommunityIcons 
                    name="gender-male-female" 
                    size={20} 
                    color={Colors.primary.green} 
                  />
                  <Text style={styles.datePickerText}>
                    {profile.gender || 'Seleccionar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Dirección */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color={Colors.primary.dark} />
              <Text style={styles.sectionTitle}>Dirección</Text>
            </View>
            
            <Input
              label="Dirección"
              value={profile.address}
              onChangeText={(text) => setProfile({ ...profile, address: text })}
              placeholder="Tu dirección"
            />

            <Input
              label="Ciudad"
              value={profile.city}
              onChangeText={(text) => setProfile({ ...profile, city: text })}
              placeholder="Tu ciudad"
            />
          </View>

          {/* Contacto de emergencia */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="phone-alert" size={20} color={Colors.primary.dark} />
              <Text style={styles.sectionTitle}>Contacto de Emergencia</Text>
            </View>
            
            <Input
              label="Nombre del contacto"
              value={profile.emergency_contact_name}
              onChangeText={(text) => setProfile({ ...profile, emergency_contact_name: text })}
              placeholder="Nombre de tu contacto de emergencia"
            />

            <Input
              label="Teléfono del contacto"
              value={profile.emergency_contact_phone}
              onChangeText={(text) => setProfile({ ...profile, emergency_contact_phone: text })}
              placeholder="Teléfono de emergencia"
              keyboardType="phone-pad"
            />
          </View>

          {/* Información médica */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="medical-bag" size={20} color={Colors.primary.dark} />
              <Text style={styles.sectionTitle}>Información Médica</Text>
            </View>
            
            <Input
              label="Condiciones médicas"
              value={profile.medical_conditions}
              onChangeText={(text) => setProfile({ ...profile, medical_conditions: text })}
              placeholder="Condiciones médicas relevantes"
              multiline
              numberOfLines={3}
            />

            <Input
              label="Alergias"
              value={profile.allergies}
              onChangeText={(text) => setProfile({ ...profile, allergies: text })}
              placeholder="Alergias conocidas"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Botones de acción */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButtonStyle]}
              onPress={saveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.buttonContent}>
                  <MaterialCommunityIcons name="content-save" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Guardar cambios</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.notificationButtonStyle]}
              onPress={() => navigation.navigate('NotificationPreferences')}
            >
              <View style={styles.buttonContent}>
                <MaterialCommunityIcons name="bell-outline" size={20} color="#FFFFFF" />
                <Text style={styles.notificationButtonText}>Notificaciones</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={getDateForPicker()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
          locale="es"
        />
      )}

      {/* Gender Picker Modal */}
      <Modal
        visible={showGenderPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGenderPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Género</Text>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.genderOption}
              onPress={() => {
                setProfile({ ...profile, gender: 'Masculino' });
                setShowGenderPicker(false);
              }}
            >
              <MaterialCommunityIcons name="gender-male" size={24} color={Colors.primary.green} />
              <Text style={styles.genderOptionText}>Masculino</Text>
              {profile.gender === 'Masculino' && (
                <Ionicons name="checkmark-circle" size={24} color={Colors.primary.green} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.genderOption}
              onPress={() => {
                setProfile({ ...profile, gender: 'Femenino' });
                setShowGenderPicker(false);
              }}
            >
              <MaterialCommunityIcons name="gender-female" size={24} color="#FF69B4" />
              <Text style={styles.genderOptionText}>Femenino</Text>
              {profile.gender === 'Femenino' && (
                <Ionicons name="checkmark-circle" size={24} color={Colors.primary.green} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.genderOption}
              onPress={() => {
                setProfile({ ...profile, gender: 'Otro' });
                setShowGenderPicker(false);
              }}
            >
              <MaterialCommunityIcons name="gender-transgender" size={24} color="#9B59B6" />
              <Text style={styles.genderOptionText}>Otro</Text>
              {profile.gender === 'Otro' && (
                <Ionicons name="checkmark-circle" size={24} color={Colors.primary.green} />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.ui.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    color: Colors.text.secondary,
    fontWeight: 'bold',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    backgroundColor: Colors.primary.dark,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.ui.background,
  },
  section: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary.dark,
    flex: 1,
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  bottomSpacing: {
    height: 100,
  },
  buttonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginTop: 8,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonStyle: {
    backgroundColor: Colors.primary.dark,
  },
  notificationButtonStyle: {
    backgroundColor: Colors.primary.dark,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  notificationButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    gap: 10,
  },
  datePickerText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary.dark,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
    gap: 16,
  },
  genderOptionText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  // Estilos para la sección de créditos
  creditsSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  creditsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  creditsCompactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creditsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creditsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditsCompactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  creditsCompactLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginRight: 6,
  },
  creditsCompactAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary.green,
  },
});