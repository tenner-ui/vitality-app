import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionLabel } from './ui';
import { Header } from './Header';
import { colors } from './colors';
import { fonts, type } from './typography';
import { useAuth } from './AuthContext';
import * as api from './api';
import { signedUrl } from './storage';

function fmtDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Row({ icon, label, value }: { icon: string; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Ionicons name={icon as any} size={16} color={colors.gold} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function CardioCard({ r }: { r: any }) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    const first = Array.isArray(r.images) ? r.images[0] : null;
    if (first) signedUrl('cardio', first).then(setImg).catch(() => {});
  }, [r]);
  return (
    <Card style={{ marginBottom: 12 }}>
      <Text style={styles.date}>{fmtDate(r.report_date || r.created_at)}</Text>
      <Row icon="document-text-outline" label="Resumo da consulta" value={r.consult_summary} />
      <Row icon="pulse-outline" label="ECG" value={r.ecg_description} />
      <Row icon="flask-outline" label="Outros exames" value={r.other_exams} />
      <Row icon="alert-circle-outline" label="Risco cardiovascular" value={r.risk_notes} />
      {img && <Image source={{ uri: img }} style={styles.img} />}
    </Card>
  );
}

export function CardioScreen() {
  const { demo, userId } = useAuth();
  const ctx = { demo, patientId: userId };
  const [reports, setReports] = useState<any[]>([]);
  useEffect(() => {
    api.getCardioReports(ctx, userId ?? undefined).then((r) => setReports(Array.isArray(r) ? r.filter(Boolean) : [])).catch(() => {});
  }, [userId]);

  return (
    <Screen>
      <Header title="Cardio" subtitle="Cardiologia" rightIcon="heart-outline" />
      <View style={styles.hero}>
        <Ionicons name="heart" size={22} color={colors.danger} />
        <Text style={styles.heroText}>Seus laudos e avaliações cardiológicas registrados pela equipe médica.</Text>
      </View>

      <SectionLabel>Laudos e avaliações</SectionLabel>
      {reports.length === 0 ? (
        <Card><Text style={styles.empty}>Nenhum registro cardiológico ainda. Assim que seu médico lançar um laudo, ele aparece aqui.</Text></Card>
      ) : (
        reports.map((r, i) => <CardioCard key={r.id || i} r={r} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceMuted, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 8 },
  heroText: { ...type.small, color: colors.textSecondary, flex: 1, lineHeight: 20 },
  date: { fontFamily: fonts.sansSemibold, fontSize: 13, color: colors.gold, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...type.caption, color: colors.textSecondary, textTransform: 'uppercase' },
  rowValue: { ...type.body, color: colors.textPrimary, marginTop: 2 },
  img: { width: '100%', height: 220, borderRadius: 12, marginTop: 12 },
  empty: { ...type.small, color: colors.textMuted, fontStyle: 'italic' },
});
