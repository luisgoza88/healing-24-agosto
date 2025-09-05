import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors } from '../constants/colors';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AppointmentsScreen } from '../screens/appointments/AppointmentsScreen';
import { HotStudioScreen } from '../screens/hotstudio/HotStudioScreen';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary.green,
        tabBarInactiveTintColor: Colors.text.light,
        tabBarStyle: {
          backgroundColor: Colors.ui.surface,
          borderTopColor: Colors.ui.divider,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarLabel: 'Citas',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📅</Text>
          ),
        }}
      />
      <Tab.Screen
        name="HotStudio"
        component={HotStudioScreen}
        options={{
          tabBarLabel: 'Hot Studio',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🧘‍♀️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};