/**
 * Broadcast mirror pieces. These render the Host Console's own components in
 * read-only mode — no second implementation of the board, clue, score chips or
 * buzz queue exists. Any visual difference from the console is a bug.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { BoardGrid } from "@/components/game/BoardGrid";
import { QuestionOverlay } from "@/components/game/QuestionOverlay";
import { QueueList } from "@/components/game/QueueList";
import { ScorePill } from "@/components/game/ScorePill";
import { teamName } from "@/lib/types";
import {
  CANVAS_H,
  CANVAS_W,
  overlayTile,
  useOverlayTheme,
  type OverlayState,
} from "@/components/overlay/overlay-state";

/** Soft dark scrim so text survives whatever the streamer composites underneath. */
export const SCRIM = "drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] drop-shadow-[0_0_28px_rgba(0,0,0,0.45)]";

const FADE = { duration: 0.4, ease: [0.2, 0, 0, 1] as [number, number, number, number] };

/**
 * Fixed 1920x1080 root, transform-scaled to the browser source and centred,
 * with overflow hidden so nothing can escape the canvas at any window size.
 */
export function OverlayCanvas({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () =>
      setScale(Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        /* The size container for every mirrored piece: board and clue size
           their type and spacing off the 1920x1080 canvas, not off their own
           footprint, so a streamer's chosen board box cannot rescale them.
           As a class rather than an inline style, so it does not depend on
           `container-type` being present in the installed csstype. */
        className="[container-type:size]"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          overflow: "hidden",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          position: "relative",
          flex: "0 0 auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* --------------------------- board + clue region -------------------------- */

export function OverlayBoard({
  state,
  width,
  height,
}: {
  state: OverlayState;
  width: number;
  height: number;
}) {
  const theme = useOverlayTheme(state);
  const tile = overlayTile(state);
  const category = state.categories.find((c) => c.id === tile?.category_id) ?? null;
  const clueOpen =
    !!tile &&
    (state.session.phase === "question_open" ||
      state.session.phase === "answering" ||
      state.session.phase === "reveal");

  return (
    <div
      className={SCRIM}
      style={{ position: "relative", width, height, display: "flex", justifyContent: "center", alignItems: "center" }}
    >
      {/*
       * Board and clue share ONE box, so the clue is a true container transform
       * of the board's footprint instead of a differently-sized card that
       * happens to sit on top of it.
       */}
      <div style={{ position: "relative", height: "100%", aspectRatio: "5 / 5.4" }}>
        <BoardGrid
          theme={theme}
          categories={state.categories}
          tiles={state.tiles}
          usedIds={new Set(state.session.used_tile_ids)}
          scale={height / 640}
          fill
          ownContainer={false}
        />
        <AnimatePresence>
          {clueOpen && tile && (
            <QuestionOverlay
              key={tile.id + state.session.phase}
              session={state.session}
              tile={tile}
              category={category}
              players={state.players}
              queue={state.queue}
              theme={theme}
              readOnly
              ownContainer={false}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------ score region ------------------------------ */

export function OverlayScores({ state }: { state: OverlayState }) {
  const theme = useOverlayTheme(state);
  return (
    /* Console-sized chips scaled up so every glyph clears 28px at 1080p.
       The scale lives on a static wrapper: motion owns the inner transform. */
    <div style={{ transform: "scale(2.6)", transformOrigin: "top center" }}>
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={FADE}
      className={`flex items-center gap-10 ${SCRIM}`}
    >
      <ScorePill
        team="alpha"
        side="left"
        name={teamName(theme, "alpha")}
        score={state.session.score_alpha}
        players={state.players}
        step={0}
        quickValues={[]}
      />
      <ScorePill
        team="bravo"
        side="right"
        name={teamName(theme, "bravo")}
        score={state.session.score_bravo}
        players={state.players}
        step={0}
        quickValues={[]}
      />
    </motion.div>
    </div>
  );
}

/* ------------------------------ queue region ------------------------------ */

export function OverlayQueue({ state, align = "right" }: { state: OverlayState; align?: "left" | "right" }) {
  return (
    <div style={{ transform: "scale(1.6)", transformOrigin: `top ${align}`, width: 340 }}>
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={FADE}
      className={`text-foreground ${SCRIM}`}
    >
      <QueueList session={state.session} players={state.players} queue={state.queue} />
    </motion.div>
    </div>
  );
}
