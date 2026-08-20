import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { notify } from './notify';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionLabel, GoldButton, Pill } from './ui';
import { Header } from './Header';
import { colors } from './colors';
import { fonts, type } from './typography';
import { Appointment, AppointmentType } from './types';
import { appointmentMeta, formatDateTime } from './helpers';
import { useAuth } from './AuthContext';
import { getAppointments, addAppointment } from './api';
import { scheduleAppointmentReminder, ensurePermissions } from './notifications';

const TYPES: AppointmentType[] = ['consulta', 'aplicacao', 'nutricao', 'psicologia', 'avaliacao_fisica', 'coleta'];
const SLOTS = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
const BUSY = ['09:00', '15:00'];

export function AgendaScreen() {
  const { demo, userId } = useAuth();
  const ctx = { demo, patientId: userId };
  const [type, setType] = useState<AppointmentType>('consulta');
  const [slot, setSlot] = useState<string | null>(null);
  const [list, setList] = useState<Appointment[]>([]);

  useEffect(() => {
    getAppointments(ctx).then(setList).catch(() => {});
  }, [userId, demo]);

  const proximos = list.filter((a) => a.status !== 'concluido' && a.status !== 'cancelado');
  const historico = list.filter((a) => a.status === 'concluido');

  async function book() {
    if (!slot) {
      notify('Agenda', 'Escolha um horário disponível.');
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const [h, m] = slot.split(':');
    d.setHours(Number(h), Number(m), 0, 0);
    const appt: Appointment = { id: String(Date.now()), type, starts_at: d.toISOString(), duration_min: 30, status: 'agendado' };
    setList((l) => [...l, appt]);
    setSlot(null);
    try {
      await addAppointment(ctx, { type, starts_at: d.toISOString(), duration_min: 30 });
      // lembretes 24h e 1h antes
      await ensurePermissions();
      const label = `${appointmentMeta[type].label} — Instituto Vitality`;
      await scheduleAppointmentReminder(label, new Date(d.getTime() - 24 * 3600 * 1000));
      await scheduleAppointmentReminder(label, new Date(d.getTime() - 3600 * 1000));
    } catch {
      /* segue com o item local */
    }
    notify('Agendado ✓', `${appointmentMeta[type].label} marcada. Você receberá lembretes 24h e 1h antes.`);
  }

  return (
    <Screen>
      <Header title="Agenda" subtitle="Consultas e aplicações" rightIcon="calendar-outline" />

      <SectionLabel>Novo agendamento</SectionLabel>
      <Card glow>
        <Text style={styles.field}>Tipo</Text>
        <View style={styles.wrapRow}>
          {TYPES.map((t) => (
            <Pill key={t} label={appointmentMeta[t].label} active={type === t} onPress={() => setType(t)} />
          ))}
        </View>

        <Text style={[styles.field, { marginTop: 10 }]}>Horários (ocupados riscados)</Text>
        <View style={styles.wrapRow}>
          {SLOTS.map((s) => {
            const busy = BUSY.includes(s);
            return <Pill key={s} label={s} active={slot === s} strike={busy} onPress={() => setSlot(s)} />;
          })}
        </View>

        <GoldButton label="Confirmar agendamento" onPress={book} style={{ marginTop: 12 }} />
      </Card>

      <SectionLabel>Próximos</SectionLabel>
      {proximos.length === 0 && (
        <Card style={{ marginBottom: 10 }}>
          <Text style={styles.sub}>Nenhum agendamento ainda. Marque acima.</Text>
        </Card>
      )}
      {proximos
        .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
        .map((a) => (
          <Card key={a.id} style={{ marginBottom: 10 }}>
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: appointmentMeta[a.type].color + '22' }]}>
                <Ionicons name={appointmentMeta[a.type].icon as any} size={20} color={appointmentMeta[a.type].color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{appointmentMeta[a.type].label}</Text>
                <Text style={styles.sub}>{formatDateTime(a.starts_at)}{a.notes ? ` · ${a.notes}` : ''}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Card>
        ))}

      {historico.length > 0 && <SectionLabel>Histórico</SectionLabel>}
      {historico.map((a) => (
        <Card key={a.id} style={{ marginBottom: 10, opacity: 0.7 }}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}>
              <Ionicons name="checkmark-done" size={20} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{appointmentMeta[a.type].label}</Text>
              <Text style={styles.sub}>{formatDateTime(a.starts_at)} · concluído</Text>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { ...type.caption, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.cardTitle, color: colors.textPrimary },
  sub: { ...type.small, color: colors.textSecondary, marginTop: 2 },
});
