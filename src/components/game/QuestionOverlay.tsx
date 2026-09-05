/**
 * The clue view: the container transform that replaces the board when a tile
 * opens. Shared verbatim by the Host Console and the OBS overlays.
 *
 * Non ha comandi. Giudizio, rivelazione e chiusura vivono tutti nel pannello
 * "Live control", a sinistra: averli anche qui significava due pulsanti per la
 * stessa azione a mezzo schermo di distanza. Qui resta la domanda, il tempo, e
 * il nome di chi si è prenotato.
 *
 * Ogni lunghezza è espressa in `cqmin`, misurata sull'impronta che il chiamante
 * le assegna — la stessa della board. Le unità di viewport, che c'erano prima,
 * facevano diventare enorme il testo dentro una finestra larga e bassa.
 */
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useCountdown } from "@/hooks/use-countdown";
import { sfx } from "@/lib/sfx";
import { sanitizeHtml } from "@/lib/sanitize";
import { useSignedUrl } from "@/lib/media";
import { boardTextCss } from "@/lib/types";
import type { Category, Player, Session, ThemeSettings, Tile } from "@/lib/types";

export function QuestionOverlay({
  session,
  tile,
  category,
  players,
  theme,
  readOnly = false,
  ownContainer = true,
}: {
  session: Session;
  tile: Tile;
  category: Category | null | undefined;
  players: Player[];
  theme: ThemeSettings;
  /** Mirror mode: no sound, no pointer interaction. */
  readOnly?: boolean;
  /**
   * Whether the clue's own footprint is the box its `cqmin` lengths measure.
   * The broadcast passes false so they resolve against the 1920x1080 canvas,
   * where every clamp below lands on its cap — i.e. on the pixel sizes the
   * overlay had before this component became container-relative.
   */
  ownContainer?: boolean;
}) {
  const imageUrl = useSignedUrl("game-media", tile.image_url);
  const audioUrl = useSignedUrl("game-media", tile.audio_url);
  const activePlayer = players.find((p) => p.id === session.active_player_id) ?? null;
  const isDailyDouble = session.daily_double_tile_ids?.includes(tile.id) ?? false;
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
    if (countdown.expired && alarmed.current !== session.timer_ends_at && armed.current === session.timer_ends_at) {
      alarmed.current = session.timer_ends_at;
      sfx.alarm();
    }
  }, [readOnly, countdown.seconds, countdown.expired, session.timer_ends_at]);

  const flashRed = countdown.expired && session.phase === "answering" && armed.current === session.timer_ends_at;
  const showTimer = countdown.seconds != null && session.phase !== "reveal";

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
        className="pointer-events-auto flex h-full w-full flex-col overflow-hidden p-[clamp(6px,2.2cqmin,20px)] elev-2"
        style={{ backgroundColor: theme.bg, borderRadius: theme.radius + 8 }}
      >
        {/* Daily Double: si annuncia sempre, nel momento in cui la casella si apre. */}
        {isDailyDouble && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            style={{ fontSize: "clamp(0.6rem, 3cqmin, 1.35rem)" }}
            className="mb-[clamp(3px,1cqmin,8px)] shrink-0 rounded-full bg-butter py-[clamp(3px,1.2cqmin,10px)] text-center font-display font-black uppercase tracking-[0.25em] text-ink-gold"
          >
            Daily Double · vale doppio
          </motion.div>
        )}

        <div className="flex shrink-0 items-center justify-end gap-2" style={{ minHeight: showTimer ? undefined : 0 }}>
          {showTimer && (
            <motion.span
              animate={flashRed ? { scale: [1, 1.35, 1] } : { scale: 1 }}
              transition={flashRed ? { repeat: Infinity, duration: 0.5 } : { duration: 0.15 }}
              style={{ fontSize: "clamp(0.85rem, 4.5cqmin, 1.875rem)" }}
              className={`rounded-full px-[clamp(8px,2.5cqmin,20px)] py-[clamp(3px,1.2cqmin,8px)] font-display font-black ${
                flashRed
                  ? "bg-danger text-danger-ink"
                  : countdown.seconds != null && countdown.seconds <= 5
                    ? "bg-danger/60 text-danger-ink"
                    : "bg-butter text-ink-gold"
              }`}
            >
              0:{String(countdown.seconds ?? 0).padStart(2, "0")}
            </motion.span>
          )}
        </div>

        {showTimer && (
          <div className="mt-[clamp(4px,1.2cqmin,12px)] h-[clamp(4px,1.1cqmin,10px)] w-full shrink-0 overflow-hidden rounded-full bg-muted">
            <div
              /* Niente transizione sulla larghezza: il valore viene già
                 ricalcolato a ogni frame dallo stesso rAF che muove il numero.
                 Una transizione di 100ms ne fa partire una nuova a ogni frame,
                 così la barra insegue il numero e non lo raggiunge mai. */
              className={`h-full rounded-full ${
                countdown.seconds != null && countdown.seconds <= 5 ? "bg-danger-ink" : "bg-ink-gold"
              }`}
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
            style={{ color: theme.accent, ...boardTextCss(theme, "categories", 0.75, 1.9) }}
          >
            {category?.title ?? "Question"}
          </p>
          <p
            className="shrink-0 font-display font-black"
            style={{ color: theme.accent, ...boardTextCss(theme, "numbers", 1.25, 3) }}
          >
            {isDailyDouble ? `${tile.points} ×2` : tile.points}
          </p>
        </div>

        <div
          className="mt-[clamp(4px,1cqmin,10px)] flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(6px,1.8cqmin,16px)] overflow-y-auto p-[clamp(8px,2.5cqmin,24px)] text-center"
          style={{ backgroundColor: theme.card, borderRadius: theme.radius }}
        >
          <div
            className="max-w-4xl font-display font-black leading-tight [&_b]:opacity-80 [&_strong]:opacity-80"
            style={{ color: theme.accent, ...boardTextCss(theme, "questions", 4.25, 8) }}
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

        {/*
         * La fascia sotto la domanda: senza più pulsanti, il nome di chi si è
         * prenotato la occupa tutta e sta al centro, con la sua aria attorno.
         */}
        <div className="flex shrink-0 items-center justify-center py-[clamp(6px,2.6cqmin,22px)]">
          {activePlayer ? (
            <motion.div
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex max-w-full flex-wrap items-center justify-center gap-[clamp(4px,1.4cqmin,10px)]"
            >
              <span
                className="flex h-[clamp(24px,5cqmin,40px)] w-[clamp(24px,5cqmin,40px)] items-center justify-center bg-lilac scallop"
                style={{ fontSize: "clamp(0.65rem, 2.6cqmin, 1.125rem)" }}
              >
                {activePlayer.avatar}
              </span>
              <span
                className="min-w-0 truncate font-display font-black text-foreground"
                style={{ fontSize: "clamp(0.7rem, 3.2cqmin, 1.375rem)" }}
              >
                {activePlayer.name}
              </span>
              <span
                style={{ fontSize: "clamp(0.4rem, 1.7cqmin, 0.7rem)" }}
                className={`rounded-full px-[clamp(5px,1.6cqmin,12px)] py-0.5 font-bold uppercase text-foreground ${
                  activePlayer.team === "alpha" ? "bg-team-alpha" : "bg-team-bravo"
                }`}
              >
                {activePlayer.team}
              </span>
            </motion.div>
          ) : (
            <span
              style={{ fontSize: "clamp(0.55rem, 2.2cqmin, 0.95rem)" }}
              className="font-semibold uppercase tracking-[0.25em] text-muted-foreground"
            >
              {session.phase === "reveal" ? "Casella conclusa" : "Buzzer aperti"}
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
