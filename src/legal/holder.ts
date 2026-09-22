/**
 * Chi risponde di questo sito, in un posto solo: le tre pagine legali e il
 * piè di pagina leggono da qui.
 *
 * `CONTACT_EMAIL` è vuoto di proposito, in attesa di un indirizzo dedicato.
 * Finché resta vuoto le pagine lo dicono apertamente invece di inventarsi un
 * recapito: un'informativa senza un modo per scrivere al titolare è il tipo
 * di buco che costa davvero, e va chiuso prima di pubblicare il sito.
 */
export const HOLDER_NAME = "Davide Galliazzo";

/** Da riempire: l'indirizzo a cui arrivano le richieste sui dati personali. */
export const CONTACT_EMAIL = "";

/** Da riempire quando servirà (per ora il progetto è personale e gratuito). */
export const HOLDER_ADDRESS = "";
export const HOLDER_VAT = "";

/** Ultima modifica dei testi legali. Va aggiornata quando si cambiano. */
export const LEGAL_UPDATED = "2026-09-22";

export const MIN_AGE = 14;

export function legalUpdatedLabel(locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
    new Date(`${LEGAL_UPDATED}T00:00:00Z`),
  );
}
