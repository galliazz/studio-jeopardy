/**
 * La mappa dei tasti della console dell'host, in un posto solo: il gestore dei
 * `keydown` e l'elenco dentro le impostazioni non devono poter divergere.
 *
 * Le assegnazioni dell'host vivono nelle sue preferenze e viaggiano col
 * profilo, così le ritrova su qualunque computer.
 */

export type ShortcutAction =
  | "reveal"
  | "judgeCorrect"
  | "judgeWrong"
  | "passToNext"
  | "restartTimer"
  | "closeTile";

export const SHORTCUT_ACTIONS: { id: ShortcutAction; label: string; fallback: string }[] = [
  { id: "reveal", label: "Reveal the answer", fallback: " " },
  { id: "judgeCorrect", label: "Judge correct", fallback: "c" },
  { id: "judgeWrong", label: "Judge wrong", fallback: "x" },
  { id: "passToNext", label: "Pass to next player", fallback: "n" },
  { id: "restartTimer", label: "Restart the timer", fallback: "r" },
  { id: "closeTile", label: "Close the open tile", fallback: "Escape" },
];

/** Tasti di sistema: si mostrano, non si riassegnano. */
export const FIXED_SHORTCUTS: [key: string, description: string][] = [
  ["1 – 9", "Trigger soundboard clip"],
  ["?", "Open settings"],
];

/** Confronto e memorizzazione avvengono sempre sulla forma normalizzata. */
export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

/** Come il tasto va scritto a schermo. */
export function keyLabel(key: string): string {
  if (key === " ") return "Space";
  if (key === "Escape") return "Esc";
  if (key.startsWith("Arrow")) return key.slice(5);
  return key.length === 1 ? key.toUpperCase() : key;
}

/** Azione → tasto, con le scelte dell'host sopra i valori di fabbrica. */
export function resolveShortcuts(
  custom?: Partial<Record<ShortcutAction, string>> | undefined,
): Record<ShortcutAction, string> {
  const out = {} as Record<ShortcutAction, string>;
  for (const a of SHORTCUT_ACTIONS) out[a.id] = normalizeKey(custom?.[a.id] || a.fallback);
  return out;
}

/** Tasto → azione, la direzione che serve al gestore dei `keydown`. */
export function shortcutLookup(resolved: Record<ShortcutAction, string>): Record<string, ShortcutAction> {
  const map: Record<string, ShortcutAction> = {};
  for (const a of SHORTCUT_ACTIONS) map[resolved[a.id]] = a.id;
  return map;
}

/*
 * Superfici che devono zittire le scorciatoie globali mentre hanno il fuoco.
 * `role="dialog"` da solo non bastava: il menu dell'account di Radix è un
 * `role="menu"`, quindi con il menu aperto un Esc — quello con cui lo si chiude
 * — arrivava anche a `window` e chiudeva la domanda in corso, segnandola come
 * giocata. Ora che nel menu è finita tutta la cassetta degli attrezzi dell'host,
 * quel tasto lo si preme di continuo.
 */
const FOCUS_TRAPS =
  '[role="dialog"],[role="menu"],[role="menuitem"],[role="listbox"],[data-radix-popper-content-wrapper]';

/** True while a text field, a dialog or a menu owns focus — shortcuts stay off then. */
export function shortcutsSuppressed(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return true;
  return Boolean(el.closest(FOCUS_TRAPS));
}
