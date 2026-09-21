/**
 * Il motore delle traduzioni. Niente librerie: un dizionario per lingua, una
 * funzione che cerca la chiave, sceglie il plurale e sostituisce `{nome}`.
 *
 * Il server disegna sempre in inglese, perché la lingua scelta vive nel
 * browser. Il client parte in inglese anche lui, per combaciare col server, e
 * passa alla lingua scelta subito dopo: useSyncExternalStore fa esattamente
 * questo, senza errori di idratazione.
 */
import { en, type Messages, type MessageKey } from "./messages/en/index";
import { DEFAULT_LOCALE, isLocale, localeInfo, type Locale } from "./locales";
import type { Leaf, Plural, Tree, Vars } from "./types";

type Loader = () => Promise<{ default: Messages }>;

const LOADERS: Record<Exclude<Locale, "en">, Loader> = {
  es: () => import("./messages/es/index"),
  de: () => import("./messages/de/index"),
  fr: () => import("./messages/fr/index"),
  ru: () => import("./messages/ru/index"),
  pt: () => import("./messages/pt/index"),
  zh: () => import("./messages/zh/index"),
  ja: () => import("./messages/ja/index"),
  hi: () => import("./messages/hi/index"),
  ar: () => import("./messages/ar/index"),
  it: () => import("./messages/it/index"),
};

const dictionaries: Partial<Record<Locale, Messages>> = { en };

/** La lingua già caricata e in uso. Cambia solo quando il dizionario è pronto. */
let active: Locale = DEFAULT_LOCALE;
/** L'ultima lingua chiesta: se ne arriva un'altra durante il caricamento, vince questa. */
let wanted: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getActiveLocale(): Locale {
  return active;
}

export function getServerLocale(): Locale {
  return DEFAULT_LOCALE;
}

export async function switchLocale(next: Locale) {
  if (!isLocale(next)) next = DEFAULT_LOCALE;
  wanted = next;
  if (!dictionaries[next] && next !== "en") {
    try {
      const mod = await LOADERS[next]();
      dictionaries[next] = mod.default;
    } catch (err) {
      console.error(`Could not load the "${next}" translations`, err);
      return;
    }
  }
  if (wanted !== next) return;
  active = next;
  applyDocumentLocale(next);
  emit();
}

/* -------------------------------- documento -------------------------------- */

const loadedFonts = new Set<string>();

/**
 * `lang` e `dir` su <html>: il primo sceglie i glifi giusti per cinese e
 * giapponese e fa leggere la pagina nella lingua giusta agli screen reader, il
 * secondo gira tutta l'interfaccia per l'arabo. Il carattere Noto si scarica
 * solo la prima volta che serve.
 */
function applyDocumentLocale(code: Locale) {
  if (typeof document === "undefined") return;
  const info = localeInfo(code);
  const root = document.documentElement;
  root.lang = code;
  root.dir = info.dir;
  const font = "font" in info ? info.font : undefined;
  if (font) {
    if (!loadedFonts.has(font)) {
      loadedFonts.add(font);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, "+")}:wght@400;500;700;800;900&display=swap`;
      document.head.appendChild(link);
    }
    root.style.setProperty("--font-locale", `"${font}"`);
  } else {
    root.style.removeProperty("--font-locale");
  }
}

/* -------------------------------- traduzione ------------------------------- */

function lookup(dict: Tree, key: string): Leaf | undefined {
  let node: Leaf | Tree | undefined = dict;
  for (const part of key.split(".")) {
    if (node === undefined || typeof node === "string") return undefined;
    node = (node as Tree)[part];
  }
  if (node === undefined) return undefined;
  if (typeof node === "string" || "other" in node) return node as Leaf;
  return undefined;
}

const pluralRules = new Map<Locale, Intl.PluralRules>();

function pickPlural(locale: Locale, plural: Plural, count: number): string {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  // `zero` esplicito vince anche nelle lingue che non lo prevedono.
  if (count === 0 && plural.zero !== undefined) return plural.zero;
  const form = rules.select(count) as keyof Plural;
  return plural[form] ?? plural.other;
}

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const dict = (dictionaries[locale] ?? en) as unknown as Tree;
  const found = lookup(dict, key) ?? lookup(en as unknown as Tree, key);
  if (found === undefined) {
    if (import.meta.env?.DEV) console.warn(`Missing translation key: ${key}`);
    return key;
  }
  if (typeof found === "string") return interpolate(found, vars);
  const count = typeof vars?.["count"] === "number" ? vars["count"] : Number(vars?.["count"] ?? 0);
  return interpolate(pickPlural(locale, found, count), vars);
}
