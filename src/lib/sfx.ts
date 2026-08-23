/*
 * Synthesized sound effects via the Web Audio API — no audio assets required.
 * All functions are safe to call during SSR (they no-op without window).
 */

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  slideTo?: number;
}

function tone(freq: number, duration: number, opts: ToneOpts = {}) {
  const audio = ac();
  if (!audio) return;
  const { type = "sine", gain = 0.12, delay = 0, slideTo } = opts;
  const t0 = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const sfx = {
  /** short local click when a buzz registers */
  click() {
    tone(1400, 0.06, { type: "square", gain: 0.06 });
  },
  /** player buzzer */
  buzz() {
    tone(220, 0.28, { type: "sawtooth", gain: 0.14 });
    tone(110, 0.28, { type: "square", gain: 0.08, delay: 0.02 });
  },
  /** correct answer ding */
  ding() {
    tone(880, 0.35, { gain: 0.14 });
    tone(1318.5, 0.5, { gain: 0.1, delay: 0.08 });
  },
  /** wrong answer buzzer */
  wrong() {
    tone(160, 0.5, { type: "sawtooth", gain: 0.16, slideTo: 90 });
  },
  /** steady tick 15s..6s */
  tick() {
    tone(660, 0.05, { type: "sine", gain: 0.05 });
  },
  /** urgency tick 5s..1s — fixed volume, no crescendo */
  urgentTick() {
    tone(990, 0.07, { type: "square", gain: 0.08 });
  },
  /** timer expiration alarm */
  alarm() {
    for (let i = 0; i < 3; i++) {
      tone(740, 0.18, { type: "square", gain: 0.12, delay: i * 0.22 });
      tone(523, 0.18, { type: "square", gain: 0.12, delay: i * 0.22 + 0.11 });
    }
  },
  /** daily double reveal sweep */
  dailyDouble() {
    tone(300, 0.7, { type: "sawtooth", gain: 0.1, slideTo: 1200 });
    tone(600, 0.7, { type: "sine", gain: 0.08, delay: 0.1, slideTo: 2400 });
  },
  /** victory fanfare */
  fanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => tone(n, 0.35, { type: "triangle", gain: 0.14, delay: i * 0.16 }));
    tone(1046.5, 0.9, { type: "triangle", gain: 0.12, delay: 0.7 });
  },
};

export function vibrate(pattern: number | number[] = 40) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
