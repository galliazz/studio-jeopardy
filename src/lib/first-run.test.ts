import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldShowFirstRun } from "./first-run.ts";

const base = { boards: 1, dismissed: false, hasPlayed: false };

describe("shouldShowFirstRun", () => {
  it("si mostra a chi ha solo il tabellone demo", () => {
    assert.equal(shouldShowFirstRun(base), true);
  });

  it("sparisce appena si è chiusa", () => {
    assert.equal(shouldShowFirstRun({ ...base, dismissed: true }), false);
  });

  it("sparisce dopo la prima partita", () => {
    assert.equal(shouldShowFirstRun({ ...base, hasPlayed: true }), false);
  });

  it("sparisce quando i tabelloni diventano due", () => {
    assert.equal(shouldShowFirstRun({ ...base, boards: 2 }), false);
  });

  it("non si mostra mentre la libreria sta ancora arrivando", () => {
    assert.equal(shouldShowFirstRun({ ...base, boards: 0 }), false);
  });
});
