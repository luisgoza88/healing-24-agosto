import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

export const SetupScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [loading, setLoading] = useState(false);

  const createTestUser = async () => {
    setLoading(true);
    try {
      // Intenta crear el usuario
      const { data, error } = await supabase.auth.signUp({
        email: 'lmg880@gmail.com',
        password: 'Florida20',
        options: {
          data: {
            full_name: 'Luis Miguel González López'
          }
        }
      });

      if (error) {
        // Si el usuario ya existe, intenta login
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: 'lmg880@gmail.com',
            password: 'Florida20'
          });
          
          if (!loginError) {
            Alert.alert('Éxito', 'Login exitoso con usuario existente');
            onComplete();
            return;
          }
          throw loginError || error;
        }
        throw error;
      }

      // Si se creó exitosamente, intenta login automático
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: 'lmg880@gmail.com',
        password: 'Florida20'
      });

      if (!loginError) {
        Alert.alert('Éxito', 'Usuario creado y login exitoso');
        onComplete();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Configuración Inicial</Text>
        <Text style={styles.subtitle}>
          Vamos a crear tu usuario de prueba para Healing Forest
        </Text>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Usuario de Prueba:</Text>
          <Text style={styles.infoText}>Email: lmg880@gmail.com</Text>
          <Text style={styles.infoText}>Contraseña: Florida20</Text>
          <Text style={styles.infoText}>Nombre: Luis Miguel González López</Text>
        </View>

        <Button
          title={loading ? "Creando usuario..." : "Crear Usuario de Prueba"}
          onPress={createTestUser}
          loading={loading}
          size="large"
        />

        <Text style={styles.note}>
          Este proceso creará el usuario o iniciará sesión si ya existe
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: Colors.ui.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  note: {
    fontSize: 12,
    color: Colors.text.light,
    textAlign: 'center',
    marginTop: 20,
  },
});