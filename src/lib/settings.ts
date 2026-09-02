/*
 * Local studio preferences (presentation + client-side defaults only).
 * Persisted in localStorage; no database involvement, no game logic.
 */

import { useEffect, useState } from "react";

export type GraphicsQuality = "high" | "medium" | "low";

export interface StudioSettings {
  /** 0 – 1 sound-effects level. */
  volume: number;
  /** 0 – 1 master output level, multiplied with `volume`. */
  masterVolume: number;
  muted: boolean;
  /** Default countdown length offered to new games (seconds). */
  timerSeconds: number;
  /** Mobile buzzer vibration. */
  haptics: boolean;
  teamAlpha: string;
  teamBravo: string;
  /** Presentation-only: disable non-essential animations. */
  reduceMotion: boolean;
  /** Presentation-only: blur / gradients / heavy animation budget. */
  graphics: GraphicsQuality;
  /** Presentation-only: ambient colored background blobs. */
  backgroundEffects: boolean;
}

export const DEFAULT_SETTINGS: StudioSettings = {
  volume: 0.8,
  masterVolume: 0.8,
  muted: false,
  timerSeconds: 15,
  haptics: true,
  teamAlpha: "Alpha",
  teamBravo: "Bravo",
  reduceMotion: false,
  graphics: "high",
  backgroundEffects: true,
};

const KEY = "jd-studio-settings";

let current: StudioSettings = { ...DEFAULT_SETTINGS };
let loaded = false;
const listeners = new Set<(s: StudioSettings) => void>();

function load(): StudioSettings {
  if (loaded || typeof window === "undefined") return current;
  loaded = true;
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  current = { ...DEFAULT_SETTINGS, reduceMotion: prefersReduced };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) current = { ...current, ...(JSON.parse(raw) as Partial<StudioSettings>) };
  } catch {
    /* ignore malformed storage */
  }
  applyPresentation(current);
  return current;
}

/** Reflect presentation preferences on <html> so CSS can react to them. */
function applyPresentation(s: StudioSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("reduce-motion", s.reduceMotion);
  root.classList.toggle("no-bg-fx", !s.backgroundEffects);
  root.dataset["graphics"] = s.graphics;
}

export function getSettings(): StudioSettings {
  return load();
}

export function setSettings(patch: Partial<StudioSettings>) {
  current = { ...load(), ...patch };
  applyPresentation(current);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      /* storage full / blocked */
    }
  }
  for (const l of listeners) l(current);
}

export function resetSettings() {
  current = { ...DEFAULT_SETTINGS };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
  for (const l of listeners) l(current);
}

/** Reactive hook: re-renders when any preference changes. */
export function useSettings(): StudioSettings {
  const [state, setState] = useState<StudioSettings>(() => getSettings());
  useEffect(() => {
    setState(getSettings());
    const l = (s: StudioSettings) => setState({ ...s });
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

/** Effective gain multiplier used by the synthesized SFX engine. */
export function sfxGain(): number {
  const s = load();
  if (s.muted) return 0;
  return Math.max(0, Math.min(1, s.volume * s.masterVolume));
}

/** Subset of preferences mirrored to the signed-in host's profile. */
export function syncablePreferences(s: StudioSettings = getSettings()) {
  return {
    volume: s.volume,
    masterVolume: s.masterVolume,
    muted: s.muted,
    reduceMotion: s.reduceMotion,
    graphics: s.graphics,
    backgroundEffects: s.backgroundEffects,
  };
}
