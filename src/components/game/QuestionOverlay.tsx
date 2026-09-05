/**
 * The clue view: the container transform that replaces the board when a tile
 * opens. Shared verbatim by the Host Console and the OBS overlays; the overlay
 * passes readOnly so the judging controls and host chrome are not rendered.
 *
 * It fills — exactly — the footprint its caller gives it, which is the board's
 * own box, and it is a size container: every length below is expressed in
 * `cqmin`, so the clue keeps its proportions whatever the window does. Viewport
 * units used to size this type, which meant a wide, short window produced huge
 * text inside a small card.
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
  ownContainer = true,
  onActionSettled,
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
  /**
   * Whether the clue's own footprint is the box its `cqmin` lengths measure.
   * The broadcast passes false so they resolve against the 1920x1080 canvas,
   * where every clamp below lands on its cap — i.e. on the pixel sizes the
   * overlay had before this component became container-relative.
   */
  ownContainer?: boolean;
  /**
   * Called when one of the buttons below has finished talking to the server,
   * with the error if it failed. The Host Console uses it to reload the real
   * state: without it a rejected call would leave its optimistic patch on
   * screen with nothing left to correct it.
   */
  onActionSettled?: ((error?: unknown) => void) | undefined;
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

  /** Every server call from this view reports back, so a failure is never silent. */
  const settle = (call: Promise<unknown>) => {
    void call.then(
      () => onActionSettled?.(),
      (err: unknown) => onActionSettled?.(err),
    );
  };

  return (
    <motion.div
      className={`pointer-events-none absolute inset-0 z-40 flex justify-center ${
        ownContainer ? "[container-type:size]" : ""
      }`}
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 260, damping: 26, duration: 0.4 }}
        className="pointer-events-auto flex h-full w-full flex-col overflow-y-auto p-[clamp(6px,2.2cqmin,20px)] elev-2"
        style={{ backgroundColor: theme.bg, borderRadius: theme.radius + 8 }}
      >
      {session.phase === "daily_double_wager" ? (
        <DailyDoubleWager session={session} players={players} settle={settle} />
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-end gap-2">
            {countdown.seconds != null && session.phase !== "reveal" && (
              <motion.span
                animate={flashRed ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                transition={flashRed ? { repeat: Infinity, duration: 0.5 } : { duration: 0.15 }}
                style={{ fontSize: "clamp(0.85rem, 4.5cqmin, 1.875rem)" }}
                className={`rounded-full px-[clamp(8px,2.5cqmin,20px)] py-[clamp(3px,1.2cqmin,8px)] font-display font-black ${
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
            <div className="mt-[clamp(4px,1.2cqmin,12px)] h-[clamp(4px,1.1cqmin,10px)] w-full shrink-0 overflow-hidden rounded-full bg-muted">
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
            className="mt-[clamp(4px,1cqmin,8px)] flex shrink-0 items-center justify-between gap-[clamp(4px,1.5cqmin,12px)] px-[clamp(8px,2.2cqmin,16px)] py-[clamp(4px,1.2cqmin,8px)]"
            style={{ backgroundColor: theme.card, borderRadius: theme.radius * 0.6 }}
          >
            <p
              className="truncate font-bold uppercase tracking-[0.3em]"
              style={{ color: theme.accent, fontSize: "clamp(0.45rem, 1.9cqmin, 0.75rem)" }}
            >
              {category?.title ?? "Question"}
            </p>
            <p
              className="shrink-0 font-display font-black"
              style={{ color: theme.accent, fontSize: "clamp(0.65rem, 3cqmin, 1.25rem)" }}
            >
              {session.dd_wager ? `DD ${session.dd_wager}` : tile.points}
            </p>
          </div>

          <div
            className="mt-[clamp(4px,1cqmin,10px)] flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(6px,1.8cqmin,16px)] overflow-y-auto p-[clamp(8px,2.5cqmin,24px)] text-center"
            style={{ backgroundColor: theme.card, borderRadius: theme.radius }}
          >
            <div
              className="max-w-4xl font-display font-black leading-tight [&_b]:opacity-80 [&_strong]:opacity-80"
              style={{ fontSize: "clamp(0.95rem, 8cqmin, 4.25rem)", color: theme.accent }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(tile.question || "…") }}
            />
            {imageUrl && <img src={imageUrl} alt="Question media" className="max-h-[28cqmin] rounded-[24px] object-contain" />}
            {audioUrl && <audio controls src={audioUrl} className="h-10" autoPlay />}

            {session.phase === "reveal" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-[clamp(4px,1cqmin,8px)] px-[clamp(12px,4cqmin,36px)] py-[clamp(6px,2cqmin,16px)] font-display font-black leading-snug"
                style={{
                  backgroundColor: theme.bg,
                  borderRadius: theme.radius,
                  color: theme.accent,
                  fontSize: "clamp(0.8rem, 5.2cqmin, 3rem)",
                }}
              >
                {tile.answer}
              </motion.div>
            )}
          </div>

          {activePlayer && (
            <div className="mb-[clamp(4px,1.4cqmin,12px)] flex shrink-0 flex-wrap items-center justify-center gap-2">
              <span
                className="flex h-[clamp(24px,5cqmin,40px)] w-[clamp(24px,5cqmin,40px)] items-center justify-center bg-lilac scallop"
                style={{ fontSize: "clamp(0.65rem, 2.6cqmin, 1.125rem)" }}
              >
                {activePlayer.avatar}
              </span>
              <span
                className="min-w-0 truncate font-display font-black text-foreground"
                style={{ fontSize: "clamp(0.7rem, 2.8cqmin, 1.125rem)" }}
              >
                {activePlayer.name}
              </span>
              <span
                style={{ fontSize: "clamp(0.4rem, 1.6cqmin, 0.625rem)" }}
                className={`rounded-full px-[clamp(5px,1.6cqmin,12px)] py-0.5 font-bold uppercase text-foreground ${activePlayer.team === "alpha" ? "bg-team-alpha" : "bg-team-bravo"}`}
              >
                {activePlayer.team}
              </span>
            </div>
          )}

          {/* 3-zone action row: Correct (left) · Reveal/Close (center) · Wrong (right) */}
          {!readOnly && (
          <div className="grid w-full shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-[clamp(4px,1.5cqmin,12px)]">
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
                      settle(
                        judgeAnswer({
                          data: { sessionId: session.id, correct: true, expectedPlayerId: activePlayer.id },
                        }),
                      );
                    }
                  }}
                  style={{ fontSize: "clamp(0.6rem, 2.4cqmin, 1rem)" }}
                  className="flex items-center gap-[clamp(3px,1cqmin,8px)] rounded-full bg-success px-[clamp(10px,3.4cqmin,36px)] py-[clamp(6px,1.9cqmin,14px)] font-display font-black text-success-ink elev-2"
                >
                  <Check className="h-[clamp(12px,2.6cqmin,20px)] w-[clamp(12px,2.6cqmin,20px)]" /> Correct
                </motion.button>
              )}
            </div>

            <div className="flex justify-center">
              {session.phase !== "reveal" ? (
                <button
                  onClick={() => {
                    onHostStatePatch?.({ session: { phase: "reveal", timer_ends_at: null } });
                    settle(revealAnswer({ data: { sessionId: session.id } }));
                  }}
                  style={{ fontSize: "clamp(0.6rem, 2.4cqmin, 1rem)" }}
                  className="rounded-full bg-lilac px-[clamp(10px,3.2cqmin,32px)] py-[clamp(6px,1.9cqmin,14px)] font-display font-black text-foreground elev-1 transition-transform hover:scale-105"
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
                    settle(closeTile({ data: { sessionId: session.id } }));
                  }}
                  style={{ fontSize: "clamp(0.6rem, 2.4cqmin, 1rem)" }}
                  className="rounded-full bg-coral px-[clamp(10px,3.4cqmin,36px)] py-[clamp(6px,1.9cqmin,14px)] font-display font-black text-foreground elev-2"
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
                      settle(
                        judgeAnswer({
                          data: { sessionId: session.id, correct: false, expectedPlayerId: activePlayer.id },
                        }),
                      );
                    }
                  }}
                  style={{ fontSize: "clamp(0.6rem, 2.4cqmin, 1rem)" }}
                  className="flex items-center gap-[clamp(3px,1cqmin,8px)] rounded-full bg-danger px-[clamp(10px,3.4cqmin,36px)] py-[clamp(6px,1.9cqmin,14px)] font-display font-black text-danger-ink elev-2"
                >
                  <X className="h-[clamp(12px,2.6cqmin,20px)] w-[clamp(12px,2.6cqmin,20px)]" /> Wrong
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
function DailyDoubleWager({
  session,
  players,
  settle,
}: {
  session: Session;
  players: Player[];
  settle: (call: Promise<unknown>) => void;
}) {
  const [playerId, setPlayerId] = useState(players[0]?.id ?? "");
  const [wager, setWager] = useState(500);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(6px,2.2cqmin,20px)] overflow-y-auto text-center">
      <motion.h2
        initial={{ scale: 0.6, rotate: -4 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 12 }}
        style={{ fontSize: "clamp(1.1rem, 7cqmin, 3.75rem)" }}
        className="font-display font-black tracking-wide text-ink-gold text-glow-gold"
      >
        DAILY DOUBLE
      </motion.h2>
      <p style={{ fontSize: "clamp(0.55rem, 2cqmin, 0.875rem)" }} className="text-muted-foreground">
        Pick a contestant and set the wager
      </p>
      <select
        value={playerId}
        onChange={(e) => setPlayerId(e.target.value)}
        style={{ fontSize: "clamp(0.6rem, 2.2cqmin, 0.875rem)" }}
        className="h-[clamp(36px,6cqmin,48px)] max-w-full rounded-full bg-lilac px-5 font-bold text-foreground outline-none"
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
        style={{ fontSize: "clamp(0.9rem, 4cqmin, 1.5rem)" }}
        className="h-[clamp(40px,7cqmin,56px)] w-[clamp(96px,26cqmin,160px)] rounded-full bg-butter text-center font-display font-black text-ink-gold outline-none"
      />
      <motion.button
        whileTap={{ scale: 0.95 }}
        disabled={!playerId || wager < 1}
        onClick={() => settle(startDailyDouble({ data: { sessionId: session.id, playerId, wager } }))}
        style={{ fontSize: "clamp(0.65rem, 2.8cqmin, 1.125rem)" }}
        className="rounded-full bg-coral px-[clamp(14px,4cqmin,40px)] py-[clamp(7px,2.2cqmin,16px)] font-display font-black text-foreground elev-2 disabled:opacity-40"
      >
        Start 15s clock
      </motion.button>
      <button
        onClick={() => settle(closeTile({ data: { sessionId: session.id } }))}
        style={{ fontSize: "clamp(0.5rem, 1.8cqmin, 0.75rem)" }}
        className="text-muted-foreground underline"
      >
        Skip this tile
      </button>
    </div>
  );
}
