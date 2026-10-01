/// <reference types="node" />
/**
 * La pila di annulla/ripristina. Vale la pena provarla perché gli errori qui
 * non si vedono: si vedono dopo, quando un annullamento riporta il valore
 * sbagliato o ne salta uno.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  EMPTY_HISTORY,
  canRedo,
  canUndo,
  historyShortcut,
  pushed,
  redone,
  undone,
  type HistoryAction,
  type HistoryState,
} from "./edit-history.ts";

const action = (label: string): HistoryAction => ({
  label,
  undo: async () => {},
  redo: async () => {},
});

const labels = (state: HistoryState) => ({
  past: state.past.map((a) => a.label),
  future: state.future.map((a) => a.label),
});

describe("pila di annulla e ripristina", () => {
  test("le azioni si impilano nell'ordine in cui si fanno", () => {
    const s = pushed(pushed(EMPTY_HISTORY, action("uno")), action("due"));
    assert.deepEqual(labels(s), { past: ["uno", "due"], future: [] });
    assert.equal(canUndo(s), true);
    assert.equal(canRedo(s), false);
  });

  test("annullare sposta l'ultima nel futuro, ripristinare la riporta indietro", () => {
    const s = pushed(pushed(EMPTY_HISTORY, action("uno")), action("due"));
    const u = undone(s);
    assert.equal(u.action?.label, "due");
    assert.deepEqual(labels(u.state), { past: ["uno"], future: ["due"] });

    const r = redone(u.state);
    assert.equal(r.action?.label, "due");
    assert.deepEqual(labels(r.state), { past: ["uno", "due"], future: [] });
  });

  test("una modifica nuova cancella il ramo che si poteva ripristinare", () => {
    // Altrimenti «ripristina» rimetterebbe un valore che non c'entra più
    // niente con quello che si sta scrivendo adesso.
    const s = undone(pushed(pushed(EMPTY_HISTORY, action("uno")), action("due"))).state;
    assert.deepEqual(labels(pushed(s, action("tre"))), { past: ["uno", "tre"], future: [] });
  });

  test("con la pila vuota non succede niente", () => {
    assert.equal(undone(EMPTY_HISTORY).action, null);
    assert.equal(redone(EMPTY_HISTORY).action, null);
    assert.deepEqual(labels(undone(EMPTY_HISTORY).state), { past: [], future: [] });
  });

  test("oltre il limite cadono le azioni più vecchie, non le ultime", () => {
    let s = EMPTY_HISTORY;
    for (let i = 1; i <= 5; i++) s = pushed(s, action(String(i)), 3);
    assert.deepEqual(labels(s), { past: ["3", "4", "5"], future: [] });
  });
});

describe("scorciatoia da tastiera", () => {
  const ev = (over: Partial<Parameters<typeof historyShortcut>[0]>) => ({
    key: "z",
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    target: null,
    ...over,
  });

  test("⌘Z annulla, ⌘⇧Z e Ctrl+Y ripristinano", () => {
    assert.equal(historyShortcut(ev({ metaKey: true })), "undo");
    assert.equal(historyShortcut(ev({ ctrlKey: true })), "undo");
    assert.equal(historyShortcut(ev({ metaKey: true, shiftKey: true })), "redo");
    assert.equal(historyShortcut(ev({ ctrlKey: true, key: "y" })), "redo");
  });

  test("la Z da sola non annulla niente", () => {
    // Scrivere «z» in un titolo non deve disfare la casella precedente.
    assert.equal(historyShortcut(ev({})), null);
    assert.equal(historyShortcut(ev({ metaKey: true, key: "s" })), null);
  });

  test("le maiuscole del tasto non contano", () => {
    assert.equal(historyShortcut(ev({ metaKey: true, key: "Z" })), "undo");
  });

  test("mentre si scrive in un campo l'annullamento resta quello del browser", () => {
    // In un campo di testo ⌘Z deve disfare le lettere appena scritte, non
    // l'ultima casella modificata.
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
      assert.equal(historyShortcut(ev({ metaKey: true, target: { tagName } })), null, tagName);
    }
    assert.equal(
      historyShortcut(ev({ metaKey: true, target: { tagName: "DIV", isContentEditable: true } })),
      null,
    );
    // Su un pulsante invece vale, perché lì non si scrive.
    assert.equal(historyShortcut(ev({ metaKey: true, target: { tagName: "BUTTON" } })), "undo");
  });
});
