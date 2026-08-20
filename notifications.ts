import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensurePermissions(): Promise<boolean> {
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

/** Lembrete diário de água em HH:MM. Retorna o id do agendamento. */
export async function scheduleWaterReminder(hour: number, minute: number): Promise<string> {
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
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Lembrete VITALITY', body: title },
    trigger: { date: when } as any,
  });
}

export async function cancelReminder(id: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* noop */
  }
}
