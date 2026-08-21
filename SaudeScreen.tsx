import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { notify } from './notify';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionLabel, StatTile, GoldButton, Pill } from './ui';
import { Header } from './Header';
import { LineChart } from './LineChart';
import { colors } from './colors';
import { fonts, type } from './typography';
import { useAuth } from './AuthContext';
import { getBioSeries, getCardioReports, getLabResults, getPhotos, getStreakInfo, getBodyProfile, fatMassOf } from './api';
import { pickAndUpload, signedUrl } from './storage';
import { addPhoto } from './api';
import { achievements, weightTrend } from './mock';

type Seg = 'corpo' | 'bio' | 'cardio' | 'exames';

export function SaudeScreen() {
  const { demo, userId } = useAuth();
  const ctx = { demo, patientId: userId };
  const [seg, setSeg] = useState<Seg>('bio');

  return (
    <Screen>
      <Header title="Saúde" subtitle="Evolução clínica" rightIcon="pulse-outline" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }} contentContainerStyle={{ gap: 0 }}>
        <Pill label="Corpo" active={seg === 'corpo'} onPress={() => setSeg('corpo')} />
        <Pill label="Bioimpedância" active={seg === 'bio'} onPress={() => setSeg('bio')} />
        <Pill label="Cardio" active={seg === 'cardio'} onPress={() => setSeg('cardio')} />
        <Pill label="Exames" active={seg === 'exames'} onPress={() => setSeg('exames')} />
      </ScrollView>

      {seg === 'corpo' && <CorpoSection ctx={ctx} />}
      {seg === 'bio' && <BioSection ctx={ctx} />}
      {seg === 'cardio' && <CardioSection ctx={ctx} />}
      {seg === 'exames' && <ExamesSection ctx={ctx} />}
    </Screen>
  );
}

