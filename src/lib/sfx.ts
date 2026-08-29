/*
 * Synthesized sound effects via the Web Audio API — no audio assets required.
 * Fun, game-show-style set: drums, claps, brass stabs, trombone, suspense.
 * All functions are safe to call during SSR (they no-op without window).
 * Every voice routes through a master gain driven by studio preferences.
 */

import { sfxGain } from "@/lib/settings";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

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

/** Master bus — its gain follows the user's volume / mute preference. */
function bus(audio: AudioContext): GainNode {
  if (!master || master.context !== audio) {
    master = audio.createGain();
    master.connect(audio.destination);
  }
  master.gain.value = sfxGain();
  return master;
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  slideTo?: number;
  /** Slow attack for pads / suspense beds. */
  attack?: number;
}

function tone(freq: number, duration: number, opts: ToneOpts = {}) {
  const audio = ac();
  if (!audio) return;
  const { type = "sine", gain = 0.12, delay = 0, slideTo, attack = 0.008 } = opts;
  const t0 = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(bus(audio));
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

let noiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(audio: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const len = audio.sampleRate * 1;
    noiseBuffer = audio.createBuffer(1, len, audio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

interface NoiseOpts {
  gain?: number;
  delay?: number;
  /** bandpass center frequency */
  freq?: number;
  /** bandpass Q */
  q?: number;
}

/** Filtered noise burst — the building block for drums, claps and cymbals. */
function noise(duration: number, opts: NoiseOpts = {}) {
  const audio = ac();
  if (!audio) return;
  const { gain = 0.2, delay = 0, freq = 1800, q = 1 } = opts;
  const t0 = audio.currentTime + delay;
  const src = audio.createBufferSource();
  src.buffer = getNoiseBuffer(audio);
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = q;
  const amp = audio.createGain();
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter).connect(amp).connect(bus(audio));
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

/** Kick drum: pitched thump. */
function kick(delay = 0, gain = 0.3) {
  tone(120, 0.18, { type: "sine", gain, delay, slideTo: 45 });
}

/** Snare/clap: bandpassed noise burst. */
function clap(delay = 0, gain = 0.22) {
  noise(0.09, { gain, delay, freq: 1600, q: 1.2 });
  noise(0.05, { gain: gain * 0.6, delay: delay + 0.02, freq: 2400, q: 2 });
}

/** Crowd clap applause over ~1s. */
function applause(delay = 0) {
  for (let i = 0; i < 14; i++) {
    clap(delay + i * 0.07 + Math.random() * 0.03, 0.08 + Math.random() * 0.06);
  }
}

/** Cymbal crash. */
function crash(delay = 0, gain = 0.14) {
  noise(0.6, { gain, delay, freq: 5200, q: 0.7 });
}

/** Drum roll for ~0.9s then a crash. */
function drumRoll(delay = 0) {
  let t = delay;
  let step = 0.11;
  for (let i = 0; i < 11; i++) {
    kick(t, 0.16);
    t += step;
    step = Math.max(0.045, step * 0.86);
  }
  crash(t, 0.16);
  kick(t, 0.3);
}

/** Bright brass-ish stab used across the celebratory cues. */
function stab(freq: number, delay: number, dur = 0.28, gain = 0.12) {
  tone(freq, dur, { type: "triangle", gain, delay });
  tone(freq * 2, dur * 0.7, { type: "square", gain: gain * 0.35, delay });
  tone(freq / 2, dur, { type: "sawtooth", gain: gain * 0.4, delay });
}

export const sfx = {
  /** short local click when a buzz registers */
  click() {
    tone(1400, 0.06, { type: "square", gain: 0.06 });
  },
  /** UI pop — panels and popovers springing open */
  pop() {
    tone(520, 0.09, { type: "sine", gain: 0.08, slideTo: 980 });
    noise(0.05, { gain: 0.05, freq: 3200, q: 3, delay: 0.02 });
  },
  /** player buzzer — punchy two-tone horn */
  buzz() {
    tone(392, 0.16, { type: "square", gain: 0.1 });
    tone(523.25, 0.22, { type: "square", gain: 0.1, delay: 0.14 });
    kick(0, 0.2);
  },
  /** correct answer — happy chime + claps */
  ding() {
    tone(783.99, 0.18, { type: "triangle", gain: 0.16 });
    tone(1046.5, 0.3, { type: "triangle", gain: 0.16, delay: 0.1 });
    tone(1318.5, 0.45, { type: "triangle", gain: 0.12, delay: 0.2 });
    applause(0.1);
  },
  /** wrong answer — rimshot then a fat sad trombone slide */
  wrong() {
    noise(0.06, { gain: 0.16, freq: 2200, q: 1.4 });
    kick(0.02, 0.22);
    const wah = (freq: number, delay: number, dur: number, slideTo?: number) => {
      tone(freq, dur, { type: "sawtooth", gain: 0.1, delay, ...(slideTo ? { slideTo } : {}) });
      tone(freq / 2, dur, { type: "triangle", gain: 0.08, delay, ...(slideTo ? { slideTo: slideTo / 2 } : {}) });
    };
    wah(233.08, 0.12, 0.24);
    wah(220, 0.4, 0.24);
    wah(207.65, 0.68, 0.24);
    wah(196, 0.96, 0.8, 150);
  },
  /** steady tick 15s..6s — soft woodblock */
  tick() {
    noise(0.04, { gain: 0.07, freq: 2000, q: 6 });
    tone(840, 0.03, { type: "sine", gain: 0.03 });
  },
  /** urgency tick 5s..1s — brighter woodblock */
  urgentTick() {
    noise(0.05, { gain: 0.1, freq: 2600, q: 6 });
    tone(1180, 0.04, { type: "sine", gain: 0.04 });
  },
  /** timer expiration — drum fill + big crash */
  alarm() {
    kick(0, 0.28);
    clap(0.12, 0.2);
    kick(0.24, 0.28);
    clap(0.36, 0.22);
    kick(0.48, 0.3);
    crash(0.6, 0.18);
    tone(523.25, 0.5, { type: "triangle", gain: 0.1, delay: 0.6, slideTo: 392 });
  },
  /** daily double reveal — drum roll + crash */
  dailyDouble() {
    drumRoll(0);
  },
  /** standalone accelerating drum roll ending on a crash */
  drumroll() {
    drumRoll(0);
  },
  /** victory — triumphant brass fanfare, cymbal and a crowd */
  victory() {
    crash(0, 0.14);
    const riff: [number, number][] = [
      [523.25, 0], [523.25, 0.18], [659.25, 0.34], [783.99, 0.52], [1046.5, 0.74],
    ];
    riff.forEach(([f, d]) => stab(f, d, 0.3, 0.13));
    kick(0, 0.24);
    kick(0.34, 0.22);
    clap(0.52, 0.2);
    stab(1046.5, 0.98, 1.0, 0.14);
    crash(0.98, 0.16);
    applause(1.05);
  },
  /** sad — descending minor piano-ish fall */
  sad() {
    const notes = [440, 392, 349.23, 293.66];
    notes.forEach((n, i) => {
      tone(n, 0.5, { type: "triangle", gain: 0.11, delay: i * 0.22 });
      tone(n / 2, 0.6, { type: "sine", gain: 0.07, delay: i * 0.22 });
    });
    tone(220, 1.4, { type: "sine", gain: 0.09, delay: 0.9, slideTo: 165 });
  },
  /** funny — cartoon boing + slide whistle + rimshot */
  funny() {
    tone(180, 0.35, { type: "square", gain: 0.09, slideTo: 720 });
    tone(720, 0.3, { type: "square", gain: 0.07, delay: 0.34, slideTo: 220 });
    tone(400, 0.55, { type: "sine", gain: 0.08, delay: 0.66, slideTo: 1600 });
    noise(0.07, { gain: 0.14, freq: 2400, q: 1.2, delay: 1.2 });
    kick(1.22, 0.24);
    crash(1.26, 0.1);
  },
  /** suspense — ticking heartbeat under a rising dissonant pad */
  suspense() {
    for (let i = 0; i < 8; i++) {
      kick(i * 0.42, 0.16);
      kick(i * 0.42 + 0.16, 0.1);
    }
    tone(110, 3.4, { type: "sawtooth", gain: 0.05, attack: 1.2, slideTo: 175 });
    tone(164.81, 3.4, { type: "triangle", gain: 0.04, attack: 1.4, slideTo: 233.08 });
    noise(3.2, { gain: 0.02, freq: 900, q: 0.6 });
  },
  /** victory fanfare — brass riff + drum roll + applause */
  fanfare() {
    drumRoll(0);
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => stab(n, 1.0 + i * 0.15, 0.3, 0.13));
    tone(1046.5, 0.9, { type: "triangle", gain: 0.13, delay: 1.65 });
    applause(1.7);
  },
};

export function vibrate(pattern: number | number[] = 40) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
