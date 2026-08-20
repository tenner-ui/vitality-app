import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { notify } from './notify';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionLabel, ProgressBar, IconBadge } from './ui';
import { Header } from './Header';
import { ProgressRing } from './ProgressRing';
import { colors } from './colors';
import { fonts, type } from './typography';
import { useAuth } from './AuthContext';
import * as api from './api';
import { Appointment, Message, WeightMeasure } from './types';
import { appointmentMeta, formatDateTime, daysUntil } from './helpers';

const WATER_TARGET = 2500;
const CAL_TARGET = 1800;

function GoalRing({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  return (
    <View style={{ alignItems: 'center', width: '25%' }}>
      <ProgressRing size={68} stroke={7} progress={target ? current / target : 0} color={color}>
        <Ionicons name={label === 'Água' ? 'water' : label === 'Passos' ? 'walk' : label === 'Treino' ? 'barbell' : 'flame'} size={18} color={color} />
      </ProgressRing>
      <Text style={styles.ringVal}>{current >= 1000 ? `${(current / 1000).toFixed(1)}k` : current}</Text>
      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

export function HomeScreen() {
  const { displayName, signOut, demo, userId } = useAuth();
  const nav = useNavigation<any>();
  const ctx = { demo, patientId: userId };
  const firstName = (displayName || 'Paciente').split(' ')[0];

  const [water, setWater] = useState(0);
  const [calories, setCalories] = useState(0);
  const [workoutDone, setWorkoutDone] = useState(0);
  const [weights, setWeights] = useState<WeightMeasure[]>([]);
  const [bio, setBio] = useState<any[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [program, setProgram] = useState<{ program?: string; phase?: string; week?: number } | null>(null);

  useEffect(() => {
    api.getWaterToday(ctx).then(setWater).catch(() => {});
    api.getMealsToday(ctx).then((m) => setCalories(m.reduce((s, x) => s + (x.calories || 0), 0))).catch(() => {});
    api.getWorkoutToday(ctx).then((w) => setWorkoutDone(w?.items?.length ? 1 : 0)).catch(() => {});
    api.getWeightHistory(ctx).then(setWeights).catch(() => {});
    api.getBioSeries(ctx).then(setBio).catch(() => {});
    api.getAppointments(ctx).then((a) => setAppts(a.filter((x) => x.status !== 'cancelado'))).catch(() => {});
    api.getMessages(ctx).then(setMsgs).catch(() => {});
    api.getMyProgram(ctx).then(setProgram).catch(() => {});
  }, [userId]);

  function confirmSignOut() {
    notify('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  // Peso: usa as medições de peso; se não houver, usa a série de bioimpedância (mesma fonte da composição corporal).
  const wSeries: number[] = (weights.length
    ? weights.map((w) => Number(w.weight_kg))
    : bio.map((b) => Number(b.weight_kg))
  ).filter((n) => !isNaN(n));
  const firstW = wSeries[0];
  const lastW = wSeries[wSeries.length - 1];
  const lost = firstW != null && lastW != null ? (firstW - lastW).toFixed(1) : null;
  const lastBio = bio.length ? bio[bio.length - 1] : null;

  // Próximos compromissos (futuros)
  const now = Date.now();
  const upcoming = [...appts]
    .filter((a) => +new Date(a.starts_at) >= now - 3600_000)
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const nextAppt = upcoming[0];

  // Última mensagem da equipe
  const lastTeamMsg = [...msgs].reverse().find((m) => m.sender_role !== 'paciente');

  const totalWeeks = 12;
  const week = program?.week ?? 0;
  const progress = week ? week / totalWeeks : 0;

  return (
    <Screen>
      <Header rightIcon="log-out-outline" onRightPress={confirmSignOut} />
      <Text style={styles.greeting}>Olá, {firstName} ☀️</Text>
      <Text style={styles.date}>
        {program?.week ? `${program?.phase || 'RenovaCorps'} · Semana ${program.week} de ${totalWeeks}` : 'Vamos cuidar de você hoje.'}
      </Text>

      <View style={styles.quickRow}>
        {[
          { label: 'Água', icon: 'water', to: 'Agua' },
          { label: 'Treino', icon: 'barbell', to: 'Treino' },
          { label: 'Chat', icon: 'chatbubbles', to: 'Chat' },
        ].map((q) => (
          <Pressable key={q.to} style={styles.quick} onPress={() => nav.navigate(q.to)}>
            <Ionicons name={q.icon as any} size={20} color={colors.gold} />
            <Text style={styles.quickLabel}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionLabel>Metas do dia</SectionLabel>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <GoalRing label="Água" current={water} target={WATER_TARGET} color={colors.ringWater} />
          <GoalRing label="Calorias" current={calories} target={CAL_TARGET} color={colors.ringCalories} />
          <GoalRing label="Passos" current={0} target={8000} color={colors.ringSteps} />
          <GoalRing label="Treino" current={workoutDone} target={1} color={colors.ringWorkout} />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <Card style={{ flex: 1 }}>
          <View style={styles.metricHead}>
            <Ionicons name="trending-down" size={16} color={colors.gold} />
            <Text style={styles.metricLabel}>Peso</Text>
          </View>
          {lost != null ? (
            <>
              <Text style={styles.metricBig}>{Number(lost) >= 0 ? '-' : '+'}{Math.abs(Number(lost))}<Text style={styles.metricUnit}> kg</Text></Text>
              <Text style={styles.metricSub}>de {firstW} para {lastW} kg</Text>
            </>
          ) : lastW != null ? (
            <>
              <Text style={styles.metricBig}>{lastW}<Text style={styles.metricUnit}> kg</Text></Text>
              <Text style={styles.metricSub}>primeira medição registrada</Text>
            </>
          ) : (
            <>
              <Text style={styles.metricBig}>—</Text>
              <Text style={styles.metricSub}>registre seu peso na aba Saúde</Text>
            </>
          )}
          {lastBio && (
            <Text style={[styles.metricSub, { marginTop: 6, color: colors.gold }]}>
              {[
                lastBio.bmi != null ? `IMC ${Number(lastBio.bmi).toFixed(1)}` : null,
                lastBio.waist_cm != null ? `Cintura ${Number(lastBio.waist_cm).toFixed(0)}cm` : null,
                lastBio.bmr_kcal != null ? `TMB ${lastBio.bmr_kcal}kcal` : null,
              ].filter(Boolean).join(' · ')}
            </Text>
          )}
        </Card>
        <Card style={{ flex: 1 }}>
          <View style={styles.metricHead}>
            <Ionicons name="water-outline" size={16} color={colors.gold} />
            <Text style={styles.metricLabel}>Água hoje</Text>
          </View>
          <Text style={styles.metricBig}>{(water / 1000).toFixed(1)}<Text style={styles.metricUnit}> L</Text></Text>
          <Text style={styles.metricSub}>meta {(WATER_TARGET / 1000).toFixed(1)} L</Text>
        </Card>
      </View>

      <SectionLabel>Programa RenovaCorps</SectionLabel>
      <Card glow>
        {program?.phase || week ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={styles.phase}>{program?.phase || 'Reprogramação Metabólica'}</Text>
                <Text style={styles.metricSub}>Semana {week} de {totalWeeks}</Text>
              </View>
              <Text style={styles.pct}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={{ marginTop: 12 }}>
              <ProgressBar value={progress} color={colors.gold} />
            </View>
          </>
        ) : (
          <Text style={styles.metricSub}>Seu programa será definido pela equipe na primeira consulta.</Text>
        )}
      </Card>

      <SectionLabel>Próximos compromissos</SectionLabel>
      {nextAppt ? (
        <Card style={{ marginBottom: 12 }}>
          <View style={styles.apptRow}>
            <View style={[styles.apptIcon, { backgroundColor: appointmentMeta[nextAppt.type].color + '22' }]}>
              <Ionicons name={appointmentMeta[nextAppt.type].icon as any} size={20} color={appointmentMeta[nextAppt.type].color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.apptTitle}>{appointmentMeta[nextAppt.type].label}</Text>
              <Text style={styles.metricSub}>{formatDateTime(nextAppt.starts_at)}</Text>
            </View>
            <Text style={styles.apptIn}>em {daysUntil(nextAppt.starts_at)}d</Text>
          </View>
        </Card>
      ) : (
        <Card style={{ marginBottom: 12 }}>
          <Text style={styles.metricSub}>Nenhum compromisso agendado. Veja a aba Agenda para marcar.</Text>
        </Card>
      )}

      <SectionLabel>Mensagem da equipe</SectionLabel>
      <Card glow>
        {lastTeamMsg ? (
          <>
            <Text style={styles.msgFrom}>{lastTeamMsg.sender_name}</Text>
            <Text style={styles.msgBody}>“{lastTeamMsg.body}”</Text>
          </>
        ) : (
          <Text style={styles.metricSub}>Sua equipe de cuidado aparecerá aqui com orientações.</Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { fontFamily: fonts.serifBold, fontSize: 28, color: colors.textPrimary },
  date: { ...type.body, color: colors.textSecondary, marginBottom: 4 },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quick: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  quickLabel: { ...type.small, color: colors.textSecondary },
  ringVal: { fontFamily: fonts.sansSemibold, fontSize: 13, color: colors.textPrimary, marginTop: 6 },
  ringLabel: { ...type.caption, color: colors.textSecondary },
  metricHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metricLabel: { ...type.caption, color: colors.textSecondary, textTransform: 'uppercase' },
  metricBig: { fontFamily: fonts.serifBold, fontSize: 30, color: colors.textPrimary },
  metricUnit: { fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary },
  metricSub: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  phase: { fontFamily: fonts.serif, fontSize: 18, color: colors.gold },
  pct: { fontFamily: fonts.serifBold, fontSize: 26, color: colors.textPrimary },
  apptRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  apptIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  apptTitle: { ...type.cardTitle, color: colors.textPrimary },
  apptIn: { ...type.small, color: colors.gold },
  msgFrom: { fontFamily: fonts.sansSemibold, fontSize: 13, color: colors.gold },
  msgBody: { fontFamily: fonts.serif, fontSize: 16, color: colors.textPrimary, marginTop: 6, lineHeight: 24 },
});
