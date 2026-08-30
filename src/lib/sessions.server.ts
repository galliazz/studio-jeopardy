export const DEFAULT_TIMER_SECONDS = 15;
const MIN_TIMER_SECONDS = 5;
const MAX_TIMER_SECONDS = 120;

/** Durata valida entro i limiti, con ripiego sul default. */
export function clampTimerSeconds(seconds: number | null | undefined): number {
  if (!Number.isFinite(seconds ?? NaN)) return DEFAULT_TIMER_SECONDS;
  return Math.min(MAX_TIMER_SECONDS, Math.max(MIN_TIMER_SECONDS, Math.round(seconds as number)));
}

export function timerEnd(seconds?: number | null): string {
  return new Date(Date.now() + clampTimerSeconds(seconds) * 1000).toISOString();
}

export function shuffleIds(ids: string[]): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = arr[i];
    const picked = arr[j];
    if (current === undefined || picked === undefined) continue;
    arr[i] = picked;
    arr[j] = current;
  }
  return arr;
}