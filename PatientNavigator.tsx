import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PatientTabs } from './PatientTabs';
import { WaterScreen } from './WaterScreen';
import { WorkoutScreen } from './WorkoutScreen';
import { ChatScreen } from './ChatScreen';
import { NudgeListener } from './NudgeListener';

export type PatientStackParams = {
  Tabs: undefined;
  Agua: undefined;
  Treino: undefined;
  Chat: undefined;
};

const Stack = createNativeStackNavigator<PatientStackParams>();

export function PatientNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Tabs" component={PatientTabs} />
        <Stack.Screen name="Agua" component={WaterScreen} />
        <Stack.Screen name="Treino" component={WorkoutScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
      <NudgeListener />
    </View>
  );
}
