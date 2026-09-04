/**
 * The clue view: the container transform that replaces the board when a tile
 * opens. Shared verbatim by the Host Console and the OBS overlays; the overlay
 * passes readOnly so the judging controls and host chrome are not rendered.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { sfx } from "@/lib/sfx";
import { sanitizeHtml } from "@/lib/sanitize";
import { useSignedUrl } from "@/lib/media";
import {
  closeTile,
  judgeAnswer,
  revealAnswer,
  startDailyDouble,
} from "@/lib/sessions.functions";
import type { Category, Player, QueueEntry, Session, ThemeSettings, Tile } from "@/lib/types";

export interface HostPatch {
  session?: Partial<Session>;
  players?: Player[];
  queue?: QueueEntry[];
}

export function QuestionOverlay({
  session,
  tile,
  category,
  players,
  queue,
  theme,
  onHostStatePatch,
  readOnly = false,
}: {
  session: Session;
  tile: Tile;
  category: Category | null | undefined;
  players: Player[];
  queue: QueueEntry[];
  theme: ThemeSettings;
  onHostStatePatch?: ((patch: HostPatch) => void) | undefined;
  /** Mirror mode: no judging controls, no sound, no pointer interaction. */
  readOnly?: boolean;
}) {
  const imageUrl = useSignedUrl("game-media", tile.image_url);
  const audioUrl = useSignedUrl("game-media", tile.audio_url);
  const activePlayer = players.find((p) => p.id === session.active_player_id) ?? null;
  const activeEntry = queue.find(
    (q) => q.tile_id === tile.id && q.player_id === session.active_player_id,
  );
  const alreadyJudged = activeEntry ? activeEntry.status === "correct" || activeEntry.status === "wrong" : false;
  const countdown = useCountdown(session.timer_ends_at);
  const lastSecond = useRef<number | null>(null);
  const alarmed = useRef<string | null>(null);
  /** Only flash/alarm when THIS timer was actually observed running first. */
  const armed = useRef<string | null>(null);

  useEffect(() => {
    if (session.timer_ends_at && !countdown.expired) armed.current = session.timer_ends_at;
  }, [session.timer_ends_at, countdown.expired]);

  useEffect(() => {
    if (readOnly || countdown.seconds == null) return;
    if (countdown.seconds !== lastSecond.current && countdown.seconds > 0) {
      if (countdown.seconds <= 5) sfx.urgentTick();
      else sfx.tick();
      lastSecond.current = countdown.seconds;
    }
    if (
      countdown.expired &&
      alarmed.current !== session.timer_ends_at &&
      armed.current === session.timer_ends_at
    ) {
      alarmed.current = session.timer_ends_at;
      sfx.alarm();
    }
  }, [readOnly, countdown.seconds, countdown.expired, session.timer_ends_at]);

  const flashRed =
    countdown.expired && session.phase === "answering" && armed.current === session.timer_ends_at;

  return (
    <motion.div className="pointer-events-none absolute inset-0 z-40 flex justify-center">
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 260, damping: 26, duration: 0.4 }}
        className="pointer-events-auto flex h-full w-full max-w-[1100px] flex-col overflow-y-auto p-2.5 elev-2 sm:p-5"
        style={{ backgroundColor: theme.bg, borderRadius: theme.radius + 8 }}
      >
      {session.phase === "daily_double_wager" ? (
        <DailyDoubleWager session={session} players={players} />
      ) : (
        <>
          <div className="flex items-center justify-end gap-2">
            {countdown.seconds != null && session.phase !== "reveal" && (
              <motion.span
                animate={flashRed ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                transition={flashRed ? { repeat: Infinity, duration: 0.5 } : { duration: 0.15 }}
                className={`rounded-full px-5 py-2 font-display text-3xl font-black ${
                  flashRed
                    ? "bg-danger text-danger-ink"
                    : countdown.seconds <= 5
                      ? "bg-danger/60 text-danger-ink"
                      : "bg-butter text-ink-gold"
                }`}
              >
                0:{String(countdown.seconds).padStart(2, "0")}
              </motion.span>
            )}
          </div>

          {countdown.seconds != null && session.phase !== "reveal" && (
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                /* Niente transizione sulla larghezza: il valore viene già
                   ricalcolato a ogni frame dallo stesso rAF che muove il
                   numero. Una transizione di 100ms ne fa partire una nuova a
                   ogni frame, così la barra insegue il numero con un ritardo
                   costante e non lo raggiunge mai. */
                className={`h-full rounded-full ${countdown.seconds <= 5 ? "bg-danger-ink" : "bg-ink-gold"}`}
                style={{ width: `${countdown.fraction * 100}%` }}
              />
            </div>
          )}

          {/* Compact header: category + value */}
          <div
            className="mt-2 flex items-center justify-between gap-3 px-4 py-2"
            style={{ backgroundColor: theme.card, borderRadius: theme.radius * 0.6 }}
          >
            <p
              className="truncate text-[10px] font-bold uppercase tracking-[0.3em] sm:text-xs"
              style={{ color: theme.accent }}
            >
              {category?.title ?? "Question"}
            </p>
            <p className="shrink-0 font-display text-lg font-black sm:text-xl" style={{ color: theme.accent }}>
              {session.dd_wager ? `DD ${session.dd_wager}` : tile.points}
            </p>
          </div>

          <div
            className="mt-2.5 flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-4 text-center sm:p-6"
            style={{ backgroundColor: theme.card, borderRadius: theme.radius }}
          >
            <div
              className="max-w-4xl font-display font-black leading-tight [&_b]:opacity-80 [&_strong]:opacity-80"
              style={{ fontSize: "clamp(2rem, 4.2vw, 4.5rem)", color: theme.accent }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(tile.question || "…") }}
            />
            {imageUrl && <img src={imageUrl} alt="Question media" className="max-h-48 rounded-[24px] object-contain" />}
            {audioUrl && <audio controls src={audioUrl} className="h-10" autoPlay />}

            {session.phase === "reveal" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 px-9 py-4 font-display font-black leading-snug"
                style={{
                  backgroundColor: theme.bg,
                  borderRadius: theme.radius,
                  color: theme.accent,
                  fontSize: "clamp(1.5rem, 3vw, 3rem)",
                }}
              >
                {tile.answer}
              </motion.div>
            )}
          </div>

          {activePlayer && (
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center bg-lilac text-lg scallop">{activePlayer.avatar}</span>
              <span className="font-display text-lg font-black text-foreground">{activePlayer.name}</span>
              <span className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase text-foreground ${activePlayer.team === "alpha" ? "bg-team-alpha" : "bg-team-bravo"}`}>
                {activePlayer.team}
              </span>
            </div>
          )}

          {/* 3-zone action row: Correct (left) · Reveal/Close (center) · Wrong (right) */}
          {!readOnly && (
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex justify-start">
              {activePlayer && !alreadyJudged && (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    sfx.ding();
                    if (activePlayer) {
                      const value = session.dd_wager ?? tile.points;
                      onHostStatePatch?.({
                        session: {
                          phase: "reveal",
                          dd_wager: null,
                          timer_ends_at: null,
                          ...(activePlayer.team === "alpha"
                            ? { score_alpha: session.score_alpha + value }
                            : { score_bravo: session.score_bravo + value }),
                        },
                        queue: queue.map((q) =>
                          q.tile_id === tile.id && q.player_id === activePlayer.id && q.status === "active"
                            ? { ...q, status: "correct", judged_at: new Date().toISOString() }
                            : q.tile_id === tile.id && q.status === "queued"
                              ? { ...q, status: "cleared", judged_at: new Date().toISOString() }
                              : q,
                        ),
                      });
                      // La chiamata sta DENTRO la guardia: fuori, `activePlayer.id`
                      // dipenderebbe dal restringimento di tipo operato dal JSX, che
                      // regge solo perché la variabile è `const`. Meglio non farlo
                      // dipendere da una sottigliezza del compilatore.
                      void judgeAnswer({
                        data: { sessionId: session.id, correct: true, expectedPlayerId: activePlayer.id },
                      });
                    }
                  }}
                  className="flex items-center gap-2 rounded-full bg-success px-9 py-3.5 font-display text-base font-black text-success-ink elev-2"
                >
                  <Check className="h-5 w-5" /> Correct
                </motion.button>
              )}
            </div>

            <div className="flex justify-center">
              {session.phase !== "reveal" ? (
                <button
                  onClick={() => {
                    onHostStatePatch?.({ session: { phase: "reveal", timer_ends_at: null } });
                    void revealAnswer({ data: { sessionId: session.id } });
                  }}
                  className="rounded-full bg-lilac px-8 py-3.5 font-display text-base font-black text-foreground elev-1 transition-transform hover:scale-105"
                >
                  Reveal answer
                </button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    onHostStatePatch?.({
                      session: {
                        phase: "idle",
                        current_tile_id: null,
                        active_player_id: null,
                        timer_ends_at: null,
                        dd_wager: null,
                        used_tile_ids: [...new Set([...session.used_tile_ids, tile.id])],
                      },
                      players: players.map((p) => ({ ...p, locked_out: false })),
                      queue: queue.map((q) =>
                        q.tile_id === tile.id && (q.status === "queued" || q.status === "active")
                          ? { ...q, status: "cleared", judged_at: new Date().toISOString() }
                          : q,
                      ),
                    });
                    void closeTile({ data: { sessionId: session.id } });
                  }}
                  className="rounded-full bg-coral px-9 py-3.5 font-display text-base font-black text-foreground elev-2"
                >
                  Close tile
                </motion.button>
              )}
            </div>

            <div className="flex justify-end">
              {activePlayer && !alreadyJudged && (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    sfx.wrong();
                    if (activePlayer) {
                      const value = session.dd_wager ?? Math.round(tile.points / 2);
                      const nextQueued = queue.find(
                        (q) => q.tile_id === tile.id && q.status === "queued" && q.player_id !== activePlayer.id,
                      );
                      const now = new Date().toISOString();
                      onHostStatePatch?.({
                        session: {
                          phase: session.dd_wager != null ? "reveal" : nextQueued ? "answering" : "question_open",
                          active_player_id: nextQueued?.player_id ?? null,
                          timer_ends_at: nextQueued ? new Date(Date.now() + 15_000).toISOString() : null,
                          dd_wager: null,
                          ...(activePlayer.team === "alpha"
                            ? { score_alpha: session.score_alpha - value }
                            : { score_bravo: session.score_bravo - value }),
                        },
                        players: players.map((p) => (p.id === activePlayer.id ? { ...p, locked_out: true } : p)),
                        queue: queue.map((q) =>
                          q.tile_id === tile.id && q.player_id === activePlayer.id && q.status === "active"
                            ? { ...q, status: "wrong", judged_at: now }
                            : nextQueued && q.id === nextQueued.id
                              ? { ...q, status: "active" }
                              : q,
                        ),
                      });
                      void judgeAnswer({
                        data: { sessionId: session.id, correct: false, expectedPlayerId: activePlayer.id },
                      });
                    }
                  }}
                  className="flex items-center gap-2 rounded-full bg-danger px-9 py-3.5 font-display text-base font-black text-danger-ink elev-2"
                >
                  <X className="h-5 w-5" /> Wrong
                </motion.button>
              )}
            </div>
          </div>
          )}
        </>
      )}
      </motion.div>
    </motion.div>
  );
}
function DailyDoubleWager({ session, players }: { session: Session; players: Player[] }) {
  const [playerId, setPlayerId] = useState(players[0]?.id ?? "");
  const [wager, setWager] = useState(500);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <motion.h2
        initial={{ scale: 0.6, rotate: -4 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 12 }}
        className="font-display text-4xl font-black tracking-wide text-ink-gold text-glow-gold sm:text-6xl"
      >
        DAILY DOUBLE
      </motion.h2>
      <p className="text-sm text-muted-foreground">Pick a contestant and set the wager</p>
      <select
        value={playerId}
        onChange={(e) => setPlayerId(e.target.value)}
        className="h-12 rounded-full bg-lilac px-5 text-sm font-bold text-foreground outline-none"
      >
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.avatar} {p.name} ({p.team})
          </option>
        ))}
      </select>
      <input
        type="number"
        min={1}
        value={wager}
        onChange={(e) => setWager(Number(e.target.value))}
        className="h-14 w-40 rounded-full bg-butter text-center font-display text-2xl font-black text-ink-gold outline-none"
      />
      <motion.button
        whileTap={{ scale: 0.95 }}
        disabled={!playerId || wager < 1}
        onClick={() => void startDailyDouble({ data: { sessionId: session.id, playerId, wager } })}
        className="rounded-full bg-coral px-10 py-4 font-display text-lg font-black text-foreground elev-2 disabled:opacity-40"
      >
        Start 15s clock
      </motion.button>
      <button
        onClick={() => void closeTile({ data: { sessionId: session.id } })}
        className="text-xs text-muted-foreground underline"
      >
        Skip this tile
      </button>
    </div>
  );
}
