/**
 * Le lingue dell'app. L'inglese è quella di partenza e l'unica sempre caricata:
 * le altre arrivano solo quando qualcuno le sceglie nelle impostazioni.
 *
 * Gli alfabeti che i nostri caratteri non coprono (cinese, giapponese, hindi,
 * arabo) li disegna il carattere di sistema del dispositivo: scaricarli da un
 * servizio esterno manderebbe l'indirizzo IP di chi gioca a un terzo.
 */
export const LOCALES = [
  { code: "en", name: "English", dir: "ltr" },
  { code: "es", name: "Español", dir: "ltr" },
  { code: "de", name: "Deutsch", dir: "ltr" },
  { code: "fr", name: "Français", dir: "ltr" },
  { code: "ru", name: "Русский", dir: "ltr" },
  { code: "pt", name: "Português (Brasil)", dir: "ltr" },
  { code: "zh", name: "中文（简体）", dir: "ltr" },
  { code: "ja", name: "日本語", dir: "ltr" },
  { code: "hi", name: "हिन्दी", dir: "ltr" },
  { code: "ar", name: "العربية", dir: "rtl" },
  { code: "it", name: "Italiano", dir: "ltr" },
] as const satisfies readonly {
  code: string;
  name: string;
  dir: "ltr" | "rtl";
}[];

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.some((l) => l.code === value);
}

export function localeInfo(code: Locale) {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}
