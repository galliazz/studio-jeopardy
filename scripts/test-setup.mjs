/**
 * Fa girare i test con Node e basta, senza pacchetti in più: Node toglie da
 * solo i tipi dai file .ts, e questo aggancio gli insegna le due cose che
 * sa fare solo Vite — gli indirizzi "@/..." e gli import senza estensione.
 *
 * Nessuna dipendenza nuova vuol dire nessun lockfile da rigenerare: Lovable
 * compila con bun, e un bun.lock disallineato le romperebbe la build.
 */
import { registerHooks } from "node:module";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SUFFIXES = ["", ".ts", ".tsx", ".js", "/index.ts"];

function findFile(base) {
  for (const suffix of SUFFIXES) {
    const candidate = base + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, next) {
    let file = null;
    if (specifier.startsWith("@/")) {
      file = findFile(path.join(root, "src", specifier.slice(2)));
    } else if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith("file:")
    ) {
      file = findFile(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier));
    }
    return next(file ? pathToFileURL(file).href : specifier, context);
  },
});
