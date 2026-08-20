import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { notify } from './notify';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, Card, SectionLabel, GoldButton, StatTile } from './ui';
import { LineChart } from './LineChart';
import { colors } from './colors';
import { fonts, type } from './typography';
import { useAuth } from './AuthContext';
import { roleMeta, appointmentMeta } from './helpers';
import { AppointmentType } from './types';
import * as api from './api';
import { pickAndUpload, pickAndUploadPdf } from './storage';
import { TeamStackParams } from './TeamNavigator';

function NumGrid({ fields, values, set }: { fields: [string, string][]; values: Record<string, string>; set: (k: string, v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {fields.map(([k, ph]) => (
        <TextInput key={k} style={styles.numInput} placeholder={ph} placeholderTextColor={colors.textMuted} keyboardType={k === 'unit' ? 'default' : 'numeric'} value={values[k] || ''} onChangeText={(t) => set(k, t)} />
      ))}
    </View>
  );
}

type Props = NativeStackScreenProps<TeamStackParams, 'PatientDetail'>;

function Field({ label, value, onChange, placeholder, keyboard }: { label: string; value: string; onChange: (t: string) => void; placeholder?: string; keyboard?: 'numeric' | 'default' }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboard === 'numeric' ? 'numeric' : 'default'}
      />
    </View>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <Card style={{ marginBottom: 8 }}>
      <Text style={[styles.sub, { fontStyle: 'italic' }]}>{text}</Text>
    </Card>
  );
}

export function PatientDetailScreen({ route, navigation }: Props) {
  const { id, name } = route.params;
  const { demo, userId, role, displayName, teamLens } = useAuth();
  const ctx = { demo, patientId: userId };
  const isLeader = role === 'lider';
  // Cada profissional manipula apenas a sua área. O líder escolhe a área pela
  // aba de função (teamLens); em "Todos" vê todas.
  const canArea = (area: 'medico' | 'nutricionista' | 'psicologa' | 'educador_fisico') =>
    role === area || (isLeader && (teamLens === 'all' || teamLens === area));

  async function chamarAtencao() {
    const { error } = await api.sendNudge(ctx, id, displayName);
    if (error) return notify('Erro', error);
    notify('Campainha enviada 🔔', `${name} vai receber um alerta sonoro no app.`);
  }

  const [bio, setBio] = useState<any | null>(null);
  const [weights, setWeights] = useState<any[]>([]);
  const [water, setWater] = useState(0);
  const [meals, setMeals] = useState<any[]>([]);
  const [active, setActive] = useState<boolean | null>(null);

  useEffect(() => {
    api.getBioSeries(ctx, id).then((s) => setBio(s.length ? s[s.length - 1] : null)).catch(() => {});
    api.getWeightHistory(ctx, id).then(setWeights).catch(() => {});
    api.getWaterToday(ctx, id).then(setWater).catch(() => {});
    api.getMealsToday(ctx, id).then(setMeals).catch(() => {});
    api.listPatients(ctx).then((ps) => { const p = ps.find((x) => x.id === id); if (p) setActive(!!p.active); }).catch(() => {});
  }, [id]);

  async function toggleAtivo() {
    const novo = !active;
    setActive(novo);
    const { error } = await api.setPatientActive(ctx, id, novo);
    if (error) { notify('Erro', error); setActive(!novo); }
    else notify(novo ? 'Paciente liberado ✓' : 'Acesso pausado', '');
  }

  const val = (v: any) => (v == null ? '—' : String(v));
  const weightCurve = weights.map((w, i) => ({ label: `#${i + 1}`, value: Number(w.weight_kg) })).filter((p) => !isNaN(p.value));
  const kcalHoje = meals.reduce((s, m) => s + (m.calories || 0), 0);

  return (
    <Screen>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={colors.gold} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.sub}>RenovaCorps · você atua como {roleMeta[role].label}</Text>
        </View>
        <Pressable onPress={chamarAtencao} style={styles.bellBtn}>
          <Ionicons name="notifications" size={18} color={colors.textOnGold} />
          <Text style={styles.bellText}>Chamar</Text>
        </Pressable>
      </View>

      {isLeader && active !== null && (
        <Pressable onPress={toggleAtivo} style={[styles.gate, active ? styles.gateOn : styles.gateOff]}>
          <Ionicons name={active ? 'checkmark-circle' : 'hourglass'} size={18} color={active ? colors.success : colors.gold} />
          <Text style={[styles.gateText, { color: active ? colors.success : colors.gold }]}>
            {active ? 'Acesso liberado — toque para pausar' : 'Aguardando liberação — toque para liberar'}
          </Text>
        </Pressable>
      )}

      <ScheduleBox ctx={ctx} patientId={id} name={name} />

      <SectionLabel>Registros do paciente</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatTile label="Água hoje" value={(water / 1000).toFixed(1)} unit="L" />
        <StatTile label="Calorias hoje" value={String(kcalHoje)} unit="kcal" />
        <StatTile label="Refeições" value={String(meals.length)} unit="hoje" />
      </View>
      <View style={{ marginTop: 12 }}>
        <Text style={styles.miniLabel}>Curva de peso</Text>
        {weightCurve.length > 0 ? (
          <Card><LineChart data={weightCurve} unit="kg" color={colors.blueAccent} /></Card>
        ) : (
          <Card><Text style={styles.sub}>Sem medições de peso ainda.</Text></Card>
        )}
      </View>

      <SectionLabel>Composição corporal (última avaliação)</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatTile label="Peso" value={val(bio?.weight_kg)} unit="kg" />
        <StatTile label="% Gordura" value={val(bio?.body_fat_pct)} unit="%" />
        <StatTile label="Cintura" value={val(bio?.waist_cm)} unit="cm" />
      </View>
      {!bio && <Text style={[styles.sub, { marginTop: 8 }]}>Sem bioimpedância registrada ainda — registre na área do Educador Físico.</Text>}

      <ChatBox ctx={ctx} patientId={id} role={role} />

      {canArea('medico') && <MedicoArea ctx={ctx} patientId={id} />}
      {canArea('nutricionista') && <NutriArea ctx={ctx} patientId={id} />}
      {canArea('psicologa') && <PsicoArea ctx={ctx} patientId={id} />}
      {canArea('educador_fisico') && <EducadorArea ctx={ctx} patientId={id} />}
    </Screen>
  );
}