// ------------------------------- CORPO -------------------------------
const ANTES_MAX = 3;
type PhotoRow = { id: string; url: string; pose: string | null; taken_at: string; signed?: string };
function CorpoSection({ ctx }: { ctx: any }) {
  const [rows, setRows] = useState<PhotoRow[]>([]);
  const [bio, setBio] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bodyProf, setBodyProf] = useState<{ sex: 'M' | 'F' | null; birth_date: string | null }>({ sex: null, birth_date: null });

  async function reload() {
    const raw = await getPhotos(ctx).catch(() => []);
    const withUrls = await Promise.all(raw.map(async (r) => ({ ...r, signed: (await signedUrl('body-photos', r.url)) || undefined })));
    setRows(withUrls.filter((r) => r.signed));
    setBio(await getBioSeries(ctx).catch(() => []));
    getBodyProfile(ctx).then(setBodyProf).catch(() => {});
    getStreakInfo(ctx, 30).then((s) => setStreak(s.streak)).catch(() => {});
  }
  useEffect(() => { reload(); }, []);

  const antesRows = rows.filter((r) => r.pose === 'antes');
  const antesCount = antesRows.length;
  const before = antesRows[antesRows.length - 1] || rows[0];
  const others = rows.filter((r) => r.pose !== 'antes');
  const current = others[others.length - 1] || rows[rows.length - 1];

  // Nova foto de evolução (registro temporal, sem limite)
  async function newPhoto() {
    setBusy(true);
    const r = await pickAndUpload('body-photos', ctx.patientId, ctx.demo);
    setBusy(false);
    if (r.canceled) return;
    if (r.error) return notify('Foto', r.error);
    if (r.path) { await addPhoto(ctx, r.path, 'frente'); reload(); notify('Foto salva ✓', 'Registrada no seu histórico de evolução.'); }
  }
  // Foto "antes" — pode ser trocada no máximo 3x (correção de erro)
  async function setBeforePhoto() {
    if (antesCount >= ANTES_MAX) {
      return notify('Limite atingido', `A foto "antes" já foi atualizada ${ANTES_MAX} vezes. Para ajustar, entre em contato com o suporte do Instituto.`);
    }
    setBusy(true);
    const r = await pickAndUpload('body-photos', ctx.patientId, ctx.demo);
    setBusy(false);
    if (r.canceled) return;
    if (r.error) return notify('Foto', r.error);
    if (r.path) {
      await addPhoto(ctx, r.path, 'antes');
      reload();
      const rest = ANTES_MAX - (antesCount + 1);
      notify('Foto "antes" definida ✓', rest > 0 ? `Você ainda pode corrigi-la ${rest}x, se precisar.` : 'Este foi o último ajuste permitido da foto "antes".');
    }
  }

  const latest = bio[bio.length - 1] || {};
  const first = bio[0] || {};
  const bioDate = latest.measured_at ? new Date(latest.measured_at).toLocaleDateString('pt-BR') : null;
  const shortDate = (s?: string) => (s ? new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '');
  const weightCurve = bio
    .map((b, i) => ({ label: b.measured_at ? shortDate(b.measured_at) : `#${i + 1}`, value: Number(b.weight_kg) }))
    .filter((p) => !isNaN(p.value));

  // Peso inicial × atual e perda acumulada
  const firstW = Number(first.weight_kg);
  const lastW = Number(latest.weight_kg);
  const hasWeights = !isNaN(firstW) && !isNaN(lastW);
  const weightLost = hasWeights ? Math.round((firstW - lastW) * 10) / 10 : null;

  // Curva de gordura (massa gorda em kg): medida quando o laudo traz; senão estimada.
  const fatComputed = bio.map((b) => ({ b, fm: fatMassOf(b, bodyProf.sex, bodyProf.birth_date) }));
  const fatCurve = fatComputed
    .filter((x) => x.fm)
    .map((x) => ({ label: x.b.measured_at ? shortDate(x.b.measured_at) : '', value: (x.fm as any).kg }));
  const fatEstimated = fatComputed.some((x) => x.fm && (x.fm as any).estimated);
  const firstFat = fatCurve.length ? fatCurve[0].value : null;
  const lastFat = fatCurve.length ? fatCurve[fatCurve.length - 1].value : null;
  const fatLost = firstFat != null && lastFat != null ? Math.round((firstFat - lastFat) * 10) / 10 : null;

  return (
    <View>
      <SectionLabel>Antes e depois</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[{ l: 'Antes', u: before?.signed }, { l: 'Atual', u: current?.signed }].map((it) => (
          <Card key={it.l} style={{ flex: 1, alignItems: 'center', paddingVertical: 24 }}>
            {it.u ? <Image source={{ uri: it.u }} style={styles.photo} /> : <View style={styles.photoPh}><Ionicons name="person" size={38} color={colors.textMuted} /></View>}
            <Text style={styles.photoLabel}>{it.l}</Text>
          </Card>
        ))}
      </View>
      <GoldButton label={busy ? 'Enviando…' : '📸  Nova foto de evolução'} onPress={newPhoto} style={{ marginTop: 12 }} />
      <GoldButton
        label={antesCount >= ANTES_MAX ? '🔒  Foto "antes" travada (limite 3x)' : `Definir foto "antes" (${antesCount}/${ANTES_MAX})`}
        outline
        onPress={setBeforePhoto}
        style={{ marginTop: 10 }}
      />

      <SectionLabel>Linha do tempo</SectionLabel>
      {rows.length === 0 ? (
        <Card><Text style={styles.small}>Suas fotos criam um histórico de evolução. Cada nova foto fica registrada com a data.</Text></Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {rows.map((r) => (
            <View key={r.id} style={{ marginRight: 10, alignItems: 'center' }}>
              <Image source={{ uri: r.signed }} style={styles.tlPhoto} />
              <Text style={styles.tlDate}>{new Date(r.taken_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</Text>
              {r.pose === 'antes' && <Text style={styles.tlTag}>antes</Text>}
            </View>
          ))}
        </ScrollView>
      )}

      <SectionLabel>Peso {bioDate ? `· BIA ${bioDate}` : ''}</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatTile label="Peso inicial" value={hasWeights ? String(firstW) : '—'} unit="kg" />
        <StatTile label="Peso atual" value={hasWeights ? String(lastW) : '—'} unit="kg" hint={weightLost != null && weightLost !== 0 ? `${weightLost > 0 ? '-' : '+'}${Math.abs(weightLost)} kg` : undefined} />
        <StatTile label="Gordura perdida" value={fatLost != null ? String(Math.abs(fatLost)) : '—'} unit="kg" />
      </View>
      <Text style={styles.note}>Peso inicial ao lado do atual. Atualizado a cada nova bioimpedância.</Text>

      <SectionLabel>Composição corporal</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatTile label="IMC" value={latest.bmi != null ? String(latest.bmi) : '—'} unit="" />
        <StatTile label="% Gordura" value={latest.body_fat_pct != null ? String(latest.body_fat_pct) : '—'} unit="%" />
        <StatTile label="TMB" value={latest.bmr_kcal != null ? String(latest.bmr_kcal) : '—'} unit="kcal" />
      </View>

      <SectionLabel>Curva de peso e gordura</SectionLabel>
      {weightCurve.length > 0 ? (
        <Card>
          <LineChart
            data={weightCurve}
            series2={fatCurve.length ? fatCurve : undefined}
            color={colors.blueAccent}
            color2={colors.gold}
            label="Peso (kg)"
            label2={fatCurve.length ? `Gordura (kg)${fatEstimated ? ' · estimada' : ''}` : undefined}
            unit="kg"
          />
          {fatCurve.length === 0 && (
            <Text style={styles.small}>A curva de gordura aparece quando a bioimpedância trouxer a massa gorda. Reimporte os laudos pelo painel para preencher o histórico.</Text>
          )}
        </Card>
      ) : (
        <Card><Text style={styles.small}>Sem medições ainda. A equipe registra sua bioimpedância e a curva aparece aqui.</Text></Card>
      )}

      <SectionLabel>Conquistas</SectionLabel>
      <Card glow style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.streakMedal}><Ionicons name="flame" size={22} color={colors.gold} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.achieveTitle}>Constância · {streak}/30 dias</Text>
            <Text style={styles.small}>Bata a meta de água e registre refeições todo dia. Aos 30 dias seguidos você ganha um prêmio e entra na comunidade! 🏆</Text>
          </View>
        </View>
        <View style={{ height: 8, backgroundColor: colors.surfaceMuted, borderRadius: 4, overflow: 'hidden', marginTop: 12 }}>
          <View style={{ height: 8, width: `${Math.min(100, (streak / 30) * 100)}%`, backgroundColor: colors.gold }} />
        </View>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {achievements.map((a) => (
          <Card key={a.id} style={[styles.achieve, !a.unlocked && { opacity: 0.4 }]}>
            <View style={[styles.medal, a.unlocked && { backgroundColor: colors.gold + '22', borderColor: colors.gold }]}>
              <Ionicons name={a.icon as any} size={20} color={a.unlocked ? colors.gold : colors.textMuted} />
            </View>
            <Text style={styles.achieveTitle}>{a.title}</Text>
            <Text style={styles.small}>{a.description}</Text>
          </Card>
        ))}
      </View>
    </View>
  );
}

