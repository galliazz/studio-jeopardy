/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { pickVoice } from "./speech.ts";

const voice = (lang: string, name = lang): SpeechSynthesisVoice =>
  ({ lang, name, default: false, localService: true, voiceURI: name }) as SpeechSynthesisVoice;

describe("scelta della voce", () => {
  test("preferisce la lingua esatta", () => {
    const voices = [voice("en-US"), voice("it-IT"), voice("it-CH")];
    assert.equal(pickVoice(voices, "it-IT")?.lang, "it-IT");
  });

  test("con la sola lingua prende la prima di quella lingua", () => {
    const voices = [voice("en-US"), voice("it-CH"), voice("it-IT")];
    assert.equal(pickVoice(voices, "it")?.lang, "it-CH");
  });

  test("se quella lingua non c'è, torna null e parla la voce di sistema", () => {
    // Meglio una voce qualsiasi che nessuna voce: il silenzio sembrerebbe un
    // guasto, e chi ha premuto il pulsante non saprebbe perché.
    assert.equal(pickVoice([voice("en-US")], "ja"), null);
    assert.equal(pickVoice([], "it"), null);
  });
});
