import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useCountdown } from "@/hooks/use-countdown";
import { themeOf, type Team } from "@/lib/types";
import { CANVAS_H, CANVAS_W, type OverlayState } from "@/components/overlay/overlay-state";

const SPRING = { type: "spring" as const, stiffness: 260, damping: 30 };
const FADE = { duration: 0.36, ease: [0.2, 0, 0, 1] as [number, number, number, number] };
/** Soft dark scrim so text survives whatever the streamer composites underneath. */
const TEXT_SHADOW = "0 2px 10px rgba(0,0,0,0.55), 0 0 26px rgba(0,0,0,0.35)";

/**
 * Fixed 1920x1080 root, transform-scaled to the browser source and centred.
 * The layout never reflows — a reflow mid-stream is visible to the audience.
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
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function teamColor(state: OverlayState, team: Team): string {
  const theme = themeOf(state.game);
  return (team === "alpha" ? theme.teamAlpha : theme.teamBravo) ?? theme.accent;
}

export function teamLabel(team: Team) {
  return team === "alpha" ? "Team Alpha" : "Team Bravo";
}

/* ------------------------------ score chips ------------------------------- */

function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = value;
    if (a === b) return;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 450);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(a + (b - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{shown}</span>;
}

function AvatarStack({ state, team }: { state: OverlayState; team: Team }) {
  const members = state.players.filter((p) => p.team === team);
  if (members.length === 0) return null;
  const color = teamColor(state, team);

  if (members.length >= 6) {
    return <CookieBadge count={members.length} color={color} size={56} />;
  }
  return (
    <div style={{ display: "flex" }}>
      {members.map((p, i) => (
        <span
          key={p.id}
          style={{
            width: 56,
            height: 56,
            marginLeft: i === 0 ? 0 : -20,
            borderRadius: 999,
            background: color,
            border: "3px solid rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            opacity: p.locked_out ? 0.45 : 1,
          }}
        >
          {p.avatar}
        </span>
      ))}
    </div>
  );
}

/** 12-lobe scalloped cookie badge (SVG path — radii cannot make rounded lobes). */
export function CookieBadge({ count, color, size }: { count: number; color: string; size: number }) {
  const lobes = 12;
  const cx = 50;
  const cy = 50;
  const base = 34;
  const lobeR = 9;
  const pts: string[] = [];
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    pts.push(`${cx + Math.cos(a) * base},${cy + Math.sin(a) * base}`);
  }
  const d =
    pts
      .map((p, i) => (i === 0 ? `M ${p}` : `A ${lobeR} ${lobeR} 0 0 1 ${p}`))
      .join(" ") + ` A ${lobeR} ${lobeR} 0 0 1 ${pts[0]} Z`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <path d={d} fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth={5} />
      <text
        x="50"
        y="56"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="34"
        fontWeight="900"
        fill="#1B1020"
      >
        {count}
      </text>
    </svg>
  );
}

export function OverlayScores({ state }: { state: OverlayState }) {
  const theme = themeOf(state.game);
  const chip = (team: Team, score: number, mirrored: boolean) => (
    <div
      style={{
        display: "flex",
        flexDirection: mirrored ? "row" : "row-reverse",
        alignItems: "center",
        gap: 20,
        padding: "18px 34px",
        borderRadius: 999,
        background: teamColor(state, team),
        boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
      }}
    >
      <AvatarStack state={state} team={team} />
      <div style={{ textAlign: mirrored ? "right" : "left", color: "#1B1020" }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>
          {teamLabel(team)}
        </div>
        <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, minWidth: "5ch" }}>
          <CountUp value={score} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 48, color: theme.accent }}>
      {chip("alpha", state.session.score_alpha, true)}
      {chip("bravo", state.session.score_bravo, false)}
    </div>
  );
}

/* --------------------------------- board ---------------------------------- */

