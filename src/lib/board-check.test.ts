/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { boardIssues, isCategoryUntitled, isTileIncomplete } from "./board-check.ts";
import type { Category, Tile } from "./types.ts";

const tile = (over: Partial<Tile> = {}): Tile =>
  ({
    id: "t1",
    category_id: "c1",
    row_index: 0,
    points: 200,
    question: "<p>Chi dipinse la Gioconda?</p>",
    answer: "Leonardo",
    hint: null,
    image_url: null,
    audio_url: null,
    created_at: "2026-09-01T20:00:00.000Z",
    ...over,
  }) as Tile;

const category = (title: string): Category =>
  ({ id: "c1", game_id: "g1", title, position: 0, created_at: "" }) as Category;

describe("caselle da completare", () => {
  test("una casella con domanda e risposta è a posto", () => {
    assert.equal(isTileIncomplete(tile()), false);
  });

  test("senza risposta non è giocabile", () => {
    assert.equal(isTileIncomplete(tile({ answer: "   " })), true);
  });

  test("una domanda fatta di soli tag vuoti conta come vuota", () => {
    // L'editor lascia <p><br></p> quando si cancella tutto: a schermo è vuota,
    // e il controllo deve vederla come la vede chi gioca.
    assert.equal(isTileIncomplete(tile({ question: "<p><br></p>" })), true);
    assert.equal(isTileIncomplete(tile({ question: "   " })), true);
  });

  test("il suggerimento resta facoltativo", () => {
    assert.equal(isTileIncomplete(tile({ hint: null })), false);
  });
});

describe("categorie senza titolo", () => {
  test("i titoli di ripiego del database non contano come titoli", () => {
    for (const title of ["", "  ", "Untitled", "untitled", "New category", "Categoria"]) {
      assert.equal(isCategoryUntitled(title), true, title);
    }
  });

  test("un titolo vero passa", () => {
    assert.equal(isCategoryUntitled("Storia del cinema"), false);
  });
});

test("il riepilogo tiene l'ordine di lettura del tabellone", () => {
  const tiles = [
    tile({ id: "a", answer: "" }),
    tile({ id: "b" }),
    tile({ id: "c", question: "<p></p>" }),
  ];
  const issues = boardIssues(tiles, [category("Storia"), category("Untitled")]);
  assert.deepEqual(
    issues.tiles.map((x) => x.id),
    ["a", "c"],
  );
  assert.equal(issues.categories.length, 1);
});
