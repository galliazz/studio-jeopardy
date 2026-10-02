/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildRecap } from "./recap.ts";
import type { Category, Player, QueueEntry, Tile } from "./types.ts";

const player = (id: string, name: string): Player =>
  ({
    id,
    session_id: "s",
    name,
    avatar: "🦊",
    team: "alpha",
    locked_out: false,
    created_at: "",
  }) as Player;

const tile = (id: string, categoryId: string): Tile =>
  ({
    id,
    category_id: categoryId,
    row_index: 0,
    points: 200,
    question: "",
    answer: "",
    hint: null,
    image_url: null,
    audio_url: null,
    created_at: "",
  }) as Tile;

const category = (id: string, title: string): Category =>
  ({ id, game_id: "g", title, position: 0, created_at: "" }) as Category;

const entry = (
  playerId: string,
  tileId: string,
  status: QueueEntry["status"],
  at: string,
): QueueEntry =>
  ({
    id: `${playerId}-${tileId}-${at}`,
    session_id: "s",
    tile_id: tileId,
    player_id: playerId,
    status,
    created_at: at,
    judged_at: null,
  }) as QueueEntry;

const base = {
  players: [player("p1", "Giulia"), player("p2", "Marco")],
  tiles: [tile("t1", "c1"), tile("t2", "c2")],
  categories: [category("c1", "Storia"), category("c2", "Musica")],
};

describe("riepilogo di fine partita", () => {
  test("conta prenotazioni, primi posti, giuste e sbagliate", () => {
    const recap = buildRecap({
      ...base,
      queue: [
        entry("p1", "t1", "correct", "2026-09-01T20:00:01.000Z"),
        entry("p2", "t1", "cleared", "2026-09-01T20:00:02.000Z"),
        entry("p2", "t2", "wrong", "2026-09-01T20:01:00.000Z"),
        entry("p1", "t2", "correct", "2026-09-01T20:01:05.000Z"),
      ],
    });
    const giulia = recap.players.find((p) => p.name === "Giulia")!;
    assert.deepEqual(
      {
        buzzes: giulia.buzzes,
        firsts: giulia.firsts,
        correct: giulia.correct,
        wrong: giulia.wrong,
      },
      { buzzes: 2, firsts: 1, correct: 2, wrong: 0 },
    );
    assert.equal(recap.totalBuzzes, 4);
    assert.equal(recap.tilesPlayed, 2);
  });

  test("il dito più veloce è chi arriva primo, non chi preme di più", () => {
    // Marco preme ovunque ma sempre dopo: premere tanto non è una medaglia.
    const recap = buildRecap({
      ...base,
      queue: [
        entry("p1", "t1", "correct", "2026-09-01T20:00:01.000Z"),
        entry("p2", "t1", "cleared", "2026-09-01T20:00:02.000Z"),
        entry("p1", "t2", "wrong", "2026-09-01T20:01:00.000Z"),
        entry("p2", "t2", "cleared", "2026-09-01T20:01:01.000Z"),
      ],
    });
    assert.equal(recap.fastestFinger?.name, "Giulia");
    assert.equal(recap.fastestFinger?.firsts, 2);
  });

  test("la categoria più dura è quella con più risposte sbagliate", () => {
    const recap = buildRecap({
      ...base,
      queue: [
        entry("p1", "t2", "wrong", "2026-09-01T20:00:01.000Z"),
        entry("p2", "t2", "wrong", "2026-09-01T20:00:02.000Z"),
        entry("p1", "t1", "wrong", "2026-09-01T20:00:03.000Z"),
      ],
    });
    assert.deepEqual(recap.hardestCategory, { title: "Musica", wrong: 2 });
  });

  test("una partita senza prenotazioni non inventa primati", () => {
    const recap = buildRecap({ ...base, queue: [] });
    assert.equal(recap.topScorer, null);
    assert.equal(recap.fastestFinger, null);
    assert.equal(recap.hardestCategory, null);
    assert.equal(recap.tilesPlayed, 0);
  });
});
