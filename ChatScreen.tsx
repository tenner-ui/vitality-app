import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from './Header';
import { useNavigation } from '@react-navigation/native';
import { colors, gradients } from './colors';
import { fonts, type } from './typography';
import { chatMessages as seed, chatShortcuts } from './mock';
import { Message } from './types';
import { useAuth } from './AuthContext';
import { getMessages, sendMessage, sendAudioMessage } from './api';
import { uploadAudioBlob, signedUrl } from './storage';
import { supabase, supabaseConfigured } from './supabase';
import { playBell, armAudioUnlock, initAudio } from './bell';

/** Escolhe um mimeType de gravação suportado pelo navegador. */
function pickRecMime(): string | undefined {
  const MR: any = (globalThis as any).MediaRecorder;
  if (!MR || !MR.isTypeSupported) return undefined;
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    try { if (MR.isTypeSupported(t)) return t; } catch {}
  }
  return undefined;
}

/** Bolha de áudio: toca/pausa uma mensagem de voz (web via HTMLAudioElement). */
function AudioBubble({ path, mine }: { path: string; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<any>(null);

  useEffect(() => {
    let alive = true;
    signedUrl('chat-audio', path).then((u) => { if (alive) setUrl(u); }).catch(() => {});
    return () => {
      alive = false;
      if (audioRef.current) { try { audioRef.current.pause(); } catch {} audioRef.current = null; }
    };
  }, [path]);

  const tint = mine ? colors.textOnGold : colors.gold;

  function play(u: string) {
    try {
      const a = new (window as any).Audio(u);
      a.onended = () => setPlaying(false);
      a.onpause = () => setPlaying(false);
      a.onplay = () => setPlaying(true);
      audioRef.current = a;
      a.play().catch(() => {});
    } catch {}
  }

  async function toggle() {
    if (Platform.OS !== 'web') return;
    initAudio();
    let u = url;
    if (!u) { setLoading(true); u = await signedUrl('chat-audio', path); setLoading(false); if (!u) return; setUrl(u); }
    if (!audioRef.current) { play(u); return; }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setPlaying(true); }
  }

  return (
    <Pressable onPress={toggle} style={styles.audioRow}>
      {loading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : (
        <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={30} color={tint} />
      )}
      <View style={styles.audioBars}>
        {[10, 16, 22, 14, 20, 12, 18, 9, 15].map((h, i) => (
          <View key={i} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: tint, opacity: mine ? 0.85 : 0.6 }} />
        ))}
      </View>
      <Ionicons name="mic" size={14} color={tint} style={{ opacity: 0.7 }} />
    </Pressable>
  );
}

