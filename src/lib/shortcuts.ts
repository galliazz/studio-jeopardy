/**
 * The host console's keyboard map, in one place: the `keydown` handler and the
 * reference list inside Settings must never drift apart.
 */
export const SHORTCUTS: [key: string, description: string][] = [
  ["Space", "Reveal the answer"],
  ["C", "Judge correct"],
  ["X", "Judge wrong"],
  ["N", "Pass to next player"],
  ["R", "Restart the timer"],
  ["Esc", "Close the open tile"],
  ["1 – 9", "Trigger soundboard clip"],
  ["?", "Open settings"],
];

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
