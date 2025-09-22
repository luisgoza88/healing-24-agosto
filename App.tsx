import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { Colors } from './src/constants/colors';
import { HomeScreen } from './src/screens/home/HomeScreen';
import { SetupScreen } from './src/screens/auth/SetupScreen';
import { QuickSetupScreen } from './src/screens/auth/QuickSetupScreen';
import { TabNavigator } from './src/navigation/TabNavigator';
import { createStackNavigator } from '@react-navigation/stack';
import { NotificationPreferencesScreen } from './src/screens/profile/NotificationPreferencesScreen';
import { RescheduleAppointmentScreen } from './src/screens/appointments/RescheduleAppointmentScreen';
import { DevToolsScreen } from './src/screens/dev/DevToolsScreen';
import { HotStudioScreen } from './src/screens/hotstudio/HotStudioScreen';
import { MembershipsScreen } from './src/screens/hotstudio/MembershipsScreen';
import { ClassEnrollmentScreen } from './src/screens/hotstudio/ClassEnrollmentScreen';
import { ClassDetailScreen } from './src/screens/hotstudio/ClassDetailScreen';
import { MembershipPaymentScreen } from './src/screens/hotstudio/MembershipPaymentScreen';
import { MyMembershipScreen } from './src/screens/hotstudio/MyMembershipScreen';
import { NotificationsScreen } from './src/screens/notifications/NotificationsScreen';
import { TestNotificationsScreen } from './src/screens/test/TestNotificationsScreen';
import { BreatheAndMoveScreen } from './src/screens/breatheandmove/BreatheAndMoveScreen';
import { ClassScheduleScreen } from './src/screens/breatheandmove/ClassScheduleScreen';
import { PackagesScreen } from './src/screens/breatheandmove/PackagesScreen';
import { ScheduleScreen } from './src/screens/breatheandmove/ScheduleScreen';
import { ClassEnrollmentScreen as BreatheAndMoveClassEnrollmentScreen } from './src/screens/breatheandmove/ClassEnrollmentScreen';
import { BreatheAndMoveClassDetailScreen } from './src/screens/breatheandmove/ClassDetailScreen';
import { ClassPaymentScreen } from './src/screens/breatheandmove/ClassPaymentScreen';
import { PackagePaymentScreen } from './src/screens/breatheandmove/PackagePaymentScreen';
import { MyPackagesScreen } from './src/screens/breatheandmove/MyPackagesScreen';
// Initialize functions removed - managed by backend/admin
import { initSentry, setUser as setSentryUser } from './src/config/sentry';
import * as Sentry from '@sentry/react-native';
import { preloadImages } from './src/utils/imageCache';

// Inicializar Sentry antes de cualquier otra cosa
initSentry();

const Stack = createStackNavigator();

// Navigator principal para cuando el usuario está autenticado
const MainNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        presentation: 'card', 
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <Stack.Screen name="RescheduleAppointment" component={RescheduleAppointmentScreen} />
      <Stack.Screen name="DevTools" component={DevToolsScreen} />
      <Stack.Screen name="HotStudio" component={HotStudioScreen} />
      <Stack.Screen name="Memberships" component={MembershipsScreen} />
      <Stack.Screen name="ClassEnrollment" component={ClassEnrollmentScreen} />
      <Stack.Screen name="ClassDetail" component={ClassDetailScreen} />
      <Stack.Screen name="MembershipPayment" component={MembershipPaymentScreen} />
      <Stack.Screen name="MyMembership" component={MyMembershipScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="TestNotifications" component={TestNotificationsScreen} />
    </Stack.Navigator>
  );
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      
      // User is logged in
      if (session) {
        // Classes are managed by backend/admin
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      // User logged in
      if (session && _event === 'SIGNED_IN') {
        // Set user in Sentry for better error tracking
        setSentryUser({
          id: session.user.id,
          email: session.user.email
        });
      } else if (_event === 'SIGNED_OUT') {
        // Clear user from Sentry
        setSentryUser(null);
      }
    });

    // Precargar imágenes cuando la app inicia
    preloadImages();

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.ui.background }}>
        <ActivityIndicator size="large" color={Colors.primary.green} />
      </View>
    );
  }

  // Mostrar pantalla de setup si se presiona el botón especial
  if (showSetup) {
    return <QuickSetupScreen onComplete={() => setShowSetup(false)} />;
  }

  return (
    <NavigationContainer>
      {session ? (
        <MainNavigator />
      ) : (
        <View style={{ flex: 1 }}>
          <AuthNavigator />
          {/* Botón oculto para setup */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              padding: 10,
            }}
            onPress={() => setShowSetup(true)}
          >
            <Text style={{ fontSize: 10, color: Colors.text.light }}>Setup</Text>
          </TouchableOpacity>
        </View>
      )}
    </NavigationContainer>
  );
}

// Wrap App with Sentry for error boundary
export default Sentry.wrap(App);
