/**
 * Dados de exemplo (paciente "Ana Silva") para o app rodar sem backend.
 * Quando o Supabase estiver configurado e com dados, troca-se por queries reais.
 */
import { Achievement, Appointment, Message, Meal, Workout } from './types';

export const patient = {
  id: 'demo-ana',
  full_name: 'Ana Silva',
  first_name: 'Ana',
  program: 'RenovaCorps',
  phase: 'Reprogramação Metabólica',
  week: 5,
  totalWeeks: 12,
};

export const dailyGoals = {
  water: { current: 1500, target: 2500, unit: 'ml' },
  calories: { current: 1180, target: 1600, unit: 'kcal' },
  steps: { current: 6200, target: 9000, unit: 'passos' },
  workout: { current: 1, target: 1, unit: 'treino' },
};

export const weightTrend = {
  start: 82.4,
  current: 76.1,
  goal: 68.0,
  history: [82.4, 81.2, 80.0, 78.9, 77.5, 76.1],
};

export const waistTrend = {
  start: 96,
  current: 88,
  goal: 78,
};

export const bodyComposition = {
  weightKg: 76.1,
  bodyFatPct: 31.2,
  leanMassKg: 48.9,
  waistCm: 88,
  hipCm: 102,
};

export const waterWeek = [2.4, 2.1, 2.5, 1.8, 2.2, 2.5, 1.5]; // litros por dia (seg..dom)

export const meals: Meal[] = [
  { id: 'm1', title: 'Omelete + abacate', photo_url: null, calories: 320, protein_g: 22, carbs_g: 8, fat_g: 22, fiber_g: 5, logged_at: '08:10' },
  { id: 'm2', title: 'Frango grelhado + salada', photo_url: null, calories: 460, protein_g: 45, carbs_g: 18, fat_g: 20, fiber_g: 9, logged_at: '12:40' },
  { id: 'm3', title: 'Iogurte natural + castanhas', photo_url: null, calories: 240, protein_g: 14, carbs_g: 12, fat_g: 15, fiber_g: 3, logged_at: '16:00' },
];

export const macroTargets = { protein_g: 130, carbs_g: 120, fat_g: 55, fiber_g: 25, calories: 1600 };

export const todayWorkout: Workout = {
  id: 'w1',
  title: 'Full Body — Força A',
  day_of_week: new Date().getDay(),
  items: [
    { name: 'Agachamento livre', sets: 3, reps: '12', rest_sec: 60, done: false },
    { name: 'Supino com halteres', sets: 3, reps: '10', rest_sec: 60, done: false },
    { name: 'Remada curvada', sets: 3, reps: '12', rest_sec: 60, done: false },
    { name: 'Elevação pélvica', sets: 3, reps: '15', rest_sec: 45, done: false },
    { name: 'Prancha', sets: 3, reps: '40s', rest_sec: 30, done: false },
  ],
};

export const weekPlan = [
  { day: 'Seg', label: 'Força A', done: true },
  { day: 'Ter', label: 'Cardio', done: true },
  { day: 'Qua', label: 'Força B', done: true },
  { day: 'Qui', label: 'Descanso', done: false },
  { day: 'Sex', label: 'Força A', done: false },
  { day: 'Sáb', label: 'Mobilidade', done: false },
  { day: 'Dom', label: 'Descanso', done: false },
];

