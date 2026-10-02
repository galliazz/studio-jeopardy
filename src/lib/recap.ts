import type { Category, Player, QueueEntry, Tile } from "@/lib/types";

/**
 * Il riepilogo di fine partita.
 *
 * Alla fine restano due numeri e un vincitore: chi ha giocato non sa quante
 * volte ha prenotato per primo, né quale categoria ha fatto cadere tutti.
 * Sono le cose che si raccontano dopo, e il database le sa già: basta
 * leggerle dalla coda delle prenotazioni.
 *
 * Qui non c'è niente di casuale e niente di asincrono: è una funzione pura,
 * e per questo si può provare con un test invece che giocando una partita.
 */

export interface PlayerRecap {
  playerId: string;
  name: string;
  avatar: string;
  /** Quante volte ha premuto. */
  buzzes: number;
  /** Quante volte è arrivato primo su una casella. */
  firsts: number;
  correct: number;
  wrong: number;
}

export interface Recap {
  players: PlayerRecap[];
  /** Chi ha risposto bene più volte (a parità, chi ha prenotato più spesso). */
  topScorer: PlayerRecap | null;
  /** Chi è arrivato primo più spesso: il dito più veloce. */
  fastestFinger: PlayerRecap | null;
  /** La categoria con più risposte sbagliate. */
  hardestCategory: { title: string; wrong: number } | null;
  totalBuzzes: number;
  tilesPlayed: number;
}

export function buildRecap({
  queue,
  tiles,
  categories,
  players,
}: {
  queue: readonly QueueEntry[];
  tiles: readonly Tile[];
  categories: readonly Category[];
  players: readonly Player[];
}): Recap {
  const byTile = new Map<string, QueueEntry[]>();
  for (const entry of queue) {
    const list = byTile.get(entry.tile_id) ?? [];
    list.push(entry);
    byTile.set(entry.tile_id, list);
  }

  const firstOf = new Map<string, string>();
  for (const [tileId, entries] of byTile) {
    const first = [...entries].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
    if (first) firstOf.set(tileId, first.player_id);
  }

  const recaps = players.map<PlayerRecap>((p) => {
    const mine = queue.filter((q) => q.player_id === p.id);
    return {
      playerId: p.id,
      name: p.name,
      avatar: p.avatar,
      buzzes: mine.length,
      firsts: [...firstOf.values()].filter((id) => id === p.id).length,
      correct: mine.filter((q) => q.status === "correct").length,
      wrong: mine.filter((q) => q.status === "wrong").length,
    };
  });

  const best = <K extends keyof PlayerRecap>(key: K, tieBreak: keyof PlayerRecap) => {
    const ranked = recaps
      .filter((r) => Number(r[key]) > 0)
      .sort((a, b) => Number(b[key]) - Number(a[key]) || Number(b[tieBreak]) - Number(a[tieBreak]));
    return ranked[0] ?? null;
  };

  const categoryOf = new Map(tiles.map((tile) => [tile.id, tile.category_id]));
  const titleOf = new Map(categories.map((c) => [c.id, c.title]));
  const wrongByCategory = new Map<string, number>();
  for (const entry of queue) {
    if (entry.status !== "wrong") continue;
    const categoryId = categoryOf.get(entry.tile_id);
    if (!categoryId) continue;
    wrongByCategory.set(categoryId, (wrongByCategory.get(categoryId) ?? 0) + 1);
  }
  const hardest = [...wrongByCategory.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    players: recaps.sort((a, b) => b.correct - a.correct || b.firsts - a.firsts),
    topScorer: best("correct", "buzzes"),
    fastestFinger: best("firsts", "buzzes"),
    hardestCategory: hardest ? { title: titleOf.get(hardest[0]) ?? "", wrong: hardest[1] } : null,
    totalBuzzes: queue.length,
    tilesPlayed: byTile.size,
  };
}
