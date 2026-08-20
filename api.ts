/**
 * Camada de dados VITALITY.
 * Cada função recebe o contexto { demo, patientId } e:
 *  - em modo demonstração (ou Supabase não configurado) → retorna dados de exemplo;
 *  - caso contrário → consulta/grava no Supabase (protegido por RLS).
 */
import { supabase, supabaseConfigured } from './supabase';
import {
  Appointment,
  AppointmentType,
  Meal,
  Message,
  Profile,
  Role,
  WeightMeasure,
  Workout,
} from './types';
import * as mock from './mock';

export interface Ctx {
  demo: boolean;
  patientId: string | null;
}

const isReal = (ctx: Ctx) => supabaseConfigured && !ctx.demo && !!ctx.patientId && ctx.patientId !== 'demo';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

// ------------------------- ÁGUA -------------------------
export async function getWaterToday(ctx: Ctx, patientId?: string): Promise<number> {
  const pid = patientId ?? ctx.patientId;
  if (!supabaseConfigured || ctx.demo || !pid || pid === 'demo') return mock.dailyGoals.water.current;
  const { data } = await supabase
    .from('water_logs')
    .select('amount_ml')
    .eq('patient_id', pid)
    .gte('logged_at', startOfToday());
  return (data ?? []).reduce((s, r: any) => s + r.amount_ml, 0);
}

export async function addWater(ctx: Ctx, amount_ml: number): Promise<void> {
  if (!isReal(ctx)) return;
  await supabase.from('water_logs').insert({ patient_id: ctx.patientId, amount_ml });
}

// ------------------------- REFEIÇÕES -------------------------
export async function getMealsToday(ctx: Ctx, patientId?: string): Promise<Meal[]> {
  const pid = patientId ?? ctx.patientId;
  if (!supabaseConfigured || ctx.demo || !pid || pid === 'demo') return mock.meals;
  const { data } = await supabase
    .from('meals')
    .select('*')
    .eq('patient_id', pid)
    .gte('logged_at', startOfToday())
    .order('logged_at', { ascending: true });
  return (data as Meal[]) ?? [];
}

export async function addMeal(ctx: Ctx, meal: Omit<Meal, 'id' | 'logged_at'>): Promise<void> {
  if (!isReal(ctx)) return;
  await supabase.from('meals').insert({ patient_id: ctx.patientId, ...meal });
}

// ------------------------- PESO -------------------------
export async function getWeightHistory(ctx: Ctx, patientId?: string): Promise<WeightMeasure[]> {
  const pid = patientId ?? ctx.patientId;
  if (!supabaseConfigured || ctx.demo || !pid || pid === 'demo') {
    return mock.weightTrend.history.map((w, i) => ({
      id: String(i),
      weight_kg: w,
      measured_at: new Date().toISOString(),
    }));
  }
  const { data } = await supabase
    .from('weight_measures')
    .select('*')
    .eq('patient_id', pid)
    .order('measured_at', { ascending: true });
  return (data as WeightMeasure[]) ?? [];
}

export async function addWeight(ctx: Ctx, weight_kg: number): Promise<void> {
  if (!isReal(ctx)) return;
  await supabase.from('weight_measures').insert({ patient_id: ctx.patientId, weight_kg });
}

// ------------------------- AGENDA -------------------------
export async function getAppointments(ctx: Ctx): Promise<Appointment[]> {
  if (!isReal(ctx)) return [...mock.appointments, ...mock.pastAppointments];
  const { data } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', ctx.patientId)
    .order('starts_at', { ascending: true });
  return (data as Appointment[]) ?? [];
}

export async function addAppointment(
  ctx: Ctx,
  input: { type: AppointmentType; starts_at: string; duration_min: number; notes?: string; patient_id?: string }
): Promise<{ error?: string }> {
  if (!isReal(ctx) && !(supabaseConfigured && input.patient_id)) return {};
  const patient_id = input.patient_id ?? ctx.patientId;
  const { error } = await supabase.from('appointments').insert({
    patient_id,
    type: input.type,
    starts_at: input.starts_at,
    duration_min: input.duration_min,
    notes: input.notes,
    status: 'agendado',
  });
  return { error: error?.message };
}

