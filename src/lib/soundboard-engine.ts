/*
 * Soundboard playback engine.
 *
 * Uploaded clips are decoded into AudioBuffers once (when the host console
 * mounts) and triggered straight from memory, so a manual cue is instant on a
 * live stream. Trim offsets and per-clip gain are applied at playback time —
 * the stored file is never re-encoded, which keeps the trim re-editable.
 *
 * Preset clips are the app's synthesized cues (Web Audio, zero load time).
 * System sounds wired to game events live in @/lib/sfx and are NOT part of
 * this user-curated board.
 */

import { sfx } from "@/lib/sfx";
import { sfxGain } from "@/lib/settings";
import { signedUrl } from "@/lib/media";

export interface SoundboardClip {
  id: string;
  name: string;
  position: number;
  source: string;
  preset_key: string | null;
  storage_path: string | null;
  trim_start_ms: number;
  trim_end_ms: number;
  gain: number;
}

export interface PresetDef {
  key: string;
  name: string;
  /** approximate length in seconds, used for the chip progress line */
  duration: number;
  play: () => void;
}

export const PRESETS: PresetDef[] = [
  { key: "buzz", name: "Buzz in", duration: 0.5, play: () => sfx.buzz() },
  { key: "ding", name: "Correct", duration: 1.2, play: () => sfx.ding() },
  { key: "wrong", name: "Wrong", duration: 2.0, play: () => sfx.wrong() },
  { key: "alarm", name: "Time's up", duration: 1.4, play: () => sfx.alarm() },
  { key: "drumroll", name: "Drum roll", duration: 1.3, play: () => sfx.drumroll() },
  { key: "suspense", name: "Suspense sting", duration: 3.4, play: () => sfx.suspense() },
  { key: "dailyDouble", name: "Daily Double", duration: 1.3, play: () => sfx.dailyDouble() },
  { key: "applause", name: "Applause", duration: 1.2, play: () => sfx.applause() },
  { key: "fanfare", name: "Victory fanfare", duration: 3.0, play: () => sfx.fanfare() },
  { key: "sad", name: "Sad trombone", duration: 2.4, play: () => sfx.sad() },
];

export function presetByKey(key: string | null): PresetDef | undefined {
  return PRESETS.find((p) => p.key === key);
}

/* ------------------------------ audio context ----------------------------- */

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const buffers = new Map<string, AudioBuffer>();
const active = new Map<string, { source: AudioBufferSourceNode | null; endsAt: number; startedAt: number }>();

/** Board-level volume (0..1), separate from the Settings SFX volume. */
let boardVolume = 0.9;
export function setBoardVolume(v: number) {
  boardVolume = Math.max(0, Math.min(1, v));
}
export function getBoardVolume() {
  return boardVolume;
}

/** Decodes an uploaded clip into memory. Safe to call repeatedly. */
export async function preloadClip(clip: SoundboardClip): Promise<void> {
  if (clip.source !== "upload" || !clip.storage_path) return;
  if (buffers.has(clip.storage_path)) return;
  const audio = ac();
  if (!audio) return;
  const url = await signedUrl("game-media", clip.storage_path);
  const res = await fetch(url);
  const raw = await res.arrayBuffer();
  const decoded = await audio.decodeAudioData(raw);
  buffers.set(clip.storage_path, decoded);
}

export async function preloadAll(clips: SoundboardClip[]): Promise<void> {
  await Promise.all(clips.map((c) => preloadClip(c).catch(() => undefined)));
}

export function bufferFor(path: string | null): AudioBuffer | null {
  return path ? (buffers.get(path) ?? null) : null;
}

/** Decodes a local File (used by the trim step before upload completes). */
export async function decodeFile(file: File): Promise<AudioBuffer | null> {
  const audio = ac();
  if (!audio) return null;
  return audio.decodeAudioData(await file.arrayBuffer());
}

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() {
  listeners.forEach((l) => l());
}
export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Playing state + progress (0..1) for a clip, or null when idle. */
export function progressOf(clipId: string): number | null {
  const a = active.get(clipId);
  if (!a) return null;
  const now = performance.now();
  if (now >= a.endsAt) return null;
  return (now - a.startedAt) / Math.max(1, a.endsAt - a.startedAt);
}

function markActive(clipId: string, durationSec: number, source: AudioBufferSourceNode | null) {
  const startedAt = performance.now();
  active.set(clipId, { source, endsAt: startedAt + durationSec * 1000, startedAt });
  emit();
  window.setTimeout(() => {
    const cur = active.get(clipId);
    if (cur && cur.startedAt === startedAt) {
      active.delete(clipId);
      emit();
    }
  }, durationSec * 1000);
}

/**
 * Fires a clip. Overlapping cues are allowed — a new clip never cuts another
 * one off, only "Stop all" does.
 */
export function playClip(clip: SoundboardClip) {
  if (clip.source === "preset") {
    const preset = presetByKey(clip.preset_key);
    if (!preset) return;
    preset.play();
    markActive(clip.id, preset.duration, null);
    return;
  }
  const audio = ac();
  const buffer = bufferFor(clip.storage_path);
  if (!audio || !buffer) return;
  const start = clip.trim_start_ms / 1000;
  const end = clip.trim_end_ms > clip.trim_start_ms ? clip.trim_end_ms / 1000 : buffer.duration;
  const duration = Math.max(0.05, Math.min(end, buffer.duration) - start);
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const gainNode = audio.createGain();
  gainNode.gain.value = Math.max(0, clip.gain) * boardVolume * sfxGain();
  src.connect(gainNode).connect(audio.destination);
  src.start(0, start, duration);
  markActive(clip.id, duration, src);
}

/** Preview an arbitrary buffer slice (trim step). Returns a stop function. */
export function playBufferSlice(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
  gain: number,
  loop: boolean,
): () => void {
  const audio = ac();
  if (!audio) return () => undefined;
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const g = audio.createGain();
  g.gain.value = Math.max(0, gain) * boardVolume * sfxGain();
  src.connect(g).connect(audio.destination);
  if (loop) {
    src.loop = true;
    src.loopStart = startSec;
    src.loopEnd = endSec;
  }
  src.start(0, startSec, loop ? undefined : Math.max(0.05, endSec - startSec));
  return () => {
    try {
      src.stop();
    } catch {
      /* already stopped */
    }
  };
}

/** Hard stop: cuts every uploaded clip currently sounding. */
export function stopAll() {
  active.forEach((a) => {
    try {
      a.source?.stop();
    } catch {
      /* already stopped */
    }
  });
  active.clear();
  emit();
}
