import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, supabaseConfigured } from './supabase';
import { useAuth } from './AuthContext';
import { playBell, initAudio, armAudioUnlock, buzz } from './bell';
import { colors } from './colors';
import { fonts, type } from './typography';

/**
 * Escuta "chamar atenção" (nudges) em tempo real para o paciente logado.
 * Ao chegar: toca a campainha e mostra um aviso no topo.
 */
export function NudgeListener() {
  const { userId, demo } = useAuth();
  const [msg, setMsg] = useState<string | null>(null);
  const slide = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (!supabaseConfigured || demo || !userId || userId === 'demo') return;
    armAudioUnlock();
    initAudio();
    // Pede permissão de notificação do navegador (best-effort) para o alerta aparecer
    // mesmo com o app em segundo plano.
    try {
      const N: any = (globalThis as any).Notification;
      if (N && N.permission === 'default') N.requestPermission?.().catch?.(() => {});
    } catch {}
    const ch = supabase
      .channel(`nudges:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nudges', filter: `patient_id=eq.${userId}` }, (payload: any) => {
        const body = payload.new?.body || 'Sua equipe está chamando sua atenção 🔔';
        playBell();
        buzz([150, 80, 150]);
        try {
          const N: any = (globalThis as any).Notification;
          if (N && N.permission === 'granted') new N('Instituto Vitality 🔔', { body, tag: 'vitality-nudge' });
        } catch {}
        setMsg(body);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, demo]);

  useEffect(() => {
    if (msg) {
      Animated.spring(slide, { toValue: 0, useNativeDriver: true }).start();
      const t = setTimeout(() => hide(), 6000);
      return () => clearTimeout(t);
    }
  }, [msg]);

  function hide() {
    Animated.timing(slide, { toValue: -120, duration: 250, useNativeDriver: true }).start(() => setMsg(null));
  }

  if (!msg) return null;
  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: slide }] }]}>
      <Pressable onPress={hide} style={styles.card}>
        <View style={styles.bell}><Ionicons name="notifications" size={22} color={colors.textOnGold} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Instituto Vitality</Text>
          <Text style={styles.body}>{msg}</Text>
        </View>
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999, paddingTop: 44, paddingHorizontal: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.gold, borderRadius: 16, padding: 14, shadowColor: '#0D1F3F', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.sansSemibold, fontSize: 13, color: colors.gold },
  body: { ...type.body, color: colors.textPrimary, marginTop: 1 },
});