// ------------------------- CHAT -------------------------
export async function getMessages(ctx: Ctx, patientId?: string): Promise<Message[]> {
  const pid = patientId ?? ctx.patientId;
  if (!supabaseConfigured || ctx.demo || pid === 'demo') return mock.chatMessages;
  const { data } = await supabase
    .from('messages')
    .select('id, sender_role, body, created_at, profiles:sender_id(full_name)')
    .eq('patient_id', pid)
    .order('created_at', { ascending: true });
  return (data ?? []).map((m: any) => ({
    id: m.id,
    sender_role: m.sender_role,
    sender_name: m.profiles?.full_name ?? 'Equipe',
    body: m.body,
    created_at: m.created_at,
  }));
}

export async function sendMessage(
  ctx: Ctx,
  body: string,
  role: Role,
  patientId?: string
): Promise<void> {
  const pid = patientId ?? ctx.patientId;
  if (!supabaseConfigured || ctx.demo || !pid || pid === 'demo') return;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from('messages').insert({
    patient_id: pid,
    sender_id: u.user.id,
    sender_role: role,
    body,
  });
}

// ------------------------- FOTOS DE EVOLUÇÃO -------------------------
export async function addPhoto(ctx: Ctx, path: string, pose?: string): Promise<void> {
  if (!isReal(ctx)) return;
  await supabase.from('photos').insert({ patient_id: ctx.patientId, url: path, pose });
}

export async function getPhotos(ctx: Ctx): Promise<{ id: string; url: string; taken_at: string }[]> {
  if (!isReal(ctx)) return [];
  const { data } = await supabase
    .from('photos')
    .select('id, url, taken_at')
    .eq('patient_id', ctx.patientId)
    .order('taken_at', { ascending: true });
  return (data as any) ?? [];
}

// ------------------------- TREINO -------------------------
export async function getWorkoutToday(ctx: Ctx): Promise<Workout> {
  if (!isReal(ctx)) return mock.todayWorkout;
  const dow = new Date().getDay();
  const { data } = await supabase
    .from('workouts')
    .select('*')
    .eq('patient_id', ctx.patientId)
    .eq('day_of_week', dow)
    .maybeSingle();
  return (data as Workout) ?? { ...mock.todayWorkout, items: [] };
}

// ------------------------- BIOIMPEDÂNCIA (BIA) -------------------------
export async function getBioSeries(ctx: Ctx, patientId?: string): Promise<any[]> {
  const pid = patientId ?? ctx.patientId;
  if (!supabaseConfigured || ctx.demo || !pid || pid === 'demo') return mock.bioSeries;
  const { data } = await supabase
    .from('bioimpedance')
    .select('*')
    .eq('patient_id', pid)
    .order('measured_at', { ascending: true });
  return data ?? [];
}

export async function addBioimpedance(ctx: Ctx, patientId: string, input: Record<string, any>): Promise<{ error?: string }> {
  if (!supabaseConfigured || ctx.demo) return {};
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('bioimpedance').insert({ patient_id: patientId, created_by: u.user?.id, ...input });
  return { error: error?.message };
}

// ------------------------- CARDIOLOGIA -------------------------
export async function getCardioReports(ctx: Ctx, patientId?: string): Promise<any[]> {
  const pid = patientId ?? ctx.patientId;
  if (!supabaseConfigured || ctx.demo || !pid || pid === 'demo') return [mock.cardioReportDemo];
  const { data } = await supabase
    .from('cardio_reports')
    .select('*')
    .eq('patient_id', pid)
    .order('report_date', { ascending: false });
  return data ?? [];
}

export async function saveCardioReport(ctx: Ctx, patientId: string, input: Record<string, any>): Promise<{ error?: string }> {
  if (!supabaseConfigured || ctx.demo) return {};
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('cardio_reports').insert({ patient_id: patientId, created_by: u.user?.id, ...input });
  return { error: error?.message };
}

