import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
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
import { getMessages, sendMessage } from './api';
import { supabase, supabaseConfigured } from './supabase';

export function ChatScreen() {
  const { demo, userId, role, displayName } = useAuth();
  const navigation = useNavigation();
  const ctx = { demo, patientId: userId };
  const [messages, setMessages] = useState<Message[]>(demo ? seed : []);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
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
              : [...prev, { id: m.id, sender_role: m.sender_role, sender_name: m.sender_role === 'paciente' ? 'Você' : 'Equipe', body: m.body, created_at: m.created_at }]
          );
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, demo]);

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
                    <Text style={[styles.body, mine && { color: colors.textOnGold }]}>{m.body}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.shortcuts}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
              {chatShortcuts.map((s) => (
                <Pressable key={s} style={styles.shortcut} onPress={() => send(s + ':')}>
                  <Text style={styles.shortcutText}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Escreva para a equipe…"
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
            />
            <Pressable onPress={() => send(text)} style={styles.sendBtn}>
              <Ionicons name="send" size={18} color={colors.textOnGold} />
            </Pressable>
          </View>
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
  shortcuts: { paddingVertical: 8 },
  shortcut: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.hairline, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  shortcutText: { ...type.small, color: colors.gold },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.surfaceMuted, borderRadius: 20, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: 16, paddingVertical: 10, fontFamily: fonts.sans, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
});
