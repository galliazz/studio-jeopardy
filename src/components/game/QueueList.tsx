/**
 * Ordered buzzer queue — shared by the Host Console and the OBS overlays.
 * Read-only when onClear is omitted.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { formatDelta, type Player, type QueueEntry, type Session } from "@/lib/types";

export function QueueList({
  session,
  players,
  queue,
  onClear,
}: {
  session: Session;
  players: Player[];
  queue: QueueEntry[];
  onClear?: () => void;
}) {
  const tileQueue = useMemo(() => {
    if (!session.current_tile_id) return [];
    return queue
      .filter((q) => q.tile_id === session.current_tile_id && (q.status === "queued" || q.status === "active"))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [queue, session.current_tile_id]);
  const firstAt = tileQueue[0] ? new Date(tileQueue[0].created_at).getTime() : 0;

  if (tileQueue.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-muted-foreground">Buzzer queue</h4>
        {onClear && (
          <button
            onClick={() => {
              if (window.confirm("Clear the buzzer queue? Everyone waiting is removed.")) onClear();
            }}
            aria-label="Clear queue"
            title="Clear queue"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ink-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    <ol className="space-y-2">

      {tileQueue.map((entry, i) => {
        const player = players.find((p) => p.id === entry.player_id);
        if (!player) return null;
        const delta = new Date(entry.created_at).getTime() - firstAt;
        const isActive = entry.status === "active";
        return (
          <motion.li
            key={entry.id}
            layout
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className={`flex items-center gap-3 rounded-[26px] px-3 py-2.5 ${
              isActive ? "bg-butter elev-1" : "border border-foreground/10 bg-transparent"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center font-display text-xs font-black text-foreground scallop ${
                isActive ? "bg-peach" : "bg-muted"
              }`}
            >
              #{i + 1}
            </span>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center text-base scallop ${
                player.team === "alpha" ? "bg-team-alpha" : "bg-team-bravo"
              }`}
            >
              {player.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{player.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {i === 0 ? "first in" : formatDelta(delta)} · {player.team}
              </p>
            </div>
            {isActive && <span className="h-3 w-3 animate-pulse rounded-full bg-ink-gold" />}
          </motion.li>
        );
      })}
    </ol>
    </div>
  );
}
