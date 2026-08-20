import { Platform } from 'react-native';

let ctx: any = null;

/** Inicializa/retoma o áudio — deve ser chamado a partir de um gesto do usuário (web). */
export function initAudio() {
  if (Platform.OS !== 'web') return;
  try {
    const AC = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {}
}

/** Toca uma campainha curta (dois toques). Web Audio — sem arquivo de áudio. */
export function playBell() {
  if (Platform.OS !== 'web') return;
  try {
    if (!ctx) initAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1320, 880].forEach((f: number, i: number) => {
      const t = now + i * 0.22;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.6);
    });
  } catch {}
}
