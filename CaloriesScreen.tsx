import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen, Card, SectionLabel, GoldButton, ProgressBar } from './ui';
import { Header } from './Header';
import { colors } from './colors';
import { fonts, type } from './typography';
import { notify } from './notify';
import { useAuth } from './AuthContext';
import * as api from './api';
import { Meal } from './types';

const CHIPS = [
  { label: 'Café da manhã', fill: '2 ovos cozidos, 1 banana e um café preto' },
  { label: 'Almoço', fill: '200 g de patinho grelhado, 4 colheres de arroz branco, feijão e salada com azeite' },
  { label: 'Pós-treino', fill: '1 scoop de whey em 300 ml de água e 30 g de castanha de caju' },
];

async function toBase64Web(uri: string): Promise<string> {
  // Redimensiona para no máx. 1100px e retorna base64 (jpeg).
  return await new Promise((resolve, reject) => {
    const img = new (window as any).Image();
    img.onload = () => {
      const max = 1100;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = reject;
    img.src = uri;
  });
}

export function CaloriesScreen() {
  const { demo, userId } = useAuth();
  const ctx = { demo, patientId: userId };

  const [meals, setMeals] = useState<Meal[]>([]);
  const [target, setTarget] = useState(2200);
  const [tab, setTab] = useState<'text' | 'photo'>('text');
  const [mealText, setMealText] = useState('');
  const [note, setNote] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [photoB64, setPhotoB64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<api.CalorieEstimate | null>(null);

  const metaKey = `kcal:meta:${userId ?? 'anon'}`;

  function load() {
    api.getMealsToday(ctx).then(setMeals).catch(() => {});
  }
  useEffect(() => {
    load();
    AsyncStorage.getItem(metaKey).then((v) => { if (v) setTarget(Number(v) || 2200); }).catch(() => {});
  }, [userId, demo]);

  const totals = meals.reduce(
    (a, m) => ({
      kcal: a.kcal + (m.calories || 0),
      prot: a.prot + (m.protein_g || 0),
      carb: a.carb + (m.carbs_g || 0),
      gord: a.gord + (m.fat_g || 0),
    }),
    { kcal: 0, prot: 0, carb: 0, gord: 0 }
  );
  const pct = target > 0 ? totals.kcal / target : 0;
  const rest = target - totals.kcal;
  const over = rest < 0;

  async function estimate(kind: 'text' | 'photo') {
    setStatus('Estimando…');
    setBusy(true);
    const input = kind === 'photo'
      ? { imageBase64: photoB64 || undefined, note: note.trim() || undefined }
      : { text: mealText.trim() };
    const { data, error } = await api.estimateCalories(ctx, input);
    setBusy(false);
    if (error || !data) { setStatus(error || 'Não deu para estimar. Tente novamente.'); return; }
    setStatus('');
    setResult(data);
  }

  async function pickPhoto() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: Platform.OS !== 'web',
      });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      let b64: string | null = null;
      if (Platform.OS === 'web') b64 = await toBase64Web(a.uri);
      else b64 = (a as any).base64 ?? null;
      setPreviewUri(a.uri);
      setPhotoB64(b64);
      setStatus('');
    } catch (e: any) {
      setStatus('Não foi possível abrir a imagem.');
    }
  }

  async function addToDay() {
    if (!result) return;
    const itens = result.itens || [];
    const meal = {
      title: result.refeicao || 'Refeição',
      photo_url: null as string | null,
      calories: Math.round(Number(result.total_kcal) || itens.reduce((s, i) => s + (Number(i.kcal) || 0), 0)),
      protein_g: Math.round(Number(result.total_prot) || itens.reduce((s, i) => s + (Number(i.prot) || 0), 0)),
      carbs_g: Math.round(Number(result.total_carb) || itens.reduce((s, i) => s + (Number(i.carb) || 0), 0)),
      fat_g: Math.round(Number(result.total_gord) || itens.reduce((s, i) => s + (Number(i.gord) || 0), 0)),
      fiber_g: 0,
    };
    const { error } = await api.addMeal(ctx, meal);
    if (error) return notify('Erro', error);
    resetComposer();
    load();
  }

  function resetComposer() {
    setResult(null);
    setMealText('');
    setNote('');
    setPreviewUri(null);
    setPhotoB64(null);
    setStatus('');
  }

  async function removeMeal(id: string) {
    setMeals((arr) => arr.filter((m) => m.id !== id));
    const { error } = await api.deleteMeal(ctx, id);
    if (error) { notify('Erro', error); load(); }
  }

  async function clearDay() {
    if (meals.length === 0) return;
    setMeals([]);
    const { error } = await api.clearMealsToday(ctx);
    if (error) { notify('Erro', error); load(); }
  }

  function onTargetChange(v: string) {
    const n = Number(v) || 2200;
    setTarget(n);
    AsyncStorage.setItem(metaKey, String(n)).catch(() => {});
  }

  const confLabel = result
    ? ({ alta: 'Confiança alta', media: 'Confiança média', baixa: 'Confiança baixa' } as any)[result.confianca] || 'Confiança média'
    : '';

  return (
    <Screen>
      <Header title="Calorias" subtitle="Registro alimentar" rightIcon="flame-outline" />

      {/* Consumo de hoje */}
      <Card glow>
        <Text style={styles.eyebrow}>Consumo de hoje</Text>
        <View style={styles.figure}>
          <Text style={styles.figNum}>{totals.kcal}</Text>
          <Text style={styles.figUnit}>kcal</Text>
        </View>
        <ProgressBar value={Math.min(pct, 1)} color={over ? colors.danger : colors.gold} height={10} />
        <View style={styles.metaRow}>
          <View style={styles.metaLabel}>
            <Text style={styles.metaTxt}>Meta diária</Text>
            <TextInput
              style={styles.metaInput}
              value={String(target)}
              onChangeText={onTargetChange}
              keyboardType="numeric"
            />
            <Text style={styles.metaTxt}>kcal</Text>
          </View>
          <Text style={[styles.remaining, over && { color: colors.danger }]}>
            {over ? `excedeu ${Math.abs(rest)}` : `restam ${rest}`}
          </Text>
        </View>
        <View style={styles.macros}>
          {[
            { k: 'Proteína', v: totals.prot },
            { k: 'Carboidrato', v: totals.carb },
            { k: 'Gordura', v: totals.gord },
          ].map((m) => (
            <View key={m.k} style={styles.macro}>
              <Text style={styles.macroK}>{m.k}</Text>
              <Text style={styles.macroV}>{m.v}<Text style={styles.macroU}>g</Text></Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Composer */}
      <View style={styles.tabs}>
        {(['text', 'photo'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
            <Text style={[styles.tabTxt, tab === t && styles.tabTxtOn]}>{t === 'text' ? 'Descrever' : 'Foto'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'text' ? (
        <Card>
          <TextInput
            style={styles.textarea}
            value={mealText}
            onChangeText={setMealText}
            placeholder="Ex.: 3 ovos mexidos na manteiga, 2 fatias de pão integral e um café preto sem açúcar"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <View style={styles.chips}>
            {CHIPS.map((c) => (
              <Pressable key={c.label} onPress={() => setMealText(c.fill)} style={styles.chip}>
                <Text style={styles.chipTxt}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <GoldButton
            label={busy ? 'Estimando…' : 'Calcular calorias'}
            onPress={() => { if (!mealText.trim()) { setStatus('Escreva o que você comeu.'); return; } estimate('text'); }}
            style={{ marginTop: 14 }}
          />
          {!!status && <Text style={styles.status}>{status}</Text>}
        </Card>
      ) : (
        <Card>
          {previewUri && <Image source={{ uri: previewUri }} style={styles.preview} />}
          <Pressable onPress={pickPhoto} style={styles.drop}>
            <Ionicons name="camera-outline" size={26} color={colors.gold} />
            <Text style={styles.dropT}>{previewUri ? 'Trocar foto' : 'Fotografar ou escolher imagem'}</Text>
            <Text style={styles.dropS}>O prato inteiro, de cima, com um talher ou copo ao lado para dar escala</Text>
          </Pressable>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Detalhe opcional: porção, modo de preparo, marca"
            placeholderTextColor={colors.textMuted}
          />
          <GoldButton
            label={busy ? 'Analisando…' : 'Analisar foto'}
            onPress={() => { if (!photoB64) { setStatus('Escolha uma foto primeiro.'); return; } estimate('photo'); }}
            style={{ marginTop: 14 }}
          />
          {!!status && <Text style={styles.status}>{status}</Text>}
        </Card>
      )}

      {/* Resultado */}
      {result && (
        <Card glow style={{ marginTop: 12 }}>
          <View style={styles.resTop}>
            <Text style={styles.resName}>{result.refeicao || 'Refeição'}</Text>
            <Text style={styles.resKcal}>{Math.round(Number(result.total_kcal) || 0)}<Text style={styles.resKcalU}> kcal</Text></Text>
          </View>
          <Text style={styles.conf}>{confLabel} · P {result.total_prot}g · C {result.total_carb}g · G {result.total_gord}g</Text>
          <View style={{ marginTop: 8 }}>
            {(result.itens || []).map((i, idx) => (
              <View key={idx} style={styles.item}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{i.nome}</Text>
                  {!!i.porcao && <Text style={styles.itemP}>{i.porcao}</Text>}
                </View>
                <Text style={styles.itemK}>{Math.round(Number(i.kcal) || 0)} kcal</Text>
              </View>
            ))}
          </View>
          {!!result.observacao && <Text style={styles.obs}>{result.observacao}</Text>}
          <View style={styles.resActions}>
            <GoldButton label="Adicionar ao dia" onPress={addToDay} style={{ flex: 1 }} small />
            <GoldButton label="Descartar" onPress={resetComposer} outline small style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {/* Diário */}
      <View style={styles.logHead}>
        <SectionLabel>Refeições de hoje</SectionLabel>
        {meals.length > 0 && (
          <Pressable onPress={clearDay}><Text style={styles.clear}>zerar dia</Text></Pressable>
        )}
      </View>
      <Card style={{ paddingVertical: 6 }}>
        {meals.length === 0 && (
          <Text style={[styles.empty]}>Nada registrado ainda. A primeira refeição entra aqui.</Text>
        )}
        {meals.map((m, i) => {
          const hora = new Date(m.logged_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          return (
            <View key={m.id} style={[styles.entry, i < meals.length - 1 && styles.entryDiv]}>
              <Text style={styles.eTime}>{hora}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.eName}>{m.title}</Text>
                <Text style={styles.eMacros}>P {m.protein_g} · C {m.carbs_g} · G {m.fat_g}</Text>
              </View>
              <Text style={styles.eKcal}>{m.calories}</Text>
              <Pressable onPress={() => removeMeal(m.id)} hitSlop={8}><Ionicons name="close" size={18} color={colors.textMuted} /></Pressable>
            </View>
          );
        })}
      </Card>

      <Text style={styles.foot}>
        Valores estimados por IA a partir de tabelas de composição de alimentos. Servem para acompanhamento e educação
        alimentar; não substituem avaliação nutricional individualizada. Margem de erro típica de 10 a 20% no modo texto,
        maior no modo foto.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: colors.textMuted },
  figure: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6, marginBottom: 14 },
  figNum: { fontFamily: fonts.serifBold, fontSize: 48, color: colors.gold, lineHeight: 50 },
  figUnit: { ...type.small, color: colors.textSecondary, letterSpacing: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  metaLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTxt: { ...type.small, color: colors.textSecondary },
  metaInput: { width: 60, borderBottomWidth: 1, borderBottomColor: colors.border, color: colors.gold, fontFamily: fonts.sansSemibold, fontSize: 14, textAlign: 'center', paddingVertical: 2 },
  remaining: { fontFamily: fonts.sansSemibold, fontSize: 13, color: colors.textPrimary },
  macros: { flexDirection: 'row', gap: 1, marginTop: 16, backgroundColor: colors.border, borderRadius: 10, overflow: 'hidden' },
  macro: { flex: 1, backgroundColor: colors.surface, paddingVertical: 12, alignItems: 'center' },
  macroK: { fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textMuted },
  macroV: { fontFamily: fonts.sansSemibold, fontSize: 18, color: colors.textPrimary, marginTop: 4 },
  macroU: { fontSize: 11, color: colors.textSecondary },

  tabs: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden', marginTop: 18, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: colors.surface },
  tabOn: { backgroundColor: colors.gold },
  tabTxt: { fontFamily: fonts.sansSemibold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textSecondary },
  tabTxtOn: { color: colors.textOnGold },

  textarea: { minHeight: 100, backgroundColor: colors.surfaceMuted, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, padding: 14, fontFamily: fonts.sans, fontSize: 15, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipTxt: { ...type.small, color: colors.textSecondary },
  status: { ...type.small, color: colors.danger, marginTop: 10 },

  drop: { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 12, padding: 28, alignItems: 'center', gap: 6 },
  dropT: { ...type.body, color: colors.textPrimary },
  dropS: { ...type.small, color: colors.textMuted, textAlign: 'center' },
  preview: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  noteInput: { backgroundColor: colors.surfaceMuted, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.sans, fontSize: 15, marginTop: 12 },

  resTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  resName: { fontFamily: fonts.serifBold, fontSize: 18, color: colors.textPrimary, flex: 1 },
  resKcal: { fontFamily: fonts.serifBold, fontSize: 26, color: colors.gold },
  resKcalU: { ...type.small, color: colors.textSecondary },
  conf: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textMuted, marginTop: 6 },
  item: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  itemName: { ...type.body, color: colors.textPrimary },
  itemP: { ...type.small, color: colors.textMuted, marginTop: 1 },
  itemK: { fontFamily: fonts.sansSemibold, fontSize: 14, color: colors.textSecondary },
  obs: { ...type.small, color: colors.textSecondary, borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: 10, marginTop: 12 },
  resActions: { flexDirection: 'row', gap: 10, marginTop: 16 },

  logHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 },
  clear: { ...type.small, color: colors.textMuted, textDecorationLine: 'underline' },
  empty: { ...type.small, color: colors.textMuted, padding: 10 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 6 },
  entryDiv: { borderBottomWidth: 1, borderBottomColor: colors.border },
  eTime: { fontFamily: fonts.sansSemibold, fontSize: 11, color: colors.gold, width: 40 },
  eName: { ...type.cardTitle, color: colors.textPrimary },
  eMacros: { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  eKcal: { fontFamily: fonts.sansSemibold, fontSize: 15, color: colors.textPrimary },

  foot: { ...type.small, color: colors.textMuted, marginTop: 24, lineHeight: 18 },
});
