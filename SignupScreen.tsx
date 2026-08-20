import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { notify } from './notify';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, GoldButton, Card, PasswordInput } from './ui';
import { colors } from './colors';
import { fonts, type } from './typography';
import { RootStackParams } from './RootNavigator';

type Props = NativeStackScreenProps<RootStackParams, 'Signup'>;

function digits(s: string) { return s.replace(/\D/g, ''); }
function formatCpf(s: string) {
  const d = digits(s).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function SignupScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function next() {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      notify('VITALITY', 'Preencha nome, e-mail e uma senha de 6+ caracteres.');
      return;
    }
    if (digits(cpf).length !== 11) {
      notify('VITALITY', 'Informe um CPF válido (11 dígitos).');
      return;
    }
    navigation.navigate('Consent', { email: email.trim(), password, fullName: fullName.trim(), cpf: digits(cpf) });
  }

  return (
    <Screen scroll={false} contentStyle={{ padding: 24, justifyContent: 'center' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
            <Ionicons name="chevron-back" size={26} color={colors.gold} />
          </Pressable>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.sub}>Comece sua jornada no Instituto Vitality.</Text>

          <Card glow style={{ marginTop: 20 }}>
            <Text style={styles.label}>Nome completo</Text>
            <TextInput style={styles.input} placeholder="Seu nome completo" placeholderTextColor={colors.textMuted} value={fullName} onChangeText={setFullName} />
            <Text style={styles.label}>CPF</Text>
            <TextInput style={styles.input} placeholder="000.000.000-00" placeholderTextColor={colors.textMuted} keyboardType="number-pad" value={cpf} onChangeText={(t) => setCpf(formatCpf(t))} />
            <Text style={styles.label}>E-mail</Text>
            <TextInput style={styles.input} placeholder="voce@email.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <Text style={styles.label}>Senha</Text>
            <PasswordInput inputStyle={styles.input} placeholder="mínimo 6 caracteres" value={password} onChangeText={setPassword} />
            <GoldButton label="Continuar" onPress={next} style={{ marginTop: 14 }} />
            <Text style={styles.note}>Após o cadastro você confirma seu e-mail. O acesso é liberado pelo Dr. Tenner.</Text>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.serifBold, fontSize: 28, color: colors.textPrimary },
  sub: { ...type.body, color: colors.textSecondary, marginTop: 6 },
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
  note: { ...type.small, color: colors.textMuted, marginTop: 12, textAlign: 'center', lineHeight: 17 },
});
