import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, SectionLabel, GoldButton } from './ui';
import { colors } from './colors';
import { fonts, type } from './typography';
import { notify } from './notify';
import { useAuth } from './AuthContext';
import { addNutriTip, getNutriTips, addMealPlan, getNutriFeed, NutriTip, NutriFeedItem } from './api';
import { pickAndUploadPdf, signedUrl, signedPdfUrl } from './storage';

export function NutriDeskScreen() {
  const { demo, userId, displayName, role } = useAuth();
  const nav = useNavigation<any>();
  const ctx = { demo, patientId: userId };

  const [body, setBody] = useState('');
  const [scope, setScope] = useState<'diaria' | 'semanal'>('diaria');
  const [busy, setBusy] = useState(false);
  const [tips, setTips] = useState<NutriTip[]>([]);
  const [feed, setFeed] = useState<(NutriFeedItem & { thumb?: string })[]>([]);

  function reload() {
    getNutriTips(ctx).then(setTips).catch(() => {});
    getNutriFeed(ctx).then(async (items) => {
      const withThumbs = await Promise.all(items.map(async (it) => ({ ...it, thumb: (await signedUrl('meal-photos', it.path)) || undefined })));
      setFeed(withThumbs);
    }).catch(() => {});
  }
  useEffect(() => { reload(); }, [userId, demo]);

  async function publish() {
    if (!body.trim()) return notify('Mural', 'Escreva a dica antes de publicar.');
    setBusy(true);
    const { error } = await addNutriTip(ctx, { body: body.trim(), scope, author_name: displayName, author_role: role });
    setBusy(false);
    if (error) return notify('Erro', error);
    setBody('');
    reload();
    notify('Publicado ✓', 'A dica já aparece no mural dos pacientes.');
  }

  async function uploadCardapioGeral() {
    const r = await pickAndUploadPdf('global');
    if (r.canceled) return;
    if (r.error || !r.path) return notify('Cardápio', r.error || 'Falha no envio.');
    const { error } = await addMealPlan(ctx, { patient_id: null, title: r.name || 'Cardápio geral', pdf_path: r.path });
    if (error) return notify('Erro', error);
    notify('Cardápio enviado ✓', 'Disponível para todos os pacientes na aba Nutrição.');
  }

  async function openPhoto(path: string) {
    const url = await signedUrl('meal-photos', path);
    if (url && Platform.OS === 'web') window.open(url, '_blank');
  }

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10}><Ionicons name="chevron-back" size={24} color={colors.textPrimary} /></Pressable>
        <Text style={styles.title}>Nutrição · Publicações</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Publicar no mural */}
      <SectionLabel>Publicar dica no mural</SectionLabel>
      <Card glow>
        <TextInput
          style={styles.textarea}
          value={body}
          onChangeText={setBody}
          placeholder="Ex.: Hoje capriche na hidratação e priorize proteína no café da manhã…"
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <View style={styles.scopeRow}>
          {(['diaria', 'semanal'] as const).map((s) => (
            <Pressable key={s} onPress={() => setScope(s)} style={[styles.scope, scope === s && styles.scopeOn]}>
              <Text style={[styles.scopeTxt, scope === s && styles.scopeTxtOn]}>{s === 'diaria' ? 'Dica diária' : 'Dica semanal'}</Text>
            </Pressable>
          ))}
        </View>
        <GoldButton label={busy ? 'Publicando…' : 'Publicar no mural'} onPress={publish} style={{ marginTop: 12 }} />
      </Card>

      {/* Cardápio geral */}
      <SectionLabel>Cardápio geral (PDF)</SectionLabel>
      <Card>
        <Text style={styles.small}>Envie um cardápio em PDF válido para todos os pacientes. Para um cardápio individual, abra o paciente na lista e use “Enviar cardápio”.</Text>
        <GoldButton label="📄  Enviar PDF para todos" outline onPress={uploadCardapioGeral} style={{ marginTop: 12 }} />
      </Card>

      {/* Fotos enviadas pelos pacientes */}
      <SectionLabel>Fotos enviadas pelos pacientes</SectionLabel>
      {feed.length === 0 ? (
        <Card><Text style={styles.small}>Quando um paciente escolher “Comer” na calculadora, a foto do prato aparece aqui.</Text></Card>
      ) : (
        feed.map((it) => (
          <Pressable key={it.id} onPress={() => openPhoto(it.path)}>
            <Card style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {it.thumb ? <Image source={{ uri: it.thumb }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]}><Ionicons name="image" size={20} color={colors.textMuted} /></View>}
              <View style={{ flex: 1 }}>
                <Text style={styles.feedName}>{it.patient_name}</Text>
                <Text style={styles.small}>{it.title} · {it.calories} kcal</Text>
                <Text style={styles.feedDate}>{new Date(it.logged_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.gold} />
            </Card>
          </Pressable>
        ))
      )}

      {/* Dicas publicadas */}
      <SectionLabel>Dicas publicadas</SectionLabel>
      {tips.length === 0 ? (
        <Card><Text style={styles.small}>Nenhuma dica publicada ainda.</Text></Card>
      ) : (
        tips.map((t) => (
          <Card key={t.id} style={{ marginBottom: 8 }}>
            <Text style={styles.tipScope}>{t.scope === 'semanal' ? 'Semanal' : 'Diária'} · {new Date(t.created_at).toLocaleDateString('pt-BR')}</Text>
            <Text style={styles.tipBody}>{t.body}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontFamily: fonts.serifBold, fontSize: 18, color: colors.textPrimary },
  small: { ...type.small, color: colors.textSecondary },
  textarea: { minHeight: 90, backgroundColor: colors.surfaceMuted, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, padding: 14, fontFamily: fonts.sans, fontSize: 15, textAlignVertical: 'top' },
  scopeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  scope: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  scopeOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  scopeTxt: { fontFamily: fonts.sansSemibold, fontSize: 12, color: colors.textSecondary },
  scopeTxtOn: { color: colors.textOnGold },
  thumb: { width: 52, height: 52, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  feedName: { ...type.cardTitle, color: colors.textPrimary },
  feedDate: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  tipScope: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: colors.textMuted, marginBottom: 4 },
  tipBody: { ...type.body, color: colors.textPrimary },
});
