import { useEffect, useRef, useState } from "react";
import { useServerTimeOffset } from "@/hooks/use-server-time";

export interface Countdown {
  /** whole seconds remaining (ceil), null when no timer */
  seconds: number | null;
  /** 0..1 fraction of the window remaining */
  fraction: number;
  expired: boolean;
  /** raw derived milliseconds remaining */
  remainingMs: number;
}

export const DEFAULT_TIMER_DURATION_MS = 15_000;

/**
 * Derives the countdown from the session's start timestamp — the remaining
 * value is never stored, never decremented by an interval and never written
 * back to the server. Ticks on requestAnimationFrame so every surface shows
 * the same number at the same moment.
 */
export function useDerivedCountdown(
  startedAt: string | null | undefined,
  durationMs: number = DEFAULT_TIMER_DURATION_MS,
): Countdown {
  const offset = useServerTimeOffset();
  const [, force] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!startedAt) return;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      force((n) => (n + 1) % 1_000_000);
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [startedAt, durationMs]);

  if (!startedAt) return { seconds: null, fraction: 0, expired: false, remainingMs: 0 };

  const remainingMs = durationMs - (Date.now() + offset - Date.parse(startedAt));
  return {
    seconds: Math.max(0, Math.ceil(remainingMs / 1000)),
    fraction: Math.max(0, Math.min(1, remainingMs / durationMs)),
    expired: remainingMs <= 0,
    remainingMs,
  };
}

/**
 * Compatibility wrapper for surfaces holding the session's timer end
 * timestamp: the start timestamp is derived from it, then the same
 * rAF-driven derivation applies.
 */
export function useCountdown(
  timerEndsAt: string | null | undefined,
  durationMs: number = DEFAULT_TIMER_DURATION_MS,
): Countdown {
  const startedAt = timerEndsAt
    ? new Date(Date.parse(timerEndsAt) - durationMs).toISOString()
    : null;
  return useDerivedCountdown(startedAt, durationMs);
}
