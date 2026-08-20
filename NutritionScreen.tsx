import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Image, ScrollView, Pressable } from 'react-native';
import { notify } from './notify';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionLabel, GoldButton, ProgressBar } from './ui';
import { Header } from './Header';
import { colors } from './colors';
import { fonts, type } from './typography';
import { meals as seedMeals, macroTargets } from './mock';
import { Meal } from './types';
import { useAuth } from './AuthContext';
import { getMealsToday, addMeal, getMealPhotos } from './api';
import { pickAndUpload, signedUrl } from './storage';

function Macro({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <View style={{ flex: 1, minWidth: '45%' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroVal}>{value}/{target}g</Text>
      </View>
      <ProgressBar value={value / target} color={color} height={6} />
    </View>
  );
}

const empty = { title: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '' };

export function NutritionScreen() {
  const { demo, userId } = useAuth();
  const ctx = { demo, patientId: userId };
  const [meals, setMeals] = useState<Meal[]>(demo ? seedMeals : []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [photos, setPhotos] = useState<{ uri: string; title: string }[]>([]);

  useEffect(() => {
    getMealsToday(ctx).then((m) => setMeals(m)).catch(() => {});
    (async () => {
      const rows = await getMealPhotos(ctx).catch(() => []);
      const withUrls = await Promise.all(rows.map(async (r) => ({ uri: (await signedUrl('meal-photos', r.path)) || '', title: r.title })));
      setPhotos(withUrls.filter((p) => p.uri));
    })();
  }, [userId, demo]);

  const totals = useMemo(
    () => meals.reduce((a, m) => ({
      calories: a.calories + m.calories, protein_g: a.protein_g + m.protein_g,
      carbs_g: a.carbs_g + m.carbs_g, fat_g: a.fat_g + m.fat_g, fiber_g: a.fiber_g + (m.fiber_g || 0),
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }),
    [meals]
  );

  function addManual() {
    if (!form.title.trim()) return notify('Item', 'Dê um nome ao item.');
    const meal = {
      title: form.title.trim(),
      photo_url: null,
      calories: Number(form.calories) || 0,
      protein_g: Number(form.protein_g) || 0,
      carbs_g: Number(form.carbs_g) || 0,
      fat_g: Number(form.fat_g) || 0,
      fiber_g: Number(form.fiber_g) || 0,
    };
    setMeals((m) => [...m, { id: String(Date.now()), logged_at: 'agora', ...meal }]);
    addMeal(ctx, meal).catch(() => {});
    setForm({ ...empty });
    setShowForm(false);
  }

  async function photographMeal() {
    const r = await pickAndUpload('meal-photos', userId, demo);
    if (r.canceled) return;
    if (r.error) {
      // modo demo / sem conta: adiciona um exemplo estimado
      notify('Fotografar refeição', r.error + '\n\nAdicionando um exemplo estimado por IA (fase 2).', [
        { text: 'OK', onPress: () => {
          const meal = { title: 'Refeição (estimada)', photo_url: null, calories: 420, protein_g: 30, carbs_g: 28, fat_g: 18, fiber_g: 6 };
          setMeals((m) => [...m, { id: String(Date.now()), logged_at: 'agora', ...meal }]);
        } },
      ]);
      return;
    }
    if (r.path) {
      const meal = { title: 'Refeição fotografada', photo_url: r.path, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
      await addMeal(ctx, meal);
      const url = await signedUrl('meal-photos', r.path);
      setMeals((m) => [...m, { id: String(Date.now()), logged_at: 'agora', ...meal }]);
      if (url) setPhotos((p) => [{ uri: url, title: meal.title }, ...p]);
      notify('Foto salva ✓', 'Registrada no seu diário de refeições.');
    }
  }

  const calPct = totals.calories / macroTargets.calories;

  return (
    <Screen>
      <Header title="Nutrição" subtitle="Diário e contador" rightIcon="restaurant-outline" />

      <Card glow>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.calLabel}>Calorias hoje</Text>
            <Text style={styles.cal}>{totals.calories}<Text style={styles.calTarget}> / {macroTargets.calories} kcal</Text></Text>
          </View>
          <Text style={[styles.remaining, calPct > 1 && { color: colors.warning }]}>{Math.max(0, macroTargets.calories - totals.calories)} restantes</Text>
        </View>
        <View style={{ marginTop: 12 }}><ProgressBar value={calPct} color={calPct > 1 ? colors.warning : colors.gold} /></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 18 }}>
          <Macro label="Proteína" value={totals.protein_g} target={macroTargets.protein_g} color={colors.blueAccent} />
          <Macro label="Carboidrato" value={totals.carbs_g} target={macroTargets.carbs_g} color={colors.goldLight} />
          <Macro label="Gordura" value={totals.fat_g} target={macroTargets.fat_g} color={colors.success} />
          <Macro label="Fibras" value={totals.fiber_g} target={macroTargets.fiber_g} color={colors.gold} />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
        <GoldButton label="📷  Fotografar" onPress={photographMeal} style={{ flex: 1 }} />
        <GoldButton label={showForm ? 'Fechar' : '＋ Item'} outline onPress={() => setShowForm((s) => !s)} style={{ flex: 1 }} />
      </View>

      {showForm && (
        <Card glow style={{ marginTop: 12 }}>
          <Text style={styles.formLabel}>Adicionar item ao contador</Text>
          <TextInput style={styles.input} placeholder="Nome do alimento" placeholderTextColor={colors.textMuted} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} />
          <View style={styles.grid}>
            {([['calories', 'kcal'], ['protein_g', 'Prot (g)'], ['carbs_g', 'Carb (g)'], ['fat_g', 'Gord (g)'], ['fiber_g', 'Fibra (g)']] as const).map(([k, ph]) => (
              <TextInput key={k} style={styles.inputSm} placeholder={ph} placeholderTextColor={colors.textMuted} keyboardType="numeric" value={(form as any)[k]} onChangeText={(t) => setForm({ ...form, [k]: t })} />
            ))}
          </View>
          <GoldButton label="Adicionar ao dia" onPress={addManual} style={{ marginTop: 10 }} />
        </Card>
      )}

      <SectionLabel>Refeições de hoje</SectionLabel>
      {meals.map((m) => (
        <Card key={m.id} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.thumb}><Ionicons name="fast-food" size={22} color={colors.gold} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mealTitle}>{m.title}</Text>
              <Text style={styles.small}>P {m.protein_g} · C {m.carbs_g} · G {m.fat_g} · Fib {m.fiber_g}g · {m.logged_at}</Text>
            </View>
            <Text style={styles.mealCal}>{m.calories}<Text style={styles.small}> kcal</Text></Text>
          </View>
        </Card>
      ))}

      <SectionLabel>Fotos das refeições</SectionLabel>
      {photos.length === 0 ? (
        <Card><Text style={styles.small}>Suas fotos de refeição aparecem aqui. Toque em “Fotografar” para registrar.</Text></Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {photos.map((p, i) => (
            <View key={i} style={{ marginRight: 10 }}>
              <Image source={{ uri: p.uri }} style={styles.mealPhoto} />
              <Text style={[styles.small, { width: 120 }]} numberOfLines={1}>{p.title}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  calLabel: { ...type.caption, color: colors.textSecondary, textTransform: 'uppercase' },
  cal: { fontFamily: fonts.serifBold, fontSize: 32, color: colors.textPrimary },
  calTarget: { fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary },
  remaining: { ...type.small, color: colors.gold },
  macroLabel: { ...type.caption, color: colors.textSecondary },
  macroVal: { ...type.caption, color: colors.textPrimary },
  formLabel: { ...type.caption, color: colors.gold, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: colors.surfaceMuted, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.sans, fontSize: 15, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inputSm: { width: '31%', backgroundColor: colors.surfaceMuted, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: 10, paddingVertical: 10, fontFamily: fonts.sans, fontSize: 14 },
  thumb: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  mealTitle: { ...type.cardTitle, color: colors.textPrimary },
  small: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  mealCal: { fontFamily: fonts.serifBold, fontSize: 18, color: colors.gold },
  mealPhoto: { width: 120, height: 120, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, marginBottom: 4 },
});
