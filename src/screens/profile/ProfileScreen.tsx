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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

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

  useEffect(() => {
    loadProfile();
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
          upsert: true
        });

      if (uploadError) throw uploadError;

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
        <ScrollView showsVerticalScrollIndicator={false}>
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
                <Text>📷</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Cambiar foto</Text>
          </View>

          {/* Información personal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Personal</Text>
            
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
                <Input
                  label="Fecha de nacimiento"
                  value={profile.date_of_birth}
                  onChangeText={(text) => setProfile({ ...profile, date_of_birth: text })}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="Género"
                  value={profile.gender}
                  onChangeText={(text) => setProfile({ ...profile, gender: text })}
                  placeholder="Género"
                />
              </View>
            </View>
          </View>

          {/* Dirección */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dirección</Text>
            
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contacto de Emergencia</Text>
            
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Médica</Text>
            
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
          <View style={styles.actions}>
            <Button
              title="Guardar cambios"
              onPress={saveProfile}
              loading={saving}
              disabled={saving}
            />

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('NotificationPreferences')}
            >
              <Text style={styles.secondaryButtonText}>
                🔔 Preferencias de notificación
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: '#2E7653' }]}
              onPress={() => navigation.navigate('TestNotifications' as any)}
            >
              <Text style={[styles.secondaryButtonText, { color: '#fff' }]}>
                🧪 Probar Notificaciones
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingVertical: 24,
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
    backgroundColor: Colors.primary.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    color: '#FFFFFF',
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
    right: 0,
    bottom: 0,
    backgroundColor: Colors.ui.surface,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.ui.background,
  },
  changePhotoText: {
    marginTop: 8,
    fontSize: 16,
    color: Colors.primary.green,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 16,
  },
  disabledInput: {
    backgroundColor: Colors.ui.disabled,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: Colors.primary.green,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: Colors.primary.green,
    fontWeight: '600',
  },
});