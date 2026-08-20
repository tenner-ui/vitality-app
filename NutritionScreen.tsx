import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, SectionLabel, GoldButton, ProgressBar } from './ui';
import { Header } from './Header';
import { colors } from './colors';
import { fonts, type } from './typography';
import { notify } from './notify';
import { useAuth } from './AuthContext';
import { getMealsToday, getCalorieGoal, getNutriTips, getMealPlans, NutriTip, MealPlan } from './api';
import { signedPdfUrl } from './storage';

export function NutritionScreen() {
  const { demo, userId } = useAuth();
  const nav = useNavigation<any>();
  const ctx = { demo, patientId: userId };

  const [kcalToday, setKcalToday] = useState(0);
  const [goal, setGoal] = useState<{ kcal: number; source: string }>({ kcal: 2000, source: '—' });
  const [tips, setTips] = useState<NutriTip[]>([]);
  const [plans, setPlans] = useState<MealPlan[]>([]);

  useEffect(() => {
    getMealsToday(ctx).then((m) => setKcalToday(m.reduce((s, x) => s + (x.calories || 0), 0))).catch(() => {});
    getCalorieGoal(ctx).then(setGoal).catch(() => {});
    getNutriTips(ctx).then(setTips).catch(() => {});
    getMealPlans(ctx).then(setPlans).catch(() => {});
  }, [userId, demo]);

  const pct = goal.kcal > 0 ? kcalToday / goal.kcal : 0;
  const rest = goal.kcal - kcalToday;

  async function openPlan(p: MealPlan) {
    const url = await signedPdfUrl(p.pdf_path);
    if (!url) return notify('Cardápio', 'Não foi possível abrir o PDF agora. Tente de novo.');
    if (Platform.OS === 'web') window.open(url, '_blank');
    else notify('Cardápio', 'Abra o app no navegador para visualizar o PDF.');
  }

  return (
    <Screen>
      <Header title="Nutrição" subtitle="Orientações e cardápio" rightIcon="restaurant-outline" />

      {/* Resumo do dia (meta vem da bioimpedância) */}
      <Card glow>
        <Text style={styles.eyebrow}>Meta diária · {goal.source}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <Text style={styles.big}>{kcalToday}</Text>
          <Text style={styles.small}>/ {goal.kcal} kcal</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <ProgressBar value={Math.min(pct, 1)} color={rest < 0 ? colors.danger : colors.gold} height={10} />
        </View>
        <Text style={[styles.small, { marginTop: 8 }]}>
          {rest < 0 ? `Você excedeu ${Math.abs(rest)} kcal hoje.` : `Restam ${rest} kcal para hoje.`} A meta é calculada
          pela sua bioimpedância e não é editável.
        </Text>
        <GoldButton label="Registrar refeição na aba Calorias" onPress={() => nav.navigate('Calorias')} small style={{ marginTop: 14 }} />
      </Card>

      {/* Mural da Nutri */}
      <SectionLabel>Mural da Nutricionista</SectionLabel>
      {tips.length === 0 ? (
        <Card><Text style={styles.small}>Ainda não há dicas publicadas. As orientações diárias e semanais da nutri aparecem aqui.</Text></Card>
      ) : (
        tips.map((t) => (
          <Card key={t.id} style={{ marginBottom: 10 }}>
            <View style={styles.tipHead}>
              <View style={styles.tipIcon}><Ionicons name="nutrition" size={16} color={colors.textOnGold} /></View>
              <Text style={styles.tipAuthor}>{t.author_name || 'Nutrição'}</Text>
              <View style={[styles.badge, t.scope === 'semanal' ? styles.badgeWeek : styles.badgeDay]}>
                <Text style={styles.badgeTxt}>{t.scope === 'semanal' ? 'Semanal' : 'Diária'}</Text>
              </View>
            </View>
            {!!t.media_url && <Image source={{ uri: t.media_url }} style={styles.tipImg} />}
            <Text style={styles.tipBody}>{t.body}</Text>
            <Text style={styles.tipDate}>{new Date(t.created_at).toLocaleDateString('pt-BR')}</Text>
          </Card>
        ))
      )}

      {/* Cardápio (PDF) */}
      <SectionLabel>Cardápio</SectionLabel>
      {plans.length === 0 ? (
        <Card><Text style={styles.small}>Seu cardápio em PDF, quando enviado pela nutri, fica disponível aqui para consulta.</Text></Card>
      ) : (
        plans.map((p) => (
          <Pressable key={p.id} onPress={() => openPlan(p)}>
            <Card style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.pdfIcon}><Ionicons name="document-text" size={22} color={colors.danger} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealTitle}>{p.title}</Text>
                <Text style={styles.small}>{p.patient_id ? 'Individual' : 'Geral'} · {new Date(p.created_at).toLocaleDateString('pt-BR')}</Text>
              </View>
              <Ionicons name="open-outline" size={20} color={colors.gold} />
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: colors.textMuted },
  big: { fontFamily: fonts.serifBold, fontSize: 40, color: colors.gold, lineHeight: 42 },
  small: { ...type.small, color: colors.textSecondary },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  tipAuthor: { fontFamily: fonts.sansSemibold, fontSize: 13, color: colors.textPrimary, flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeDay: { backgroundColor: colors.surfaceMuted },
  badgeWeek: { backgroundColor: colors.blueAccent },
  badgeTxt: { fontFamily: fonts.sansSemibold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textPrimary },
  tipImg: { width: '100%', height: 170, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.hairline },
  tipBody: { ...type.body, color: colors.textPrimary, lineHeight: 21 },
  tipDate: { ...type.caption, color: colors.textMuted, marginTop: 8 },
  pdfIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  mealTitle: { ...type.cardTitle, color: colors.textPrimary },
});
