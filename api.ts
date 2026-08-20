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

export async function addMeal(ctx: Ctx, meal: Record<string, any>): Promise<{ error?: string }> {
  if (!isReal(ctx)) return {};
  const { error } = await supabase.from('meals').insert({ patient_id: ctx.patientId, ...meal });
  return { error: error?.message };
}

/** Dias (YYYY-MM-DD) que possuem refeições registradas — para resgatar histórico. */
export async function getMealDays(ctx: Ctx): Promise<string[]> {
  if (!isReal(ctx)) return [];
  const { data } = await supabase
    .from('meals')
    .select('logged_at')
    .eq('patient_id', ctx.patientId)
    .order('logged_at', { ascending: false })
    .limit(600);
  const set = new Set<string>();
  for (const r of data ?? []) set.add(String((r as any).logged_at).slice(0, 10));
  return Array.from(set);
}

/** Refeições de um dia específico (YYYY-MM-DD, hora local). */
export async function getMealsByDate(ctx: Ctx, dayISO: string): Promise<Meal[]> {
  if (!isReal(ctx)) return [];
  const start = new Date(dayISO + 'T00:00:00');
  const end = new Date(dayISO + 'T23:59:59.999');
  const { data } = await supabase
    .from('meals')
    .select('*')
    .eq('patient_id', ctx.patientId)
    .gte('logged_at', start.toISOString())
    .lte('logged_at', end.toISOString())
    .order('logged_at', { ascending: true });
  return (data as Meal[]) ?? [];
}

/**
 * Meta diária de calorias — importada da bioimpedância (TMB da última medição).
 * A equipe pode sobrescrever em patient_goals.calorie_override. Não é editável pelo paciente.
 */
export async function getCalorieGoal(ctx: Ctx): Promise<{ kcal: number; source: string }> {
  if (!isReal(ctx)) return { kcal: 2000, source: 'padrão' };
  const [{ data: g }, { data: bio }] = await Promise.all([
    supabase.from('patient_goals').select('calorie_override').eq('id', ctx.patientId).maybeSingle(),
    supabase.from('bioimpedance').select('bmr_kcal, measured_at').eq('patient_id', ctx.patientId).order('measured_at', { ascending: false }).limit(1),
  ]);
  const override = (g as any)?.calorie_override;
  if (override && Number(override) > 0) return { kcal: Math.round(Number(override)), source: 'ajuste da equipe' };
  const bmr = bio && bio[0] ? Number((bio[0] as any).bmr_kcal) : 0;
  if (bmr > 0) return { kcal: Math.round(bmr), source: 'bioimpedância (TMB)' };
  return { kcal: 2000, source: 'padrão' };
}

export async function deleteMeal(ctx: Ctx, id: string): Promise<{ error?: string }> {
  if (!isReal(ctx)) return {};
  const { error } = await supabase.from('meals').delete().eq('id', id).eq('patient_id', ctx.patientId);
  return { error: error?.message };
}

export async function clearMealsToday(ctx: Ctx): Promise<{ error?: string }> {
  if (!isReal(ctx)) return {};
  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('patient_id', ctx.patientId)
    .gte('logged_at', startOfToday());
  return { error: error?.message };
}

/** Estimativa de kcal + macros por IA (Edge Function segura). */
export interface CalorieEstimate {
  refeicao: string;
  itens: { nome: string; porcao: string; kcal: number; prot: number; carb: number; gord: number }[];
  total_kcal: number; total_prot: number; total_carb: number; total_gord: number;
  confianca: 'alta' | 'media' | 'baixa';
  observacao: string;
}
export async function estimateCalories(
  ctx: Ctx,
  input: { text?: string; imageBase64?: string; note?: string }
): Promise<{ data?: CalorieEstimate; error?: string }> {
  if (!supabaseConfigured || ctx.demo) return { error: 'Disponível apenas em conta real.' };
  const { data, error } = await supabase.functions.invoke('estimate-calories', { body: input });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch {}
    return { error: msg };
  }
  if ((data as any)?.error) return { error: (data as any).error };
  return { data: data as CalorieEstimate };
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

