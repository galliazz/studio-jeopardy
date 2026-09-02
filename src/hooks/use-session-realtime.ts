import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MAX_BACKOFF_MS = 30_000;

/**
 * Subscribes to all session-scoped realtime tables and invalidates the given
 * query keys on any change. No polling: the socket is the only source of
 * updates, and a dropped socket is retried with exponential backoff.
 * Server timestamps stay authoritative for buzz order.
 */
export function useSessionRealtime(sessionId: string | undefined, queryKeys: string[][]) {
  const queryClient = useQueryClient();
  const keysJson = JSON.stringify(queryKeys);

  useEffect(() => {
    if (!sessionId) return;
    const keys = JSON.parse(keysJson) as string[][];
    const invalidate = () => {
      for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
    };

    let disposed = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const tables = ["sessions", "players", "buzzer_queue", "final_answers"] as const;

    const connect = () => {
      if (disposed) return;
      const ch = supabase.channel(`session:${sessionId}:${attempt}`);
      for (const table of tables) {
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
          // Resync anything missed while the socket was down.
          invalidate();
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
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
      if (channel) void supabase.removeChannel(channel);
    };
  }, [sessionId, keysJson, queryClient]);
}
