import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionLabel, GoldButton } from './ui';
import { Header } from './Header';
import { colors } from './colors';
import { fonts, type } from './typography';
import { useAuth } from './AuthContext';
import { roleMeta } from './helpers';

export function TeamProfileScreen() {
  const { displayName, role, signOut, demo } = useAuth();
  return (
    <Screen>
      <Header title="Perfil" subtitle="Equipe Vitality" rightIcon="settings-outline" />

      <Card glow style={{ alignItems: 'center', paddingVertical: 26 }}>
        <View style={styles.avatar}>
          <Ionicons name={roleMeta[role].icon as any} size={34} color={colors.gold} />
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.role}>{roleMeta[role].label}{demo ? ' · demonstração' : ''}</Text>
      </Card>

      <SectionLabel>Permissões deste papel</SectionLabel>
      <Card>
        {permissionsFor(role).map((p) => (
          <View key={p} style={styles.permRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.perm}>{p}</Text>
          </View>
        ))}
      </Card>

      <GoldButton label="Sair" onPress={signOut} outline style={{ marginTop: 20 }} />
    </Screen>
  );
}

function permissionsFor(role: string): string[] {
  switch (role) {
    case 'lider':
      return ['Acesso total a todos os pacientes', 'Todas as áreas: médica, nutrição, psicologia e ed. física', 'Lançar exames, prescrições, bioimpedância e avaliações', 'Ver alertas de risco de toda a equipe'];
    case 'medico':
      return ['Ver todos os pacientes', 'Lançar exames e laudos', 'Prescrever por princípio ativo', 'Ver alertas de risco'];
    case 'nutricionista':
      return ['Ver todos os pacientes', 'Definir metas de dieta/água/macros', 'Enviar orientações', 'Acompanhar adesão'];
    case 'psicologa':
      return ['Ver todos os pacientes', 'Registrar humor e escalas', 'Anotações de sessão', 'Agendar próxima sessão'];
    case 'educador_fisico':
      return ['Ver todos os pacientes', 'Registrar bioimpedância e medidas', 'Montar/ajustar treino', 'Definir meta de passos'];
    default:
      return ['Acesso de paciente'];
  }
}

const styles = StyleSheet.create({
  avatar: { width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, borderColor: colors.gold, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  name: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.textPrimary },
  role: { ...type.small, color: colors.gold, marginTop: 4 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  perm: { ...type.body, color: colors.textSecondary },
});
