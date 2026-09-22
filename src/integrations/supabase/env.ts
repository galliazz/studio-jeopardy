/**
 * Da dove arrivano indirizzo e chiavi di Supabase.
 *
 * Con Lovable Cloud le variabili si chiamavano in un modo solo. Collegando un
 * progetto Supabase proprio, la piattaforma le riscrive da sé, e non è detto
 * che usi gli stessi nomi: la chiave pubblica può arrivare come
 * `PUBLISHABLE_KEY` (il nome nuovo) o come `ANON_KEY` (quello storico), e
 * quella di servizio come `SERVICE_ROLE_KEY` o `SECRET_KEY`.
 *
 * Accettarli tutti costa tre righe ed evita che il sito resti senza database
 * per un nome diverso, proprio nel momento del trasloco.
 */

/** `process` non esiste nel browser: lì contano solo le `VITE_*`. */
function fromProcess(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env[name] : undefined;
}

export function supabaseUrl(): string | undefined {
  return import.meta.env["VITE_SUPABASE_URL"] || fromProcess("SUPABASE_URL");
}

export function supabasePublishableKey(): string | undefined {
  return (
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    import.meta.env["VITE_SUPABASE_ANON_KEY"] ||
    fromProcess("SUPABASE_PUBLISHABLE_KEY") ||
    fromProcess("SUPABASE_ANON_KEY")
  );
}

/** Solo lato server: dà accesso a tutto, e nel browser non deve esistere. */
export function supabaseServiceKey(): string | undefined {
  return fromProcess("SUPABASE_SERVICE_ROLE_KEY") || fromProcess("SUPABASE_SECRET_KEY");
}
