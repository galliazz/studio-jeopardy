import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getOverlayState } from "@/lib/play.functions";
import { GUEST_TABLES, useSessionRealtime } from "@/hooks/use-session-realtime";
import { forceDarkMode, darkBoardColors } from "@/lib/theme-mode";
import { themeOf, type Category, type Game, type Player, type QueueEntry, type Session, type ThemeSettings, type Tile } from "@/lib/types";

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
 * Token-scoped overlay snapshot. Realtime is the only update mechanism: the
 * session channel (the very same hook the Host Console subscribes to)
 * invalidates this query on every state change, so the mirror repaints in the
 * same moment the host acts. Never polls.
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
  useSessionRealtime(state?.session.id, [["overlay", token]], GUEST_TABLES);
  return state;
}

/** Board palette for the mirror — always the dark-mode resolution. */
export function useOverlayTheme(state: OverlayState | null): ThemeSettings {
  return useMemo(
    () => (state ? darkBoardColors(themeOf(state.game), true) : darkBoardColors(themeOf({ theme: null } as unknown as Game), true)),
    [state?.game],
  );
}

/**
 * The clue view consumes a Tile. The overlay only receives the public clue
 * projection, so it is adapted here rather than re-implemented.
 */
export function overlayTile(state: OverlayState): Tile | null {
  if (!state.clue || !state.session.current_tile_id) return null;
  const id = state.session.current_tile_id;
  const meta = state.tiles.find((t) => t.id === id);
  return {
    id,
    category_id: meta?.category_id ?? "",
    row_index: meta?.row_index ?? 0,
    points: state.clue.points,
    question: state.clue.question,
    answer: state.clue.answer ?? "",
    hint: null,
    image_url: null,
    audio_url: null,
  };
}

/**
 * Strips the app shell chrome so the page composites cleanly over video, and
 * pins dark mode: an OBS browser source has no session and no stored
 * preference, and a light overlay is never correct.
 */
export function useTransparentPage() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("overlay-mode");
    forceDarkMode();
    return () => root.classList.remove("overlay-mode");
  }, []);
}