// ---------------------------- CHAT COM O PACIENTE ----------------------------
function ChatBox({ ctx, patientId, role }: { ctx: api.Ctx; patientId: string; role: any }) {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState('');
  function load() { api.getMessages(ctx, patientId).then(setMsgs).catch(() => {}); }
  useEffect(() => { load(); }, [patientId]);
  async function enviar() {
    if (!text.trim()) return;
    const body = text.trim();
    setText('');
    await api.sendMessage(ctx, body, role, patientId).catch(() => {});
    load();
  }
  return (
    <>
      <SectionLabel>Conversa com o paciente</SectionLabel>
      <Card>
        {msgs.length === 0 && <Text style={styles.sub}>Nenhuma mensagem ainda. Envie a primeira.</Text>}
        {msgs.slice(-6).map((m) => {
          const meu = m.sender_role !== 'paciente';
          return (
            <View key={m.id} style={[styles.msg, meu ? styles.msgMine : styles.msgTheirs]}>
              <Text style={styles.msgFrom}>{meu ? (m.sender_name || 'Equipe') : 'Paciente'}</Text>
              <Text style={styles.msgBody}>{m.body}</Text>
            </View>
          );
        })}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Escreva uma mensagem…" placeholderTextColor={colors.textMuted} value={text} onChangeText={setText} />
          <Pressable onPress={enviar} style={styles.sendBtn}><Ionicons name="send" size={18} color={colors.textOnGold} /></Pressable>
        </View>
      </Card>
    </>
  );
}

// ---------------------------- AGENDAR ATENDIMENTO ----------------------------
const APPT_TYPES: AppointmentType[] = ['consulta', 'aplicacao', 'nutricao', 'psicologia', 'avaliacao_fisica', 'coleta'];

