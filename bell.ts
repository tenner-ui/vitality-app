import { Platform } from 'react-native';

let ctx: any = null;
let unlockBound = false;

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

/**
 * Liga o desbloqueio de áudio ao PRIMEIRO gesto do usuário (toque/tecla/clique).
 * Sem isso, o navegador (principalmente iPhone) bloqueia qualquer som que não
 * venha de dentro de um gesto — então a campainha por tempo real não tocaria.
 */
export function armAudioUnlock() {
  if (Platform.OS !== 'web' || unlockBound) return;
  unlockBound = true;
  const unlock = () => { initAudio(); };
  try {
    const opts = { passive: true } as any;
    ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach((ev) =>
      (globalThis as any).addEventListener?.(ev, unlock, opts)
    );
  } catch {}
}

/** Vibra o aparelho (reforço tátil quando o som pode estar mudo). */
export function buzz(pattern: number | number[] = [120, 60, 120]) {
  if (Platform.OS !== 'web') return;
  try { (navigator as any)?.vibrate?.(pattern); } catch {}
}

function tone(freqs: number[], step = 0.22, peak = 0.35, dur = 0.55) {
  if (Platform.OS !== 'web') return;
  try {
    if (!ctx) initAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    freqs.forEach((f, i) => {
      const t = now + i * step;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  } catch {}
}

/** Campainha (chamar atenção) — três toques + vibração. */
export function playBell() {
  tone([880, 1320, 880]);
  buzz([150, 80, 150]);
}

/** Som suave de lembrete de água (gota dupla). */
export function playWaterChime() {
  tone([1200, 1600], 0.16, 0.28, 0.4);
  buzz(60);
}
