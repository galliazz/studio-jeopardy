import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_COLUMNS,
  AI_POINTS,
  boardFromAi,
  boardPrompt,
  countTiles,
  extractJson,
} from "./ai-board.ts";

describe("boardPrompt", () => {
  it("mette dentro argomento, lingua e difficoltà", () => {
    const p = boardPrompt({ topic: "storia del rock", language: "it", difficulty: "hard" });
    assert.ok(p.includes("storia del rock"));
    assert.ok(p.includes("it"));
    assert.ok(p.includes("expert audience"));
  });

  it("chiede JSON e niente altro", () => {
    const p = boardPrompt({ topic: "x", language: "en", difficulty: "mixed" });
    assert.ok(p.includes("JSON only"));
    assert.ok(p.includes("no code fence"));
  });
});

describe("extractJson", () => {
  it("legge una risposta pulita", () => {
    assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  });

  it("sopravvive al blocco di codice", () => {
    assert.deepEqual(extractJson('Ecco il tabellone:\n```json\n{"a":2}\n```\nBuon divertimento!'), {
      a: 2,
    });
  });

  it("si lamenta se non c'è niente da leggere", () => {
    assert.throws(() => extractJson("Mi dispiace, non posso."), /ai.noJson/);
  });
});

const good = {
  title: "Rock",
  categories: Array.from({ length: 5 }, (_, c) => ({
    title: `Cat ${c}`,
    clues: Array.from({ length: 5 }, (_, r) => ({ clue: `indizio ${c}-${r}`, answer: `ris ${r}` })),
  })),
};

describe("boardFromAi", () => {
  it("costruisce un tabellone pieno", () => {
    const board = boardFromAi(good, "senza nome");
    assert.equal(board.version, 1);
    assert.equal(board.title, "Rock");
    assert.equal(board.categories.length, 5);
    assert.equal(countTiles(board), 25);
  });

  it("dà i punti della riga, non quelli del modello", () => {
    const board = boardFromAi(good, "x");
    assert.deepEqual(
      board.categories[0]!.tiles.map((t) => t.points),
      [...AI_POINTS],
    );
    assert.deepEqual(
      board.categories[0]!.tiles.map((t) => t.row_index),
      [0, 1, 2, 3, 4],
    );
  });

  it("riempie le colonne mancanti e taglia quelle di troppo", () => {
    const few = boardFromAi({ categories: [good.categories[0]] }, "x");
    assert.equal(few.categories.length, AI_COLUMNS);
    assert.equal(countTiles(few), 5);

    const many = boardFromAi({ categories: [...good.categories, good.categories[0]] }, "x");
    assert.equal(many.categories.length, AI_COLUMNS);
  });

  it("tiene al massimo cinque indizi per colonna", () => {
    const board = boardFromAi(
      {
        categories: [
          {
            title: "Troppi",
            clues: Array.from({ length: 9 }, (_, i) => ({ clue: `c${i}`, answer: "a" })),
          },
        ],
      },
      "x",
    );
    assert.equal(board.categories[0]!.tiles.length, 5);
  });

  it("salta gli indizi incompleti e rinumera le righe", () => {
    const board = boardFromAi(
      {
        categories: [
          {
            title: "Buchi",
            clues: [
              { clue: "primo", answer: "uno" },
              { clue: "senza risposta", answer: "" },
              { clue: "", answer: "senza domanda" },
              { clue: "ultimo", answer: "due" },
            ],
          },
        ],
      },
      "x",
    );
    const tiles = board.categories[0]!.tiles;
    assert.equal(tiles.length, 2);
    assert.deepEqual(
      tiles.map((t) => [t.row_index, t.points]),
      [
        [0, 100],
        [1, 200],
      ],
    );
  });

  it("accetta anche `question` al posto di `clue`", () => {
    const board = boardFromAi(
      { categories: [{ title: "Q", clues: [{ question: "scritto così", answer: "ok" }] }] },
      "x",
    );
    assert.equal(board.categories[0]!.tiles[0]!.question, "scritto così");
  });

  it("ripiega sul titolo proposto quando il modello non ne dà uno", () => {
    assert.equal(boardFromAi({ categories: [] }, "Il mio quiz").title, "Il mio quiz");
  });

  it("non si rompe su spazzatura", () => {
    const board = boardFromAi({ categories: [null, 7, "no"] }, "x");
    assert.equal(board.categories.length, AI_COLUMNS);
    assert.equal(countTiles(board), 0);
    assert.equal(boardFromAi(null, "y").title, "y");
  });

  it("taglia i titoli e i testi troppo lunghi", () => {
    const board = boardFromAi(
      {
        title: "t".repeat(200),
        categories: [
          { title: "c".repeat(200), clues: [{ clue: "q".repeat(9000), answer: "a".repeat(9000) }] },
        ],
      },
      "x",
    );
    assert.equal(board.title.length, 80);
    assert.equal(board.categories[0]!.title.length, 60);
    assert.equal(board.categories[0]!.tiles[0]!.question.length, 4000);
    assert.equal(board.categories[0]!.tiles[0]!.answer.length, 2000);
  });
});
