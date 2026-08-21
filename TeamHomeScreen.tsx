import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, Card, SectionLabel } from './ui';
import { colors } from './colors';
import { fonts, type } from './typography';
import { notify } from './notify';
import { useAuth } from './AuthContext';
import { listPatients, setPatientActive, getTeamAgendaToday, getTeamAdherence, PatientRow, TeamAgendaItem } from './api';
import { appointmentMeta, roleMeta } from './helpers';
import { AppointmentType, Role } from './types';
import { TeamStackParams } from './TeamNavigator';

type Lens = 'all' | 'medico' | 'nutricionista' | 'psicologa' | 'educador_fisico';

const LENSES: { key: Lens; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'all', label: 'Todos', icon: 'grid', color: colors.navy },
  { key: 'medico', label: 'Médico', icon: 'medkit', color: colors.blueAccent },
  { key: 'nutricionista', label: 'Nutrição', icon: 'nutrition', color: colors.success },
  { key: 'psicologa', label: 'Psico', icon: 'happy', color: colors.goldLight },
  { key: 'educador_fisico', label: 'Físico', icon: 'barbell', color: colors.info },
];

const lensTypes: Record<string, AppointmentType[]> = {
  medico: ['consulta', 'aplicacao', 'coleta'],
  nutricionista: ['nutricao'],
  psicologa: ['psicologia'],
  educador_fisico: ['avaliacao_fisica'],
};

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function adherenceColor(a: number): string {
  if (a >= 0.8) return colors.success;
  if (a >= 0.5) return colors.gold;
  return colors.danger;
}

