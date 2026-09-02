import { useEffect, useState } from "react";
import { getServerTime } from "@/lib/server-time.functions";

/**
 * server_time_offset_ms — measured once per connect, then shared by every
 * surface in the tab. Adding it to Date.now() yields the server clock, so the
 * host console, OBS overlays and player phones derive identical countdowns
 * from the same session start timestamp.
 */
let offsetMs = 0;
let measured: Promise<number> | null = null;
const listeners = new Set<(v: number) => void>();

export function serverTimeOffsetMs() {
  return offsetMs;
}

export function serverNow() {
  return Date.now() + offsetMs;
}

function measure(): Promise<number> {
  if (measured) return measured;
  measured = (async () => {
    try {
      const sentAt = Date.now();
      const { now } = await getServerTime();
      const receivedAt = Date.now();
      const roundTrip = receivedAt - sentAt;
      // Assume a symmetric round trip: the server reading matches the midpoint.
      offsetMs = now + roundTrip / 2 - receivedAt;
    } catch {
      offsetMs = 0;
    }
    listeners.forEach((l) => l(offsetMs));
    return offsetMs;
  })();
  return measured;
}

/** Reactive access to the measured offset (0 until the first reading lands). */
export function useServerTimeOffset(): number {
  const [value, setValue] = useState(offsetMs);
  useEffect(() => {
    listeners.add(setValue);
    void measure();
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}
