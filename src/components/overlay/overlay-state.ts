import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getOverlayState } from "@/lib/play.functions";
import { useSessionRealtime } from "@/hooks/use-session-realtime";
import type { Category, Game, Player, QueueEntry, Session } from "@/lib/types";

export interface OverlayState {
  game: Game;
  session: Session;
  categories: Category[];
  tiles: { id: string; category_id: string; row_index: number; points: number }[];
  players: Player[];
  queue: QueueEntry[];
  clue: { category: string; points: number; question: string; answer: string | null } | null;
}

/** Fixed broadcast canvas — never responsive, only transform-scaled. */
export const CANVAS_W = 1920;
export const CANVAS_H = 1080;
export const SAFE = 60;

/**
 * Token-scoped overlay snapshot. Realtime is the only update mechanism:
 * the session channel invalidates this query on every state change, so the
 * mirror repaints in the same moment the host acts. Never polls.
 */
export function useOverlayState(token: string): OverlayState | null {
  const fetchState = useServerFn(getOverlayState);
  const { data } = useQuery({
    queryKey: ["overlay", token],
    queryFn: () => fetchState({ data: { token } }),
    enabled: /^[0-9a-f-]{36}$/i.test(token),
    refetchOnWindowFocus: false,
    retry: false,
  });
  const state = (data as unknown as OverlayState | null) ?? null;
  useSessionRealtime(state?.session.id, [["overlay", token]]);
  return state;
}

/** Strips the app shell chrome so the page composites cleanly over video. */
export function useTransparentPage() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("overlay-mode");
    return () => root.classList.remove("overlay-mode");
  }, []);
}