export async function getPhotos(ctx: Ctx, patientId?: string): Promise<{ id: string; url: string; pose: string | null; taken_at: string }[]> {
  const pid = patientId ?? ctx.patientId;
  if (!supabaseConfigured || ctx.demo || !pid || pid === 'demo') return [];
  const { data } = await supabase
    .from('photos')
    .select('id, url, pose, taken_at')
    .eq('patient_id', pid)
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

// ------------------------- MURAL DA NUTRI (dicas) -------------------------
export interface NutriTip {
  id: string; body: string; media_url: string | null; scope: 'diaria' | 'semanal';
  author_name: string | null; author_role: string | null; created_at: string;
}
export async function getNutriTips(ctx: Ctx): Promise<NutriTip[]> {
  if (!supabaseConfigured || ctx.demo) return (mock as any).nutriTipsDemo ?? [];
  const { data } = await supabase
    .from('nutri_tips')
    .select('id, body, media_url, scope, author_name, author_role, created_at')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(60);
  return (data as any) ?? [];
}
export async function addNutriTip(
  ctx: Ctx,
  input: { body: string; scope: 'diaria' | 'semanal'; media_url?: string | null; author_name?: string; author_role?: string }
): Promise<{ error?: string }> {
  if (!supabaseConfigured || ctx.demo) return {};
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('nutri_tips').insert({
    body: input.body, scope: input.scope, media_url: input.media_url ?? null,
    created_by: u.user?.id, author_name: input.author_name ?? 'Nutrição', author_role: input.author_role ?? 'nutricionista',
  });
  return { error: error?.message };
}
export async function deleteNutriTip(ctx: Ctx, id: string): Promise<{ error?: string }> {
  if (!supabaseConfigured || ctx.demo) return {};
  const { error } = await supabase.from('nutri_tips').update({ active: false }).eq('id', id);
  return { error: error?.message };
}

// ------------------------- CARDÁPIO (PDF) -------------------------
export interface MealPlan { id: string; patient_id: string | null; title: string; pdf_path: string; created_at: string; }
export async function getMealPlans(ctx: Ctx, patientId?: string): Promise<MealPlan[]> {
  const pid = patientId ?? ctx.patientId;
  if (!supabaseConfigured || ctx.demo || !pid || pid === 'demo') return [];
  // Individuais do paciente + gerais (patient_id null)
  const { data } = await supabase
    .from('meal_plans')
    .select('id, patient_id, title, pdf_path, created_at')
    .or(`patient_id.eq.${pid},patient_id.is.null`)
    .order('created_at', { ascending: false });
  return (data as any) ?? [];
}
export async function addMealPlan(
  ctx: Ctx,
  input: { patient_id?: string | null; title: string; pdf_path: string }
): Promise<{ error?: string }> {
  if (!supabaseConfigured || ctx.demo) return {};
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('meal_plans').insert({
    patient_id: input.patient_id ?? null, title: input.title, pdf_path: input.pdf_path, created_by: u.user?.id,
  });
  return { error: error?.message };
}

// ------------------------- NUTRI: FOTOS ENVIADAS PELOS PACIENTES -------------------------
export interface NutriFeedItem { id: string; patient_id: string; patient_name: string; title: string; path: string; calories: number; logged_at: string; }
export async function getNutriFeed(ctx: Ctx): Promise<NutriFeedItem[]> {
  if (!supabaseConfigured || ctx.demo) return [];
  const { data } = await supabase
    .from('meals')
    .select('id, patient_id, title, photo_url, calories, logged_at')
    .eq('sent_to_nutri', true)
    .not('photo_url', 'is', null)
    .order('logged_at', { ascending: false })
    .limit(60);
  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((r: any) => r.patient_id)));
  const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  const nameById: Record<string, string> = {};
  for (const p of profs ?? []) nameById[(p as any).id] = (p as any).full_name;
  return rows.map((m: any) => ({
    id: m.id, patient_id: m.patient_id, patient_name: nameById[m.patient_id] ?? 'Paciente',
    title: m.title, path: m.photo_url, calories: m.calories, logged_at: m.logged_at,
  }));
}

