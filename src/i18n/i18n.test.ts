/// <reference types="node" />
/**
 * Le traduzioni devono avere la stessa forma dell'inglese: stesse chiavi, e in
 * ogni frase gli stessi segnaposto `{nome}` e gli stessi tag `<b>`. Il
 * compilatore controlla le chiavi; i segnaposto no, perché per lui sono solo
 * testo. Un `{count}` sparito in giapponese mostrerebbe "giocatori" senza il
 * numero, e nessuno se ne accorgerebbe finché non gioca in giapponese.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { LOCALES, type Locale } from "./locales.ts";
import { en, type Messages } from "./messages/en/index.ts";
import { translate } from "./runtime.ts";
import type { Tree } from "./types.ts";

const tokens = (text: string) =>
  [...text.matchAll(/\{(\w+)\}|<\/?(\w+)\/?>/g)].map((m) => m[0]).sort();

function leaves(node: Tree, prefix = ""): [string, string | Record<string, string>][] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") return [[path, value]];
    if ("other" in value && typeof value["other"] === "string")
      return [[path, value as Record<string, string>]];
    return leaves(value as Tree, path);
  });
}

async function load(code: Locale): Promise<Messages> {
  if (code === "en") return en;
  return (await import(`./messages/${code}/index.ts`)).default as Messages;
}

for (const { code } of LOCALES) {
  test(`${code}: stessi segnaposto dell'inglese in ogni frase`, async () => {
    const dict = await load(code);
    const theirs = new Map(leaves(dict as unknown as Tree));
    for (const [key, source] of leaves(en as unknown as Tree)) {
      const translated = theirs.get(key);
      assert.ok(translated !== undefined, `${code}: manca ${key}`);
      const sourceForms = typeof source === "string" ? [source] : Object.values(source);
      const expected = new Set(sourceForms.flatMap(tokens));
      const forms = typeof translated === "string" ? [translated] : Object.values(translated);
      for (const form of forms) {
        for (const token of tokens(form)) {
          assert.ok(expected.has(token), `${code}: ${key} usa ${token}, che l'inglese non ha`);
        }
      }
      // Ogni segnaposto dell'inglese deve comparire almeno in una forma
      // (nei plurali, la forma "one" può scrivere "un" al posto di {count}).
      const seen = new Set(forms.flatMap(tokens));
      for (const token of expected) {
        if (token === "{count}" && typeof source !== "string") continue;
        assert.ok(seen.has(token), `${code}: ${key} ha perso ${token}`);
      }
      assert.ok(forms.every((f) => f.trim().length > 0), `${code}: ${key} è vuota`);
    }
  });
}

test("le regole dei plurali che le traduzioni danno per scontate", () => {
  // Il russo distingue 3 da 5, l'arabo ha il duale: se Intl smettesse di
  // saperlo, i plurali di quelle traduzioni userebbero la forma sbagliata.
  assert.equal(new Intl.PluralRules("ru").select(3), "few");
  assert.equal(new Intl.PluralRules("ru").select(5), "many");
  assert.equal(new Intl.PluralRules("ar").select(2), "two");
  assert.equal(new Intl.PluralRules("ja").select(1), "other");
});

test("una chiave che non esiste torna com'è, senza rompere la pagina", () => {
  assert.equal(translate("it", "nope.missing" as never), "nope.missing");
});

test("i segnaposto si sostituiscono, quelli sconosciuti restano visibili", () => {
  assert.equal(translate("en", "common.cancel", { x: 1 }), "Cancel");
});
