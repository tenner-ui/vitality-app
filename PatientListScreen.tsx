import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, Card } from './ui';
import { Header } from './Header';
import { notify } from './notify';
import { colors } from './colors';
import { fonts, type } from './typography';
import { useAuth } from './AuthContext';
import { listPatients, setPatientActive, createPatientAccount, PatientRow } from './api';
import { GoldButton } from './ui';
import { TeamStackParams } from './TeamNavigator';

export function PatientListScreen() {
  const { demo, userId, isLeader } = useAuth();
  const ctx = { demo, patientId: userId };
  const nav = useNavigation<NativeStackNavigationProp<TeamStackParams>>();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'todos' | 'ativos' | 'pendentes'>('todos');
  const [showNew, setShowNew] = useState(false);
  const [nName, setNName] = useState('');
  const [nEmail, setNEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [cred, setCred] = useState<{ email: string; password: string } | null>(null);

  function load() {
    listPatients(ctx).then(setPatients).catch(() => {});
  }
  useEffect(() => { load(); }, [demo, userId]);

  async function criar() {
    if (!nName.trim() || !nEmail.trim()) return notify('Novo paciente', 'Informe nome e e-mail.');
    setCreating(true);
    const r = await createPatientAccount(nEmail.trim(), nName.trim());
    setCreating(false);
    if (r.error) return notify('Não foi possível criar', r.error);
    setCred({ email: r.email!, password: r.password! });
    setNName(''); setNEmail(''); setShowNew(false);
    load();
  }

  async function toggle(p: PatientRow) {
    const novo = !p.active;
    setPatients((arr) => arr.map((x) => x.id === p.id ? { ...x, active: novo } : x));
    const { error } = await setPatientActive(ctx, p.id, novo);
    if (error) { notify('Erro', error); load(); return; }
    notify(novo ? 'Paciente liberado ✓' : 'Acesso pausado', novo ? `${p.full_name} já pode usar o app.` : `${p.full_name} não acessa mais até ser liberado.`);
  }

  const filtered = patients
    .filter((p) => p.full_name.toLowerCase().includes(q.toLowerCase()))
    .filter((p) => filter === 'todos' ? true : filter === 'ativos' ? p.active : !p.active);

  return (
    <Screen>
      <Header title="Pacientes" subtitle="Acompanhamento" rightIcon="search-outline" />

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput style={styles.input} placeholder="Buscar paciente…" placeholderTextColor={colors.textMuted} value={q} onChangeText={setQ} />
      </View>

      {isLeader && (
        <>
          {!showNew && !cred && (
            <GoldButton label="＋ Novo paciente" onPress={() => setShowNew(true)} style={{ marginBottom: 14 }} />
          )}
          {showNew && (
            <Card glow style={{ marginBottom: 14 }}>
              <Text style={styles.formTitle}>Criar login de paciente</Text>
              <TextInput style={styles.formInput} placeholder="Nome completo" placeholderTextColor={colors.textMuted} value={nName} onChangeText={setNName} />
              <TextInput style={styles.formInput} placeholder="E-mail do paciente" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={nEmail} onChangeText={setNEmail} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <GoldButton label="Cancelar" onPress={() => setShowNew(false)} outline style={{ flex: 1 }} />
                <GoldButton label={creating ? 'Criando…' : 'Criar conta'} onPress={criar} style={{ flex: 2 }} />
              </View>
            </Card>
          )}
          {cred && (
            <Card glow style={{ marginBottom: 14, borderColor: colors.success }}>
              <Text style={styles.formTitle}>Conta criada ✓ — entregue ao paciente</Text>
              <Text style={styles.credLine}>E-mail: <Text style={styles.credVal}>{cred.email}</Text></Text>
              <Text style={styles.credLine}>Senha provisória: <Text style={styles.credVal}>{cred.password}</Text></Text>
              <Text style={styles.credHint}>O paciente pode trocar a senha em Perfil › Trocar senha após entrar.</Text>
              <GoldButton label="Ok, anotei" onPress={() => setCred(null)} outline style={{ marginTop: 10 }} />
            </Card>
          )}
        </>
      )}

      <View style={styles.filterRow}>
        {(['todos', 'ativos', 'pendentes'] as const).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipOn]}>
            <Text style={[styles.chipText, filter === f && { color: colors.textOnGold }]}>
              {f === 'todos' ? 'Todos' : f === 'ativos' ? 'Ativos' : 'Pendentes'}
            </Text>
          </Pressable>
        ))}
      </View>

      {filtered.map((p) => (
        <Card key={p.id} style={{ marginBottom: 10 }}>
          <View style={styles.row}>
            <Pressable onPress={() => nav.navigate('PatientDetail', { id: p.id, name: p.full_name })}>
              {p.avatar_url ? (
                <Image source={{ uri: p.avatar_url }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.initials}>{p.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</Text>
                </View>
              )}
            </Pressable>
            <Pressable style={{ flex: 1 }} onPress={() => nav.navigate('PatientDetail', { id: p.id, name: p.full_name })}>
              <Text style={styles.name}>{p.full_name}</Text>
              <View style={styles.statusLine}>
                <View style={[styles.statusDot, { backgroundColor: p.active ? colors.success : colors.gold }]} />
                <Text style={[styles.statusText, { color: p.active ? colors.success : colors.gold }]}>
                  {p.active ? 'Ativo' : 'Aguardando liberação'}
                </Text>
                {!!p.week && <Text style={styles.sub}> · semana {p.week}</Text>}
              </View>
            </Pressable>
            {isLeader ? (
              <Pressable onPress={() => toggle(p)} style={[styles.toggle, p.active ? styles.togglePause : styles.toggleOn]}>
                <Ionicons name={p.active ? 'pause' : 'checkmark'} size={16} color={p.active ? colors.gold : colors.textOnGold} />
                <Text style={[styles.toggleText, { color: p.active ? colors.gold : colors.textOnGold }]}>{p.active ? 'Pausar' : 'Liberar'}</Text>
              </Pressable>
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            )}
          </View>
        </Card>
      ))}
      {filtered.length === 0 && <Text style={styles.empty}>Nenhum paciente encontrado.</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceMuted, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, marginBottom: 12 },
  input: { flex: 1, color: colors.textPrimary, paddingVertical: 12, fontFamily: fonts.sans, fontSize: 15 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { ...type.small, color: colors.textSecondary, fontFamily: fonts.sansMedium },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  avatarImg: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: colors.gold },
  initials: { fontFamily: fonts.serifBold, fontSize: 16, color: colors.gold },
  name: { ...type.cardTitle, color: colors.textPrimary },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { ...type.small, fontFamily: fonts.sansMedium },
  sub: { ...type.small, color: colors.textSecondary },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  toggleOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  togglePause: { backgroundColor: 'transparent', borderColor: colors.gold },
  toggleText: { ...type.small, fontFamily: fonts.sansSemibold },
  empty: { ...type.body, color: colors.textMuted, textAlign: 'center', marginTop: 20 },
  formTitle: { ...type.cardTitle, color: colors.textPrimary, marginBottom: 10 },
  formInput: { backgroundColor: colors.surfaceMuted, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.sans, fontSize: 15, marginBottom: 10 },
  credLine: { ...type.body, color: colors.textSecondary, marginTop: 4 },
  credVal: { fontFamily: fonts.sansSemibold, color: colors.gold },
  credHint: { ...type.small, color: colors.textMuted, marginTop: 10 },
});
