/**
 * Team score chips — the single implementation shared by the Host Console and
 * the OBS overlays. Omitting onAdjust/onSet renders the read-only mirror.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, Minus, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Player, Team } from "@/lib/types";

const COOKIE_PATH =
  "M95.7,50.0 L95.0,52.9 L93.0,55.7 L90.2,58.0 L87.3,60.0 L85.0,61.9 L83.5,63.9 L83.1,66.3 L83.5,69.3 L84.1,72.8 L84.4,76.4 L83.9,79.7 L82.3,82.3 L79.7,83.9 L76.4,84.4 L72.8,84.1 L69.3,83.5 L66.3,83.1 L63.9,83.5 L61.9,85.0 L60.0,87.3 L58.0,90.2 L55.7,93.0 L52.9,95.0 L50.0,95.7 L47.1,95.0 L44.3,93.0 L42.0,90.2 L40.0,87.3 L38.1,85.0 L36.1,83.5 L33.7,83.1 L30.7,83.5 L27.2,84.1 L23.6,84.4 L20.3,83.9 L17.7,82.3 L16.1,79.7 L15.6,76.4 L15.9,72.8 L16.5,69.3 L16.9,66.3 L16.5,63.9 L15.0,61.9 L12.7,60.0 L9.8,58.0 L7.0,55.7 L5.0,52.9 L4.3,50.0 L5.0,47.1 L7.0,44.3 L9.8,42.0 L12.7,40.0 L15.0,38.1 L16.5,36.1 L16.9,33.7 L16.5,30.7 L15.9,27.2 L15.6,23.6 L16.1,20.3 L17.7,17.7 L20.3,16.1 L23.6,15.6 L27.2,15.9 L30.7,16.5 L33.7,16.9 L36.1,16.5 L38.1,15.0 L40.0,12.7 L42.0,9.8 L44.3,7.0 L47.1,5.0 L50.0,4.3 L52.9,5.0 L55.7,7.0 L58.0,9.8 L60.0,12.7 L61.9,15.0 L63.9,16.5 L66.3,16.9 L69.3,16.5 L72.8,15.9 L76.4,15.6 L79.7,16.1 L82.3,17.7 L83.9,20.3 L84.4,23.6 L84.1,27.2 L83.5,30.7 L83.1,33.7 L83.5,36.1 L85.0,38.1 L87.3,40.0 L90.2,42.0 L93.0,44.3 L95.0,47.1 Z";

function CountUpScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    const duration = 500;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className="tabular-nums">{display}</span>;
}

function TeamCountBadge({ team, count }: { team: Team; count: number }) {
  return (
    <motion.span
      layout
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.4, opacity: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className="relative block h-7 w-7 shrink-0"
      title={`${count} players`}
      aria-label={`${count} players on this team`}
    >
      <svg viewBox="0 0 100 100" className="h-7 w-7">
        <path d={COOKIE_PATH} className={team === "alpha" ? "fill-team-alpha-ink" : "fill-team-bravo-ink"} />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center pb-[1px] font-display text-[11px] font-black leading-none ${
          team === "alpha" ? "text-team-alpha" : "text-team-bravo"
        }`}
      >
        {count}
      </span>
    </motion.span>
  );
}

/** Compact minus / custom / plus cluster attached to the outer side of a chip. */
function ScoreControls({
  name,
  step,
  quickValues,
  mirrored,
  onAdjust,
}: {
  name: string;
  step: number;
  quickValues: number[];
  mirrored: boolean;
  onAdjust: (delta: number) => void;
}) {
  const [custom, setCustom] = useState("");
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ink-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const amount = Number(custom) || 0;

  return (
    <div
      className={`flex shrink-0 items-center gap-0.5 rounded-full border border-foreground/15 p-1 ${
        mirrored ? "mr-2 flex-row" : "ml-2 flex-row-reverse"
      }`}
    >
      <button onClick={() => onAdjust(-step)} aria-label={`Subtract ${step} from ${name}`} title={`−${step}`} className={btn}>
        <Minus className="h-4 w-4" />
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <button aria-label={`Custom score change for ${name}`} title="Custom amount" className={btn}>
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-[19rem] rounded-[24px] p-4">
          <p className="mb-2 text-sm font-semibold text-muted-foreground">Custom amount</p>
          <input
            type="number"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="0"
            aria-label="Custom amount"
            className="h-11 w-full rounded-full border border-foreground/20 bg-transparent px-4 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ink-accent"
          />
          {quickValues.length > 0 && (
            /* Una riga sola: il taglio da 1000 andava a capo da solo e la
               scaletta sembrava avere due gruppi che non esistono. */
            <div className="mt-2 flex items-center gap-1.5">
              {quickValues.map((v) => (
                <button
                  key={v}
                  onClick={() => setCustom(String(v))}
                  className="min-h-9 flex-1 rounded-full border border-foreground/20 px-1 text-xs font-bold tabular-nums transition-colors hover:bg-foreground/5"
                >
                  {v}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              disabled={!amount}
              onClick={() => {
                onAdjust(Math.abs(amount));
                setCustom("");
              }}
              className="min-h-11 rounded-full bg-success px-3 text-sm font-black text-success-ink disabled:opacity-40"
            >
              Add
            </button>
            <button
              disabled={!amount}
              onClick={() => {
                onAdjust(-Math.abs(amount));
                setCustom("");
              }}
              className="min-h-11 rounded-full bg-danger px-3 text-sm font-black text-danger-ink disabled:opacity-40"
            >
              Subtract
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <button onClick={() => onAdjust(step)} aria-label={`Add ${step} to ${name}`} title={`+${step}`} className={btn}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** The score value, editable in place on double click without shifting layout. */
function EditableScore({ score, name, onSet }: { score: number; name: string; onSet?: ((value: number) => void) | undefined }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(score));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const next = Number(draft);
    if (Number.isFinite(next) && next !== score) onSet?.(next);
    setEditing(false);
  };

  const shared = "min-w-[4.5ch] font-display text-base font-black leading-none";

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        aria-label={`${name} score`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className={`${shared} w-[4.5ch] appearance-none border-0 bg-transparent p-0 text-inherit outline-none`}
      />
    );
  }

  return (
    <div
      className={`${shared} cursor-text`}
      title="Double-click to edit"
      onDoubleClick={() => {
        if (!onSet) return;
        setDraft(String(score));
        setEditing(true);
      }}
    >
      <CountUpScore value={score} />
    </div>
  );
}

export function ScorePill({
  team,
  side,
  name,
  score,
  players,
  step,
  quickValues,
  onAdjust,
  onSet,
}: {
  team: Team;
  side: "left" | "right";
  name: string;
  score: number;
  players: Player[];
  step: number;
  quickValues: number[];
  onAdjust?: ((delta: number) => void) | undefined;
  onSet?: ((value: number) => void) | undefined;
}) {

  const members = players.filter((p) => p.team === team);
  const collapsed = members.length >= 6;
  const mirrored = side === "left";

  const avatars = (
    <div className={`flex ${mirrored ? "flex-row-reverse" : "flex-row"}`}>
      <AnimatePresence initial={false} mode="popLayout">
        {collapsed ? (
          <TeamCountBadge key="count" team={team} count={members.length} />
        ) : (
          members.map((p, i) => (
            <motion.span
              key={p.id}
              layout
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              title={p.name}
              className={`flex h-7 w-7 shrink-0 items-center justify-center bg-card text-sm scallop ${
                p.locked_out ? "opacity-40" : ""
              }`}
              style={{
                marginLeft: !mirrored && i > 0 ? "-35%" : undefined,
                marginRight: mirrored && i > 0 ? "-35%" : undefined,
                zIndex: members.length - i,
              }}
            >
              {p.avatar}
            </motion.span>
          ))
        )}
      </AnimatePresence>
    </div>
  );

  const text = (
    <div className={`text-foreground ${mirrored ? "text-right" : "text-left"}`}>
      <div className="text-[9px] font-bold uppercase tracking-wider opacity-70">{name}</div>
      <EditableScore score={score} name={name} onSet={onSet} />
    </div>
  );

  const adjust = onAdjust && (
    <ScoreControls name={name} step={step} quickValues={quickValues} mirrored={mirrored} onAdjust={onAdjust} />
  );

  const pill = (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex w-fit items-center gap-2.5 rounded-full px-5 py-2.5 elev-1 ${
        team === "alpha" ? "bg-team-alpha" : "bg-team-bravo"
      }`}
    >
      {mirrored ? (
        <>
          {avatars}
          {text}
        </>
      ) : (
        <>
          {text}
          {avatars}
        </>
      )}
    </motion.div>
  );

  return (
    <div className="flex items-center">
      {mirrored ? (
        <>
          {adjust}
          {pill}
        </>
      ) : (
        <>
          {pill}
          {adjust}
        </>
      )}
    </div>
  );
}
