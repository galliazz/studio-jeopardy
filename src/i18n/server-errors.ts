import type { MessageKey } from "./messages/en/index";

/**
 * I messaggi d'errore che le funzioni server lanciano, testo esatto, e la
 * chiave che li traduce. Il server resta in inglese: è l'interfaccia che li
 * mostra nella lingua di chi guarda, tramite `localizeError`.
 *
 * Oltre ai nostri ci sono quelli di Supabase e del browser che arrivano fin
 * qui senza passare da un nostro `throw`: il middleware di autenticazione, la
 * riga non trovata di `.single()`, lo storage, la rete che cade. Se il testo
 * cambia a monte, il messaggio torna semplicemente in inglese.
 */
export const SERVER_ERRORS: Record<string, MessageKey> = {
  // sessions.functions.ts
  "Session already finished": "errors.session.alreadyFinished",
  "Missing tile or player": "errors.session.missingTileOrPlayer",
  "No open tile": "errors.session.noOpenTile",
  "This team has no final answer to judge": "errors.session.noFinalAnswer",

  // soundboard.functions.ts, con MAX_CLIPS = 20
  "Soundboard is full (20 clips max)": "errors.soundboard.full",

  // integrations/supabase/auth-middleware.ts
  "Unauthorized: No request headers available": "errors.auth.signedOut",
  "Unauthorized: No authorization header provided": "errors.auth.signedOut",
  "Unauthorized: Only Bearer tokens are supported": "errors.auth.signedOut",
  "Unauthorized: No token provided": "errors.auth.signedOut",
  "Unauthorized: Invalid token": "errors.auth.signedOut",
  "Unauthorized: No user ID found in token": "errors.auth.signedOut",
  // PostgREST, quando la sessione è scaduta e il token non è stato rinnovato
  "JWT expired": "errors.auth.signedOut",

  // PostgREST, quando `.single()` non trova la riga (codice PGRST116)
  "JSON object requested, multiple (or no) rows returned": "errors.data.notFound",
  "Cannot coerce the result to a single JSON object": "errors.data.notFound",
  // Storage di Supabase, da uploadMedia
  "new row violates row-level security policy": "errors.data.notAllowed",
  "The object exceeded the maximum allowed size": "errors.upload.tooLarge",

  // fetch caduto: Chrome, Safari, Firefox
  "Failed to fetch": "errors.network.offline",
  "Load failed": "errors.network.offline",
  "NetworkError when attempting to fetch resource.": "errors.network.offline",
};
