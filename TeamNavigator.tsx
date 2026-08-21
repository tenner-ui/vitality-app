import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './colors';
import { fonts } from './typography';
import { FluidTabBar } from './FluidTabBar';
import { TeamHomeScreen } from './TeamHomeScreen';
import { PatientListScreen } from './PatientListScreen';
import { TeamProfileScreen } from './TeamProfileScreen';
import { PatientDetailScreen } from './PatientDetailScreen';
import { NutriDeskScreen } from './NutriDeskScreen';
import { ImportPacientesScreen } from './ImportPacientesScreen';

export type TeamStackParams = {
  TeamTabs: undefined;
  PatientDetail: { id: string; name: string };
  NutriDesk: undefined;
  ImportPacientes: undefined;
};

const Stack = createNativeStackNavigator<TeamStackParams>();
const Tab = createBottomTabNavigator();

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Hoje: 'today',
  Pacientes: 'people',
  Perfil: 'person-circle',
};

function TeamTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FluidTabBar {...props} iconMap={icons} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Hoje" component={TeamHomeScreen} />
      <Tab.Screen name="Pacientes" component={PatientListScreen} />
      <Tab.Screen name="Perfil" component={TeamProfileScreen} />
    </Tab.Navigator>
  );
}

export function TeamNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="TeamTabs" component={TeamTabs} />
      <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
      <Stack.Screen name="NutriDesk" component={NutriDeskScreen} />
      <Stack.Screen name="ImportPacientes" component={ImportPacientesScreen} />
    </Stack.Navigator>
  );
}
