import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MAX_BACKOFF_MS = 30_000;
/** Ricarica di riserva finché il canale non è vivo. */
const FALLBACK_POLL_MS = 2_500;

/**
 * Tabelle che un ospite — telefono di un giocatore, sorgente OBS — può
 * sottoscrivere. `final_answers` è negata al ruolo anonimo, e una sola
 * sottoscrizione negata fa cadere l'intero canale: ai giocatori quelle righe
 * non servono comunque, perché punteggi e fase passano da `sessions`.
 */
export const GUEST_TABLES = ["sessions", "players", "buzzer_queue"] as const;
/** L'host è autenticato e segue anche le risposte della finale. */
export const HOST_TABLES = ["sessions", "players", "buzzer_queue", "final_answers"] as const;

/**
 * Subscribes to the session-scoped realtime tables and invalidates the given
 * query keys on any change. Un canale caduto viene ritentato con attesa
 * crescente e, nel frattempo, lo stato viene ricaricato a intervalli.
 *
 * Quella ricarica di riserva non è un lusso: per giorni i telefoni e gli
 * overlay hanno mostrato uno stato congelato al caricamento della pagina
 * perché il canale falliva in silenzio, e niente lo diceva. Ora, se il tempo
 * reale non c'è, l'app resta lenta ma non mente.
 */
export function useSessionRealtime(
  sessionId: string | undefined,
  queryKeys: string[][],
  tables: readonly string[] = HOST_TABLES,
) {
  const queryClient = useQueryClient();
  const keysJson = JSON.stringify(queryKeys);
  const tablesJson = JSON.stringify(tables);

  useEffect(() => {
    if (!sessionId) return;
    const keys = JSON.parse(keysJson) as string[][];
    const watched = JSON.parse(tablesJson) as string[];
    const invalidate = () => {
      for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
    };

    let disposed = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };
    const startPolling = () => {
      if (poll || disposed) return;
      poll = setInterval(invalidate, FALLBACK_POLL_MS);
    };

    const connect = () => {
      if (disposed) return;
      const ch = supabase.channel(`session:${sessionId}:${attempt}`);
      for (const table of watched) {
        ch.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: table === "sessions" ? `id=eq.${sessionId}` : `session_id=eq.${sessionId}`,
          },
          invalidate,
        );
      }
      channel = ch;
      ch.subscribe((status) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          attempt = 0;
          stopPolling();
          // Riallinea quel che è cambiato mentre il canale era giù.
          invalidate();
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          /*
           * La causa quasi sempre è nei permessi: Supabase Realtime non
           * consegna nulla se il ruolo non può leggere TUTTE le colonne di una
           * tabella sottoscritta, e ne basta una negata per far cadere il
           * canale intero. Dirlo in console è ciò che è mancato l'altra volta.
           */
          console.warn(
            `[realtime] canale "${status}" per la sessione ${sessionId} (tabelle: ${watched.join(", ")}). ` +
              `Si continua con la ricarica periodica. Se non torna mai SUBSCRIBED, controlla i permessi di lettura del ruolo su quelle tabelle.`,
          );
          startPolling();
          const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt) * (0.75 + Math.random() * 0.5);
          attempt += 1;
          if (channel) void supabase.removeChannel(channel);
          channel = null;
          retry = setTimeout(connect, delay);
        }
      });
    };

    connect();

    return () => {
      disposed = true;
      if (retry) clearTimeout(retry);
      stopPolling();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [sessionId, keysJson, tablesJson, queryClient]);
}
