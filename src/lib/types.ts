export type Team = "alpha" | "bravo";

export interface ThemeSettings {
  bg: string;
  card: string;
  accent: string;
  radius: number;
  rowPoints: number[];
  customSounds?: { name: string; path: string }[];
}

export const DEFAULT_THEME: ThemeSettings = {
  bg: "#070714",
  card: "#141433",
  accent: "#f7b731",
  radius: 24,
  rowPoints: [200, 400, 600, 800, 1000],
};

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface Game {
  id: string;
  host_id: string;
  title: string;
  join_code: string;
  theme: ThemeSettings;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  game_id: string;
  title: string;
  position: number;
}

export interface Tile {
  id: string;
  category_id: string;
  row_index: number;
  points: number;
  question: string;
  answer: string;
  hint: string | null;
  image_url: string | null;
  audio_url: string | null;
}

export type SessionStatus = "lobby" | "live" | "final" | "finished";

export type SessionPhase =
  | "idle"
  | "question_open"
  | "answering"
  | "reveal"
  | "daily_double_wager"
  | "final_wager"
  | "final_answer";

export interface Session {
  id: string;
  game_id: string;
  host_id: string;
  status: SessionStatus;
  phase: SessionPhase;
  current_tile_id: string | null;
  active_player_id: string | null;
  timer_ends_at: string | null;
  score_alpha: number;
  score_bravo: number;
  used_tile_ids: string[];
  daily_double_tile_ids: string[];
  dd_wager: number | null;
  final_question: string | null;
  final_answer: string | null;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  session_id: string;
  name: string;
  avatar: string;
  team: Team;
  locked_out: boolean;
  created_at: string;
}

export type QueueStatus = "queued" | "active" | "correct" | "wrong" | "cleared";

export interface QueueEntry {
  id: string;
  session_id: string;
  tile_id: string;
  player_id: string;
  status: QueueStatus;
  created_at: string;
  judged_at: string | null;
}

export interface FinalAnswer {
  id: string;
  session_id: string;
  team: Team;
  wager: number;
  answer: string;
  judged: boolean | null;
  submitted_at: string;
}

export interface BoardData {
  game: Game;
  categories: Category[];
  tiles: Tile[];
}

export const PLAYER_AVATARS = [
  "🎩", "🦊", "🐼", "🚀", "🎸", "🦄", "🤖", "👾",
  "🐙", "🦉", "🍕", "⚡", "🌵", "🐸", "💎", "🔥",
];

export function themeOf(game: Game): ThemeSettings {
  return { ...DEFAULT_THEME, ...(game.theme ?? {}) };
}

export function formatDelta(ms: number): string {
  if (ms < 1000) return `+${Math.round(ms)}ms`;
  return `+${(ms / 1000).toFixed(2)}s`;
}
