import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to all session-scoped realtime tables and invalidates the given
 * query keys on any change. Server timestamps stay authoritative for buzz order.
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
    const channel = supabase
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
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "final_answers", filter: `session_id=eq.${sessionId}` },
        invalidate,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, keysJson, queryClient]);
}
