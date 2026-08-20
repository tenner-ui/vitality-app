import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { getStreakInfo, awardAchievement, createPost, getAchievements } from './api';
import { playBell, armAudioUnlock } from './bell';
import { colors } from './colors';
import { fonts, type } from './typography';
import { roleMeta } from './helpers';

const KIND = 'constancia_30';

/** Verifica a constância de 30 dias e concede o prêmio (com post na comunidade). */
export function AchievementWatcher() {
  const { userId, demo, displayName, avatarUrl, role } = useAuth();
  const [show, setShow] = useState(false);
  const slide = useRef(new Animated.Value(-160)).current;

  useEffect(() => {
    if (demo || !userId || userId === 'demo') return;
    let cancelled = false;
    (async () => {
      try {
        const info = await getStreakInfo({ demo, patientId: userId }, 30);
        if (cancelled || !info.goalHit) return;
        const already = (await getAchievements({ demo, patientId: userId })).some((a) => a.kind === KIND);
        if (already) return;
        const res = await awardAchievement({ demo, patientId: userId }, { kind: KIND, title: 'Constância de 30 dias 🏆' });
        if (!res.awarded) return; // corrida/já existia
        // Post automático na comunidade para estimular a competição
        const first = (displayName || 'Um paciente').split(' ')[0];
        await createPost({ demo, patientId: userId }, {
          body: `🏆 ${first} completou 30 dias seguidos batendo todas as metas! Constância premiada. Bora acompanhar? 💪`,
          author_name: displayName || 'Paciente',
          author_avatar: avatarUrl,
          author_role: (roleMeta as any)[role]?.label ?? 'Paciente',
        }).catch(() => {});
        armAudioUnlock();
        try { playBell(); } catch {}
        if (!cancelled) setShow(true);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [userId, demo]);

  useEffect(() => {
    if (show) {
      Animated.spring(slide, { toValue: 0, useNativeDriver: true }).start();
    }
  }, [show]);

  function hide() {
    Animated.timing(slide, { toValue: -160, duration: 250, useNativeDriver: true }).start(() => setShow(false));
  }

  if (!show) return null;
  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: slide }] }]} pointerEvents="box-none">
      <Pressable onPress={hide} style={styles.card}>
        <View style={styles.medal}><Ionicons name="trophy" size={26} color={colors.textOnGold} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Parabéns! 30 dias de constância 🎉</Text>
          <Text style={styles.body}>
            Você bateu todas as metas por 30 dias seguidos e ganhou um prêmio do Instituto. Já avisamos a comunidade!
          </Text>
        </View>
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999, paddingTop: 44, paddingHorizontal: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.gold, borderRadius: 16, padding: 14, shadowColor: '#0D1F3F', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 10 },
  medal: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.sansSemibold, fontSize: 14, color: colors.gold },
  body: { ...type.small, color: colors.textPrimary, marginTop: 2, lineHeight: 18 },
});
