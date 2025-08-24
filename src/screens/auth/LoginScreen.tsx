import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        Alert.alert('Éxito', 'Revisa tu email para confirmar tu cuenta');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.ui.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 justify-center">
            <View className="mb-10">
              <Logo size="large" />
            </View>

            <View className="mb-8">
              <Text className="text-3xl font-bold text-center" style={{ color: Colors.primary.dark }}>
                {isSignUp ? 'Crear Cuenta' : 'Bienvenido'}
              </Text>
              <Text className="text-base text-center mt-2" style={{ color: Colors.text.secondary }}>
                {isSignUp ? 'Únete a Healing Forest' : 'Inicia sesión para continuar'}
              </Text>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium mb-2" style={{ color: Colors.text.primary }}>
                  Email
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@email.com"
                  placeholderTextColor={Colors.text.light}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor: Colors.ui.surface,
                    color: Colors.text.primary,
                    fontSize: 16
                  }}
                />
              </View>

              <View>
                <Text className="text-sm font-medium mb-2" style={{ color: Colors.text.primary }}>
                  Contraseña
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.text.light}
                  secureTextEntry
                  className="px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor: Colors.ui.surface,
                    color: Colors.text.primary,
                    fontSize: 16
                  }}
                />
              </View>
            </View>

            <View className="mt-8">
              <Button
                title={isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
                onPress={handleAuth}
                loading={loading}
                size="large"
              />
            </View>

            <TouchableOpacity
              className="mt-6"
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text className="text-center" style={{ color: Colors.text.secondary }}>
                {isSignUp ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                <Text style={{ color: Colors.primary.green, fontWeight: '600' }}>
                  {isSignUp ? 'Inicia Sesión' : 'Regístrate'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};