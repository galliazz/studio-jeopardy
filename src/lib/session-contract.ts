import { DEFAULT_TIMER_DURATION_MS } from "@/hooks/use-countdown";
import type { Category, Game, Player, QueueEntry, Session, Tile } from "@/lib/types";

/**
 * SESSION STATE CONTRACT — a read-only projection of backend rows.
 * Nothing here invents or stores game state: every field is derived from the
 * session, player, queue and tile rows the backend already owns.
 */
export type ContractPhase =
  | "lobby"
  | "board"
  | "clue_open"
  | "buzzed"
  | "revealed"
  | "final"
  | "ended";

export type TimerState = "idle" | "running" | "expired" | "stopped";

export interface ContractClue {
  category: string;
  value: number;
  text: string;
}

export interface ContractBuzz {
  player_id: string;
  display_name: string;
  team_id: string;
  buzzed_at: string;
}

export interface ContractPlayer {
  id: string;
  display_name: string;
  avatar_url: string;
  team_id: string;
  connected: boolean;
}

export interface ContractTeam {
  id: string;
  name: string;
  color: string;
  score: number;
}

export interface ContractTile {
  id: string;
  category: string;
  value: number;
  used: boolean;
}

export interface SessionState {
  phase: ContractPhase;
  active_tile_id: string | null;
  active_clue: ContractClue | null;
  active_answer: string | null;
  buzz_order: ContractBuzz[];
  active_player_id: string | null;
  timer_started_at: string | null;
  timer_duration_ms: number;
  timer_state: TimerState;
  players: ContractPlayer[];
  teams: ContractTeam[];
  tiles: ContractTile[];
  board_color: string;
  server_time_offset_ms: number;
}

function mapPhase(session: Session): ContractPhase {
  if (session.status === "finished") return "ended";
  if (session.status === "lobby") return "lobby";
  if (session.status === "final") return "final";
  switch (session.phase) {
    case "question_open":
    case "daily_double_wager":
      return "clue_open";
    case "answering":
      return "buzzed";
    case "reveal":
      return "revealed";
    case "final_wager":
    case "final_answer":
      return "final";
    default:
      return "board";
  }
}

export interface ContractSources {
  game: Game;
  session: Session;
  categories: Category[];
  tiles: Pick<Tile, "id" | "category_id" | "points">[];
  players: Player[];
  queue: QueueEntry[];
  /** Full clue row, only when the host is allowed to see it. */
  activeTile?: Pick<Tile, "id" | "question" | "answer" | "points" | "category_id"> | null;
  teamNames?: { alpha: string; bravo: string };
  serverTimeOffsetMs?: number;
}

/** Projects backend rows onto the session state contract. */
export function toSessionState({
  game,
  session,
  categories,
  tiles,
  players,
  queue,
  activeTile,
  teamNames,
  serverTimeOffsetMs = 0,
}: ContractSources): SessionState {
  const categoryTitle = new Map(categories.map((c) => [c.id, c.title]));
  const phase = mapPhase(session);
  const used = new Set(session.used_tile_ids);
  const playerName = new Map(players.map((p) => [p.id, p.name]));
  const playerTeam = new Map(players.map((p) => [p.id, p.team as string]));

  const durationMs = DEFAULT_TIMER_DURATION_MS;
  const endsAt = session.timer_ends_at ? Date.parse(session.timer_ends_at) : null;
  const startedAt = endsAt !== null ? new Date(endsAt - durationMs).toISOString() : null;
  const timerState: TimerState =
    endsAt === null
      ? "idle"
      : endsAt - (Date.now() + serverTimeOffsetMs) <= 0
        ? "expired"
        : "running";

  return {
    phase,
    active_tile_id: session.current_tile_id,
    active_clue:
      activeTile && session.current_tile_id
        ? {
            category: categoryTitle.get(activeTile.category_id) ?? "",
            value: activeTile.points,
            text: activeTile.question,
          }
        : null,
    active_answer: phase === "revealed" && activeTile ? activeTile.answer : null,
    buzz_order: queue.map((q) => ({
      player_id: q.player_id,
      display_name: playerName.get(q.player_id) ?? "Player",
      team_id: playerTeam.get(q.player_id) ?? "alpha",
      buzzed_at: q.created_at,
    })),
    active_player_id: session.active_player_id,
    timer_started_at: startedAt,
    timer_duration_ms: durationMs,
    timer_state: timerState,
    players: players.map((p) => ({
      id: p.id,
      display_name: p.name,
      avatar_url: p.avatar,
      team_id: p.team,
      connected: !p.locked_out,
    })),
    teams: [
      {
        id: "alpha",
        name: teamNames?.alpha ?? "Alpha",
        color: "var(--team-alpha)",
        score: session.score_alpha,
      },
      {
        id: "bravo",
        name: teamNames?.bravo ?? "Bravo",
        color: "var(--team-bravo)",
        score: session.score_bravo,
      },
    ],
    tiles: tiles.map((t) => ({
      id: t.id,
      category: categoryTitle.get(t.category_id) ?? "",
      value: t.points,
      used: used.has(t.id),
    })),
    board_color: game.theme.card,
    server_time_offset_ms: serverTimeOffsetMs,
  };
}
