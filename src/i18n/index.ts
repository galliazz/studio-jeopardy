/**
 * Le traduzioni, lato componenti.
 *
 *   const t = useT();
 *   t("host.buzzer.reset")
 *   t("host.buzzer.lockedOut", { count: 3, total: 5 })
 *   t.rich("play.youAre", { name }, { b: (s) => <strong>{s}</strong> })
 *
 * Fuori dai componenti (un toast dentro una callback) c'è `t`, che usa la
 * lingua attiva in quel momento.
 */
import { createElement, Fragment, useEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { getSettings, subscribeSettings } from "@/lib/settings";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";
import type { MessageKey } from "./messages/en/index";
import {
  getActiveLocale,
  getServerLocale,
  subscribeLocale,
  switchLocale,
  translate,
} from "./runtime";
import { SERVER_ERRORS } from "./server-errors";
import type { Vars } from "./types";

export { LOCALES, DEFAULT_LOCALE, isLocale, localeInfo, type Locale } from "./locales";
export type { MessageKey } from "./messages/en/index";

type RichTags = Record<string, (chunk: string) => ReactNode>;

export interface TFunction {
  (key: MessageKey, vars?: Vars): string;
  /**
   * Per le frasi con un pezzo evidenziato o un componente dentro. Nel testo:
   * `<b>testo</b>` passa "testo" a `tags.b`, `<icon/>` chiama `tags.icon("")`.
   * Così chi traduce può spostare il pezzo dove la sua lingua lo vuole.
   */
  rich: (key: MessageKey, vars: Vars | undefined, tags: RichTags) => ReactNode[];
  locale: Locale;
}

function renderRich(text: string, tags: RichTags): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /<(\w+)\/>|<(\w+)>([\s\S]*?)<\/\2>/g;
  let last = 0;
  let key = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const name = m[1] ?? m[2] ?? "";
    const chunk = m[3] ?? "";
    const render = tags[name];
    out.push(createElement(Fragment, { key: key++ }, render ? render(chunk) : chunk));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function makeT(locale: Locale): TFunction {
  const fn = ((key: MessageKey, vars?: Vars) => translate(locale, key, vars)) as TFunction;
  fn.rich = (key, vars, tags) => renderRich(translate(locale, key, vars), tags);
  fn.locale = locale;
  return fn;
}

/** Traduce con la lingua attiva adesso. Per callback e codice fuori da React. */
export function t(key: MessageKey, vars?: Vars): string {
  return translate(getActiveLocale(), key, vars);
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getActiveLocale, getServerLocale);
}

export function useT(): TFunction {
  const locale = useLocale();
  return useMemo(() => makeT(locale), [locale]);
}

/* ------------------------------ scelta lingua ------------------------------ */

/**
 * Se una pagina impone la lingua (gli overlay di OBS, che non hanno
 * impostazioni: la ricevono nel link), le impostazioni non la toccano più.
 */
let forced: Locale | null = null;
let started = false;

/** Da chiamare una volta, sul client, alla radice dell'app. */
export function startLocaleSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  // Gli effetti dei figli girano prima di quello della radice: un overlay può
  // aver già imposto la sua lingua, e qui non va scavalcata.
  void switchLocale(forced ?? getSettings().language);
  subscribeSettings((s) => {
    if (!forced) void switchLocale(s.language);
  });
}

/** Impone una lingua finché la pagina è montata, senza salvarla. */
export function useForcedLocale(code: string | null | undefined) {
  useEffect(() => {
    if (!isLocale(code)) return;
    forced = code;
    void switchLocale(code);
    return () => {
      forced = null;
      void switchLocale(getSettings().language ?? DEFAULT_LOCALE);
    };
  }, [code]);
}

/* --------------------------------- errori ---------------------------------- */

/**
 * Il messaggio di un errore, tradotto quando è uno di quelli che il server
 * manda davvero (elencati in server-errors.ts). Un errore sconosciuto resta
 * com'è: meglio un messaggio in inglese che uno generico che non dice niente.
 */
export function localizeError(err: unknown, fallback: MessageKey = "common.somethingWentWrong") {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const key = SERVER_ERRORS[message.trim()];
  if (key) return t(key);
  return message || t(fallback);
}
