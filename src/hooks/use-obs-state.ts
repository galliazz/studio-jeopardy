import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getObsState } from "@/lib/play.functions";
import { useSessionRealtime } from "@/hooks/use-session-realtime";
import type { Category, Game, Player, QueueEntry, Session } from "@/lib/types";

export interface ObsState {
  game: Game;
  session: Session;
  categories: Category[];
  tiles: { id: string; category_id: string; row_index: number; points: number }[];
  players: Player[];
  queue: QueueEntry[];
}

/** Shared polling + realtime wiring for the public OBS overlay routes. */
export function useObsState(code: string) {
  const fetchState = useServerFn(getObsState);
  const { data } = useQuery({
    queryKey: ["obs", code],
    queryFn: () => fetchState({ data: { code } }),
    enabled: code.length >= 4,
    refetchOnWindowFocus: false,
  });
  const state = data && !("error" in data) ? (data as unknown as ObsState) : null;
  useSessionRealtime(state?.session.id, [["obs", code]]);
  return state;
}