export function TeamHomeScreen() {
  const { demo, userId, role, displayName, isLeader, teamLens, setTeamLens } = useAuth();
  const ctx = { demo, patientId: userId };
  const nav = useNavigation<NativeStackNavigationProp<TeamStackParams>>();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [agendaAll, setAgendaAll] = useState<TeamAgendaItem[]>([]);
  const [adhMap, setAdhMap] = useState<Record<string, number>>({});

  // A visão (lens): o líder alterna entre todas as áreas; o profissional vê a sua.
  const ownLens: Lens = (['medico', 'nutricionista', 'psicologa', 'educador_fisico'].includes(role)
    ? role
    : 'all') as Lens;
  const activeLens: Lens = (isLeader ? teamLens : ownLens) as Lens;

  function load() {
    listPatients(ctx)
      .then((ps) => {
        setPatients(ps);
        const ids = ps.map((p) => p.id).filter(Boolean);
        getTeamAdherence(ctx, ids).then(setAdhMap).catch(() => {});
      })
      .catch(() => {});
    getTeamAgendaToday(ctx).then(setAgendaAll).catch(() => {});
  }
  useEffect(() => { load(); }, [demo, userId]);

  // Adesão de cada paciente: usa o valor do mock (demo) ou o calculado (real).
  const adhOf = (p: any): number | null => {
    if (typeof p.adherence === 'number') return p.adherence;
    if (typeof adhMap[p.id] === 'number') return adhMap[p.id];
    return null;
  };

  const ativos = patients.filter((p: any) => p.active);
  const pendentes = patients.filter((p: any) => !p.active);
  const atRisk = (patients as any[]).filter((p) => {
    const a = adhOf(p);
    return p.risk || (a !== null && a < 0.5);
  });

  const adhVals = ativos.map((p) => adhOf(p)).filter((a): a is number => a !== null);
  const adesaoMedia = adhVals.length
    ? Math.round((adhVals.reduce((s, a) => s + a, 0) / adhVals.length) * 100)
    : null;
  const atencao = atRisk.length + pendentes.length;

  const agenda = useMemo(() => {
    if (activeLens === 'all') return agendaAll;
    const types = lensTypes[activeLens] ?? [];
    return agendaAll.filter((a) => types.includes(a.type as AppointmentType));
  }, [agendaAll, activeLens]);

  const roleLabel =
    activeLens === 'all' ? 'Equipe completa' : roleMeta[activeLens as Role].label;

  async function liberar(p: PatientRow) {
    setPatients((arr) => arr.map((x) => x.id === p.id ? { ...x, active: true } : x));
    const { error } = await setPatientActive(ctx, p.id, true);
    if (error) { notify('Erro', error); load(); return; }
    notify('Paciente liberado ✓', `${p.full_name} já pode usar o app.`);
  }

  return (
    <Screen>
      {/* Cabeçalho do painel */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>PAINEL DA EQUIPE</Text>
          <Text style={styles.h1}>{isLeader ? 'Instituto Vitality' : displayName}</Text>
          <Text style={styles.h1sub}>
            {isLeader ? 'RenovaCorps · ' + roleLabel : `${roleMeta[role].label} · RenovaCorps`}
          </Text>
        </View>
        <View style={styles.countChip}>
          <Text style={styles.countChipTxt}>{patients.length} pac.</Text>
        </View>
      </View>

      {/* Abas de função — apenas o líder alterna entre as áreas */}
      {isLeader && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.lensRow}
          style={{ marginBottom: 6 }}
        >
          {LENSES.map((l) => {
            const on = teamLens === l.key;
            return (
              <Pressable key={l.key} onPress={() => setTeamLens(l.key)} style={[styles.lens, on && styles.lensOn]}>
                <Ionicons name={l.icon} size={16} color={on ? '#fff' : l.color} />
                <Text style={[styles.lensTxt, { color: on ? '#fff' : colors.textSecondary }]}>{l.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <Card glow style={styles.kpiCard}>
          <Text style={styles.kpi}>{ativos.length}</Text>
          <Text style={styles.kpiLabel}>Ativos</Text>
        </Card>
        <Card glow style={styles.kpiCard}>
          <Text style={styles.kpi}>{adesaoMedia !== null ? `${adesaoMedia}%` : '—'}</Text>
          <Text style={styles.kpiLabel}>Adesão</Text>
        </Card>
        <Card glow style={styles.kpiCard}>
          <Text style={[styles.kpi, atencao > 0 && { color: colors.gold }]}>{atencao}</Text>
          <Text style={styles.kpiLabel}>Atenção</Text>
        </Card>
      </View>

      {/* Atalho da Nutrição (nutricionista e líder) */}
      {(role === 'nutricionista' || isLeader) && (activeLens === 'all' || activeLens === 'nutricionista') && (
        <Pressable onPress={() => nav.navigate('NutriDesk')}>
          <Card glow style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <View style={styles.nutriIcon}><Ionicons name="nutrition" size={20} color={colors.textOnGold} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.patient}>Publicações da Nutrição</Text>
              <Text style={styles.sub}>Mural de dicas · cardápio em PDF · fotos dos pacientes</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        </Pressable>
      )}

      {/* Importar pacientes por pasta de PDFs (líder) */}
      {isLeader && (
        <Pressable onPress={() => nav.navigate('ImportPacientes')}>
          <Card glow style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <View style={styles.importIcon}><Ionicons name="cloud-upload" size={20} color={colors.textOnGold} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.patient}>Importar pacientes</Text>
              <Text style={styles.sub}>Suba as pastas de bioimpedância (PDF) · a IA alimenta os dados</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        </Pressable>
      )}

      {/* Painel de liberação (líder) */}
      {isLeader && pendentes.length > 0 && (
        <>
          <SectionLabel>Liberação · {pendentes.length} aguardando</SectionLabel>
          {pendentes.map((p) => (
            <Card key={p.id} glow style={{ marginBottom: 10 }}>
              <View style={styles.row}>
                <View style={styles.avatar}><Text style={styles.avatarTxt}>{initials(p.full_name)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patient}>{p.full_name}</Text>
                  <Text style={styles.sub}>Aguardando sua liberação</Text>
                </View>
                <Pressable onPress={() => liberar(p)} style={styles.liberarBtn}>
                  <Ionicons name="checkmark" size={16} color={colors.textOnGold} />
                  <Text style={styles.liberarTxt}>Liberar</Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Agenda de hoje */}
      <View style={styles.secHead}>
        <SectionLabel>Agenda de hoje</SectionLabel>
        {agenda.length > 0 && <Text style={styles.secCount}>{agenda.length} atend.</Text>}
      </View>
      <Card style={{ paddingVertical: 6 }}>
        {agenda.length > 0 ? (
          agenda.map((a, i) => (
            <View key={a.id} style={[styles.agItem, i < agenda.length - 1 && styles.agDivider]}>
              <Text style={styles.time}>{a.time}</Text>
              <View style={[styles.dot, { backgroundColor: appointmentMeta[a.type].color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.patient}>{a.patient}</Text>
                <Text style={styles.sub}>{appointmentMeta[a.type].label}</Text>
              </View>
              {a.type === 'aplicacao' ? (
                <View style={styles.nowTag}><Text style={styles.nowTagTxt}>Agora</Text></View>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              )}
            </View>
          ))
        ) : (
          <Text style={[styles.sub, { fontStyle: 'italic', padding: 8 }]}>
            {patients.length === 0
              ? 'Nenhum paciente cadastrado ainda. Eles aparecem aqui assim que se cadastram no app.'
              : 'Sem compromissos para hoje.'}
          </Text>
        )}
      </Card>

      {/* Pacientes */}
      <View style={styles.secHead}>
        <SectionLabel>Pacientes</SectionLabel>
        {ativos.length > 0 && <Text style={styles.secCount}>{ativos.length} ativos</Text>}
      </View>
      <Card style={{ paddingVertical: 6 }}>
        {ativos.length === 0 && (
          <Text style={[styles.sub, { fontStyle: 'italic', padding: 8 }]}>Nenhum paciente ativo no momento.</Text>
        )}
        {ativos.map((p: any, i) => {
          const adhRaw = adhOf(p);
          const adh = adhRaw !== null ? Math.round(adhRaw * 100) : null;
          const risky = p.risk || (adhRaw !== null && adhRaw < 0.5);
          const wk = p.week ? `Semana ${p.week}` : (p.phase || 'RenovaCorps');
          return (
            <Pressable
              key={p.id}
              onPress={() => nav.navigate('PatientDetail', { id: p.id, name: p.full_name })}
              style={[styles.agItem, i < ativos.length - 1 && styles.agDivider]}
            >
              <View style={[styles.avatarSm, { borderColor: risky ? colors.danger : colors.gold }]}>
                <Text style={[styles.avatarSmTxt, { color: risky ? colors.danger : colors.gold }]}>{initials(p.full_name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.patient}>
                  {p.full_name} {risky ? '⚠️' : ''}
                </Text>
                <Text style={styles.sub}>{wk}</Text>
              </View>
              {adh !== null ? (
                <Text style={[styles.adh, { color: adherenceColor(adhRaw as number) }]}>{adh}%</Text>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              )}
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  eyebrow: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.gold, letterSpacing: 2, textTransform: 'uppercase' },
  h1: { fontFamily: fonts.serifBold, fontSize: 24, color: colors.textPrimary, marginTop: 2 },
  h1sub: { ...type.small, color: colors.textSecondary, marginTop: 1 },
  countChip: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  countChipTxt: { fontFamily: fonts.sansSemibold, fontSize: 12, color: colors.textSecondary },

  lensRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  lens: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  lensOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  lensTxt: { fontFamily: fonts.sansSemibold, fontSize: 13 },

  kpiRow: { flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 4 },
  kpiCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  kpi: { fontFamily: fonts.serifBold, fontSize: 30, color: colors.textPrimary },
  kpiLabel: { ...type.small, color: colors.textSecondary, marginTop: 2 },

  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secCount: { ...type.small, color: colors.textMuted },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  agItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 6 },
  agDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  time: { fontFamily: fonts.sansSemibold, fontSize: 15, color: colors.gold, width: 46 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  patient: { ...type.cardTitle, color: colors.textPrimary },
  sub: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  nowTag: { backgroundColor: colors.gold + '22', borderWidth: 1, borderColor: colors.gold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  nowTagTxt: { fontFamily: fonts.sansSemibold, fontSize: 11, color: colors.gold },

  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: colors.gold, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontFamily: fonts.serifBold, fontSize: 15, color: colors.gold },
  avatarSm: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  avatarSmTxt: { fontFamily: fonts.serifBold, fontSize: 14 },
  adh: { fontFamily: fonts.sansSemibold, fontSize: 15 },

  liberarBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.gold, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  liberarTxt: { fontFamily: fonts.sansSemibold, fontSize: 13, color: colors.textOnGold },
  nutriIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  importIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
});
