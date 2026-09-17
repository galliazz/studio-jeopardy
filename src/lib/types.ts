import type { CSSProperties } from "react";

export type Team = "alpha" | "bravo";

/** Board typography target scopes the editor can restyle. */
export type TextScope = "numbers" | "questions" | "categories";

export interface TextStyle {
  /** CSS font-family stack. */
  font?: string;
  /** Multiplier applied to the scope's default size (0.6 – 1.8). */
  size?: number;
  /**
   * Peso esplicito (100–900). Quando c'è vince su `bold`, che resta per i
   * giochi salvati prima che questo esistesse.
   */
  weight?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface ThemeSettings {
  bg: string;
  card: string;
  accent: string;
  radius: number;
  rowPoints: number[];
  teamAlpha?: string;
  teamBravo?: string;
  customSounds?: { name: string; path: string }[];
  textStyles?: Partial<Record<TextScope, TextStyle>>;
  /**
   * Caselle Daily Double scelte a mano nella pagina di Edit. Vivono sul gioco
   * perché la sessione nasce solo quando si preme Play; ogni nuova partita le
   * eredita, e se la lista è vuota il server ne sorteggia due.
   */
  dailyDoubleTileIds?: string[];
}

export const DEFAULT_THEME: ThemeSettings = {
  bg: "#F4EAF8",
  card: "#E3D3F5",
  accent: "#5B3E77",
  radius: 30,
  rowPoints: [200, 400, 600, 800, 1000],
};

/**
 * Le famiglie disponibili sulla board.
 *
 * Solo caratteri già presenti sulla macchina o già caricati dall'app: una
 * famiglia che va scaricata comparirebbe dopo, e sulla trasmissione OBS
 * significa vedere la board cambiare forma in diretta.
 */
export const BOARD_FONTS: { label: string; value: string }[] = [
  { label: "Display", value: "" },
  { label: "Sans", value: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" },
  { label: "System", value: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { label: "Grotesk", value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: "Rounded", value: "'Trebuchet MS', 'Segoe UI', sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Old Style", value: "'Palatino Linotype', Palatino, 'Book Antiqua', serif" },
  { label: "Slab", value: "Rockwell, 'Courier Bold', Courier, Georgia, serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  { label: "Condensed", value: "'Arial Narrow', 'Helvetica Neue Condensed', sans-serif" },
  { label: "Handwriting", value: "'Bradley Hand', 'Segoe Script', cursive" },
];

/** I pesi offerti dal menu del carattere. Non tutte le famiglie li hanno tutti:
 *  dove manca il taglio, il browser lo sintetizza o si avvicina. */
export const FONT_WEIGHTS: { label: string; value: number }[] = [
  { label: "Light", value: 300 },
  { label: "Book", value: 400 },
  { label: "Medium", value: 500 },
  { label: "Bold", value: 700 },
  { label: "Black", value: 900 },
];

/**
 * CSS for a board text scope. `baseRem` is the scope's default size so the
 * stored multiplier scales it without breaking responsive defaults.
 */
export function textScopeCss(
  theme: ThemeSettings,
  scope: TextScope,
  baseRem?: number,
): CSSProperties {
  const s = theme.textStyles?.[scope];
  if (!s) return {};
  const css: CSSProperties = {};
  if (s.font) css.fontFamily = s.font;
  if (s.size && baseRem) css.fontSize = `${(baseRem * s.size).toFixed(3)}rem`;
  if (s.weight) css.fontWeight = s.weight;
  else if (s.bold !== undefined) css.fontWeight = s.bold ? 900 : 500;
  if (s.italic) css.fontStyle = "italic";
  if (s.underline) css.textDecoration = "underline";
  return css;
}


/**
 * Board/clue typography, container-relative. La dimensione salvata in Edit è un
 * MOLTIPLICATORE, non una misura fissa: qui moltiplica sia il termine che segue
 * la board (`cqmin`) sia il tetto massimo, così la scelta dell'host resta una
 * proporzione — la stessa a ogni dimensione di finestra — invece di un numero
 * di pixel che a schermo piccolo diventa sproporzionato.
 *
 * `capRem` è la dimensione di riferimento a board grande, `cqmin` quanta parte
 * della board occupa il carattere.
 */
export function boardTextCss(
  theme: ThemeSettings,
  scope: TextScope,
  /**
   * Tetto assoluto in rem, oppure `null` per non averne.
   *
   * Un tetto in rem dentro una misura in `cqmin` è incoerente: il primo non sa
   * niente del contenitore, la seconda è tutta contenitore. Finché il tetto non
   * morde il testo è proporzionale; appena morde diventa una dimensione fissa, e
   * la stessa griglia disegnata grande e disegnata piccola smette di avere le
   * stesse proporzioni. Dove la scatola misurata è davvero quella del testo il
   * tetto va tolto: non può esserci nulla di "troppo grande" rispetto a una
   * scatola che è già il metro.
   */
  capRem: number | null,
  cqmin: number,
): CSSProperties {
  const s = theme.textStyles?.[scope];
  const m = s?.size ?? 1;
  const css: CSSProperties = {
    fontSize:
      capRem === null
        ? `${(cqmin * m).toFixed(3)}cqmin`
        : `clamp(0.45rem, ${(cqmin * m).toFixed(3)}cqmin, ${(capRem * m).toFixed(3)}rem)`,
  };
  if (s?.font) css.fontFamily = s.font;
  if (s?.weight) css.fontWeight = s.weight;
  else if (s?.bold !== undefined) css.fontWeight = s.bold ? 900 : 500;
  if (s?.italic) css.fontStyle = "italic";
  if (s?.underline) css.textDecoration = "underline";
  return css;
}

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
  /** Private key that authorises the read-only OBS overlay mirrors. */
  overlay_token: string;
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
  profile: Pick<Profile, "id" | "username" | "avatar_url"> | null;
}

export const PLAYER_AVATARS = [
  "🎩", "🦊", "🐼", "🚀", "🎸", "🦄", "🤖", "👾",
  "🐙", "🦉", "🍕", "⚡", "🌵", "🐸", "💎", "🔥",
];

/** Relative luminance of a #rrggbb / #rgb string (0 = black, 1 = white). */
function hexLuma(hex?: string): number {
  if (!hex) return 1;
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return 1;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Resolve a board theme. Boards saved with the previous dark palette are
 * mapped onto the pastel defaults so the whole app reads as Material You.
 */
export function themeOf(game: Game): ThemeSettings {
  const merged = { ...DEFAULT_THEME, ...(game.theme ?? {}) };
  if (hexLuma(merged.bg) < 0.62 || hexLuma(merged.card) < 0.62) {
    merged.bg = DEFAULT_THEME.bg;
    merged.card = DEFAULT_THEME.card;
    merged.accent = DEFAULT_THEME.accent;
  }
  if (merged.radius < 16) merged.radius = 16;
  return merged;
}


export function teamName(theme: ThemeSettings, team: Team): string {
  const name = team === "alpha" ? theme.teamAlpha : theme.teamBravo;
  return name?.trim() || (team === "alpha" ? "Alpha" : "Bravo");
}

export function formatDelta(ms: number): string {
  if (ms < 1000) return `+${Math.round(ms)}ms`;
  return `+${(ms / 1000).toFixed(2)}s`;
}