function ScheduleBox({ ctx, patientId, name }: { ctx: api.Ctx; patientId: string; name: string }) {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const defaultDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const [type, setType] = useState<AppointmentType>('consulta');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('09:00');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  async function agendar() {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
    const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    if (!m || !t) return notify('Data ou hora inválida', 'Use os formatos AAAA-MM-DD e HH:MM.');
    const starts = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(t[1]), Number(t[2]), 0, 0);
    if (isNaN(starts.getTime())) return notify('Data inválida', 'Verifique o dia informado.');
    setBusy(true);
    const { error } = await api.addAppointment(ctx, { type, starts_at: starts.toISOString(), duration_min: 30, patient_id: patientId });
    setBusy(false);
    if (error) return notify('Erro ao agendar', error);
    // Confirmação inline (sem alerta bloqueante na web)
    setOk(true);
    setTimeout(() => setOk(false), 3000);
  }

  return (
    <>
      <SectionLabel>Agendar atendimento</SectionLabel>
      <Card>
        <Text style={styles.fieldLabel}>Tipo</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {APPT_TYPES.map((tp) => {
            const on = type === tp;
            return (
              <Pressable key={tp} onPress={() => setType(tp)} style={[styles.apptChip, on && { backgroundColor: colors.navy, borderColor: colors.navy }]}>
                <View style={[styles.apptDot, { backgroundColor: appointmentMeta[tp].color }]} />
                <Text style={[styles.apptChipTxt, { color: on ? '#fff' : colors.textSecondary }]}>{appointmentMeta[tp].label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1.4 }}>
            <Text style={styles.fieldLabel}>Data</Text>
            <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Hora</Text>
            <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="HH:MM" placeholderTextColor={colors.textMuted} keyboardType="numbers-and-punctuation" />
          </View>
        </View>
        <GoldButton label={busy ? 'Agendando…' : ok ? 'Agendado ✓' : 'Agendar'} onPress={agendar} style={{ marginTop: 14 }} />
      </Card>
    </>
  );
}

// ------------------------------- MÉDICO -------------------------------
function MedicoArea({ ctx, patientId }: { ctx: api.Ctx; patientId: string }) {
  const [ing, setIng] = useState('');
  const [dose, setDose] = useState('');
  const [sched, setSched] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [examResult, setExamResult] = useState('');
  const [examPath, setExamPath] = useState<string | null>(null);
  const [prescricoes, setPrescricoes] = useState<any[]>([]);
  const [examesList, setExamesList] = useState<any[]>([]);
  // Cardiologia
  const [cardio, setCardio] = useState({ consult_summary: '', ecg_description: '', other_exams: '', risk_notes: '' });
  const [cardioImg, setCardioImg] = useState<string | null>(null);
  // Exame de rotina (lab)
  const [lab, setLab] = useState<Record<string, string>>({ analyte: '', value: '', unit: '', ref_low: '', ref_high: '', category: 'Rotina' });

  function recarregar() {
    api.getPrescriptions(ctx, patientId).then(setPrescricoes).catch(() => {});
    api.getExams(ctx, patientId).then(setExamesList).catch(() => {});
  }
  useEffect(() => { recarregar(); }, [patientId]);

  async function anexarCardio() {
    const r = await pickAndUpload('cardio', patientId, ctx.demo);
    if (r.error) return notify('Imagem', r.error);
    if (r.path) { setCardioImg(r.path); notify('Imagem anexada ✓', ''); }
  }
  async function salvarCardio() {
    if (!cardio.consult_summary && !cardio.ecg_description) return notify('Cardio', 'Preencha ao menos o resumo ou o ECG.');
    const { error } = await api.saveCardioReport(ctx, patientId, { ...cardio, images: cardioImg ? [cardioImg] : [] });
    if (error) return notify('Erro', error);
    setCardio({ consult_summary: '', ecg_description: '', other_exams: '', risk_notes: '' }); setCardioImg(null);
    notify('Registro cardiológico salvo ✓', 'Aparece na aba Saúde › Cardio do paciente.');
  }
  async function salvarLab() {
    if (!lab.analyte.trim()) return notify('Exame', 'Informe o nome do exame.');
    const { error } = await api.addLabResult(ctx, patientId, {
      analyte: lab.analyte.trim(), category: lab.category || 'Rotina', unit: lab.unit,
      value: lab.value ? Number(lab.value) : null, ref_low: lab.ref_low ? Number(lab.ref_low) : null, ref_high: lab.ref_high ? Number(lab.ref_high) : null,
    });
    if (error) return notify('Erro', error);
    setLab({ analyte: '', value: '', unit: '', ref_low: '', ref_high: '', category: 'Rotina' });
    notify('Exame registrado ✓', 'Correlacionado com a faixa de referência na aba Saúde › Exames.');
  }

  async function anexarExame() {
    const r = await pickAndUpload('exams', patientId, ctx.demo);
    if (r.canceled) return;
    if (r.error) return notify('Anexo', r.error);
    if (r.path) { setExamPath(r.path); notify('Anexo pronto ✓', 'Imagem do exame anexada.'); }
  }

  async function prescrever() {
    if (!ing.trim()) return notify('Prescrição', 'Informe o princípio ativo.');
    const { error } = await api.addPrescription(ctx, patientId, { active_ingredient: ing.trim(), dose, schedule: sched });
    if (error) return notify('Erro', error);
    setIng(''); setDose(''); setSched('');
    recarregar();
    notify('Prescrição registrada ✓', 'Sempre por princípio ativo (CFM).');
  }
  async function lancarExame() {
    if (!examTitle.trim()) return notify('Exame', 'Informe o título do exame.');
    const { error } = await api.addExam(ctx, patientId, { title: examTitle.trim(), result: examResult, file_url: examPath ?? undefined });
    if (error) return notify('Erro', error);
    setExamTitle(''); setExamResult(''); setExamPath(null);
    recarregar();
    notify('Exame lançado ✓', '');
  }

  return (
    <>
      <SectionLabel>Prescrições (princípio ativo)</SectionLabel>
      {prescricoes.length === 0 && <EmptyNote text="Nenhuma prescrição registrada para este paciente." />}
      {prescricoes.map((p, i) => (
        <Card key={i} style={{ marginBottom: 8 }}>
          <Text style={styles.itemTitle}>{p.active_ingredient}</Text>
          <Text style={styles.sub}>{[p.dose, p.schedule].filter(Boolean).join(' · ')}</Text>
        </Card>
      ))}
      <Card glow>
        <Field label="Princípio ativo" value={ing} onChange={setIng} placeholder="ex.: semaglutida, tirzepatida" />
        <Field label="Dose" value={dose} onChange={setDose} placeholder="ex.: 0,5 mg" />
        <Field label="Posologia" value={sched} onChange={setSched} placeholder="ex.: 1x/semana (SC)" />
        <GoldButton label="Registrar prescrição" onPress={prescrever} />
        <Text style={styles.cfm}>⚕ Nunca use nome comercial — apenas princípio ativo (CFM).</Text>
      </Card>

      <SectionLabel>Exames e laudos</SectionLabel>
      {examesList.length === 0 && <EmptyNote text="Nenhum exame lançado para este paciente." />}
      {examesList.map((e, i) => (
        <Card key={i} style={{ marginBottom: 8 }}>
          <Text style={styles.itemTitle}>{e.title}</Text>
          {!!e.result && <Text style={styles.sub}>{e.result}</Text>}
        </Card>
      ))}
      <Card glow>
        <Field label="Exame" value={examTitle} onChange={setExamTitle} placeholder="ex.: Hemograma completo" />
        <Field label="Resultado / observação" value={examResult} onChange={setExamResult} placeholder="resumo do laudo" />
        <GoldButton label={examPath ? '✓ Imagem anexada' : '📎 Anexar imagem do exame'} onPress={anexarExame} outline style={{ marginBottom: 10 }} />
        <GoldButton label="Lançar exame" onPress={lancarExame} />
      </Card>

      <SectionLabel>Cardiologia</SectionLabel>
      <Card glow>
        <Field label="Resumo da consulta" value={cardio.consult_summary} onChange={(t) => setCardio({ ...cardio, consult_summary: t })} placeholder="conduta, PA, ausculta…" />
        <Field label="Descrição do ECG" value={cardio.ecg_description} onChange={(t) => setCardio({ ...cardio, ecg_description: t })} placeholder="ritmo, FC, eixo, repolarização…" />
        <Field label="Outros exames" value={cardio.other_exams} onChange={(t) => setCardio({ ...cardio, other_exams: t })} placeholder="eco, teste ergométrico, holter…" />
        <Field label="Risco cardiovascular" value={cardio.risk_notes} onChange={(t) => setCardio({ ...cardio, risk_notes: t })} placeholder="estratificação / observações" />
        <GoldButton label={cardioImg ? '✓ Imagem anexada' : '📎 Anexar imagem (ECG/laudo)'} onPress={anexarCardio} outline style={{ marginBottom: 10 }} />
        <GoldButton label="Salvar registro cardiológico" onPress={salvarCardio} />
      </Card>

      <SectionLabel>Exames de rotina</SectionLabel>
      <Card glow>
        <Field label="Exame" value={lab.analyte} onChange={(t) => setLab({ ...lab, analyte: t })} placeholder="ex.: Glicemia de jejum, LDL, HbA1c" />
        <Text style={styles.fieldLabel}>Valor · unidade · referência (mín/máx)</Text>
        <NumGrid
          fields={[['value', 'valor'], ['unit', 'unid.'], ['ref_low', 'ref min'], ['ref_high', 'ref máx']]}
          values={lab}
          set={(k, v) => setLab({ ...lab, [k]: v })}
        />
        <Field label="Categoria" value={lab.category} onChange={(t) => setLab({ ...lab, category: t })} placeholder="Rotina, Lipídico, Hormonal…" />
        <GoldButton label="Registrar exame" onPress={salvarLab} />
      </Card>
    </>
  );
}

// ---------------------------- NUTRICIONISTA ----------------------------
function NutriArea({ ctx, patientId }: { ctx: api.Ctx; patientId: string }) {
  const [orient, setOrient] = useState('');
  const [agua, setAgua] = useState('2500');
  const [passos, setPassos] = useState('8000');
  const [kcalOverride, setKcalOverride] = useState('');
  const [savingGoals, setSavingGoals] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.getPatientGoals(ctx, patientId).then((g) => {
      setAgua(String(g.water_ml_goal));
      setPassos(String(g.steps_goal));
      setKcalOverride(g.calorie_override ? String(g.calorie_override) : '');
    }).catch(() => {});
  }, [patientId]);

  async function enviar() {
    if (!orient.trim()) return;
    await api.sendMessage(ctx, `Orientação nutricional: ${orient.trim()}`, 'nutricionista', patientId);
    setOrient('');
    notify('Enviado ✓', 'Orientação enviada ao paciente pelo chat.');
  }
  async function salvarMetas() {
    setSavingGoals(true);
    const { error } = await api.savePatientGoals(ctx, patientId, {
      water_ml_goal: Number(agua) || 2500,
      steps_goal: Number(passos) || 8000,
      calorie_override: kcalOverride.trim() ? Number(kcalOverride) : null,
    });
    setSavingGoals(false);
    if (error) return notify('Erro', error);
    notify('Metas salvas ✓', 'As metas do paciente foram atualizadas.');
  }
  async function enviarCardapio() {
    setUploading(true);
    const r = await pickAndUploadPdf(patientId);
    setUploading(false);
    if (r.canceled) return;
    if (r.error || !r.path) return notify('Cardápio', r.error || 'Falha no envio.');
    const { error } = await api.addMealPlan(ctx, { patient_id: patientId, title: r.name || 'Cardápio', pdf_path: r.path });
    if (error) return notify('Erro', error);
    notify('Cardápio enviado ✓', 'Disponível para o paciente na aba Nutrição.');
  }

  return (
    <>
      <SectionLabel>Metas escaláveis do paciente</SectionLabel>
      <Card glow>
        <Text style={styles.fieldLabel}>Água (ml/dia) · Passos/dia</Text>
        <NumGrid
          fields={[['agua', 'água ml'], ['passos', 'passos']]}
          values={{ agua, passos }}
          set={(k, v) => (k === 'agua' ? setAgua(v) : setPassos(v))}
        />
        <Field label="Meta calórica (opcional — vazio = usar TMB da bioimpedância)" value={kcalOverride} onChange={setKcalOverride} placeholder="deixe vazio para usar a bioimpedância" keyboard="numeric" />
        <GoldButton label={savingGoals ? 'Salvando…' : 'Salvar metas'} onPress={salvarMetas} />
      </Card>

      <SectionLabel>Cardápio individual (PDF)</SectionLabel>
      <Card>
        <Text style={[styles.sub, { marginBottom: 10 }]}>Envie um cardápio em PDF exclusivo deste paciente. Ele aparece na aba Nutrição do app.</Text>
        <GoldButton label={uploading ? 'Enviando…' : '📄  Enviar cardápio (PDF)'} outline onPress={enviarCardapio} />
      </Card>

      <SectionLabel>Orientação ao paciente</SectionLabel>
      <Card glow>
        <Field label="Mensagem" value={orient} onChange={setOrient} placeholder="ex.: aumentar proteína no almoço" />
        <GoldButton label="Enviar orientação (chat)" onPress={enviar} />
      </Card>
    </>
  );
}

