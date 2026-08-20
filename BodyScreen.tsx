import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { notify } from './notify';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionLabel, StatTile, GoldButton } from './ui';
import { Header } from './Header';
import { colors } from './colors';
import { fonts, type } from './typography';
import { bodyComposition, weightTrend, achievements } from './mock';
import { useAuth } from './AuthContext';
import { pickAndUpload, signedUrl } from './storage';
import { addPhoto, getPhotos } from './api';

export function BodyScreen() {
  const { demo, userId } = useAuth();
  const ctx = { demo, patientId: userId };
  const maxW = Math.max(...weightTrend.history);
  const minW = Math.min(...weightTrend.history, weightTrend.goal);
  const range = maxW - minW || 1;

  const [photos, setPhotos] = useState<string[]>([]); // URLs assinadas (antiga → recente)

  useEffect(() => {
    (async () => {
      const rows = await getPhotos(ctx).catch(() => []);
      const urls = await Promise.all(rows.map((r) => signedUrl('body-photos', r.url)));
      setPhotos(urls.filter(Boolean) as string[]);
    })();
  }, [userId, demo]);

  async function newPhoto() {
    const r = await pickAndUpload('body-photos', userId, demo);
    if (r.canceled) return;
    if (r.error) return notify('Foto', r.error);
    if (r.path) {
      await addPhoto(ctx, r.path, 'frente');
      const url = await signedUrl('body-photos', r.path);
      if (url) setPhotos((p) => [...p, url]);
      notify('Foto salva ✓', 'Registrada na sua evolução.');
    }
  }

  const before = photos[0];
  const current = photos[photos.length - 1];

  return (
    <Screen>
      <Header title="Corpo" subtitle="Evolução" rightIcon="body-outline" />

      <SectionLabel>Fotos de evolução</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[{ label: 'Antes', uri: before }, { label: 'Atual', uri: current }].map((item) => (
          <Card key={item.label} style={{ flex: 1, alignItems: 'center', paddingVertical: 26 }}>
            {item.uri ? (
              <Image source={{ uri: item.uri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={40} color={colors.textMuted} />
              </View>
            )}
            <Text style={styles.photoLabel}>{item.label}</Text>
          </Card>
        ))}
      </View>
      <GoldButton label="📸  Nova foto (com guia de pose)" outline onPress={newPhoto} style={{ marginTop: 12 }} />

      <SectionLabel>Composição corporal</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatTile label="Peso" value={String(bodyComposition.weightKg)} unit="kg" />
        <StatTile label="% Gordura" value={String(bodyComposition.bodyFatPct)} unit="%" />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <StatTile label="Massa magra" value={String(bodyComposition.leanMassKg)} unit="kg" />
        <StatTile label="Cintura" value={String(bodyComposition.waistCm)} unit="cm" />
      </View>

      <SectionLabel>Curva de peso</SectionLabel>
      <Card>
        <View style={styles.chart}>
          {weightTrend.history.map((w, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text style={styles.wVal}>{w}</Text>
              <View style={[styles.wBar, { height: 30 + ((w - minW) / range) * 90, backgroundColor: colors.blueAccent }]} />
            </View>
          ))}
        </View>
        <View style={styles.goalLine}>
          <Text style={styles.goalText}>Meta: {weightTrend.goal} kg</Text>
        </View>
      </Card>

      <SectionLabel>Conquistas</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {achievements.map((a) => (
          <Card key={a.id} style={[styles.achieve, !a.unlocked && { opacity: 0.4 }]}>
            <View style={[styles.medal, a.unlocked && { backgroundColor: colors.gold + '22', borderColor: colors.gold }]}>
              <Ionicons name={a.icon as any} size={20} color={a.unlocked ? colors.gold : colors.textMuted} />
            </View>
            <Text style={styles.achieveTitle}>{a.title}</Text>
            <Text style={styles.achieveDesc}>{a.description}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoPlaceholder: { width: 90, height: 110, borderRadius: 12, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  photo: { width: 90, height: 110, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline },
  photoLabel: { ...type.caption, color: colors.textSecondary, marginTop: 10, textTransform: 'uppercase' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 150, gap: 4 },
  wVal: { ...type.caption, color: colors.textSecondary, marginBottom: 4 },
  wBar: { width: 20, borderRadius: 6 },
  goalLine: { borderTopWidth: 1, borderTopColor: colors.hairline, borderStyle: 'dashed', marginTop: 12, paddingTop: 8 },
  goalText: { ...type.small, color: colors.gold },
  achieve: { width: '47%' },
  medal: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  achieveTitle: { ...type.bodyStrong, color: colors.textPrimary },
  achieveDesc: { ...type.small, color: colors.textSecondary, marginTop: 2 },
});
