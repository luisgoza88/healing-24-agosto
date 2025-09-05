import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

export const QuickSetupScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const setupEverything = async () => {
    setLoading(true);
    setStatus('Iniciando configuración...');

    try {
      // Paso 1: Intentar login primero
      setStatus('Verificando si el usuario existe...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'lmg880@gmail.com',
        password: 'Florida20'
      });

      if (!loginError && loginData.user) {
        setStatus('✅ Usuario encontrado, iniciando sesión...');
        Alert.alert('Éxito', 'Login exitoso');
        setTimeout(onComplete, 1000);
        return;
      }

      // Paso 2: Si no existe, usar un usuario temporal para crear el perfil
      setStatus('Creando configuración inicial...');
      
      // Crear con email diferente temporalmente
      const tempEmail = `temp_${Date.now()}@example.com`;
      const { data: tempUser, error: tempError } = await supabase.auth.signUp({
        email: tempEmail,
        password: 'TempPass123!',
        options: {
          data: {
            full_name: 'Usuario Temporal'
          }
        }
      });

      if (tempUser?.user) {
        // Crear el perfil de Luis Miguel manualmente
        setStatus('Configurando perfil de Luis Miguel...');
        
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: tempUser.user.id,
            email: 'lmg880@gmail.com',
            full_name: 'Luis Miguel González López'
          });

        if (!profileError) {
          setStatus('✅ Perfil creado exitosamente');
          Alert.alert(
            'Configuración Manual Requerida',
            'El perfil se creó, pero necesitas crear el usuario manualmente en Supabase:\n\n' +
            '1. Ve a Authentication > Users\n' +
            '2. Crea un usuario con:\n' +
            '   - Email: lmg880@gmail.com\n' +
            '   - Password: Florida20\n' +
            '   - Auto Confirm: ✓',
            [{ text: 'Entendido', onPress: onComplete }]
          );
        }
      }

    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert('Error', error.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Configuración Rápida</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estado del proceso:</Text>
          <Text style={styles.status}>{status || 'Listo para iniciar'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información del usuario:</Text>
          <Text style={styles.info}>📧 Email: lmg880@gmail.com</Text>
          <Text style={styles.info}>🔑 Contraseña: Florida20</Text>
          <Text style={styles.info}>👤 Nombre: Luis Miguel González López</Text>
        </View>

        <Button
          title="Configurar Usuario"
          onPress={setupEverything}
          loading={loading}
          size="large"
        />

        <Text style={styles.note}>
          Este proceso intentará crear o encontrar tu usuario automáticamente
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.dark,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: Colors.ui.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.dark,
    marginBottom: 12,
  },
  status: {
    fontSize: 14,
    color: Colors.text.primary,
    fontStyle: 'italic',
  },
  info: {
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