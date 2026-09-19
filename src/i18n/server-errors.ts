import type { MessageKey } from "./messages/en/index";

/**
 * I messaggi d'errore che le funzioni server lanciano, testo esatto, e la
 * chiave che li traduce. Il server resta in inglese: è l'interfaccia che li
 * mostra nella lingua di chi guarda, tramite `localizeError`.
 */
export const SERVER_ERRORS: Record<string, MessageKey> = {};
