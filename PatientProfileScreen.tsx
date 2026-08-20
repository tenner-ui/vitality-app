import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionLabel, GoldButton, PasswordInput } from './ui';
import { Header } from './Header';
import { notify } from './notify';
import { colors } from './colors';
import { fonts, type } from './typography';
import { useAuth } from './AuthContext';
import * as api from './api';
import { pickAndUpload, publicUrl } from './storage';

export function PatientProfileScreen() {
  const { demo, userId, displayName, avatarUrl, active, signOut, refreshProfile } = useAuth();
  const ctx = { demo, patientId: userId };
  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  async function trocarSenha() {
    if (pw1.length < 6) return notify('Senha', 'A nova senha precisa ter ao menos 6 caracteres.');
    if (pw1 !== pw2) return notify('Senha', 'As senhas não conferem.');
    setPwBusy(true);
    const { error } = await api.changePassword(pw1);
    setPwBusy(false);
    if (error) return notify('Erro', error);
    setPw1(''); setPw2('');
    notify('Senha alterada ✓', 'Use a nova senha no próximo login.');
  }

  async function trocarFoto() {
    const r = await pickAndUpload('avatars', userId, demo);
    if (r.canceled) return;
    if (r.error) return notify('Foto', r.error);
    if (r.path) {
      const url = publicUrl('avatars', r.path);
      const { error } = await api.updateMyProfile(ctx, { avatar_url: url });
      if (error) return notify('Erro', error);
      await refreshProfile();
      notify('Foto atualizada ✓', 'Sua nova foto de perfil já aparece na Comunidade.');
    }
  }

  async function salvarNome() {
    if (!name.trim()) return notify('Nome', 'Digite seu nome.');
    setSaving(true);
    const { error } = await api.updateMyProfile(ctx, { full_name: name.trim() });
    setSaving(false);
    if (error) return notify('Erro', error);
    await refreshProfile();
    notify('Perfil salvo ✓', '');
  }

  function confirmSair() {
    notify('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const initial = (displayName || '?').trim().charAt(0).toUpperCase();

  return (
    <Screen>
      <Header title="Perfil" subtitle="Sua conta" rightIcon="settings-outline" />

      <Card glow style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Pressable onPress={trocarFoto} style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPh]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={styles.camBadge}>
            <Ionicons name="camera" size={16} color={colors.textOnGold} />
          </View>
        </Pressable>
        <Text style={styles.name}>{displayName}</Text>
        <View style={[styles.statusPill, active ? styles.statusOn : styles.statusOff]}>
          <Ionicons name={active ? 'checkmark-circle' : 'hourglass'} size={14} color={active ? colors.success : colors.gold} />
          <Text style={[styles.statusText, { color: active ? colors.success : colors.gold }]}>
            {active ? 'Protocolo ativo' : 'Aguardando liberação'}
          </Text>
        </View>
        <Text style={styles.hint}>Toque na foto para trocar sua imagem de perfil.</Text>
      </Card>

      <SectionLabel>Meus dados</SectionLabel>
      <Card>
        <Text style={styles.label}>Nome</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor={colors.textMuted} />
        <GoldButton label={saving ? 'Salvando…' : 'Salvar'} onPress={salvarNome} style={{ marginTop: 12 }} />
      </Card>

      <SectionLabel>Trocar senha</SectionLabel>
      <Card>
        <Text style={styles.label}>Nova senha</Text>
        <PasswordInput inputStyle={styles.input} value={pw1} onChangeText={setPw1} placeholder="mínimo 6 caracteres" />
        <Text style={[styles.label, { marginTop: 10 }]}>Repita a nova senha</Text>
        <PasswordInput inputStyle={styles.input} value={pw2} onChangeText={setPw2} placeholder="repita a senha" />
        <GoldButton label={pwBusy ? 'Salvando…' : 'Salvar nova senha'} onPress={trocarSenha} style={{ marginTop: 12 }} />
      </Card>

      <GoldButton label="Sair da conta" onPress={confirmSair} outline style={{ marginTop: 20 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: colors.gold },
  avatarPh: { backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: fonts.serifBold, fontSize: 40, color: colors.gold },
  camBadge: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.navy },
  name: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.textPrimary },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginTop: 10, borderWidth: 1 },
  statusOn: { backgroundColor: colors.success + '18', borderColor: colors.success },
  statusOff: { backgroundColor: colors.gold + '18', borderColor: colors.gold },
  statusText: { ...type.small, fontFamily: fonts.sansSemibold },
  hint: { ...type.small, color: colors.textMuted, marginTop: 12, textAlign: 'center' },
  label: { ...type.caption, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: colors.surfaceMuted, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.sans, fontSize: 15 },
});
