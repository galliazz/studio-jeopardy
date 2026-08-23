import { useEffect, useState } from "react";

export interface Countdown {
  /** whole seconds remaining (ceil), null when no timer */
  seconds: number | null;
  /** 0..1 fraction of the 15s window remaining */
  fraction: number;
  expired: boolean;
}

/** Ticks a countdown against a server-provided end timestamp (15s window). */
export function useCountdown(timerEndsAt: string | null | undefined): Countdown {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (!timerEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [timerEndsAt]);

  if (!timerEndsAt) return { seconds: null, fraction: 0, expired: false };
  const msLeft = new Date(timerEndsAt).getTime() - now;
  const seconds = Math.max(0, Math.ceil(msLeft / 1000));
  return {
    seconds,
    fraction: Math.max(0, Math.min(1, msLeft / 15000)),
    expired: msLeft <= 0,
  };
}
