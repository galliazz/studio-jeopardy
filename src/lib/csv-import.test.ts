/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { boardFromRows, parseCsv, sheetCsvUrl } from "./csv-import.ts";

describe("lettura del CSV", () => {
  test("campi fra virgolette, virgole dentro, virgolette doppie", () => {
    const rows = parseCsv('a,"b,c","d""e"\n1,2,3');
    assert.deepEqual(rows, [
      ["a", "b,c", 'd"e'],
      ["1", "2", "3"],
    ]);
  });

  test("un campo può andare a capo senza spezzare la riga", () => {
    // Le domande lunghe, scritte in un foglio, vanno a capo di continuo.
    assert.deepEqual(parseCsv('x,"prima\nseconda"'), [["x", "prima\nseconda"]]);
  });

  test("riconosce il punto e virgola, che usano Google e l'Excel italiano", () => {
    assert.deepEqual(parseCsv("a;b;c\n1;2;3"), [
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  test("toglie il segno invisibile in testa al file e le righe vuote", () => {
    assert.deepEqual(parseCsv("﻿a,b\n\n \n1,2"), [
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("dal foglio al tabellone", () => {
  const header = ["Categoria", "Punti", "Domanda", "Risposta", "Suggerimento"];

  test("raggruppa per categoria e tiene l'ordine delle righe", () => {
    const { board, hadHeader } = boardFromRows(
      [
        header,
        ["Storia", "200", "Chi fondò Roma?", "Romolo", ""],
        ["Storia", "400", "Anno della Rivoluzione francese?", "1789", "Fine Settecento"],
        ["Musica", "200", "Chi scrisse il Nabucco?", "Verdi", ""],
      ],
      "Prova",
    );
    assert.equal(hadHeader, true);
    assert.deepEqual(
      board.categories.map((c) => [c.title, c.tiles.length]),
      [
        ["Storia", 2],
        ["Musica", 1],
        // Le colonne mancanti arrivano vuote: il tabellone ne vuole cinque.
        ["", 0],
        ["", 0],
        ["", 0],
      ],
    );
    assert.equal(board.categories[0]!.tiles[1]!.points, 400);
    assert.equal(board.categories[0]!.tiles[1]!.hint, "Fine Settecento");
    assert.equal(board.categories[0]!.tiles[1]!.row_index, 1);
  });

  test("senza intestazione usa l'ordine dell'esportazione", () => {
    const { board, hadHeader } = boardFromRows([["Storia", "200", "D", "R", ""]], "Prova");
    assert.equal(hadHeader, false);
    assert.equal(board.categories.length, 5);
    assert.equal(board.categories[0]?.title, "Storia");
    assert.equal(board.categories[0]?.tiles[0]?.question, "D");
  });

  test("senza punti mette la scala classica, invece di zero", () => {
    const { board } = boardFromRows(
      [header, ["Storia", "", "D1", "R1", ""], ["Storia", "banane", "D2", "R2", ""]],
      "Prova",
    );
    assert.deepEqual(
      board.categories[0]!.tiles.map((t) => t.points),
      [200, 400],
    );
  });

  test("oltre cinque categorie o cinque caselle si lascia fuori, e si conta", () => {
    const rows = [header];
    for (let c = 1; c <= 6; c++) {
      for (let r = 1; r <= 6; r++) rows.push([`Cat ${c}`, "200", `D${r}`, `R${r}`, ""]);
    }
    const { board, skipped } = boardFromRows(rows, "Prova");
    assert.equal(board.categories.length, 5);
    assert.ok(board.categories.every((c) => c.tiles.length === 5));
    assert.equal(skipped, 11);
  });

  test("le righe senza categoria o senza contenuto non diventano caselle", () => {
    const { board, skipped } = boardFromRows(
      [header, ["", "200", "D", "R", ""], ["Storia", "200", "", "", ""]],
      "Prova",
    );
    assert.deepEqual(board.categories, [
      { title: "", tiles: [] },
      { title: "", tiles: [] },
      { title: "", tiles: [] },
      { title: "", tiles: [] },
      { title: "", tiles: [] },
    ]);
    assert.equal(skipped, 2);
  });
});

describe("link di Google Sheets", () => {
  test("il foglio pubblicato sul web diventa un link al CSV", () => {
    assert.equal(
      sheetCsvUrl("https://docs.google.com/spreadsheets/d/e/2PACX-1vABC/pubhtml"),
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vABC/pub?output=csv",
    );
  });

  test("un foglio normale usa l'esportazione, col foglio giusto", () => {
    assert.equal(
      sheetCsvUrl("https://docs.google.com/spreadsheets/d/ABC123/edit#gid=42"),
      "https://docs.google.com/spreadsheets/d/ABC123/export?format=csv&gid=42",
    );
  });

  test("quello che non è Google Sheets torna null", () => {
    // Un link qualsiasi non si va a scaricare: lo si dice a chi l'ha incollato.
    assert.equal(sheetCsvUrl("https://esempio.it/foglio.csv"), null);
    assert.equal(sheetCsvUrl(""), null);
  });
});
