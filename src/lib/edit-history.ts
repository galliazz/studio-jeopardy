/**
 * Annulla e ripristina nella pagina di modifica.
 *
 * Ogni cambiamento registra come si disfa e come si rifà: due funzioni che
 * chiamano il server con i valori di prima e con quelli di dopo. Non si
 * fotografa tutto il tabellone a ogni tasto — sarebbero migliaia di righe in
 * memoria e un salvataggio che sovrascrive anche quello che non hai toccato.
 *
 * La pila vive finché la pagina è aperta: ricaricando si riparte da zero. La
 * cronologia che sopravvive alle sessioni è un'altra cosa, e vuole il
 * database.
 */

export interface HistoryAction {
  /** Cosa è stato fatto, per il messaggio dopo l'annullamento. */
  label: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export interface HistoryState {
  past: HistoryAction[];
  future: HistoryAction[];
}

export const EMPTY_HISTORY: HistoryState = { past: [], future: [] };

/** Quante azioni si tengono. Oltre, le più vecchie cadono. */
export const HISTORY_LIMIT = 50;

/**
 * Una nuova azione svuota il futuro: dopo aver annullato, se si modifica
 * qualcosa d'altro, il ramo che si stava ripristinando non esiste più.
 */
export function pushed(
  state: HistoryState,
  action: HistoryAction,
  limit: number = HISTORY_LIMIT,
): HistoryState {
  const past = [...state.past, action];
  return { past: past.slice(Math.max(0, past.length - limit)), future: [] };
}

export function undone(state: HistoryState): { state: HistoryState; action: HistoryAction | null } {
  const action = state.past.at(-1) ?? null;
  if (!action) return { state, action: null };
  return { state: { past: state.past.slice(0, -1), future: [action, ...state.future] }, action };
}

export function redone(state: HistoryState): { state: HistoryState; action: HistoryAction | null } {
  const action = state.future[0] ?? null;
  if (!action) return { state, action: null };
  return { state: { past: [...state.past, action], future: state.future.slice(1) }, action };
}

export const canUndo = (state: HistoryState) => state.past.length > 0;
export const canRedo = (state: HistoryState) => state.future.length > 0;

/**
 * La scorciatoia di sistema: ⌘Z e ⌘⇧Z sul Mac, Ctrl+Z e Ctrl+Y altrove.
 * Mentre si scrive in un campo non vale: lì l'annullamento è quello del
 * browser, che disfa le lettere e non le caselle.
 */
export interface ShortcutEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  /* Basta la forma: `tagName` e `isContentEditable` ce l'ha qualunque
     elemento, e così la funzione gira anche in un test senza browser. */
  target?: { tagName?: string; isContentEditable?: boolean } | null;
}

export function historyShortcut(e: ShortcutEvent): "undo" | "redo" | null {
  if (!e.metaKey && !e.ctrlKey) return null;
  const el = e.target;
  const tag = el?.tagName;
  if (el?.isContentEditable || (tag && ["INPUT", "TEXTAREA", "SELECT"].includes(tag))) return null;
  const key = e.key.toLowerCase();
  if (key === "z") return e.shiftKey ? "redo" : "undo";
  if (key === "y") return "redo";
  return null;
}
