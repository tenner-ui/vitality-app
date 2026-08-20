import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { notify } from './notify';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, GoldButton, Card, PasswordInput } from './ui';
import { BrandLockup, TennerMark } from './Logo';
import { colors } from './colors';
import { fonts, type } from './typography';
import { useAuth } from './AuthContext';
import { RootStackParams } from './RootNavigator';

type Props = NativeStackScreenProps<RootStackParams, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function traduzErro(e: string): string {
    const s = e.toLowerCase();
    if (s.includes('invalid login')) return 'E-mail ou senha incorretos.';
    if (s.includes('email not confirmed')) return 'E-mail ainda não confirmado. Fale com o Instituto.';
    if (s.includes('network')) return 'Sem conexão. Verifique a internet e tente de novo.';
    return e;
  }

  async function handleLogin() {
    setErr('');
    if (!email || !password) {
      setErr('Preencha e-mail e senha.');
      return;
    }
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) setErr(traduzErro(error));
  }

  return (
    <Screen scroll={false} contentStyle={{ padding: 24, justifyContent: 'center' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <BrandLockup />
          <Text style={styles.tagline}>Saúde metabólica · Programa RenovaCorps</Text>
        </View>

        <Card glow>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="voce@email.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>Senha</Text>
          <PasswordInput
            inputStyle={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
          />
          {!!err && <Text style={styles.error}>{err}</Text>}
          <GoldButton label={busy ? 'Entrando…' : 'Entrar'} onPress={handleLogin} style={{ marginTop: 8 }} />

          <Pressable onPress={() => navigation.navigate('Signup')} style={{ marginTop: 18, alignItems: 'center' }}>
            <Text style={styles.link}>
              Não tem conta? <Text style={{ color: colors.gold }}>Cadastre-se</Text>
            </Text>
          </Pressable>
          <Text style={styles.helper}>
            Após o cadastro, confirme seu e-mail. O acesso é liberado pelo Dr. Tenner.
          </Text>
        </Card>

        {!configured && (
          <Text style={styles.warn}>
            Supabase não configurado neste build — use o modo demonstração.
          </Text>
        )}

        <View style={styles.signature}>
          <TennerMark size={64} />
          <Text style={styles.signatureText}>Responsabilidade técnica · Dr. Tenner Nunes — CRM 2020RR</Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tagline: { ...type.small, color: colors.textSecondary, marginTop: 10 },
  label: { ...type.caption, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  link: { ...type.body, color: colors.textSecondary },
  helper: { ...type.small, color: colors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  demoBtn: { marginTop: 22, alignItems: 'center', paddingVertical: 12 },
  demoText: { ...type.bodyStrong, color: colors.gold, letterSpacing: 0.5 },
  demoTeamLabel: { ...type.caption, color: colors.textMuted, textAlign: 'center', marginTop: 6, textTransform: 'uppercase' },
  demoTeamRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  demoChip: { borderWidth: 1, borderColor: colors.hairline, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  demoChipText: { ...type.small, color: colors.gold },
  warn: { ...type.small, color: colors.textMuted, textAlign: 'center', marginTop: 10 },
  error: { ...type.small, color: colors.danger, textAlign: 'center', marginTop: 12, marginBottom: 2 },
  signature: { alignItems: 'center', marginTop: 30, opacity: 0.9 },
  signatureText: { ...type.small, color: colors.textMuted, textAlign: 'center', marginTop: 8, letterSpacing: 0.4 },
});
