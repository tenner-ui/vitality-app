import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { playWaterChime, buzz } from './bell';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const isWeb = Platform.OS === 'web';
function webNotif(): any {
  return typeof globalThis !== 'undefined' ? (globalThis as any).Notification : undefined;
}

export async function ensurePermissions(): Promise<boolean> {
  // WEB: usamos a API de Notificações do navegador. Mesmo se o usuário negar,
  // o app ainda toca o lembrete sonoro interno — então nunca bloqueamos o toggle.
  if (isWeb) {
    const N = webNotif();
    if (!N) return true; // sem API nativa: seguimos com o chime interno
    try {
      if (N.permission === 'granted') return true;
      if (N.permission === 'denied') return true; // não bloqueia: cai no chime interno
      const p = await N.requestPermission();
      return p === 'granted' || true;
    } catch {
      return true;
    }
  }

  const { status } = await Notifications.getPermissionsAsync();
  let final = status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    final = req.status;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'VITALITY',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#C8A24A',
    });
  }
  return final === 'granted';
}

// ---- Agendador WEB (setTimeout diário; funciona enquanto a aba estiver aberta) ----
let webSeq = 0;
const webTimers = new Map<string, any>();

function msUntil(hour: number, minute: number): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

function fireWater() {
  try { playWaterChime(); } catch {}
  try { buzz(80); } catch {}
  const N = webNotif();
  try {
    if (N && N.permission === 'granted') {
      new N('Hora de se hidratar 💧', { body: 'Registre mais um copo de água no VITALITY.', tag: 'vitality-water' });
    }
  } catch {}
}

function scheduleWebDaily(id: string, hour: number, minute: number) {
  const t = setTimeout(() => {
    fireWater();
    scheduleWebDaily(id, hour, minute); // reprograma para o próximo dia
  }, msUntil(hour, minute));
  webTimers.set(id, t);
}

/** Lembrete diário de água em HH:MM. Retorna o id do agendamento. */
export async function scheduleWaterReminder(hour: number, minute: number): Promise<string> {
  if (isWeb) {
    const id = `web-water-${++webSeq}`;
    scheduleWebDaily(id, hour, minute);
    return id;
  }
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Hora de se hidratar 💧',
      body: 'Registre mais um copo de água no VITALITY.',
    },
    // Repetição diária no horário escolhido (compatível com expo-notifications SDK 51).
    trigger: { hour, minute, repeats: true } as any,
  });
}

/** Lembrete de compromisso (consulta/aplicação) numa data específica. */
export async function scheduleAppointmentReminder(
  title: string,
  when: Date
): Promise<string | null> {
  if (when.getTime() <= Date.now()) return null;
  if (isWeb) {
    const id = `web-appt-${++webSeq}`;
    const t = setTimeout(() => {
      const N = webNotif();
      try { if (N && N.permission === 'granted') new N('Lembrete VITALITY', { body: title }); } catch {}
      try { playWaterChime(); } catch {}
      webTimers.delete(id);
    }, when.getTime() - Date.now());
    webTimers.set(id, t);
    return id;
  }
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Lembrete VITALITY', body: title },
    trigger: { date: when } as any,
  });
}

export async function cancelReminder(id: string) {
  if (id.startsWith('web-')) {
    const t = webTimers.get(id);
    if (t) clearTimeout(t);
    webTimers.delete(id);
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* noop */
  }
}
