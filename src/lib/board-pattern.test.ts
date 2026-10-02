/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { BOARD_PATTERNS, patternOf, patternStyle } from "./board-pattern.ts";

const theme = (pattern?: string) =>
  ({ pattern, accent: "#5B3E77", bg: "#F4EAF8" }) as Parameters<typeof patternStyle>[0];

describe("motivo di fondo del tabellone", () => {
  test("un valore sconosciuto vale «tinta unita», non un errore", () => {
    // Il tema arriva dal database come JSON libero: un gioco salvato con una
    // versione futura non deve rompere la board di chi ha la vecchia.
    assert.equal(patternOf(theme("marmo")), "none");
    assert.equal(patternOf(theme(undefined)), "none");
    assert.deepEqual(patternStyle(theme("marmo")), {});
  });

  test("ogni motivo disegna qualcosa, e usa il colore d'accento", () => {
    for (const p of BOARD_PATTERNS.filter((x) => x !== "none")) {
      const style = patternStyle(theme(p));
      assert.ok(style.backgroundImage, p);
      assert.ok(style.backgroundImage!.includes("#5B3E77"), p);
    }
  });

  test("la tinta unita non aggiunge strati", () => {
    assert.deepEqual(patternStyle(theme("none")), {});
  });
});
