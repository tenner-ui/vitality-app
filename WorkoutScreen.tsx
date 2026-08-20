import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionLabel, GoldButton } from './ui';
import { Header } from './Header';
import { useNavigation } from '@react-navigation/native';
import { colors } from './colors';
import { fonts, type } from './typography';
import { ExerciseItem, Workout } from './types';
import { useAuth } from './AuthContext';
import { getWorkoutToday } from './api';

export function WorkoutScreen() {
  const { demo, userId } = useAuth();
  const navigation = useNavigation();
  const ctx = { demo, patientId: userId };
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [items, setItems] = useState<ExerciseItem[]>([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    getWorkoutToday(ctx)
      .then((w) => { setWorkout(w); setItems(w?.items ?? []); })
      .catch(() => {});
  }, [userId]);

  const doneCount = items.filter((i) => i.done).length;

  function toggle(idx: number) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, done: !it.done } : it)));
  }

  const hasWorkout = items.length > 0;

  return (
    <Screen>
      <Header title="Treino" subtitle="Plano do dia" rightIcon="barbell-outline" onBack={() => navigation.goBack()} />

      {!hasWorkout ? (
        <Card glow style={{ marginTop: 8 }}>
          <Text style={styles.exName}>Nenhum treino para hoje</Text>
          <Text style={[styles.exMeta, { marginTop: 6 }]}>
            Seu educador físico ainda não montou um treino. Assim que ele publicar, o plano aparece aqui.
          </Text>
        </Card>
      ) : (
        <>
          <SectionLabel>{workout?.title || 'Treino do dia'}</SectionLabel>
          <Card glow>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.progress}>{doneCount}/{items.length} exercícios</Text>
              <Text style={styles.byTeam}>montado pela equipe</Text>
            </View>
            {items.map((ex, i) => (
              <Pressable key={ex.name + i} onPress={() => toggle(i)} style={[styles.exRow, i < items.length - 1 && styles.divider]}>
                <View style={[styles.check, ex.done && styles.checkOn]}>
                  {ex.done && <Ionicons name="checkmark" size={15} color={colors.textOnGold} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exName, ex.done && styles.exDone]}>{ex.name}</Text>
                  <Text style={styles.exMeta}>{ex.sets} séries · {ex.reps} reps · {ex.rest_sec}s descanso</Text>
                </View>
              </Pressable>
            ))}
          </Card>

          <GoldButton
            label={started ? 'Treino em andamento…' : 'Iniciar treino'}
            onPress={() => setStarted(true)}
            style={{ marginTop: 14 }}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dayDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dayDone: { backgroundColor: colors.gold, borderColor: colors.gold },
  dayRest: { opacity: 0.6 },
  dayLabel: { ...type.caption, color: colors.textSecondary, marginTop: 6 },
  progress: { fontFamily: fonts.sansSemibold, fontSize: 14, color: colors.textPrimary },
  byTeam: { ...type.caption, color: colors.gold },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  exName: { ...type.cardTitle, color: colors.textPrimary },
  exDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  exMeta: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  videoBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
});