// --------------------------- BIOIMPEDÂNCIA ---------------------------
const BIA_METRICS = [
  { key: 'weight_kg', label: 'Peso', unit: 'kg' },
  { key: 'body_fat_pct', label: '% Gordura', unit: '%' },
  { key: 'fat_mass_kg', label: 'Gordura (kg)', unit: 'kg' },
  { key: 'lean_mass_kg', label: 'Massa magra', unit: 'kg' },
  { key: 'muscle_mass_kg', label: 'Massa muscular', unit: 'kg' },
  { key: 'skeletal_muscle_kg', label: 'M. esquelético', unit: 'kg' },
  { key: 'body_water_pct', label: 'Água corporal', unit: '%' },
  { key: 'visceral_fat', label: 'Gordura visceral', unit: 'nível' },
  { key: 'bmr_kcal', label: 'TMB', unit: 'kcal' },
  { key: 'phase_angle', label: 'Ângulo de fase', unit: '°' },
  { key: 'metabolic_age', label: 'Idade metabólica', unit: 'anos' },
];

function BioSection({ ctx }: { ctx: any }) {
  const [rows, setRows] = useState<any[]>([]);
  const [metric, setMetric] = useState('body_fat_pct');
  useEffect(() => { getBioSeries(ctx).then(setRows).catch(() => {}); }, []);
  const latest = rows[rows.length - 1] || {};
  const first = rows[0] || {};
  const m = BIA_METRICS.find((x) => x.key === metric)!;
  const chart = rows.map((r, i) => ({ label: r.label ?? `#${i + 1}`, value: Number(r[metric]) })).filter((p) => !isNaN(p.value));
  const delta = (k: string) => {
    const a = Number(first[k]); const b = Number(latest[k]);
    if (isNaN(a) || isNaN(b)) return null;
    const d = b - a; return `${d >= 0 ? '+' : ''}${d.toFixed(1)}`;
  };

  if (!rows.length) return <Card style={{ marginTop: 8 }}><Text style={styles.small}>Nenhuma bioimpedância registrada ainda. A equipe lança os dados da BIA e a evolução aparece aqui.</Text></Card>;

  return (
    <View>
      <SectionLabel>Resumo atual (BIA{latest.device ? ` · ${latest.device}` : ''})</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatTile label="Peso" value={String(latest.weight_kg)} unit="kg" hint={delta('weight_kg') && `${delta('weight_kg')} kg`} />
        <StatTile label="% Gordura" value={String(latest.body_fat_pct)} unit="%" hint={delta('body_fat_pct') && `${delta('body_fat_pct')} pp`} />
        <StatTile label="M. muscular" value={String(latest.muscle_mass_kg)} unit="kg" hint={delta('muscle_mass_kg') && `${delta('muscle_mass_kg')} kg`} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <StatTile label="Água" value={String(latest.body_water_pct)} unit="%" />
        <StatTile label="Visceral" value={String(latest.visceral_fat)} unit="nível" />
        <StatTile label="Âng. fase" value={String(latest.phase_angle)} unit="°" />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <StatTile label="TMB" value={String(latest.bmr_kcal)} unit="kcal" />
        <StatTile label="Idade metab." value={String(latest.metabolic_age)} unit="anos" hint={delta('metabolic_age') && `${delta('metabolic_age')} anos`} />
        <StatTile label="Massa magra" value={String(latest.lean_mass_kg)} unit="kg" />
      </View>

      <SectionLabel>Evolução</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {BIA_METRICS.map((x) => <Pill key={x.key} label={x.label} active={metric === x.key} onPress={() => setMetric(x.key)} />)}
      </ScrollView>
      <Card>
        <Text style={styles.chartTitle}>{m.label} ({m.unit})</Text>
        <LineChart data={chart} unit={m.unit} color={colors.gold} />
      </Card>
      <Text style={styles.note}>A equipe (Educador Físico) lança cada avaliação de BIA; os pontos formam a curva de evolução durante e ao final do protocolo.</Text>
    </View>
  );
}