// ------------------------- EXAMES DE ROTINA (LAB) -------------------------
export async function getLabResults(ctx: Ctx, patientId?: string): Promise<any[]> {
  const pid = patientId ?? ctx.patientId;
  if (!supabaseConfigured || ctx.demo || !pid || pid === 'demo') return mock.labResultsDemo;
  const { data } = await supabase
    .from('lab_results')
    .select('*')
    .eq('patient_id', pid)
    .order('measured_at', { ascending: true });
  // agrupa por analito com série temporal
  const byAnalyte: Record<string, any> = {};
  for (const r of data ?? []) {
    const key = r.analyte;
    if (!byAnalyte[key]) byAnalyte[key] = { id: key, analyte: r.analyte, category: r.category, unit: r.unit, ref_low: r.ref_low, ref_high: r.ref_high, series: [] };
    byAnalyte[key].series.push({ date: new Date(r.measured_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: Number(r.value) });
  }
  return Object.values(byAnalyte);
}

export async function addLabResult(ctx: Ctx, patientId: string, input: Record<string, any>): Promise<{ error?: string }> {
  if (!supabaseConfigured || ctx.demo) return {};
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('lab_results').insert({ patient_id: patientId, created_by: u.user?.id, ...input });
  return { error: error?.message };
}

// ------------------------- FOTOS DE REFEIÇÕES -------------------------
export async function getMealPhotos(ctx: Ctx): Promise<{ id: string; title: string; path: string; logged_at: string }[]> {
  if (!isReal(ctx)) return [];
  const { data } = await supabase
    .from('meals')
    .select('id, title, photo_url, logged_at')
    .eq('patient_id', ctx.patientId)
    .not('photo_url', 'is', null)
    .order('logged_at', { ascending: false });
  return (data ?? []).map((m: any) => ({ id: m.id, title: m.title, path: m.photo_url, logged_at: m.logged_at }));
}

// ------------------------- PERFIL / AVATAR -------------------------
export async function updateMyProfile(ctx: Ctx, patch: { full_name?: string; avatar_url?: string; phone?: string }): Promise<{ error?: string }> {
  if (!isReal(ctx)) return {};
  const { error } = await supabase.from('profiles').update(patch).eq('id', ctx.patientId);
  return { error: error?.message };
}

// ------------------------- COMUNIDADE (rede social interna) -------------------------
export interface CommunityPost {
  id: string;
  body: string;
  photo_url: string | null;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  author_role: string | null;
  created_at: string;
  likes: number;
  liked: boolean;
}

export async function getPosts(ctx: Ctx): Promise<CommunityPost[]> {
  if (!isReal(ctx)) return [];
  const { data: posts } = await supabase
    .from('community_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (!posts) return [];
  const ids = posts.map((p: any) => p.id);
  const { data: likes } = await supabase.from('post_likes').select('post_id, user_id').in('post_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  const counts: Record<string, number> = {};
  const mine: Record<string, boolean> = {};
  for (const l of likes ?? []) {
    counts[l.post_id] = (counts[l.post_id] || 0) + 1;
    if (l.user_id === ctx.patientId) mine[l.post_id] = true;
  }
  return posts.map((p: any) => ({
    id: p.id, body: p.body, photo_url: p.photo_url,
    author_id: p.author_id, author_name: p.author_name || 'Paciente', author_avatar: p.author_avatar, author_role: p.author_role,
    created_at: p.created_at, likes: counts[p.id] || 0, liked: !!mine[p.id],
  }));
}

export async function createPost(ctx: Ctx, input: { body: string; photo_url?: string | null; author_name: string; author_avatar?: string | null; author_role?: string }): Promise<{ error?: string }> {
  if (!isReal(ctx)) return { error: 'Disponível apenas em conta real.' };
  const { error } = await supabase.from('community_posts').insert({
    author_id: ctx.patientId,
    body: input.body,
    photo_url: input.photo_url ?? null,
    author_name: input.author_name,
    author_avatar: input.author_avatar ?? null,
    author_role: input.author_role ?? null,
  });
  return { error: error?.message };
}

export async function toggleLike(ctx: Ctx, postId: string, liked: boolean): Promise<void> {
  if (!isReal(ctx)) return;
  if (liked) {
    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', ctx.patientId);
  } else {
    await supabase.from('post_likes').insert({ post_id: postId, user_id: ctx.patientId });
  }
}

export async function deletePost(ctx: Ctx, postId: string): Promise<void> {
  if (!isReal(ctx)) return;
  await supabase.from('community_posts').delete().eq('id', postId);
}

// ------------------------- LÍDER: LIBERAR PACIENTE -------------------------
export async function setPatientActive(ctx: Ctx, patientId: string, active: boolean): Promise<{ error?: string }> {
  if (!supabaseConfigured || ctx.demo) return {};
  const { error } = await supabase.from('profiles').update({ active }).eq('id', patientId);
  return { error: error?.message };
}

// ------------------------- LÍDER: CRIAR CONTA DE PACIENTE -------------------------
export async function createPatientAccount(email: string, full_name: string): Promise<{ email?: string; password?: string; error?: string }> {
  if (!supabaseConfigured) return { error: 'Supabase não configurado.' };
  const { data, error } = await supabase.functions.invoke('create-patient', { body: { email, full_name } });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch {}
    return { error: msg };
  }
  if ((data as any)?.error) return { error: (data as any).error };
  return { email: (data as any).email, password: (data as any).password };
}

// ------------------------- TROCAR SENHA (usuário logado) -------------------------
export async function changePassword(newPassword: string): Promise<{ error?: string }> {
  if (!supabaseConfigured) return {};
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error?.message };
}

// ------------------------- CHAMAR ATENÇÃO (campainha) -------------------------
export async function sendNudge(ctx: Ctx, patientId: string, fromName: string, body?: string): Promise<{ error?: string }> {
  if (!supabaseConfigured || ctx.demo) return {};
  const { error } = await supabase.from('nudges').insert({ patient_id: patientId, from_name: fromName, body: body || 'Sua equipe está chamando sua atenção 🔔' });
  return { error: error?.message };
}

// ------------------------- PACIENTE: MEU PROGRAMA -------------------------
export async function getMyProgram(ctx: Ctx): Promise<{ program?: string; phase?: string; week?: number } | null> {
  if (!isReal(ctx)) return null;
  const { data } = await supabase
    .from('patients')
    .select('program, phase, week')
    .eq('id', ctx.patientId)
    .maybeSingle();
  return (data as any) ?? null;
}

// ------------------------- EQUIPE: PACIENTES -------------------------
export interface PatientRow extends Profile {
  program?: string;
  phase?: string;
  week?: number;
  active?: boolean;
}

export async function listPatients(ctx: Ctx): Promise<PatientRow[]> {
  if (!supabaseConfigured || ctx.demo) return mock.teamPatients;
  // Duas consultas simples (evita ambiguidade de "join" embutido no PostgREST)
  const { data: profs, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url, active')
    .eq('role', 'paciente')
    .order('full_name');
  if (error || !profs) return [];
  const ids = profs.map((p: any) => p.id);
  const { data: pts } = await supabase
    .from('patients')
    .select('id, program, phase, week')
    .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  const byId: Record<string, any> = {};
  for (const pt of pts ?? []) byId[pt.id] = pt;
  return profs.map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    role: p.role,
    avatar_url: p.avatar_url,
    active: !!p.active,
    program: byId[p.id]?.program,
    phase: byId[p.id]?.phase,
    week: byId[p.id]?.week,
  }));
}

