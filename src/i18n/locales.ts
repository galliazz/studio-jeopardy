/**
 * Le lingue dell'app. L'inglese è quella di partenza e l'unica sempre caricata:
 * le altre arrivano solo quando qualcuno le sceglie nelle impostazioni.
 *
 * `font` è la famiglia Noto che copre l'alfabeto quando i caratteri dell'app
 * (Plus Jakarta Sans, Roboto Flex) non ce l'hanno. Senza, il browser pescherebbe
 * un carattere di sistema qualunque, con pesi che non somigliano ai nostri.
 */
export const LOCALES = [
  { code: "en", name: "English", dir: "ltr" },
  { code: "es", name: "Español", dir: "ltr" },
  { code: "de", name: "Deutsch", dir: "ltr" },
  { code: "fr", name: "Français", dir: "ltr" },
  { code: "ru", name: "Русский", dir: "ltr" },
  { code: "pt", name: "Português (Brasil)", dir: "ltr" },
  { code: "zh", name: "中文（简体）", dir: "ltr", font: "Noto Sans SC" },
  { code: "ja", name: "日本語", dir: "ltr", font: "Noto Sans JP" },
  { code: "hi", name: "हिन्दी", dir: "ltr", font: "Noto Sans Devanagari" },
  { code: "ar", name: "العربية", dir: "rtl", font: "Noto Sans Arabic" },
  { code: "it", name: "Italiano", dir: "ltr" },
] as const satisfies readonly {
  code: string;
  name: string;
  dir: "ltr" | "rtl";
  font?: string;
}[];

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.some((l) => l.code === value);
}

export function localeInfo(code: Locale) {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}