export function OverlayBoard({ state, size }: { state: OverlayState; size: number }) {
  const theme = themeOf(state.game);
  const used = new Set(state.session.used_tile_ids);
  const cats = state.categories;
  const clueOpen = Boolean(state.clue) && state.session.phase !== "idle";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius + 8,
        background: theme.bg,
        padding: 22,
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}
    >
      <AnimatePresence initial={false} mode="wait">
        {clueOpen ? (
          <motion.div
            key="clue"
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={SPRING}
            style={{ width: "100%", height: "100%" }}
          >
            <OverlayClue state={state} />
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={SPRING}
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              gridTemplateColumns: `repeat(${Math.max(1, cats.length)}, 1fr)`,
              gridTemplateRows: `auto repeat(5, 1fr)`,
              gap: 10,
            }}
          >
            {cats.map((c) => (
              <div
                key={c.id}
                style={{
                  background: theme.card,
                  color: theme.accent,
                  borderRadius: theme.radius * 0.6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: 8,
                  fontSize: 28,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: 1.05,
                }}
              >
                {c.title}
              </div>
            ))}
            {[0, 1, 2, 3, 4].map((row) =>
              cats.map((c) => {
                const tile = state.tiles.find((t) => t.category_id === c.id && t.row_index === row);
                if (!tile) return <div key={`${c.id}-${row}`} />;
                const isUsed = used.has(tile.id);
                return (
                  <motion.div
                    key={tile.id}
                    animate={{ opacity: isUsed ? 0.18 : 1, scale: isUsed ? 0.96 : 1 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      background: isUsed ? "transparent" : theme.card,
                      color: isUsed ? "transparent" : theme.accent,
                      borderRadius: theme.radius * 0.7,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 56,
                      fontWeight: 900,
                    }}
                  >
                    {tile.points}
                  </motion.div>
                );
              }),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Fluid clue size that fills the square box; never smaller than 44px on canvas. */
function clueFontSize(len: number): number {
  if (len < 60) return 96;
  if (len < 110) return 80;
  if (len < 180) return 66;
  if (len < 280) return 54;
  return 44;
}

function OverlayClue({ state }: { state: OverlayState }) {
  const theme = themeOf(state.game);
  const clue = state.clue!;
  const answering = state.session.phase === "answering";
  const buzzer = state.players.find((p) => p.id === state.session.active_player_id);
  const cd = useCountdown(answering ? state.session.timer_ends_at : null);
  const urgent = (cd.seconds ?? 99) <= 5;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: theme.radius,
        background: theme.card,
        color: theme.accent,
        padding: 48,
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 30,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: 2,
          opacity: 0.85,
        }}
      >
        <span>{clue.category}</span>
        <span>{clue.points}</span>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          // Canvas-relative (never viewport-relative): the root is transform-scaled.
          fontSize: clueFontSize(clue.question.length),
          fontWeight: 900,
          lineHeight: 1.1,
        }}
      >
        {clue.question}
      </div>

      {/* Reserved band: the timer and the answer swap in without shifting the clue. */}
      <div style={{ minHeight: 132, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AnimatePresence mode="wait">
          {clue.answer ? (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={FADE}
              style={{
                width: "100%",
                borderRadius: theme.radius * 0.7,
                background: theme.accent,
                color: theme.card,
                padding: "22px 32px",
                textAlign: "center",
                fontSize: 52,
                fontWeight: 900,
              }}
            >
              {clue.answer}
            </motion.div>
          ) : answering && cd.seconds !== null ? (
            <motion.div
              key="timer"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={FADE}
              style={{ display: "flex", alignItems: "center", gap: 28 }}
            >
              <TimerRing seconds={cd.seconds} fraction={cd.fraction} urgent={urgent} color={theme.accent} />
              {buzzer && (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      background: teamColor(state, buzzer.team),
                    }}
                  />
                  <span style={{ fontSize: 52, fontWeight: 900 }}>{buzzer.name}</span>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function TimerRing({
  seconds,
  fraction,
  urgent,
  color,
}: {
  seconds: number;
  fraction: number;
  urgent: boolean;
  color: string;
}) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const stroke = urgent ? "#C0392B" : color;
  return (
    <svg width={116} height={116} viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="9" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - fraction)}
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="57"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="40"
        fontWeight="900"
        fill={stroke}
      >
        {seconds}
      </text>
    </svg>
  );
}

/* ------------------------------- buzz queue -------------------------------- */

export function OverlayQueue({ state }: { state: OverlayState }) {
  const entries = state.queue.filter((q) => q.status === "queued" || q.status === "active");
  const cd = useCountdown(state.session.phase === "answering" ? state.session.timer_ends_at : null);

  return (
    <AnimatePresence>
      {entries.length > 0 && (
        <motion.ol
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14 }}
          transition={FADE}
          style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 14, width: 540 }}
        >
          {entries.map((q, i) => {
            const player = state.players.find((p) => p.id === q.player_id);
            if (!player) return null;
            const first = i === 0;
            return (
              <motion.li
                key={q.id}
                layout
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={SPRING}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: first ? "20px 26px" : "14px 26px",
                  borderRadius: 26,
                  background: first ? "rgba(12,6,18,0.88)" : "rgba(12,6,18,0.62)",
                  color: "#FFFFFF",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
                }}
              >
                <span style={{ fontSize: first ? 44 : 32, fontWeight: 900, minWidth: "1.4ch" }}>{i + 1}</span>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: teamColor(state, player.team),
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: first ? 46 : 34,
                    fontWeight: 900,
                    textShadow: TEXT_SHADOW,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {player.name}
                </span>
                {first && cd.seconds !== null && (
                  <TimerRing
                    seconds={cd.seconds}
                    fraction={cd.fraction}
                    urgent={cd.seconds <= 5}
                    color="#FFFFFF"
                  />
                )}
              </motion.li>
            );
          })}
        </motion.ol>
      )}
    </AnimatePresence>
  );
}
