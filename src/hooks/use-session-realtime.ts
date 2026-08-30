import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RealtimeOptions {
  /**
   * Iscriversi anche a `final_answers`. Solo l'host può leggere quella tabella:
   * dal telefono di un giocatore la sottoscrizione non riceverebbe nulla e
   * rischierebbe di far fallire l'intero canale.
   */
  includeFinalAnswers?: boolean;
}

/**
 * Subscribes to session-scoped realtime tables and invalidates the given query
 * keys on any change. Server timestamps stay authoritative for buzz order.
 */
export function useSessionRealtime(
  sessionId: string | undefined,
  queryKeys: string[][],
  options: RealtimeOptions = {},
) {
  const queryClient = useQueryClient();
  const keysJson = JSON.stringify(queryKeys);
  const includeFinalAnswers = options.includeFinalAnswers ?? false;

  useEffect(() => {
    if (!sessionId) return;
    const keys = JSON.parse(keysJson) as string[][];
    const invalidate = () => {
      for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
    };
    let channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `session_id=eq.${sessionId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "buzzer_queue", filter: `session_id=eq.${sessionId}` },
        invalidate,
      );

    if (includeFinalAnswers) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "final_answers", filter: `session_id=eq.${sessionId}` },
        invalidate,
      );
    }

    channel.subscribe((status) => {
      /*
       * Alla (ri)connessione si ricarica tutto: gli eventi accaduti mentre il
       * canale era giù non vengono mai recuperati, e senza questo la console
       * host poteva restare disallineata — coda vuota, nessun giocatore attivo
       * — finché non arrivava per caso un altro evento.
       */
      if (status === "SUBSCRIBED") invalidate();
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, keysJson, queryClient, includeFinalAnswers]);
}
