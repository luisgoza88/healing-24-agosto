import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from './src/constants/colors';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.ui.background }}>
        <ActivityIndicator size="large" color={Colors.primary.green} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {/* TODO: Add MainNavigator here */}
        </View>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