// ------------------------- METAS ESCALÁVEIS -------------------------
export interface PatientGoals { water_ml_goal: number; steps_goal: number; calorie_override: number | null; }
export async function getPatientGoals(ctx: Ctx, patientId?: string): Promise<PatientGoals> {
  const pid = patientId ?? ctx.patientId;
  const def: PatientGoals = { water_ml_goal: 2500, steps_goal: 8000, calorie_override: null };
  if (!supabaseConfigured || ctx.demo || !pid || pid === 'demo') return def;
  const { data } = await supabase.from('patient_goals').select('water_ml_goal, steps_goal, calorie_override').eq('id', pid).maybeSingle();
  return (data as any) ?? def;
}
export async function savePatientGoals(
  ctx: Ctx, patientId: string, input: { water_ml_goal?: number; steps_goal?: number; calorie_override?: number | null }
): Promise<{ error?: string }> {
  if (!supabaseConfigured || ctx.demo) return {};
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('patient_goals').upsert({ id: patientId, ...input, updated_by: u.user?.id, updated_at: new Date().toISOString() });
  return { error: error?.message };
}

// ------------------------- CONQUISTAS -------------------------
export interface Achievement { id: string; kind: string; title: string | null; awarded_at: string; meta: any; }
export async function getAchievements(ctx: Ctx, patientId?: string): Promise<Achievement[]> {
  const pid = patientId ?? ctx.patientId;
  if (!supabaseConfigured || ctx.demo || !pid || pid === 'demo') return [];
  const { data } = await supabase.from('achievements').select('id, kind, title, awarded_at, meta').eq('patient_id', pid).order('awarded_at', { ascending: false });
  return (data as any) ?? [];
}
export async function awardAchievement(
  ctx: Ctx, input: { kind: string; title: string; meta?: any }
): Promise<{ awarded: boolean; error?: string }> {
  if (!isReal(ctx)) return { awarded: false };
  const { error } = await supabase.from('achievements').insert({ patient_id: ctx.patientId, kind: input.kind, title: input.title, meta: input.meta ?? {} });
  if (error) {
    if ((error as any).code === '23505') return { awarded: false }; // já conquistado
    return { awarded: false, error: error.message };
  }
  return { awarded: true };
}

// ------------------------- STREAK / CONSTÂNCIA -------------------------
/**
 * Constância diária dos últimos `days` dias: um dia é "completo" quando o paciente
 * bateu a meta de água E registrou ao menos uma refeição. Retorna o streak atual
 * (dias consecutivos completos terminando hoje) e o mapa por dia.
 */
export async function getStreakInfo(ctx: Ctx, days = 30): Promise<{ streak: number; completeCount: number; goalHit: boolean }> {
  if (!isReal(ctx)) return { streak: 0, completeCount: 0, goalHit: false };
  const since = daysAgoISO(days - 1);
  const goals = await getPatientGoals(ctx);
  const waterGoal = goals.water_ml_goal || 2500;
  const [w, m] = await Promise.all([
    supabase.from('water_logs').select('amount_ml, logged_at').eq('patient_id', ctx.patientId).gte('logged_at', since),
    supabase.from('meals').select('logged_at').eq('patient_id', ctx.patientId).gte('logged_at', since),
  ]);
  const waterByDay: Record<string, number> = {};
  for (const r of w.data ?? []) {
    const d = String((r as any).logged_at).slice(0, 10);
    waterByDay[d] = (waterByDay[d] || 0) + Number((r as any).amount_ml);
  }
  const mealDays = new Set<string>();
  for (const r of m.data ?? []) mealDays.add(String((r as any).logged_at).slice(0, 10));

  const complete = (d: string) => (waterByDay[d] || 0) >= waterGoal && mealDays.has(d);
  // conta streak a partir de hoje para trás
  let streak = 0;
  const day = new Date();
  for (let i = 0; i < days; i++) {
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    if (complete(key)) streak++;
    else break;
    day.setDate(day.getDate() - 1);
  }
  let completeCount = 0;
  const d2 = new Date();
  for (let i = 0; i < days; i++) {
    const key = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`;
    if (complete(key)) completeCount++;
    d2.setDate(d2.getDate() - 1);
  }
  return { streak, completeCount, goalHit: streak >= days };
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