// ------------------------------- CARDIO -------------------------------
function CardioSection({ ctx }: { ctx: any }) {
  const [reports, setReports] = useState<any[]>([]);
  const [imgs, setImgs] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      const r = await getCardioReports(ctx).catch(() => []);
      setReports(r);
      const paths: string[] = (r[0]?.images ?? []) as string[];
      const urls = await Promise.all(paths.map((p) => signedUrl('cardio', p)));
      setImgs(urls.filter(Boolean) as string[]);
    })();
  }, []);
  const r = reports[0];
  if (!r) return <Card style={{ marginTop: 8 }}><Text style={styles.small}>Nenhum registro do cardiologista ainda.</Text></Card>;
  const Block = ({ icon, title, body }: { icon: string; title: string; body?: string }) =>
    body ? (
      <Card style={{ marginBottom: 10 }}>
        <View style={styles.blkHead}><Ionicons name={icon as any} size={16} color={colors.gold} /><Text style={styles.blkTitle}>{title}</Text></View>
        <Text style={styles.blkBody}>{body}</Text>
      </Card>
    ) : null;
  return (
    <View>
      <Text style={styles.dateTag}>Consulta de {new Date(r.report_date).toLocaleDateString('pt-BR')}</Text>
      <Block icon="document-text" title="Resumo da consulta" body={r.consult_summary} />
      <Block icon="pulse" title="Descrição do ECG" body={r.ecg_description} />
      <Block icon="clipboard" title="Outros exames" body={r.other_exams} />
      <Block icon="shield-checkmark" title="Risco cardiovascular" body={r.risk_notes} />
      {imgs.length > 0 && (
        <>
          <SectionLabel>Imagens</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 10 }}>
            {imgs.map((u, i) => <Image key={i} source={{ uri: u }} style={styles.cardioImg} />)}
          </ScrollView>
        </>
      )}
    </View>
  );
}

