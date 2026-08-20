import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, GoldButton } from './ui';
import { BrandLockup } from './Logo';
import { colors } from './colors';
import { fonts, type } from './typography';
import { useAuth } from './AuthContext';

export function PendingScreen() {
  const { displayName, signOut, refreshProfile } = useAuth();
  const firstName = (displayName || 'Paciente').split(' ')[0];
  return (
    <Screen contentStyle={{ justifyContent: 'center', flexGrow: 1 }}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <BrandLockup />
      </View>
      <Card glow style={{ alignItems: 'center', paddingVertical: 30 }}>
        <View style={styles.badge}>
          <Ionicons name="hourglass-outline" size={34} color={colors.gold} />
        </View>
        <Text style={styles.title}>Olá, {firstName}!</Text>
        <Text style={styles.body}>
          Seu cadastro foi recebido. O acesso ao aplicativo é liberado pelo{' '}
          <Text style={{ color: colors.gold }}>Dr. Tenner Nunes</Text> quando você inicia um protocolo ativo no
          Instituto Vitality.
        </Text>
        <Text style={[styles.body, { marginTop: 10 }]}>
          Assim que sua liberação for concluída, é só abrir o app novamente. Você será avisado.
        </Text>
        <GoldButton label="Já fui liberado — atualizar" onPress={refreshProfile} style={{ marginTop: 18, alignSelf: 'stretch' }} />
        <GoldButton label="Sair" onPress={signOut} outline style={{ marginTop: 10, alignSelf: 'stretch' }} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { width: 74, height: 74, borderRadius: 37, borderWidth: 1.5, borderColor: colors.gold, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontFamily: fonts.serifBold, fontSize: 24, color: colors.textPrimary },
  body: { ...type.body, color: colors.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 22 },
});