// Datas relativas a hoje, para o modo demonstração sempre parecer atual.
function inDays(days: number, hour = 9, min = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

export const appointments: Appointment[] = [
  { id: 'a1', type: 'consulta', starts_at: inDays(5, 14, 0), duration_min: 40, status: 'agendado', notes: 'Retorno mensal' },
  { id: 'a2', type: 'aplicacao', starts_at: inDays(2, 9, 30), duration_min: 15, status: 'agendado', notes: 'Semaglutida (princípio ativo)' },
  { id: 'a3', type: 'nutricao', starts_at: inDays(9, 10, 0), duration_min: 30, status: 'agendado' },
];

export const pastAppointments: Appointment[] = [
  { id: 'p1', type: 'avaliacao_fisica', starts_at: inDays(-12, 11, 0), duration_min: 30, status: 'concluido' },
  { id: 'p2', type: 'aplicacao', starts_at: inDays(-5, 9, 30), duration_min: 15, status: 'concluido' },
];

export const achievements: Achievement[] = [
  { id: 'c1', title: '7 dias de hidratação', description: 'Meta de água batida por 7 dias', icon: 'water', unlocked: true },
  { id: 'c2', title: 'Primeiros 5 kg', description: 'Você já perdeu 5 kg', icon: 'trending-down', unlocked: true },
  { id: 'c3', title: '10 treinos', description: 'Complete 10 treinos', icon: 'barbell', unlocked: true },
  { id: 'c4', title: 'Fase 2 concluída', description: 'Reprogramação Metabólica', icon: 'flame', unlocked: false },
];

export const chatMessages: Message[] = [
  { id: 'x1', sender_role: 'nutricionista', sender_name: 'Dra. Carla (Nutri)', body: 'Oi Ana! Vi seu diário de ontem, ótima adesão. Vamos aumentar a proteína no almoço. 💪', created_at: '2026-08-12T15:20:00' },
  { id: 'x2', sender_role: 'paciente', sender_name: 'Ana', body: 'Perfeito! Posso trocar o frango por peixe às vezes?', created_at: '2026-08-12T15:24:00' },
  { id: 'x3', sender_role: 'nutricionista', sender_name: 'Dra. Carla (Nutri)', body: 'Pode sim, mantém a porção. Qualquer dúvida me chama por aqui.', created_at: '2026-08-12T15:26:00' },
  { id: 'x4', sender_role: 'medico', sender_name: 'Dr. Tenner Nunes', body: 'Ana, seus exames chegaram e estão dentro do esperado. Falamos na consulta do dia 18. Abraço.', created_at: '2026-08-13T08:05:00' },
];

export const chatShortcuts = ['Enviar exame', 'Remarcar', 'Dúvida de medicação', 'Registrar sintoma'];

export const teamMessage = {
  from: 'Dr. Tenner Nunes',
  body: 'Continue firme na hidratação e no treino de força — a fase de Reprogramação está indo muito bem.',
};

// ----------------------- Painel da Equipe (demo) -----------------------
export const teamPatients = [
  { id: 'demo-ana', full_name: 'Ana Silva', role: 'paciente' as const, program: 'RenovaCorps', phase: 'Reprogramação Metabólica', week: 5, adherence: 0.86, risk: false, lastSeen: 'hoje' },
  { id: 'demo-bruno', full_name: 'Bruno Costa', role: 'paciente' as const, program: 'RenovaCorps', phase: 'Desintoxicação', week: 2, adherence: 0.41, risk: true, lastSeen: 'há 9 dias' },
  { id: 'demo-clara', full_name: 'Clara Dias', role: 'paciente' as const, program: 'RenovaCorps', phase: 'Manutenção', week: 11, adherence: 0.92, risk: false, lastSeen: 'ontem' },
  { id: 'demo-diego', full_name: 'Diego Farias', role: 'paciente' as const, program: 'RenovaCorps', phase: 'Reprogramação Metabólica', week: 6, adherence: 0.58, risk: true, lastSeen: 'há 5 dias' },
  { id: 'demo-elena', full_name: 'Elena Moura', role: 'paciente' as const, program: 'RenovaCorps', phase: 'Desintoxicação', week: 1, adherence: 0.74, risk: false, lastSeen: 'hoje' },
];

export const teamAgendaToday = [
  { id: 't1', time: '08:00', patient: 'Elena Moura', type: 'consulta' as const },
  { id: 't2', time: '09:30', patient: 'Bruno Costa', type: 'aplicacao' as const },
  { id: 't3', time: '11:00', patient: 'Ana Silva', type: 'nutricao' as const },
  { id: 't4', time: '14:00', patient: 'Diego Farias', type: 'avaliacao_fisica' as const },
  { id: 't5', time: '16:00', patient: 'Clara Dias', type: 'psicologia' as const },
];

// ----------------------- Bioimpedância (série demo — evolução) -----------------------
export const bioSeries = [
  { id: 'b1', measured_at: '2026-06-01', label: 'S1', weight_kg: 82.4, bmi: 30.3, body_fat_pct: 38.1, fat_mass_kg: 31.4, lean_mass_kg: 51.0, muscle_mass_kg: 48.4, skeletal_muscle_kg: 27.1, body_water_pct: 45.2, visceral_fat: 12, bmr_kcal: 1420, metabolic_age: 44, bone_mass_kg: 2.9, protein_pct: 15.8, phase_angle: 5.1, waist_cm: 96, hip_cm: 106 },
  { id: 'b2', measured_at: '2026-06-29', label: 'S4', weight_kg: 79.0, bmi: 29.0, body_fat_pct: 35.4, fat_mass_kg: 27.9, lean_mass_kg: 51.1, muscle_mass_kg: 48.5, skeletal_muscle_kg: 27.4, body_water_pct: 47.0, visceral_fat: 11, bmr_kcal: 1435, metabolic_age: 41, bone_mass_kg: 2.9, protein_pct: 16.4, phase_angle: 5.4, waist_cm: 92, hip_cm: 104 },
  { id: 'b3', measured_at: '2026-07-27', label: 'S8', weight_kg: 76.1, bmi: 28.0, body_fat_pct: 31.2, fat_mass_kg: 23.7, lean_mass_kg: 52.4, muscle_mass_kg: 49.7, skeletal_muscle_kg: 28.2, body_water_pct: 49.1, visceral_fat: 9, bmr_kcal: 1460, metabolic_age: 37, bone_mass_kg: 3.0, protein_pct: 17.1, phase_angle: 5.8, waist_cm: 88, hip_cm: 102 },
];

// ----------------------- Cardiologia (demo) -----------------------
export const cardioReportDemo = {
  id: 'c1',
  report_date: '2026-07-20',
  consult_summary:
    'Paciente assintomática do ponto de vista cardiovascular. Ausculta normal, sem sopros. PA 124/78 mmHg. Liberada para atividade física progressiva.',
  ecg_description:
    'Ritmo sinusal, FC 68 bpm. Eixo normal. Sem alterações de repolarização. Intervalo PR e QT normais. ECG dentro da normalidade.',
  other_exams:
    'Ecocardiograma: função sistólica preservada (FEVE 62%), sem alterações estruturais. Teste ergométrico: boa capacidade funcional, sem sinais de isquemia.',
  risk_notes: 'Risco cardiovascular baixo (escore favorável). Manter controle de peso e perfil lipídico.',
  images: [] as string[],
};

// ----------------------- Exames de rotina (demo) — correlação com faixa -----------------------
export const labResultsDemo = [
  { id: 'l1', analyte: 'Glicemia de jejum', category: 'Metabólico', unit: 'mg/dL', ref_low: 70, ref_high: 99, series: [{ date: '01/06', value: 104 }, { date: '01/07', value: 96 }, { date: '01/08', value: 92 }] },
  { id: 'l2', analyte: 'HbA1c', category: 'Metabólico', unit: '%', ref_low: 4, ref_high: 5.7, series: [{ date: '01/06', value: 6.0 }, { date: '01/07', value: 5.7 }, { date: '01/08', value: 5.5 }] },
  { id: 'l3', analyte: 'LDL', category: 'Lipídico', unit: 'mg/dL', ref_low: 0, ref_high: 100, series: [{ date: '01/06', value: 138 }, { date: '01/07', value: 118 }, { date: '01/08', value: 104 }] },
  { id: 'l4', analyte: 'HDL', category: 'Lipídico', unit: 'mg/dL', ref_low: 40, ref_high: 80, series: [{ date: '01/06', value: 42 }, { date: '01/07', value: 46 }, { date: '01/08', value: 51 }] },
  { id: 'l5', analyte: 'Triglicérides', category: 'Lipídico', unit: 'mg/dL', ref_low: 0, ref_high: 150, series: [{ date: '01/06', value: 186 }, { date: '01/07', value: 150 }, { date: '01/08', value: 128 }] },
  { id: 'l6', analyte: 'TSH', category: 'Hormonal', unit: 'µUI/mL', ref_low: 0.4, ref_high: 4.0, series: [{ date: '01/06', value: 2.3 }, { date: '01/08', value: 2.1 }] },
];

export const patientDetailDemo = {
  weightKg: 76.1,
  startWeight: 82.4,
  goalWeight: 68,
  bodyFatPct: 31.2,
  leanMassKg: 48.9,
  waistCm: 88,
  waterAdherence: 0.86,
  moodWeek: [4, 3, 4, 5, 4, 3, 4],
  anxiety: 6,
  binge: 3,
  prescriptions: [
    { active_ingredient: 'semaglutida', dose: '0,5 mg', schedule: '1x/semana (SC)' },
  ],
  exams: [
    { title: 'Hemograma + perfil metabólico', result: 'Dentro dos parâmetros', date: '01/08' },
    { title: 'Glicemia de jejum', result: '92 mg/dL', date: '01/08' },
  ],
};
