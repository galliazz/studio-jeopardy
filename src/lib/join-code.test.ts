/// <reference types="node" />
/**
 * Il codice d'ingresso si legge da uno schermo e si digita su un telefono,
 * spesso in fretta e da lontano. Deve essere corto, fatto solo di caratteri
 * che non si confondono fra loro, e deve superare sempre la validazione del
 * server: un codice generato che il server rifiuta è una partita in cui non
 * entra nessuno.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { joinCodeInput, normalizeJoinCode } from "./game-rules.ts";
import { generateJoinCode } from "./join-code.ts";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

describe("codice d'ingresso", () => {
  test("sei caratteri, se non si chiede altro", () => {
    assert.equal(generateJoinCode().length, 6);
  });

  test("la lunghezza chiesta viene rispettata", () => {
    for (const length of [1, 4, 8, 10, 32]) {
      assert.equal(generateJoinCode(length).length, length);
    }
    assert.equal(generateJoinCode(0), "");
  });

  test("niente caratteri che si confondono a colpo d'occhio", () => {
    // 0 e O, 1 e I e L: letti da una diretta compressa sono indistinguibili.
    for (let i = 0; i < 500; i++) {
      assert.doesNotMatch(generateJoinCode(), /[01OIL]/);
    }
  });

  test("solo lettere maiuscole e cifre dell'alfabeto previsto", () => {
    for (let i = 0; i < 500; i++) {
      for (const char of generateJoinCode()) assert.ok(ALPHABET.includes(char), char);
    }
  });

  test("ogni codice generato supera la validazione del server così com'è", () => {
    // Il campo della home ne accetta al massimo 8 e li mette in maiuscolo:
    // un codice che cambiasse normalizzandolo non si ritroverebbe nel database.
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      assert.ok(code.length <= 8);
      assert.equal(joinCodeInput.parse(code), code);
      assert.equal(normalizeJoinCode(code), code);
    }
  });

  test("chi lo digita in minuscolo o con uno spazio entra lo stesso", () => {
    const code = generateJoinCode();
    assert.equal(normalizeJoinCode(joinCodeInput.parse(` ${code.toLowerCase()} `)), code);
  });

  test("i codici cambiano da una partita all'altra", () => {
    // 31^6 combinazioni: una coincidenza su mille estrazioni capita una volta
    // ogni migliaio di esecuzioni, e si tollera; di più vorrebbe dire un
    // generatore rotto, non sfortuna.
    const codes = new Set(Array.from({ length: 1000 }, () => generateJoinCode()));
    assert.ok(codes.size >= 999, `${1000 - codes.size} doppioni su 1000`);
  });

  test("tutto l'alfabeto viene usato", () => {
    // Un errore nel modulo lascerebbe fuori dei caratteri e restringerebbe
    // le combinazioni senza che nessuno se ne accorga.
    const seen = new Set(Array.from({ length: 400 }, () => generateJoinCode()).join(""));
    assert.equal(seen.size, ALPHABET.length);
  });
});