export function ChatScreen() {
  const { demo, userId, role } = useAuth();
  const navigation = useNavigation();
  const ctx = { demo, patientId: userId };
  const [messages, setMessages] = useState<Message[]>(demo ? seed : []);
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const recRef = useRef<any>(null);
  const chunksRef = useRef<any[]>([]);
  const streamRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    armAudioUnlock();
    getMessages(ctx).then((m) => setMessages(m)).catch(() => {});
  }, [userId, demo]);

  // Realtime: novas mensagens chegam sem recarregar (Supabase Realtime)
  useEffect(() => {
    if (!supabaseConfigured || demo || !userId || userId === 'demo') return;
    const channel = supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `patient_id=eq.${userId}` },
        (payload: any) => {
          const m = payload.new;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, { id: m.id, sender_role: m.sender_role, sender_name: m.sender_role === 'paciente' ? 'Você' : 'Equipe', body: m.body, created_at: m.created_at, audio_path: m.audio_path ?? null }]
          );
          // Som de aviso quando a mensagem vem de outra pessoa
          if (m.sender_role !== role) playBell();
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, demo, role]);

  // Limpa gravação ao sair
  useEffect(() => () => { stopTimer(); stopStream(); }, []);

  function stopTimer() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }
  function stopStream() { try { streamRef.current?.getTracks?.().forEach((t: any) => t.stop()); } catch {} streamRef.current = null; }

  function send(body: string) {
    if (!body.trim()) return;
    const realtime = supabaseConfigured && !demo && userId && userId !== 'demo';
    // Em conta real, a própria mensagem volta pelo Realtime — evita duplicar.
    if (!realtime) {
      setMessages((m) => [
        ...m,
        { id: String(Date.now()), sender_role: 'paciente', sender_name: 'Você', body: body.trim(), created_at: new Date().toISOString() },
      ]);
    }
    sendMessage(ctx, body.trim(), role).catch(() => {});
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function startRecording() {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    if (!supabaseConfigured || demo || !userId || userId === 'demo') return;
    initAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickRecMime();
      const rec = new (window as any).MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e: any) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = onRecStop;
      recRef.current = rec;
      rec.start();
      setRecording(true);
      setRecSecs(0);
      stopTimer();
      timerRef.current = setInterval(() => setRecSecs((s) => (s >= 300 ? s : s + 1)), 1000);
    } catch (e) {
      setRecording(false);
      stopStream();
    }
  }

  function cancelRecording() {
    const rec = recRef.current;
    chunksRef.current = [];
    if (rec && rec.state !== 'inactive') { rec.onstop = () => { stopStream(); }; try { rec.stop(); } catch {} }
    recRef.current = null;
    stopTimer();
    stopStream();
    setRecording(false);
    setRecSecs(0);
  }

  function finishRecording() {
    const rec = recRef.current;
    stopTimer();
    setRecording(false);
    if (rec && rec.state !== 'inactive') { try { rec.stop(); } catch {} }
  }

  async function onRecStop() {
    const rec = recRef.current;
    const recMime = rec && rec.mimeType;
    stopStream();
    const chunks = chunksRef.current;
    chunksRef.current = [];
    recRef.current = null;
    setRecSecs(0);
    if (!chunks.length) return;
    const type = recMime || (chunks[0] && chunks[0].type) || 'audio/webm';
    const blob = new (window as any).Blob(chunks, { type });
    if (blob.size < 800) return; // muito curto/silêncio
    setUploading(true);
    const up = await uploadAudioBlob(userId, blob);
    if (up.error || !up.path) { setUploading(false); return; }
    await sendAudioMessage(ctx, up.path, role);
    setUploading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }

  const canRecord = Platform.OS === 'web' && supabaseConfigured && !demo && !!userId && userId !== 'demo';
  const mm = String(Math.floor(recSecs / 60)).padStart(2, '0');
  const ss = String(recSecs % 60).padStart(2, '0');

  return (
    <View style={{ flex: 1, backgroundColor: colors.offWhite }}>
      <LinearGradient colors={gradients.hero} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Header title="Chat" subtitle="Equipe Vitality" rightIcon="people-outline" onBack={() => navigation.goBack()} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
          <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            {messages.map((m) => {
              const mine = m.sender_role === 'paciente';
              return (
                <View key={m.id} style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                  {!mine && <Text style={styles.sender}>{m.sender_name}</Text>}
                  <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                    {m.audio_path ? (
                      <AudioBubble path={m.audio_path} mine={mine} />
                    ) : (
                      <Text style={[styles.body, mine && { color: colors.textOnGold }]}>{m.body}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {!recording && (
            <View style={styles.shortcuts}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
                {chatShortcuts.map((s) => (
                  <Pressable key={s} style={styles.shortcut} onPress={() => send(s + ':')}>
                    <Text style={styles.shortcutText}>{s}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {recording ? (
            <View style={styles.recBar}>
              <Pressable onPress={cancelRecording} hitSlop={8} style={styles.recCancel}>
                <Ionicons name="trash" size={20} color={colors.danger} />
              </Pressable>
              <View style={styles.recCenter}>
                <View style={styles.recDot} />
                <Text style={styles.recTime}>{mm}:{ss}</Text>
                <Text style={styles.recHint}>Gravando… toque no visto para enviar</Text>
              </View>
              <Pressable onPress={finishRecording} style={styles.recSend}>
                <Ionicons name="checkmark" size={20} color={colors.textOnGold} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                placeholder={uploading ? 'Enviando áudio…' : 'Escreva para a equipe…'}
                placeholderTextColor={colors.textMuted}
                value={text}
                onChangeText={setText}
                editable={!uploading}
                multiline
              />
              {text.trim().length > 0 ? (
                <Pressable onPress={() => send(text)} style={styles.sendBtn}>
                  <Ionicons name="send" size={18} color={colors.textOnGold} />
                </Pressable>
              ) : canRecord ? (
                <Pressable onPress={startRecording} style={styles.sendBtn} disabled={uploading}>
                  {uploading ? <ActivityIndicator size="small" color={colors.textOnGold} /> : <Ionicons name="mic" size={20} color={colors.textOnGold} />}
                </Pressable>
              ) : (
                <Pressable onPress={() => send(text)} style={styles.sendBtn}>
                  <Ionicons name="send" size={18} color={colors.textOnGold} />
                </Pressable>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { marginBottom: 14, maxWidth: '82%' },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start' },
  sender: { ...type.caption, color: colors.gold, marginBottom: 4, marginLeft: 4 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  mine: { backgroundColor: colors.gold, borderTopRightRadius: 4 },
  theirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 4 },
  body: { ...type.body, color: colors.textPrimary },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 150 },
  audioBars: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1, height: 24 },
  shortcuts: { paddingVertical: 8 },
  shortcut: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.hairline, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  shortcutText: { ...type.small, color: colors.gold },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.surfaceMuted, borderRadius: 20, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: 16, paddingVertical: 10, fontFamily: fonts.sans, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },

  recBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  recCancel: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  recCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger },
  recTime: { fontFamily: fonts.sansSemibold, fontSize: 15, color: colors.textPrimary },
  recHint: { ...type.small, color: colors.textSecondary, flex: 1 },
  recSend: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
});