// ------------------------- EQUIPE: AGENDA + ADESÃO -------------------------
const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};
const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export interface TeamAgendaItem {
  id: string;
  time: string;
  patient: string;
  type: AppointmentType;
}

/** Agenda de HOJE de toda a equipe (todos os pacientes). */
export async function getTeamAgendaToday(ctx: Ctx): Promise<TeamAgendaItem[]> {
  if (!supabaseConfigured || ctx.demo) return mock.teamAgendaToday as any;
  // Janela ampla (à prova de fuso horário); o filtro de "hoje" é feito abaixo
  // comparando a data local do compromisso com a data local de agora.
  const lo = new Date(Date.now() - 18 * 3600 * 1000).toISOString();
  const hi = new Date(Date.now() + 30 * 3600 * 1000).toISOString();
  const { data: appts } = await supabase
    .from('appointments')
    .select('id, starts_at, type, patient_id, status')
    .gte('starts_at', lo)
    .lte('starts_at', hi)
    .order('starts_at', { ascending: true });
  if (!appts || appts.length === 0) return [];
  const todayStr = new Date().toDateString();
  const hoje = appts.filter(
    (a: any) => a.status !== 'cancelado' && new Date(a.starts_at).toDateString() === todayStr
  );
  if (hoje.length === 0) return [];
  const ids = Array.from(new Set(hoje.map((a: any) => a.patient_id)));
  const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
  const nameById: Record<string, string> = {};
  for (const p of profs ?? []) nameById[(p as any).id] = (p as any).full_name;
  return hoje.map((a: any) => ({
    id: a.id,
    time: new Date(a.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    patient: nameById[a.patient_id] ?? 'Paciente',
    type: a.type,
  }));
}

/**
 * Adesão automática (0..1) por paciente: fração dos últimos 7 dias com
 * algum registro do próprio paciente (água ou refeição).
 */
export async function getTeamAdherence(ctx: Ctx, patientIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (!supabaseConfigured || ctx.demo || patientIds.length === 0) return out;
  const since = daysAgoISO(6); // hoje + 6 dias anteriores = 7 dias
  const days: Record<string, Set<string>> = {};
  for (const id of patientIds) days[id] = new Set();
  const collect = (rows: any[] | null) => {
    for (const r of rows ?? []) {
      if (!days[r.patient_id]) continue;
      days[r.patient_id].add(String(r.logged_at).slice(0, 10));
    }
  };
  const [w, m] = await Promise.all([
    supabase.from('water_logs').select('patient_id, logged_at').in('patient_id', patientIds).gte('logged_at', since),
    supabase.from('meals').select('patient_id, logged_at').in('patient_id', patientIds).gte('logged_at', since),
  ]);
  collect(w.data as any);
  collect(m.data as any);
  for (const id of patientIds) out[id] = Math.min(1, days[id].size / 7);
  return out;
}

// ------------------------- EQUIPE: LEITURA POR PACIENTE -------------------------
export async function getPrescriptions(ctx: Ctx, patientId: string): Promise<any[]> {
  if (!supabaseConfigured || ctx.demo || !patientId || patientId === 'demo') return [];
  const { data } = await supabase
    .from('prescriptions')
    .select('active_ingredient, dose, schedule, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getExams(ctx: Ctx, patientId: string): Promise<any[]> {
  if (!supabaseConfigured || ctx.demo || !patientId || patientId === 'demo') return [];
  const { data } = await supabase
    .from('exams')
    .select('title, result, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getPsychSeries(ctx: Ctx, patientId: string): Promise<any[]> {
  if (!supabaseConfigured || ctx.demo || !patientId || patientId === 'demo') return [];
  const { data } = await supabase
    .from('psych_assessments')
    .select('mood, anxiety_score, binge_score, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true });
  return data ?? [];
}

// ------------------------- EQUIPE: AÇÕES CLÍNICAS -------------------------
export async function addPrescription(
  ctx: Ctx,
  patientId: string,
  input: { active_ingredient: string; dose?: string; schedule?: string; notes?: string }
): Promise<{ error?: string }> {
  if (!supabaseConfigured || ctx.demo) return {};
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('prescriptions').insert({
    patient_id: patientId,
    prescribed_by: u.user?.id,
    ...input,
  });
  return { error: error?.message };
}

export async function addExam(
  ctx: Ctx,
  patientId: string,
  input: { title: string; result?: string; file_url?: string }
): Promise<{ error?: string }> {
  if (!supabaseConfigured || ctx.demo) return {};
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('exams').insert({
    patient_id: patientId,
    created_by: u.user?.id,
    ...input,
  });
  return { error: error?.message };
}

export async function addPsychAssessment(
  ctx: Ctx,
  patientId: string,
  input: { mood: number; anxiety_score?: number; binge_score?: number; notes?: string }
): Promise<{ error?: string }> {
  if (!supabaseConfigured || ctx.demo) return {};
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('psych_assessments').insert({
    patient_id: patientId,
    created_by: u.user?.id,
    ...input,
  });
  return { error: error?.message };
}

export async function addBodyMeasure(
  ctx: Ctx,
  patientId: string,
  input: { waist_cm?: number; hip_cm?: number; body_fat_pct?: number; lean_mass_kg?: number }
): Promise<{ error?: string }> {
  if (!supabaseConfigured || ctx.demo) return {};
  const { error } = await supabase.from('body_measures').insert({ patient_id: patientId, ...input });
  return { error: error?.message };
}

export async function saveWorkout(
  ctx: Ctx,
  patientId: string,
  input: { title: string; day_of_week: number; items: any[] }
): Promise<{ error?: string }> {
  if (!supabaseConfigured || ctx.demo) return {};
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('workouts').insert({
    patient_id: patientId,
    created_by: u.user?.id,
    ...input,
  });
  return { error: error?.message };
}
