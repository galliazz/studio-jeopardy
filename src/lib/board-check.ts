/**
 * Il controllo «si può giocare?» del tabellone.
 *
 * Sta qui e non nella pagina perché è una regola, non un disegno: una casella
 * senza domanda o senza risposta, in diretta, è una casella che l'host apre e
 * poi deve saltare davanti a tutti.
 */
import type { Category, Tile } from "@/lib/types";
import { stripHtml } from "@/lib/sanitize";

/**
 * Manca la domanda o manca la risposta. Il suggerimento no: è facoltativo per
 * definizione, e segnarlo come mancante vorrebbe dire chiederlo sempre.
 *
 * La domanda si misura dopo aver tolto i tag: un `<p></p>` lasciato
 * dall'editor è vuoto per chi legge, e deve esserlo anche qui.
 */
export function isTileIncomplete(tile: Pick<Tile, "question" | "answer">): boolean {
  return !stripHtml(tile.question).trim() || !tile.answer.trim();
}

/** I titoli che il database mette di suo quando una categoria nasce vuota. */
const PLACEHOLDER_TITLES = new Set(["", "untitled", "new category", "categoria", "category"]);

export function isCategoryUntitled(title: string): boolean {
  return PLACEHOLDER_TITLES.has(title.trim().toLowerCase());
}

/** Quello che resta da sistemare, nell'ordine in cui si legge il tabellone. */
export function boardIssues(tiles: readonly Tile[], categories: readonly Category[]) {
  return {
    tiles: tiles.filter(isTileIncomplete),
    categories: categories.filter((c) => isCategoryUntitled(c.title)),
  };
}