// ------------------------------ PSICÓLOGA ------------------------------
function PsicoArea({ ctx, patientId }: { ctx: api.Ctx; patientId: string }) {
  const [mood, setMood] = useState(4);
  const [anx, setAnx] = useState('');
  const [binge, setBinge] = useState('');
  const [notes, setNotes] = useState('');
  const [serie, setSerie] = useState<any[]>([]);

  function recarregar() {
    api.getPsychSeries(ctx, patientId).then(setSerie).catch(() => {});
  }
  useEffect(() => { recarregar(); }, [patientId]);

  const moods = serie.map((s) => s.mood).filter((m) => m != null);
  const max = Math.max(1, ...moods);

  async function salvar() {
    const { error } = await api.addPsychAssessment(ctx, patientId, {
      mood,
      anxiety_score: Number(anx) || undefined,
      binge_score: Number(binge) || undefined,
      notes,
    });
    if (error) return notify('Erro', error);
    setNotes(''); setAnx(''); setBinge('');
    recarregar();
    notify('Avaliação registrada ✓', '');
  }
  return (
    <>
      <SectionLabel>Evolução do humor</SectionLabel>
      {moods.length === 0 ? (
        <EmptyNote text="Nenhuma avaliação registrada ainda." />
      ) : (
        <Card>
          <View style={styles.moodChart}>
            {moods.slice(-7).map((m, i) => (
              <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                <View style={[styles.moodBar, { height: 20 + (m / max) * 90, backgroundColor: colors.blueAccent }]} />
                <Text style={styles.moodLabel}>{m}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}
      <SectionLabel>Nova avaliação</SectionLabel>
      <Card glow>
        <Text style={styles.fieldLabel}>Humor (1–5)</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setMood(n)} style={[styles.moodPick, mood === n && styles.moodPickOn]}>
              <Text style={[styles.moodPickText, mood === n && { color: colors.textOnGold }]}>{n}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Escala de ansiedade (0–10)" value={anx} onChange={setAnx} keyboard="numeric" />
        <Field label="Compulsão alimentar (0–10)" value={binge} onChange={setBinge} keyboard="numeric" />
        <Field label="Anotações da sessão" value={notes} onChange={setNotes} placeholder="observações clínicas" />
        <GoldButton label="Registrar avaliação" onPress={salvar} />
      </Card>
    </>
  );
}

// --------------------------- EDUCADOR FÍSICO ---------------------------
function EducadorArea({ ctx, patientId }: { ctx: api.Ctx; patientId: string }) {
  const [wkTitle, setWkTitle] = useState('');
  // BIA completa (padrão TeraScience)
  const [bia, setBia] = useState<Record<string, string>>({});
  const setB = (k: string, v: string) => setBia((p) => ({ ...p, [k]: v }));
  async function salvarBia() {
    const num = (k: string) => (bia[k] ? Number(bia[k]) : null);
    const payload: Record<string, any> = {
      weight_kg: num('weight_kg'), bmi: num('bmi'), body_fat_pct: num('body_fat_pct'), fat_mass_kg: num('fat_mass_kg'),
      lean_mass_kg: num('lean_mass_kg'), muscle_mass_kg: num('muscle_mass_kg'), skeletal_muscle_kg: num('skeletal_muscle_kg'),
      body_water_pct: num('body_water_pct'), visceral_fat: num('visceral_fat'), bmr_kcal: num('bmr_kcal'),
      metabolic_age: num('metabolic_age'), bone_mass_kg: num('bone_mass_kg'), protein_pct: num('protein_pct'), phase_angle: num('phase_angle'),
      waist_cm: num('waist_cm'), hip_cm: num('hip_cm'),
    };
    const filled = Object.values(payload).some((v) => v != null);
    if (!filled) return notify('BIA', 'Preencha ao menos um campo da bioimpedância.');
    const { error } = await api.addBioimpedance(ctx, patientId, payload);
    if (error) return notify('Erro', error);
    setBia({});
    notify('Bioimpedância salva ✓', 'Vira um ponto na curva de evolução (Saúde › Bioimpedância).');
  }

  async function criarTreino() {
    if (!wkTitle.trim()) return notify('Treino', 'Informe o nome do treino.');
    const { error } = await api.saveWorkout(ctx, patientId, {
      title: wkTitle.trim(),
      day_of_week: new Date().getDay(),
      items: [
        { name: 'Agachamento', sets: 3, reps: '12', rest_sec: 60 },
        { name: 'Remada', sets: 3, reps: '12', rest_sec: 60 },
      ],
    });
    if (error) return notify('Erro', error);
    setWkTitle('');
    notify('Treino salvo ✓', 'Aparece no app do paciente na aba Treino.');
  }
  return (
    <>
      <SectionLabel>Bioimpedância (BIA — TeraScience)</SectionLabel>
      <Card glow>
        <Text style={styles.fieldLabel}>Preencha os campos do laudo da BIA</Text>
        <NumGrid
          fields={[
            ['weight_kg', 'Peso kg'], ['bmi', 'IMC'], ['body_fat_pct', '% Gord.'], ['fat_mass_kg', 'Gord. kg'],
            ['lean_mass_kg', 'M. magra'], ['muscle_mass_kg', 'M. muscular'], ['skeletal_muscle_kg', 'M. esquel.'], ['body_water_pct', 'Água %'],
            ['visceral_fat', 'Visceral'], ['bmr_kcal', 'TMB kcal'], ['metabolic_age', 'Idade metab.'], ['bone_mass_kg', 'Óssea kg'],
            ['protein_pct', 'Proteína %'], ['phase_angle', 'Âng. fase'], ['waist_cm', 'Cintura cm'], ['hip_cm', 'Quadril cm'],
          ]}
          values={bia}
          set={setB}
        />
        <GoldButton label="Salvar bioimpedância" onPress={salvarBia} style={{ marginTop: 10 }} />
        <Text style={styles.cfm}>Cada avaliação salva vira um ponto nas curvas de evolução do paciente.</Text>
      </Card>
      <SectionLabel>Montar treino</SectionLabel>
      <Card glow>
        <Field label="Nome do treino" value={wkTitle} onChange={setWkTitle} placeholder="ex.: Full Body — Força A" />
        <GoldButton label="Salvar treino do dia" onPress={criarTreino} outline />
        <Text style={styles.cfm}>Meta de passos e plano semanal refletem no app do paciente.</Text>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  name: { fontFamily: fonts.serifBold, fontSize: 24, color: colors.textPrimary },
  sub: { ...type.small, color: colors.textSecondary },
  fieldLabel: { ...type.caption, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 6 },
  apptChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  apptChipTxt: { fontFamily: fonts.sansSemibold, fontSize: 13 },
  apptDot: { width: 8, height: 8, borderRadius: 4 },
  input: { backgroundColor: colors.surfaceMuted, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.sans, fontSize: 15 },
  numInput: { width: '31%', backgroundColor: colors.surfaceMuted, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: 10, paddingVertical: 10, fontFamily: fonts.sans, fontSize: 13 },
  itemTitle: { ...type.cardTitle, color: colors.textPrimary },
  cfm: { ...type.small, color: colors.gold, marginTop: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  metaVal: { ...type.bodyStrong, color: colors.textPrimary },
  moodChart: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 6 },
  moodBar: { width: 20, borderRadius: 6 },
  moodLabel: { ...type.caption, color: colors.textSecondary, marginTop: 6 },
  moodPick: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  moodPickOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  moodPickText: { fontFamily: fonts.sansSemibold, fontSize: 16, color: colors.textSecondary },
  gate: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  gateOn: { backgroundColor: colors.success + '18', borderColor: colors.success },
  gateOff: { backgroundColor: colors.gold + '18', borderColor: colors.gold },
  gateText: { ...type.small, fontFamily: fonts.sansSemibold, flex: 1 },
  miniLabel: { ...type.caption, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 6 },
  msg: { borderRadius: 12, padding: 10, marginBottom: 8, maxWidth: '86%' },
  msgMine: { backgroundColor: colors.gold + '22', alignSelf: 'flex-end' },
  msgTheirs: { backgroundColor: colors.surfaceMuted, alignSelf: 'flex-start' },
  msgFrom: { ...type.caption, color: colors.gold, marginBottom: 2 },
  msgBody: { ...type.body, color: colors.textPrimary },
  sendBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  bellBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.gold, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  bellText: { ...type.small, fontFamily: fonts.sansSemibold, color: colors.textOnGold },
});
