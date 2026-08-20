import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { notify } from './notify';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, GoldButton, Card } from './ui';
import { colors } from './colors';
import { fonts, type } from './typography';
import { useAuth } from './AuthContext';
import { supabase, supabaseConfigured } from './supabase';
import { RootStackParams } from './RootNavigator';

type Props = NativeStackScreenProps<RootStackParams, 'Consent'>;

function CheckRow({ value, onToggle, children }: { value: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onToggle} style={styles.checkRow}>
      <View style={[styles.box, value && styles.boxOn]}>
        {value && <Ionicons name="checkmark" size={16} color={colors.textOnGold} />}
      </View>
      <Text style={styles.checkText}>{children}</Text>
    </Pressable>
  );
}

export function ConsentScreen({ route, navigation }: Props) {
  const { signUp, signIn } = useAuth();
  const params = route.params!;
  const [lgpd, setLgpd] = useState(false);
  const [terms, setTerms] = useState(false);
  const [didactic, setDidactic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  function traduz(e: string): string {
    const s = e.toLowerCase();
    if (s.includes('already registered') || s.includes('already been registered')) return 'Este e-mail já tem conta. Volte e faça login.';
    if (s.includes('password')) return 'A senha precisa ter ao menos 6 caracteres.';
    if (s.includes('valid email') || s.includes('invalid email')) return 'E-mail inválido. Confira e tente de novo.';
    if (s.includes('network')) return 'Sem conexão. Verifique a internet e tente de novo.';
    return e;
  }

  async function finish() {
    setErr('');
    if (!lgpd || !terms) {
      setErr('É preciso marcar a LGPD e os Termos de Uso para continuar.');
      return;
    }
    setBusy(true);
    const { error } = await signUp(params.email, params.password, params.fullName, params.cpf);
    setBusy(false);
    if (error) {
      setErr(traduz(error));
      return;
    }
    // Confirmação de e-mail obrigatória: mostra a tela "verifique seu e-mail".
    setDone(true);
  }

  if (done) {
    return (
      <Screen contentStyle={{ justifyContent: 'center', flexGrow: 1 }}>
        <Card glow style={{ alignItems: 'center', paddingVertical: 30 }}>
          <View style={styles.mailBadge}>
            <Ionicons name="mail-unread-outline" size={34} color={colors.gold} />
          </View>
          <Text style={styles.title}>Confirme seu e-mail</Text>
          <Text style={[styles.sub, { textAlign: 'center', marginTop: 10 }]}>
            Enviamos um link de confirmação para{'\n'}
            <Text style={{ color: colors.gold }}>{params.email}</Text>.{'\n\n'}
            Abra o e-mail, confirme sua conta e depois faça login. O acesso é liberado pelo Dr. Tenner
            quando você inicia um protocolo ativo.
          </Text>
          <GoldButton label="Ir para o login" onPress={() => navigation.navigate('Login')} style={{ marginTop: 20, alignSelf: 'stretch' }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
        <Ionicons name="chevron-back" size={26} color={colors.gold} />
      </Pressable>
      <Text style={styles.title}>Privacidade e consentimento</Text>
      <Text style={styles.sub}>
        Seus dados de saúde são sensíveis. Tratamos com base na LGPD (Lei 13.709/2018): criptografia,
        acesso restrito à sua equipe de cuidado e direito de exclusão a qualquer momento.
      </Text>

      <Card glow style={{ marginTop: 18 }}>
        <CheckRow value={lgpd} onToggle={() => setLgpd(!lgpd)}>
          Autorizo o tratamento dos meus dados de saúde para acompanhamento clínico, conforme a
          Política de Privacidade. <Text style={{ color: colors.gold }}>(obrigatório)</Text>
        </CheckRow>
        <CheckRow value={terms} onToggle={() => setTerms(!terms)}>
          Li e aceito os Termos de Uso do aplicativo. <Text style={{ color: colors.gold }}>(obrigatório)</Text>
        </CheckRow>
        <CheckRow value={didactic} onToggle={() => setDidactic(!didactic)}>
          Autorizo o uso didático das minhas fotos de evolução (antes/depois), de forma anônima.
          <Text style={{ color: colors.textMuted }}> (opcional)</Text>
        </CheckRow>
      </Card>

      {!!err && <Text style={styles.error}>{err}</Text>}

      <Text style={styles.note}>
        Você pode revogar consentimentos e solicitar a exclusão dos seus dados a qualquer momento em
        Ajustes › Privacidade.
      </Text>

      <GoldButton label={busy ? 'Concluindo…' : 'Aceitar e concluir cadastro'} onPress={finish} style={{ marginTop: 18 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.serifBold, fontSize: 26, color: colors.textPrimary },
  sub: { ...type.body, color: colors.textSecondary, marginTop: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  box: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 1,
  },
  boxOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  checkText: { ...type.small, color: colors.textSecondary, flex: 1, lineHeight: 18 },
  note: { ...type.small, color: colors.textMuted, marginTop: 14 },
  error: { ...type.small, color: colors.danger, marginTop: 14, fontFamily: fonts.sansSemibold },
  mailBadge: { width: 74, height: 74, borderRadius: 37, borderWidth: 1.5, borderColor: colors.gold, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
});
