/** Tipos de domínio compartilhados (espelham o schema Supabase). */

export type Role = 'paciente' | 'medico' | 'nutricionista' | 'psicologa' | 'educador_fisico' | 'lider';

export type AppointmentType =
  | 'consulta'
  | 'aplicacao'
  | 'nutricao'
  | 'psicologia'
  | 'avaliacao_fisica'
  | 'coleta';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  avatar_url?: string | null;
}

export interface WaterLog {
  id: string;
  amount_ml: number;
  logged_at: string;
}

export interface WeightMeasure {
  id: string;
  weight_kg: number;
  measured_at: string;
}

export interface BodyMeasure {
  id: string;
  waist_cm?: number;
  hip_cm?: number;
  body_fat_pct?: number;
  lean_mass_kg?: number;
  measured_at: string;
}

export interface Meal {
  id: string;
  title: string;
  photo_url?: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  logged_at: string;
}

export interface Bioimpedance {
  id: string;
  measured_at: string;
  device?: string;
  weight_kg?: number;
  bmi?: number;
  body_fat_pct?: number;
  fat_mass_kg?: number;
  lean_mass_kg?: number;
  muscle_mass_kg?: number;
  skeletal_muscle_kg?: number;
  body_water_pct?: number;
  visceral_fat?: number;
  bmr_kcal?: number;
  metabolic_age?: number;
  bone_mass_kg?: number;
  protein_pct?: number;
  phase_angle?: number;
  waist_cm?: number;
  hip_cm?: number;
}

export interface CardioReport {
  id: string;
  report_date: string;
  consult_summary?: string;
  ecg_description?: string;
  other_exams?: string;
  risk_notes?: string;
  images?: string[];
}

export interface LabResult {
  id: string;
  measured_at: string;
  category?: string;
  analyte: string;
  value?: number;
  unit?: string;
  ref_low?: number;
  ref_high?: number;
  ref_text?: string;
}

export interface ExerciseItem {
  name: string;
  sets: number;
  reps: string;
  rest_sec: number;
  video_url?: string;
  done?: boolean;
}

export interface Workout {
  id: string;
  title: string;
  day_of_week: number; // 0 = domingo
  items: ExerciseItem[];
}

export interface Appointment {
  id: string;
  type: AppointmentType;
  starts_at: string;
  duration_min: number;
  status: 'agendado' | 'concluido' | 'cancelado';
  notes?: string;
}

export interface Message {
  id: string;
  sender_role: Role;
  sender_name: string;
  body: string;
  created_at: string;
  audio_path?: string | null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}
