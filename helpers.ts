import { AppointmentType, Role } from './types';
import { colors } from './colors';

export const appointmentMeta: Record<
  AppointmentType,
  { label: string; icon: string; color: string }
> = {
  consulta: { label: 'Consulta', icon: 'medkit', color: colors.blueAccent },
  aplicacao: { label: 'Aplicação', icon: 'medical', color: colors.gold },
  nutricao: { label: 'Nutrição', icon: 'nutrition', color: colors.success },
  psicologia: { label: 'Psicologia', icon: 'happy', color: colors.goldLight },
  avaliacao_fisica: { label: 'Avaliação física', icon: 'body', color: colors.info },
  coleta: { label: 'Coleta', icon: 'flask', color: colors.textSecondary },
};

export const roleMeta: Record<Role, { label: string; icon: string }> = {
  paciente: { label: 'Paciente', icon: 'person' },
  medico: { label: 'Médico', icon: 'medkit' },
  nutricionista: { label: 'Nutricionista', icon: 'nutrition' },
  psicologa: { label: 'Psicóloga', icon: 'happy' },
  educador_fisico: { label: 'Educador Físico', icon: 'barbell' },
  lider: { label: 'Líder da equipe', icon: 'shield-checkmark' },
};

const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} · ${time}`;
}

export function daysUntil(iso: string): number {
  const now = new Date();
  const d = new Date(iso);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
