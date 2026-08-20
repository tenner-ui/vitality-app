import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { getWaterToday } from './api';
import { playWaterChime, armAudioUnlock } from './bell';
import { colors } from './colors';
import { fonts, type } from './typography';

const TARGET_ML = 2500;
const EVERY_MS = 90 * 60 * 1000; // a cada 90 min enquanto o app estiver aberto

/** Lembrete sonoro de água enquanto o app está aberto (web não dispara notificação nativa). */
export function WaterReminder() {
  const { userId, demo } = useAuth();
  const [msg, setMsg] = useState(false);
  const slide = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (Platform.OS !== 'web' || demo || !userId || userId === 'demo') return;
    armAudioUnlock();
    const tick = async () => {
      let ml = 0;
      try { ml = await getWaterToday({ demo, patientId: userId }); } catch {}
      if (ml < TARGET_ML) { playWaterChime(); setMsg(true); }
    };
    const id = setInterval(tick, EVERY_MS);
    return () => clearInterval(id);
  }, [userId, demo]);

  useEffect(() => {
    if (msg) {
      Animated.spring(slide, { toValue: 0, useNativeDriver: true }).start();
      const t = setTimeout(() => hide(), 6000);
      return () => clearTimeout(t);
    }
  }, [msg]);

  function hide() {
    Animated.timing(slide, { toValue: -120, duration: 250, useNativeDriver: true }).start(() => setMsg(false));
  }

  if (!msg) return null;
  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: slide }] }]}>
      <Pressable onPress={hide} style={styles.card}>
        <View style={styles.icon}><Ionicons name="water" size={20} color={colors.textOnGold} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Hora de beber água 💧</Text>
          <Text style={styles.body}>Dê uma hidratada e registre na aba Água.</Text>
        </View>
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 998, paddingTop: 44, paddingHorizontal: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.blueAccent, borderRadius: 16, padding: 14, shadowColor: '#0D1F3F', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blueAccent, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.sansSemibold, fontSize: 13, color: colors.blueAccent },
  body: { ...type.body, color: colors.textPrimary, marginTop: 1 },
});
