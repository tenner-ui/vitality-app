import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from './AuthContext';
import { LoginScreen } from './LoginScreen';
import { SignupScreen } from './SignupScreen';
import { ConsentScreen } from './ConsentScreen';
import { ChangePasswordScreen } from './ChangePasswordScreen';
import { PatientNavigator } from './PatientNavigator';
import { PendingScreen } from './PendingScreen';
import { TeamNavigator } from './TeamNavigator';
import { ViewSwitcher } from './ViewSwitcher';

export type RootStackParams = {
  Login: undefined;
  Signup: undefined;
  Consent: { email: string; password: string; fullName: string; cpf?: string } | undefined;
  Patient: undefined;
  Pending: undefined;
  Team: undefined;
  ChangePassword: undefined;
};

const Stack = createNativeStackNavigator<RootStackParams>();

export function RootNavigator() {
  const { session, demo, isTeam, active, viewAs, mustChangePassword } = useAuth();
  const authed = !!session || demo;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {authed ? (
          mustChangePassword ? (
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          ) : isTeam ? (
            viewAs === 'patient' ? (
              <Stack.Screen name="Patient" component={PatientNavigator} />
            ) : (
              <Stack.Screen name="Team" component={TeamNavigator} />
            )
          ) : active ? (
            <Stack.Screen name="Patient" component={PatientNavigator} />
          ) : (
            <Stack.Screen name="Pending" component={PendingScreen} />
          )
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="Consent" component={ConsentScreen} />
          </>
        )}
      </Stack.Navigator>
      {authed && isTeam && <ViewSwitcher />}
    </View>
  );
}
