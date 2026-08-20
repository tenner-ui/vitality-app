import { Alert, Platform } from 'react-native';

type Btn = { text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' };

/**
 * Feedback compatível com web e nativo.
 * No react-native-web o Alert.alert NÃO funciona (é um no-op), então na web
 * usamos window.alert para garantir que o usuário veja erros e confirmações.
 */
export function notify(title: string, message?: string, buttons?: Btn[]) {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    try {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.alert) window.alert(text);
    } catch {}
    // dispara a ação principal do botão (ex.: "Ir para o login"), se houver
    if (buttons && buttons.length) {
      const primary = buttons.find((b) => b.style !== 'cancel' && b.onPress) ?? buttons[buttons.length - 1];
      primary?.onPress?.();
    }
    return;
  }
  Alert.alert(title, message, buttons as any);
}
