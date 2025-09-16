import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants/colors';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { MyCreditsScreen } from '../screens/profile/MyCreditsScreen';
import { AppointmentsScreen } from '../screens/appointments/AppointmentsScreen';
import { CreditsDetailScreen } from '../screens/credits/CreditsDetailScreen';

// Importar pantallas de Breathe & Move
import { BreatheAndMoveScreen } from '../screens/breatheandmove/BreatheAndMoveScreen';
import { ClassScheduleScreen } from '../screens/breatheandmove/ClassScheduleScreen';
import { PackagesScreen } from '../screens/breatheandmove/PackagesScreen';
import { ClassEnrollmentScreen as BreatheAndMoveClassEnrollmentScreen } from '../screens/breatheandmove/ClassEnrollmentScreen';
import { MyPackagesScreen } from '../screens/breatheandmove/MyPackagesScreen';
import { PackagePaymentScreen } from '../screens/breatheandmove/PackagePaymentScreen';
import { ClassPaymentScreen } from '../screens/breatheandmove/ClassPaymentScreen';
import { ScheduleScreen } from '../screens/breatheandmove/ScheduleScreen';
import { BreatheAndMoveClassDetailScreen } from '../screens/breatheandmove/ClassDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack para la pantalla Home y sus sub-pantallas
const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="BreatheAndMove" component={BreatheAndMoveScreen} />
      <Stack.Screen name="ClassSchedule" component={ClassScheduleScreen} />
      <Stack.Screen name="Packages" component={PackagesScreen} />
      <Stack.Screen name="BreatheAndMoveClassEnrollment" component={BreatheAndMoveClassEnrollmentScreen} />
      <Stack.Screen name="MyPackages" component={MyPackagesScreen} />
      <Stack.Screen name="PackagePayment" component={PackagePaymentScreen} />
      <Stack.Screen name="ClassPayment" component={ClassPaymentScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="BreatheAndMoveClassDetail" component={BreatheAndMoveClassDetailScreen} />
    </Stack.Navigator>
  );
};

// Stack para el perfil
const ProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="CreditsDetail" component={CreditsDetailScreen} />
      <Stack.Screen name="MyCredits" component={MyCreditsScreen} />
    </Stack.Navigator>
  );
};

// Stack para Breathe & Move
const BreatheAndMoveStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BreatheAndMoveMain" component={BreatheAndMoveScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="ClassSchedule" component={ClassScheduleScreen} />
      <Stack.Screen name="Packages" component={PackagesScreen} />
      <Stack.Screen name="BreatheAndMoveClassEnrollment" component={BreatheAndMoveClassEnrollmentScreen} />
      <Stack.Screen name="MyPackages" component={MyPackagesScreen} />
      <Stack.Screen name="PackagePayment" component={PackagePaymentScreen} />
      <Stack.Screen name="ClassPayment" component={ClassPaymentScreen} />
      <Stack.Screen name="BreatheAndMoveClassDetail" component={BreatheAndMoveClassDetailScreen} />
    </Stack.Navigator>
  );
};

export const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary.dark,
        tabBarInactiveTintColor: Colors.text.light,
        tabBarStyle: {
          backgroundColor: Colors.ui.surface,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: 5,
          paddingTop: 5,
          height: 85,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarLabel: 'Citas',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BreatheAndMove"
        component={BreatheAndMoveStack}
        options={{
          tabBarLabel: 'B&M',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name="yoga" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};