// ------------------------------- EXAMES -------------------------------
function statusOf(v?: number, low?: number, high?: number) {
  if (v == null) return { txt: '—', color: colors.textMuted };
  if (low != null && v < low) return { txt: 'baixo', color: colors.warning };
  if (high != null && v > high) return { txt: 'alto', color: colors.danger };
  return { txt: 'na faixa', color: colors.success };
}

function ExamesSection({ ctx }: { ctx: any }) {
  const [labs, setLabs] = useState<any[]>([]);
  useEffect(() => { getLabResults(ctx).then(setLabs).catch(() => {}); }, []);
  if (!labs.length) return <Card style={{ marginTop: 8 }}><Text style={styles.small}>Nenhum exame de rotina registrado ainda.</Text></Card>;
  const cats = Array.from(new Set(labs.map((l) => l.category || 'Rotina')));
  return (
    <View>
      <Text style={styles.note}>Cada exame é comparado com a faixa de referência e acompanhado ao longo do protocolo.</Text>
      {cats.map((cat) => (
        <View key={cat}>
          <SectionLabel>{cat}</SectionLabel>
          {labs.filter((l) => (l.category || 'Rotina') === cat).map((l) => {
            const series = l.series ?? [];
            const last = series[series.length - 1]?.value;
            const st = statusOf(last, l.ref_low, l.ref_high);
            return (
              <Card key={l.id} style={{ marginBottom: 10 }}>
                <View style={styles.labHead}>
                  <Text style={styles.labName}>{l.analyte}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text style={styles.labVal}>{last}<Text style={styles.small}> {l.unit}</Text></Text>
                    <View style={[styles.badge, { backgroundColor: st.color + '22' }]}><Text style={[styles.badgeTxt, { color: st.color }]}>{st.txt}</Text></View>
                  </View>
                </View>
                <Text style={styles.small}>Referência: {l.ref_low ?? '—'}–{l.ref_high ?? '—'} {l.unit}</Text>
                {series.length > 1 && <View style={{ marginTop: 8 }}><LineChart data={series.map((s: any) => ({ label: s.date, value: s.value }))} unit={l.unit} color={colors.blueAccent} refLow={l.ref_low} refHigh={l.ref_high} height={130} /></View>}
              </Card>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: 88, height: 108, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline },
  photoPh: { width: 88, height: 108, borderRadius: 12, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  photoLabel: { ...type.caption, color: colors.textSecondary, marginTop: 8, textTransform: 'uppercase' },
  tlPhoto: { width: 92, height: 116, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline },
  tlDate: { ...type.caption, color: colors.textSecondary, marginTop: 5 },
  tlTag: { fontFamily: fonts.sansSemibold, fontSize: 9, color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },
  small: { ...type.small, color: colors.textSecondary },
  note: { ...type.small, color: colors.textMuted, marginTop: 4, marginBottom: 6 },
  chartTitle: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: 4 },
  streakMedal: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold + '22', borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  achieve: { width: '47%' },
  medal: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  achieveTitle: { ...type.bodyStrong, color: colors.textPrimary },
  blkHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  blkTitle: { ...type.caption, color: colors.gold, textTransform: 'uppercase' },
  blkBody: { ...type.body, color: colors.textPrimary, lineHeight: 21 },
  dateTag: { ...type.small, color: colors.gold, marginBottom: 10 },
  cardioImg: { width: 150, height: 190, borderRadius: 10, marginRight: 10, borderWidth: 1, borderColor: colors.border },
  labHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  labName: { ...type.cardTitle, color: colors.textPrimary },
  labVal: { fontFamily: fonts.serifBold, fontSize: 20, color: colors.textPrimary },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt: { ...type.caption, textTransform: 'uppercase' },
});
