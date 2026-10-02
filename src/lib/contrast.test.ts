/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { contrastLabel, contrastRatio, meetsContrast, parseHex } from "./contrast.ts";

describe("lettura dei colori", () => {
  test("accetta le tre forme con cui si scrive un colore", () => {
    assert.deepEqual(parseHex("#fff"), [255, 255, 255]);
    assert.deepEqual(parseHex("ffffff"), [255, 255, 255]);
    assert.deepEqual(parseHex("#FFFFFFAA"), [255, 255, 255]);
  });

  test("quello che non è un colore torna null, e non zero", () => {
    // Zero sarebbe nero, e nero contro bianco passa qualunque soglia: un
    // colore illeggibile verrebbe dichiarato a posto.
    for (const value of ["", "#ggg", "rgb(0,0,0)", "#12345"]) {
      assert.equal(parseHex(value), null, value);
    }
  });
});

describe("rapporto di contrasto", () => {
  test("i due estremi noti", () => {
    assert.equal(Math.round(contrastRatio("#000000", "#ffffff")!), 21);
    assert.equal(contrastRatio("#777777", "#777777"), 1);
  });

  test("non cambia invertendo i due colori", () => {
    assert.equal(contrastRatio("#1a1a1a", "#dddddd"), contrastRatio("#dddddd", "#1a1a1a"));
  });

  test("le soglie: 4,5 per il testo, 3 per quello grande", () => {
    // Grigio medio su bianco: circa 4,0 — basta per i numeri della board,
    // non per le scritte piccole.
    const ratio = contrastRatio("#949494", "#ffffff")!;
    assert.ok(ratio > 3 && ratio < 4.5, String(ratio));
    assert.equal(meetsContrast(ratio), false);
    assert.equal(meetsContrast(ratio, true), true);
  });

  test("un colore che non si sa leggere non fa scattare l'avviso", () => {
    assert.equal(contrastRatio("var(--boh)", "#ffffff"), null);
    assert.equal(meetsContrast(null), true);
  });

  test("l'etichetta si scrive come nelle linee guida", () => {
    assert.equal(contrastLabel(4.4999), "4.5:1");
    assert.equal(contrastLabel(21), "21:1");
  });
});
