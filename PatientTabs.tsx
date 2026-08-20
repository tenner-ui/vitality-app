import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './colors';
import { fonts } from './typography';
import { FluidTabBar } from './FluidTabBar';
import { HomeScreen } from './HomeScreen';
import { NutritionScreen } from './NutritionScreen';
import { CaloriesScreen } from './CaloriesScreen';
import { SaudeScreen } from './SaudeScreen';
import { CardioScreen } from './CardioScreen';
import { CommunityScreen } from './CommunityScreen';
import { AgendaScreen } from './AgendaScreen';
import { PatientProfileScreen } from './PatientProfileScreen';
import { RedesScreen } from './RedesScreen';

const Tab = createBottomTabNavigator();

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Início: 'home',
  Nutrição: 'restaurant',
  Calorias: 'flame',
  Saúde: 'pulse',
  Cardio: 'heart',
  Comunidade: 'people',
  Agenda: 'calendar',
  Perfil: 'person-circle',
  Redes: 'share-social',
};

export function PatientTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FluidTabBar {...props} iconMap={icons} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Nutrição" component={NutritionScreen} />
      <Tab.Screen name="Calorias" component={CaloriesScreen} />
      <Tab.Screen name="Saúde" component={SaudeScreen} />
      <Tab.Screen name="Cardio" component={CardioScreen} />
      <Tab.Screen name="Comunidade" component={CommunityScreen} />
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Perfil" component={PatientProfileScreen} />
      <Tab.Screen name="Redes" component={RedesScreen} />
    </Tab.Navigator>
  );
}
