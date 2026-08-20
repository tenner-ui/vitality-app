import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Screen, Card, GoldButton, PasswordInput } from './ui';
import { BrandLockup } from './Logo';
import { colors } from './colors';
import { fonts, type } from './typography';
import { useAuth } from './AuthContext';

/** Primeiro acesso: o paciente define uma nova senha (a inicial é a data de nascimento). */
export function ChangePasswordScreen() {
  const { changePassword, displayName, signOut } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function handleSave() {
    setErr('');
    if (pw.length < 6) {
      setErr('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (pw !== pw2) {
      setErr('As senhas não coincidem.');
      return;
    }
    setBusy(true);
    const { error } = await changePassword(pw);
    setBusy(false);
    if (error) setErr(error);
    // Em caso de sucesso, o RootNavigator troca automaticamente para o app.
  }

  const first = (displayName || '').split(' ')[0];

  return (
    <Screen scroll={false} contentStyle={{ padding: 24, justifyContent: 'center' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <BrandLockup />
        </View>

        <Card glow>
          <Text style={styles.title}>Bem-vindo(a){first ? `, ${first}` : ''} 👋</Text>
          <Text style={styles.sub}>
            Este é seu primeiro acesso. Por segurança, defina uma nova senha pessoal —
            ela substitui a data de nascimento usada para entrar.
          </Text>

          <Text style={styles.label}>Nova senha</Text>
          <PasswordInput inputStyle={styles.input} placeholder="mínimo 6 caracteres" value={pw} onChangeText={setPw} />

          <Text style={styles.label}>Confirmar nova senha</Text>
          <PasswordInput inputStyle={styles.input} placeholder="repita a nova senha" value={pw2} onChangeText={setPw2} />

          {!!err && <Text style={styles.error}>{err}</Text>}

          <GoldButton label={busy ? 'Salvando…' : 'Salvar e entrar'} onPress={handleSave} style={{ marginTop: 10 }} />

          <Text style={styles.helper} onPress={() => signOut()}>
            Sair
          </Text>
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.textPrimary, marginBottom: 8 },
  sub: { ...type.body, color: colors.textSecondary, lineHeight: 21, marginBottom: 8 },
  label: { ...type.caption, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
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
  error: { ...type.small, color: colors.danger, textAlign: 'center', marginTop: 12 },
  helper: { ...type.small, color: colors.textMuted, textAlign: 'center', marginTop: 18 },
});
