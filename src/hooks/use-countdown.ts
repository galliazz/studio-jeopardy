import { useEffect, useState } from "react";

export interface Countdown {
  /** whole seconds remaining (ceil), null when no timer */
  seconds: number | null;
  /** 0..1 fraction of the window remaining */
  fraction: number;
  expired: boolean;
}

/**
 * Ticks a countdown against a server-provided end timestamp.
 *
 * La durata della finestra arriva dalla sessione: era fissa a 15 secondi, quindi
 * con un timer impostato su 30 la barra di avanzamento risultava già piena a
 * metà corsa.
 */
export function useCountdown(
  timerEndsAt: string | null | undefined,
  windowSeconds: number | null | undefined = 15,
): Countdown {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (!timerEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [timerEndsAt]);

  if (!timerEndsAt) return { seconds: null, fraction: 0, expired: false };
  const windowMs = Math.max(1, (windowSeconds ?? 15) * 1000);
  const msLeft = new Date(timerEndsAt).getTime() - now;
  const seconds = Math.max(0, Math.ceil(msLeft / 1000));
  return {
    seconds,
    fraction: Math.max(0, Math.min(1, msLeft / windowMs)),
    expired: msLeft <= 0,
  };
}
