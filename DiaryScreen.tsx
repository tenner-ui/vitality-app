import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionLabel, GoldButton } from './ui';
import { Header } from './Header';
import { colors } from './colors';
import { fonts, type } from './typography';
import { notify } from './notify';
import { useAuth } from './AuthContext';
import * as api from './api';

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MOODS = [
  { v: 1, emoji: '😞', label: 'Difícil' },
  { v: 2, emoji: '😕', label: 'Abaixo' },
  { v: 3, emoji: '😐', label: 'Neutro' },
  { v: 4, emoji: '🙂', label: 'Bom' },
  { v: 5, emoji: '😄', label: 'Ótimo' },
];

const PROMPTS = [
  'Como você se sentiu hoje?',
  'O que funcionou bem na sua alimentação?',
  'Teve algum desafio? Fome, ansiedade, sono?',
  'Uma vitória do dia, por menor que seja.',
];

export function DiaryScreen() {
  const { demo, userId } = useAuth();
  const ctx = { demo, patientId: userId };

  const todayISO = ymd(new Date());
  const [dayISO, setDayISO] = useState(todayISO);
  const [mood, setMood] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const isToday = dayISO === todayISO;
  const dayLabel = isToday
    ? 'Hoje'
    : new Date(dayISO + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });

  function load() {
    api.getDiaryByDate(ctx, dayISO).then((e) => {
      setMood(e?.mood ?? null);
      setSleep(e?.sleep ?? null);
      setNote(e?.note ?? '');
      setSavedAt(e?.updated_at ?? null);
      setDirty(false);
    }).catch(() => {});
  }
  useEffect(() => { load(); }, [userId, demo, dayISO]);

  function shiftDay(delta: number) {
    const d = new Date(dayISO + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    const next = ymd(d);
    if (next > todayISO) return;
    setDayISO(next);
  }

  async function save() {
    setBusy(true);
    const { error } = await api.saveDiary(ctx, { day: dayISO, mood, sleep, note });
    setBusy(false);
    if (error) return notify('Erro', error);
    setSavedAt(new Date().toISOString());
    setDirty(false);
    notify('Diário salvo ✓', isToday ? 'Registro de hoje guardado.' : `Registro de ${dayLabel} guardado.`);
  }

  const savedLabel = savedAt
    ? `Salvo ${new Date(savedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${new Date(savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : 'Ainda não registrado';

  return (
    <Screen>
      <Header title="Diário" subtitle="Seu registro do dia" rightIcon="book-outline" />

      {/* Navegador de dias */}
      <View style={styles.dayNav}>
        <Pressable onPress={() => shiftDay(-1)} hitSlop={10} style={styles.dayBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.dayLabel}>{dayLabel}</Text>
        <Pressable onPress={() => shiftDay(1)} hitSlop={10} style={[styles.dayBtn, isToday && { opacity: 0.3 }]} disabled={isToday}>
          <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Humor */}
      <Card>
        <Text style={styles.q}>Como foi o seu dia?</Text>
        <View style={styles.moodRow}>
          {MOODS.map((m) => {
            const on = mood === m.v;
            return (
              <Pressable key={m.v} onPress={() => { setMood(m.v); setDirty(true); }} style={[styles.mood, on && styles.moodOn]}>
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, on && { color: colors.gold }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.q, { marginTop: 18 }]}>Como você dormiu?</Text>
        <View style={styles.sleepRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => { setSleep(n); setDirty(true); }} hitSlop={6}>
              <Ionicons name={n <= (sleep ?? 0) ? 'moon' : 'moon-outline'} size={26} color={n <= (sleep ?? 0) ? colors.gold : colors.textMuted} />
            </Pressable>
          ))}
          {sleep != null && (
            <Pressable onPress={() => { setSleep(null); setDirty(true); }} hitSlop={6} style={{ marginLeft: 6 }}>
              <Text style={styles.clearSleep}>limpar</Text>
            </Pressable>
          )}
        </View>
      </Card>

      {/* Texto livre */}
      <SectionLabel style={{ marginTop: 8 }}>Registro do dia</SectionLabel>
      <Card>
        <TextInput
          style={styles.textarea}
          value={note}
          onChangeText={(t) => { setNote(t); setDirty(true); }}
          placeholder="Escreva como foi o seu dia — alimentação, treino, humor, sono, o que sentiu…"
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <View style={styles.prompts}>
          {PROMPTS.map((p) => (
            <Pressable key={p} onPress={() => { setNote((n) => (n ? n + '\n' : '') + p + ' '); setDirty(true); }} style={styles.prompt}>
              <Text style={styles.promptTxt}>{p}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <GoldButton label={busy ? 'Salvando…' : (dirty ? 'Salvar registro' : 'Salvo')} onPress={save} style={{ marginTop: 14 }} />
      <Text style={styles.saved}>{savedLabel}</Text>

      <Text style={styles.foot}>
        Seu diário é pessoal e faz parte do acompanhamento. A equipe do Instituto pode ler para cuidar melhor de você.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 12 },
  dayBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { fontFamily: fonts.sansSemibold, fontSize: 14, color: colors.textPrimary, minWidth: 170, textAlign: 'center', textTransform: 'capitalize' },

  q: { fontFamily: fonts.sansSemibold, fontSize: 14, color: colors.textPrimary },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 6 },
  mood: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  moodOn: { borderColor: colors.gold, backgroundColor: colors.gold + '14' },
  moodEmoji: { fontSize: 24 },
  moodLabel: { ...type.caption, color: colors.textSecondary, marginTop: 4 },
  sleepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  clearSleep: { ...type.small, color: colors.textMuted, textDecorationLine: 'underline' },

  textarea: { minHeight: 140, backgroundColor: colors.surfaceMuted, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, padding: 14, fontFamily: fonts.sans, fontSize: 15, textAlignVertical: 'top' },
  prompts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  prompt: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  promptTxt: { ...type.small, color: colors.textSecondary },

  saved: { ...type.small, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  foot: { ...type.small, color: colors.textMuted, marginTop: 20, lineHeight: 18 },
});
