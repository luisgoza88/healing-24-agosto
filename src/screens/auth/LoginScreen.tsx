import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../../components/Logo';
import { Button } from '../../components/Button';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Primero intentamos el signup
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email === 'lmg880@gmail.com' ? 'Luis Miguel González López' : email.split('@')[0]
            },
            emailRedirectTo: 'healing-forest://auth'
          }
        });
        
        if (error) {
          // Si el usuario ya existe, cambiamos a login
          if (error.message.includes('already registered')) {
            setIsSignUp(false);
            Alert.alert('Info', 'El usuario ya existe. Intenta iniciar sesión.');
            setLoading(false);
            return;
          }
          throw error;
        }
        
        // Si todo salió bien, intentamos hacer login automático
        if (data.user && !data.session) {
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (!loginError) {
            // Login exitoso, no mostramos alerta
            return;
          }
        }
        
        Alert.alert('Éxito', 'Cuenta creada exitosamente');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <Logo size="large" />
            </View>

            <View style={styles.headerContainer}>
              <Text style={styles.title}>
                {isSignUp ? 'Crear Cuenta' : 'Bienvenido'}
              </Text>
              <Text style={styles.subtitle}>
                {isSignUp ? 'Únete a Healing Forest' : 'Inicia sesión para continuar'}
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View>
                <Text style={styles.label}>
                  Email
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@email.com"
                  placeholderTextColor={Colors.text.light}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>

              <View>
                <Text style={styles.label}>
                  Contraseña
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.text.light}
                  secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title={isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
                onPress={handleAuth}
                loading={loading}
                size="large"
              />
            </View>

            <TouchableOpacity
              style={styles.toggleContainer}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.toggleText}>
                {isSignUp ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                <Text style={styles.toggleLink}>
                  {isSignUp ? 'Inicia Sesión' : 'Regístrate'}
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Botón temporal para usuario de prueba */}
            <TouchableOpacity
              style={[styles.toggleContainer, { marginTop: 12 }]}
              onPress={() => {
                setEmail('lmg880@gmail.com');
                setPassword('Florida20');
                setIsSignUp(false);
              }}
            >
              <Text style={[styles.toggleText, { fontSize: 12 }]}>
                Usar cuenta de prueba
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  headerContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: Colors.primary.dark,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    color: Colors.text.secondary,
  },
  formContainer: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: Colors.text.primary,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.ui.surface,
    color: Colors.text.primary,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 32,
  },
  toggleContainer: {
    marginTop: 24,
  },
  toggleText: {
    textAlign: 'center',
    color: Colors.text.secondary,
  },
  toggleLink: {
    color: Colors.primary.green,
    fontWeight: '600',
  },
});