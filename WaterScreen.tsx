import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { notify } from './notify';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionLabel, GoldButton } from './ui';
import { Header } from './Header';
import { useNavigation } from '@react-navigation/native';
import { ProgressRing } from './ProgressRing';
import { colors } from './colors';
import { fonts, type } from './typography';
import { dailyGoals, waterWeek } from './mock';
import { ensurePermissions, scheduleWaterReminder, cancelReminder } from './notifications';
import { useAuth } from './AuthContext';
import { getWaterToday, addWater } from './api';
import { playWaterChime, initAudio } from './bell';

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function WaterScreen() {
  const { demo, userId } = useAuth();
  const navigation = useNavigation();
  const ctx = { demo, patientId: userId };
  const [ml, setMl] = useState(dailyGoals.water.current);
  const target = dailyGoals.water.target;

  useEffect(() => {
    getWaterToday(ctx).then(setMl).catch(() => {});
  }, [userId, demo]);

  async function drink(amount: number) {
    initAudio();
    playWaterChime();
    setMl((v) => v + amount);
    try {
      await addWater(ctx, amount);
    } catch {
      /* mantém o valor local mesmo se a gravação falhar */
    }
  }
  const [reminders, setReminders] = useState([
    { id: '', time: '09:00', hour: 9, minute: 0, on: true },
    { id: '', time: '12:00', hour: 12, minute: 0, on: true },
    { id: '', time: '15:00', hour: 15, minute: 0, on: false },
    { id: '', time: '18:00', hour: 18, minute: 0, on: true },
  ]);

  const cups = Math.round(ml / 250);
  const maxWeek = Math.max(...waterWeek, target / 1000);

  async function toggleReminder(i: number) {
    const next = [...reminders];
    const r = next[i];
    if (!r.on) {
      const ok = await ensurePermissions();
      if (!ok) {
        notify('Notificações', 'Permita notificações para receber lembretes de hidratação.');
        return;
      }
      r.id = await scheduleWaterReminder(r.hour, r.minute);
      r.on = true;
    } else {
      if (r.id) await cancelReminder(r.id);
      r.id = '';
      r.on = false;
    }
    setReminders(next);
  }

  return (
    <Screen>
      <Header title="Água" subtitle="Hidratação" rightIcon="water-outline" onBack={() => navigation.goBack()} />

      <Card glow style={{ alignItems: 'center', paddingVertical: 28 }}>
        <ProgressRing size={190} stroke={16} progress={ml / target} color={colors.ringWater} trackColor={colors.surfaceMuted}>
          <Text style={styles.big}>{(ml / 1000).toFixed(2)}<Text style={styles.unit}> L</Text></Text>
          <Text style={styles.sub}>meta {(target / 1000).toFixed(1)} L · {cups} copos</Text>
        </ProgressRing>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
          <GoldButton small label="＋ Copo (250ml)" onPress={() => drink(250)} />
          <GoldButton small outline label="＋ Garrafa (500ml)" onPress={() => drink(500)} />
        </View>
      </Card>

      <SectionLabel>Lembretes programados</SectionLabel>
      <Card>
        {reminders.map((r, i) => (
          <View key={r.time} style={[styles.remRow, i < reminders.length - 1 && styles.divider]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="alarm-outline" size={18} color={colors.gold} />
              <Text style={styles.remTime}>{r.time}</Text>
            </View>
            <Switch
              value={r.on}
              onValueChange={() => toggleReminder(i)}
              trackColor={{ true: colors.blueAccent, false: colors.surfaceMuted }}
              thumbColor={r.on ? colors.gold : colors.textMuted}
            />
          </View>
        ))}
      </Card>

      <SectionLabel>Histórico semanal</SectionLabel>
      <Card>
        <View style={styles.chart}>
          {waterWeek.map((v, i) => (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              <View style={styles.barWrap}>
                <View style={[styles.bar, { height: `${(v / maxWeek) * 100}%`, backgroundColor: v >= target / 1000 ? colors.gold : colors.blueAccent }]} />
              </View>
              <Text style={styles.barLabel}>{DAYS[i]}</Text>
              <Text style={styles.barVal}>{v}</Text>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { fontFamily: fonts.serifBold, fontSize: 44, color: colors.textPrimary },
  unit: { fontFamily: fonts.sans, fontSize: 18, color: colors.textSecondary },
  sub: { ...type.small, color: colors.textSecondary, marginTop: 4 },
  remRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  remTime: { fontFamily: fonts.sansSemibold, fontSize: 16, color: colors.textPrimary },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 150, gap: 6 },
  barWrap: { height: 110, width: 18, backgroundColor: colors.surfaceMuted, borderRadius: 9, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 9 },
  barLabel: { ...type.caption, color: colors.textSecondary, marginTop: 6 },
  barVal: { ...type.caption, color: colors.textMuted },
});
