import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionLabel, GoldButton } from './ui';
import { Header } from './Header';
import { notify } from './notify';
import { colors } from './colors';
import { fonts, type } from './typography';
import { useAuth } from './AuthContext';
import * as api from './api';
import { pickAndUpload, publicUrl } from './storage';
import { roleMeta } from './helpers';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

function Avatar({ url, name, size = 42 }: { url?: string | null; name: string; size?: number }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.serifBold, color: colors.gold, fontSize: size * 0.42 }}>{initial}</Text>
    </View>
  );
}

export function CommunityScreen() {
  const { demo, userId, displayName, avatarUrl, role, isTeam } = useAuth();
  const ctx = { demo, patientId: userId };
  const [posts, setPosts] = useState<api.CommunityPost[]>([]);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api.getPosts(ctx).then(setPosts).catch(() => {});
  }
  useEffect(() => { load(); }, [userId]);

  async function anexar() {
    const r = await pickAndUpload('community', userId, demo);
    if (r.canceled) return;
    if (r.error) return notify('Foto', r.error);
    if (r.path) setPhoto(r.path);
  }

  async function publicar() {
    if (!text.trim() && !photo) return notify('Publicar', 'Escreva algo ou adicione uma foto.');
    setBusy(true);
    const { error } = await api.createPost(ctx, {
      body: text.trim(),
      photo_url: photo ? publicUrl('community', photo) : null,
      author_name: displayName,
      author_avatar: avatarUrl,
      author_role: role,
    });
    setBusy(false);
    if (error) return notify('Erro', error);
    setText(''); setPhoto(null);
    load();
  }

  async function curtir(p: api.CommunityPost) {
    setPosts((arr) => arr.map((x) => x.id === p.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x));
    await api.toggleLike(ctx, p.id, p.liked).catch(() => {});
  }

  async function apagar(p: api.CommunityPost) {
    setPosts((arr) => arr.filter((x) => x.id !== p.id));
    await api.deletePost(ctx, p.id).catch(() => {});
  }

  return (
    <Screen>
      <Header title="Comunidade" subtitle="Vitality em rede" rightIcon="people-outline" />
      <Text style={styles.intro}>Compartilhe suas conquistas e atividades para inspirar outros pacientes. 💪</Text>

      <Card glow style={{ marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Avatar url={avatarUrl} name={displayName} />
          <TextInput
            style={styles.input}
            placeholder="O que você quer compartilhar hoje?"
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
          />
        </View>
        {photo && (
          <View style={{ marginTop: 10 }}>
            <Image source={{ uri: publicUrl('community', photo) }} style={styles.preview} />
            <Pressable onPress={() => setPhoto(null)} style={styles.removePhoto}>
              <Ionicons name="close" size={16} color={colors.textPrimary} />
            </Pressable>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <GoldButton label={photo ? '✓ Foto' : '📷 Foto'} onPress={anexar} outline style={{ flex: 1 }} />
          <GoldButton label={busy ? 'Publicando…' : 'Publicar'} onPress={publicar} style={{ flex: 2 }} />
        </View>
      </Card>

      <SectionLabel>Mural</SectionLabel>
      {posts.length === 0 && (
        <Card><Text style={styles.empty}>Ainda não há publicações. Seja o primeiro a compartilhar!</Text></Card>
      )}
      {posts.map((p) => (
        <Card key={p.id} style={{ marginBottom: 10 }}>
          <View style={styles.postHead}>
            <Avatar url={p.author_avatar} name={p.author_name} />
            <View style={{ flex: 1 }}>
              <Text style={styles.author}>
                {p.author_name}
                {p.author_role && p.author_role !== 'paciente' && (
                  <Text style={styles.roleTag}>  · {roleMeta[p.author_role as keyof typeof roleMeta]?.label ?? 'Equipe'}</Text>
                )}
              </Text>
              <Text style={styles.time}>{timeAgo(p.created_at)}</Text>
            </View>
            {(p.author_id === userId || isTeam) && (
              <Pressable onPress={() => apagar(p)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          {!!p.body && <Text style={styles.body}>{p.body}</Text>}
          {!!p.photo_url && <Image source={{ uri: p.photo_url }} style={styles.postPhoto} />}
          <Pressable onPress={() => curtir(p)} style={styles.likeRow} hitSlop={8}>
            <Ionicons name={p.liked ? 'heart' : 'heart-outline'} size={20} color={p.liked ? colors.danger : colors.textSecondary} />
            <Text style={[styles.likeCount, p.liked && { color: colors.danger }]}>{p.likes > 0 ? p.likes : ''} {p.likes === 1 ? 'curtida' : p.likes > 1 ? 'curtidas' : 'Curtir'}</Text>
          </Pressable>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { ...type.small, color: colors.textSecondary, marginBottom: 12 },
  input: { flex: 1, color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 15, minHeight: 42, paddingTop: 8 },
  preview: { width: '100%', height: 180, borderRadius: 12 },
  removePhoto: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#000A', alignItems: 'center', justifyContent: 'center' },
  empty: { ...type.small, color: colors.textMuted, fontStyle: 'italic' },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  author: { fontFamily: fonts.sansSemibold, fontSize: 14, color: colors.textPrimary },
  roleTag: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.gold },
  time: { ...type.caption, color: colors.textMuted, marginTop: 1 },
  body: { ...type.body, color: colors.textPrimary, lineHeight: 22 },
  postPhoto: { width: '100%', height: 240, borderRadius: 12, marginTop: 10 },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  likeCount: { ...type.small, color: colors.textSecondary },
});
