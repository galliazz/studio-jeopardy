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
      state.session.phase === "reveal" ||
      state.session.phase === "daily_double_wager");

  return (
    <div className={SCRIM} style={{ position: "relative", width, height, display: "flex", justifyContent: "center" }}>
      <BoardGrid
        theme={theme}
        categories={state.categories}
        tiles={state.tiles}
        usedIds={new Set(state.session.used_tile_ids)}
        scale={height / 640}
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ score region ------------------------------ */

export function OverlayScores({ state }: { state: OverlayState }) {
  const theme = useOverlayTheme(state);
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={FADE}
      className={`flex items-center gap-10 ${SCRIM}`}
      /* Console-sized chips scaled up so every glyph clears 28px at 1080p. */
      style={{ transform: "scale(2.6)", transformOrigin: "top center" }}
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
  );
}

/* ------------------------------ queue region ------------------------------ */

export function OverlayQueue({ state }: { state: OverlayState }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={FADE}
      className={`text-foreground ${SCRIM}`}
      style={{ transform: "scale(1.9)", transformOrigin: "top right", width: 440 }}
    >
      <QueueList session={state.session} players={state.players} queue={state.queue} />
    </motion.div>
  );
}
