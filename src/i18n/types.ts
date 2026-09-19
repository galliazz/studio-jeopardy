/**
 * Un messaggio è una frase, oppure un plurale: un oggetto con almeno `other`
 * e le altre forme che servono a quella lingua. L'inglese usa `one` e
 * `other`; il russo anche `few` e `many`; l'arabo tutte e sei. La forma
 * giusta la sceglie Intl.PluralRules in base a `count`.
 *
 * Per questo le chiavi `zero`, `one`, `two`, `few`, `many` e `other` sono
 * riservate ai plurali: non vanno usate come nomi di sezione.
 */
export type Plural = {
  other: string;
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
};

export type Leaf = string | Plural;

export interface Tree {
  [key: string]: Leaf | Tree;
}

/**
 * Dal dizionario inglese al tipo che ogni altra lingua deve rispettare:
 * stesse chiavi, frasi qualunque, e plurali con le forme che vuole.
 */
export type Widen<T> = T extends string
  ? string
  : T extends { other: string }
    ? Plural
    : { [K in keyof T]: Widen<T[K]> };

/** Tutte le chiavi foglia, col punto: "host.buzzer.reset". */
export type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends { other: string }
      ? `${P}${K}`
      : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type Vars = Record<string, string | number>;
