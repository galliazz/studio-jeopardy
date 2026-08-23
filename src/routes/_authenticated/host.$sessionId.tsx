import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  RotateCcw,
  Trash2,
  Volume2,
  Plus,
  Sparkles,
  BarChart3,
  Crown,
  X,
  Check,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  getHostState,
  openTile,
  closeTile,
  clearQueue,
  resetBoard,
  judgeAnswer,
  revealAnswer,
  startDailyDouble,
  setDailyDoubles,
  startFinal,
  beginFinalAnswers,
  judgeFinal,
  finishSession,
} from "@/lib/sessions.functions";
import { updateGame } from "@/lib/games.functions";
import { useSessionRealtime } from "@/hooks/use-session-realtime";
import { useCountdown } from "@/hooks/use-countdown";
import { sfx } from "@/lib/sfx";
import { sanitizeHtml } from "@/lib/sanitize";
import { uploadMedia, useSignedUrl } from "@/lib/media";
import {
  themeOf,
  teamName,
  formatDelta,
  type Player,
  type Session,
  type Tile,
  type Category,
  type QueueEntry,
  type FinalAnswer,
  type Game,
  type Team,
} from "@/lib/types";

export const Route = createFileRoute("/_authenticated/host/$sessionId")({
  head: () => ({
    meta: [
      { title: "Host Console — JEOPARDESTINY" },
      { name: "description", content: "Live host console: board, buzzer queue, timers and scoring." },
      { property: "og:title", content: "Host Console — JEOPARDESTINY" },
      { property: "og:description", content: "Live host console: board, buzzer queue, timers and scoring." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: HostPage,
});

interface HostState {
  session: Session;
  game: Game;
  categories: Category[];
  tiles: Tile[];
  players: Player[];
  queue: QueueEntry[];
  finalAnswers: FinalAnswer[];
}

function HostPage() {
  const { sessionId } = Route.useParams();
  const fetchState = useServerFn(getHostState);
  const { data } = useQuery({
    queryKey: ["host", sessionId],
    queryFn: () => fetchState({ data: { sessionId } }),
    refetchOnWindowFocus: false,
  });
  useSessionRealtime(sessionId, [["host", sessionId]]);

  const state = data as unknown as HostState | undefined;
  const [ddOpen, setDdOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);

  // ---- SFX triggers on state transitions --------------------------------
  const prevActive = useRef<string | null>(null);
  const prevPhase = useRef<string | null>(null);
  const prevStatus = useRef<string | null>(null);
  useEffect(() => {
    if (!state) return;
    const s = state.session;
    if (s.active_player_id && s.active_player_id !== prevActive.current) sfx.buzz();
    if (s.phase === "daily_double_wager" && prevPhase.current !== "daily_double_wager") sfx.dailyDouble();
    if (s.status === "finished" && prevStatus.current !== "finished") {
      sfx.fanfare();
      void confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
      setTimeout(() => void confetti({ particleCount: 100, spread: 120, origin: { y: 0.4 } }), 500);
    }
    prevActive.current = s.active_player_id;
    prevPhase.current = s.phase;
    prevStatus.current = s.status;
  }, [state]);

  if (!state) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background">
        <div className="h-16 w-16 animate-pulse rounded-[24px] bg-accent" />
      </div>
    );
  }

  const { session, game, categories, tiles, players, queue, finalAnswers } = state;
  const theme = themeOf(game);
  const usedSet = new Set(session.used_tile_ids);
  const remaining = tiles.length - usedSet.size;
  const currentTile = tiles.find((t) => t.id === session.current_tile_id) ?? null;
  const currentCategory = currentTile
    ? categories.find((c) => c.id === currentTile.category_id)
    : null;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            to="/edit/$gameId"
            params={{ gameId: game.id }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-accent"
            aria-label="Back to editor"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-black leading-tight sm:text-xl">{game.title}</h1>
            <p className="text-xs text-muted-foreground">
              Code <span className="font-mono font-bold text-gold">{game.join_code}</span> ·{" "}
              {session.status === "lobby" ? "Waiting in lobby" : `${Math.max(0, remaining)} questions remain`}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ScorePill team="alpha" score={session.score_alpha} players={players} />
            <ScorePill team="bravo" score={session.score_bravo} players={players} />
            <button
              onClick={async () => {
                await resetBoard({ data: { sessionId } });
                toast.success("Board reset — new Daily Doubles picked");
              }}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground hover:bg-accent"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Board
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
          {/* LEFT: preview + soundboard + tools */}
          <div className="order-2 space-y-4 lg:order-1">
            <AnswerPreview tile={currentTile} phase={session.phase} />
            <Soundboard game={game} />
            <div className="rounded-[24px] bg-card p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tools</h3>
              <div className="flex flex-col gap-2">
                <ToolButton icon={Sparkles} label="Daily Double tiles" onClick={() => setDdOpen(true)} />
                <ToolButton icon={BarChart3} label="Analytics" onClick={() => setAnalyticsOpen(true)} />
                <ToolButton icon={Flag} label="Final Jeopardy" onClick={() => setFinalOpen(true)} />
                <ToolButton
                  icon={Crown}
                  label="End game & podium"
                  onClick={async () => {
                    await finishSession({ data: { sessionId } });
                  }}
                />
              </div>
            </div>
          </div>

          {/* CENTER: board + overlay */}
          <div className="relative order-1 lg:order-2">
            <div className="p-3 sm:p-4" style={{ backgroundColor: theme.bg, borderRadius: theme.radius + 8 }}>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex min-h-12 items-center justify-center p-1.5 text-center text-[9px] font-bold uppercase leading-tight tracking-wide sm:min-h-16 sm:text-xs"
                    style={{ backgroundColor: theme.card, borderRadius: theme.radius * 0.6, color: theme.accent }}
                  >
                    {cat.title}
                  </div>
                ))}
                {[0, 1, 2, 3, 4].map((row) =>
                  categories.map((cat) => {
                    const tile = tiles.find((t) => t.category_id === cat.id && t.row_index === row);
                    if (!tile) return <div key={`${cat.id}-${row}`} />;
                    const used = usedSet.has(tile.id);
                    return (
                      <motion.button
                        key={tile.id}
                        {...(used ? {} : { whileTap: { scale: 0.94 } })}
                        disabled={used || session.status === "final" || session.status === "finished"}
                        onClick={() => void openTile({ data: { sessionId, tileId: tile.id } })}
                        className="flex min-h-14 items-center justify-center font-display text-base font-black transition-all sm:min-h-20 sm:text-2xl"
                        style={{
                          backgroundColor: used ? "transparent" : theme.card,
                          borderRadius: theme.radius,
                          color: used ? "transparent" : theme.accent,
                          opacity: used ? 0.35 : 1,
                          boxShadow: used ? "none" : `0 0 0 1px color-mix(in srgb, ${theme.accent} 18%, transparent)`,
                        }}
                      >
                        {used ? "✓" : tile.points}
                      </motion.button>
                    );
                  }),
                )}
              </div>
            </div>

            <AnimatePresence>
              {(session.phase === "question_open" ||
                session.phase === "answering" ||
                session.phase === "reveal" ||
                session.phase === "daily_double_wager") &&
                currentTile && (
                  <QuestionOverlay
                    key={currentTile.id + session.phase}
                    session={session}
                    tile={currentTile}
                    category={currentCategory}
                    players={players}
                    queue={queue}
                    accent={theme.accent}
                  />
                )}
            </AnimatePresence>
          </div>

          {/* RIGHT: queue + controls */}
          <div className="order-3 space-y-4">
            <QueuePanel session={session} players={players} queue={queue} />
            {session.status === "final" && (
              <FinalPanel session={session} finalAnswers={finalAnswers} players={players} />
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>{ddOpen && <DDTilesDialog state={state} onClose={() => setDdOpen(false)} />}</AnimatePresence>
      <AnimatePresence>
        {analyticsOpen && <AnalyticsDialog state={state} onClose={() => setAnalyticsOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>{finalOpen && <FinalDialog sessionId={sessionId} onClose={() => setFinalOpen(false)} />}</AnimatePresence>
      <AnimatePresence>
        {session.status === "finished" && <Podium session={session} players={players} />}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------- Score pill ------------------------------- */

function ScorePill({ team, score, players }: { team: Team; score: number; players: Player[] }) {
  const members = players.filter((p) => p.team === team);
  return (
    <motion.div
      key={score}
      initial={{ scale: 1.12 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={`flex items-center gap-2 rounded-full px-4 py-2 ${
        team === "alpha" ? "bg-team-alpha" : "bg-team-bravo"
      }`}
    >
      <div className="flex -space-x-1.5">
        {members.slice(0, 4).map((p) => (
          <span key={p.id} className="flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-sm">
            {p.avatar}
          </span>
        ))}
      </div>
      <div className="text-white">
        <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">
          {team === "alpha" ? "Alpha" : "Bravo"}
        </div>
        <div className="font-display text-base font-black leading-none">${score}</div>
      </div>
    </motion.div>
  );
}

/* ----------------------------- Answer preview ----------------------------- */

function AnswerPreview({ tile, phase }: { tile: Tile | null; phase: Session["phase"] }) {
  const revealed = phase === "reveal";
  return (
    <div className="rounded-[24px] bg-card p-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Answer Preview</h3>
      {tile ? (
        <div className={revealed ? "" : "select-none"}>
          <p className={`text-sm font-semibold ${revealed ? "text-gold" : "text-foreground"}`}>
            {revealed || phase === "answering" || phase === "question_open" ? tile.answer || "—" : "—"}
          </p>
          {tile.hint && <p className="mt-2 text-xs italic text-muted-foreground">Hint: {tile.hint}</p>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Open a tile to see its answer here.</p>
      )}
    </div>
  );
}

/* ------------------------------- Soundboard ------------------------------- */

const SFX_BUTTONS = [
  { key: "buzz", label: "Buzzer", play: () => sfx.buzz() },
  { key: "ding", label: "Correct", play: () => sfx.ding() },
  { key: "wrong", label: "Wrong", play: () => sfx.wrong() },
  { key: "dd", label: "Daily Double", play: () => sfx.dailyDouble() },
  { key: "alarm", label: "Time's Up", play: () => sfx.alarm() },
  { key: "fanfare", label: "Fanfare", play: () => sfx.fanfare() },
];

function Soundboard({ game }: { game: Game }) {
  const theme = themeOf(game);
  const fileRef = useRef<HTMLInputElement>(null);
  const custom = theme.customSounds ?? [];

  return (
    <div className="rounded-[24px] bg-card p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Volume2 className="h-3.5 w-3.5" /> Soundboard
      </h3>
      <div className="flex flex-wrap gap-2">
        {SFX_BUTTONS.map((b) => (
          <button
            key={b.key}
            onClick={b.play}
            className="rounded-full bg-secondary px-3.5 py-2 text-xs font-semibold text-secondary-foreground transition-transform hover:scale-105 active:scale-95"
          >
            {b.label}
          </button>
        ))}
        {custom.map((c) => (
          <CustomSound key={c.path} name={c.name} path={c.path} />
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 rounded-full border border-dashed border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (f.size > 10 * 1024 * 1024) {
              toast.error("Audio capped at 10MB");
              return;
            }
            try {
              const path = await uploadMedia("game-media", game.host_id, game.id, f);
              await updateGame({
                data: { gameId: game.id, theme: { ...theme, customSounds: [...custom, { name: f.name.slice(0, 20), path }] } },
              });
              toast.success("Sound added");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Upload failed");
            }
          }}
        />
      </div>
    </div>
  );
}

function CustomSound({ name, path }: { name: string; path: string }) {
  const url = useSignedUrl("game-media", path);
  return (
    <button
      onClick={() => {
        if (url) void new Audio(url).play();
      }}
      className="max-w-28 truncate rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-accent-foreground transition-transform hover:scale-105"
      title={name}
    >
      {name}
    </button>
  );
}

/* ------------------------------- Tool button ------------------------------ */

function ToolButton({ icon: Icon, label, onClick }: { icon: typeof Flag; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-xs font-bold text-secondary-foreground transition-colors hover:bg-accent"
    >
      <Icon className="h-4 w-4 text-gold" /> {label}
    </button>
  );
}

/* ---------------------------- Question overlay ---------------------------- */

function QuestionOverlay({
  session,
  tile,
  category,
  players,
  queue,
  accent,
}: {
  session: Session;
  tile: Tile;
  category: Category | null | undefined;
  players: Player[];
  queue: QueueEntry[];
  accent: string;
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

  useEffect(() => {
    if (countdown.seconds == null) return;
    if (countdown.seconds !== lastSecond.current && countdown.seconds > 0) {
      if (countdown.seconds <= 5) sfx.urgentTick();
      else sfx.tick();
      lastSecond.current = countdown.seconds;
    }
    if (countdown.expired && alarmed.current !== session.timer_ends_at) {
      alarmed.current = session.timer_ends_at;
      sfx.alarm();
    }
  }, [countdown.seconds, countdown.expired, session.timer_ends_at]);

  const flashRed = countdown.expired && session.phase === "answering";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      className={`absolute inset-0 z-20 flex flex-col overflow-hidden p-5 sm:p-8 ${
        flashRed ? "animate-pulse" : ""
      }`}
      style={{
        backgroundColor: flashRed ? "#3d0a12" : "rgba(10,10,26,0.97)",
        borderRadius: "inherit",
      }}
    >
      {session.phase === "daily_double_wager" ? (
        <DailyDoubleWager session={session} players={players} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: accent, color: "#0a0a1a" }}>
              {category?.title ?? "Question"} · {session.dd_wager ? `DD $${session.dd_wager}` : `$${tile.points}`}
            </span>
            {countdown.seconds != null && (
              <span className={`font-display text-2xl font-black ${countdown.seconds <= 5 ? "text-red-400" : "text-gold"}`}>
                0:{String(countdown.seconds).padStart(2, "0")}
              </span>
            )}
          </div>

          {countdown.seconds != null && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-[width] duration-100 ${countdown.seconds <= 5 ? "bg-red-400" : "bg-gold"}`}
                style={{ width: `${countdown.fraction * 100}%` }}
              />
            </div>
          )}

          <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto py-4 text-center">
            <div
              className="max-w-3xl font-display text-xl font-bold leading-snug text-white sm:text-3xl [&_b]:text-gold [&_strong]:text-gold"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(tile.question || "…") }}
            />
            {imageUrl && <img src={imageUrl} alt="Question media" className="max-h-48 rounded-2xl object-contain" />}
            {audioUrl && <audio controls src={audioUrl} className="h-10" autoPlay />}

            {session.phase === "reveal" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 rounded-2xl bg-gold/15 px-6 py-3 font-display text-lg font-black text-gold sm:text-2xl"
              >
                {tile.answer}
              </motion.div>
            )}
          </div>

          {activePlayer && (
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg">{activePlayer.avatar}</span>
              <span className="font-display text-lg font-bold text-white">{activePlayer.name}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase text-white ${activePlayer.team === "alpha" ? "bg-team-alpha" : "bg-team-bravo"}`}>
                {activePlayer.team}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            {session.phase !== "reveal" && (
              <button
                onClick={() => void revealAnswer({ data: { sessionId: session.id } })}
                className="rounded-full bg-secondary px-6 py-3 text-sm font-bold text-secondary-foreground"
              >
                Reveal answer
              </button>
            )}
            {activePlayer && !alreadyJudged && (
              <>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    sfx.ding();
                    void judgeAnswer({ data: { sessionId: session.id, correct: true } });
                  }}
                  className="flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-3 font-display text-base font-black text-white shadow-lg shadow-emerald-500/40"
                >
                  <Check className="h-5 w-5" /> Correct
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    sfx.wrong();
                    void judgeAnswer({ data: { sessionId: session.id, correct: false } });
                  }}
                  className="flex items-center gap-2 rounded-full bg-red-500 px-8 py-3 font-display text-base font-black text-white shadow-lg shadow-red-500/40"
                >
                  <X className="h-5 w-5" /> Wrong
                </motion.button>
              </>
            )}
            {session.phase === "reveal" && (
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => void closeTile({ data: { sessionId: session.id } })}
                className="rounded-full bg-primary px-8 py-3 font-display text-base font-black text-primary-foreground"
              >
                Close tile
              </motion.button>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

/* --------------------------- Daily Double wager --------------------------- */

function DailyDoubleWager({ session, players }: { session: Session; players: Player[] }) {
  const [playerId, setPlayerId] = useState(players[0]?.id ?? "");
  const [wager, setWager] = useState(500);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <motion.h2
        initial={{ scale: 0.6, rotate: -4 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 12 }}
        className="font-display text-4xl font-black tracking-wide text-gold text-glow-gold sm:text-6xl"
      >
        DAILY DOUBLE
      </motion.h2>
      <p className="text-sm text-muted-foreground">Pick a contestant and set the wager</p>
      <select
        value={playerId}
        onChange={(e) => setPlayerId(e.target.value)}
        className="h-12 rounded-2xl border border-input bg-card px-4 text-sm font-semibold text-foreground outline-none"
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
        className="h-14 w-40 rounded-2xl border-2 border-gold bg-transparent text-center font-display text-2xl font-black text-gold outline-none"
      />
      <motion.button
        whileTap={{ scale: 0.95 }}
        disabled={!playerId || wager < 1}
        onClick={() => void startDailyDouble({ data: { sessionId: session.id, playerId, wager } })}
        className="rounded-full bg-primary px-10 py-4 font-display text-lg font-black text-primary-foreground disabled:opacity-40"
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

/* ------------------------------- Queue panel ------------------------------ */

function QueuePanel({ session, players, queue }: { session: Session; players: Player[]; queue: QueueEntry[] }) {
  const tileQueue = useMemo(() => {
    if (!session.current_tile_id) return [];
    return queue
      .filter((q) => q.tile_id === session.current_tile_id && (q.status === "queued" || q.status === "active"))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [queue, session.current_tile_id]);
  const firstAt = tileQueue[0] ? new Date(tileQueue[0].created_at).getTime() : 0;

  return (
    <div className="rounded-[24px] bg-card p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Buzzer Queue</h3>
      {tileQueue.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {session.current_tile_id ? "Buzzers are live — waiting…" : "Open a tile to arm the buzzers"}
        </p>
      ) : (
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
                className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 ${
                  isActive ? "bg-gold/20 ring-2 ring-gold" : "bg-secondary"
                }`}
              >
                <span className={`font-display text-sm font-black ${isActive ? "text-gold" : "text-muted-foreground"}`}>
                  #{i + 1}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-base">
                  {player.avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{player.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {i === 0 ? "first in" : formatDelta(delta)} · {player.team}
                  </p>
                </div>
                {isActive && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-gold" />}
              </motion.li>
            );
          })}
        </ol>
      )}
      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={() => void clearQueue({ data: { sessionId: session.id } })}
          disabled={!session.current_tile_id}
          className="flex items-center justify-center gap-2 rounded-2xl bg-secondary py-2.5 text-xs font-bold text-secondary-foreground disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear Queue
        </button>
      </div>
    </div>
  );
}

/* ------------------------- Daily Double tiles dialog ----------------------- */

function DDTilesDialog({ state, onClose }: { state: HostState; onClose: () => void }) {
  const { session, tiles, categories } = state;
  const [selected, setSelected] = useState<string[]>(session.daily_double_tile_ids);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : prev.length < 2 ? [...prev, id] : prev));
  };

  return (
    <Dialog onClose={onClose} title="Daily Double tiles" subtitle="Pick up to 2 tiles to become Daily Doubles">
      <div className="grid max-h-80 grid-cols-5 gap-1.5 overflow-y-auto">
        {categories.map((cat) => (
          <div key={cat.id} className="mb-1 truncate text-center text-[9px] font-bold uppercase text-muted-foreground">
            {cat.title}
          </div>
        ))}
        {[0, 1, 2, 3, 4].map((row) =>
          categories.map((cat) => {
            const tile = tiles.find((t) => t.category_id === cat.id && t.row_index === row);
            if (!tile) return <div key={`${cat.id}-${row}`} />;
            const on = selected.includes(tile.id);
            return (
              <button
                key={tile.id}
                onClick={() => toggle(tile.id)}
                className={`rounded-xl py-2.5 text-xs font-black transition-all ${
                  on ? "bg-gold text-black" : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {tile.points}
              </button>
            );
          }),
        )}
      </div>
      <button
        onClick={async () => {
          await setDailyDoubles({ data: { sessionId: session.id, tileIds: selected } });
          toast.success("Daily Doubles updated");
          onClose();
        }}
        className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground"
      >
        Save ({selected.length}/2)
      </button>
    </Dialog>
  );
}

/* ------------------------------ Analytics dialog --------------------------- */

function AnalyticsDialog({ state, onClose }: { state: HostState; onClose: () => void }) {
  const { queue, players, tiles } = state;

  const { series, playerStats } = useMemo(() => {
    const judged = queue
      .filter((q) => q.judged_at && (q.status === "correct" || q.status === "wrong"))
      .sort((a, b) => (a.judged_at ?? "").localeCompare(b.judged_at ?? ""));
    let alpha = 0;
    let bravo = 0;
    const series = judged.map((q, i) => {
      const player = players.find((p) => p.id === q.player_id);
      const tile = tiles.find((t) => t.id === q.tile_id);
      const pts = tile?.points ?? 0;
      const delta = q.status === "correct" ? pts : -Math.round(pts / 2);
      if (player?.team === "alpha") alpha += delta;
      else bravo += delta;
      return { n: i + 1, alpha, bravo };
    });

    const perPlayer = new Map<string, { buzzes: number; correct: number; wrong: number }>();
    for (const q of queue) {
      const rec = perPlayer.get(q.player_id) ?? { buzzes: 0, correct: 0, wrong: 0 };
      rec.buzzes += 1;
      if (q.status === "correct") rec.correct += 1;
      if (q.status === "wrong") rec.wrong += 1;
      perPlayer.set(q.player_id, rec);
    }
    const playerStats = players
      .map((p) => ({ player: p, ...(perPlayer.get(p.id) ?? { buzzes: 0, correct: 0, wrong: 0 }) }))
      .filter((s) => s.buzzes > 0)
      .sort((a, b) => b.buzzes - a.buzzes);
    return { series, playerStats };
  }, [queue, players, tiles]);

  return (
    <Dialog onClose={onClose} title="Match analytics" subtitle="Score progression & buzzer activity" wide>
      {series.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No judged answers yet — data appears as you play.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <XAxis dataKey="n" stroke="currentColor" fontSize={10} tickLine={false} />
              <YAxis stroke="currentColor" fontSize={10} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: "oklch(0.18 0.05 295)", border: "none", borderRadius: 12, fontSize: 12 }}
              />
              <Legend />
              <Line type="monotone" dataKey="alpha" stroke="oklch(0.55 0.16 245)" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="bravo" stroke="oklch(0.58 0.22 27)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {playerStats.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {playerStats.map((s) => (
            <div key={s.player.id} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs">
              <span>{s.player.avatar}</span>
              <span className="flex-1 font-bold">{s.player.name}</span>
              <span className="text-muted-foreground">{s.buzzes} buzzes</span>
              <span className="text-emerald-400">✓{s.correct}</span>
              <span className="text-red-400">✗{s.wrong}</span>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}

/* ------------------------------- Final dialog ------------------------------ */

function FinalDialog({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  return (
    <Dialog onClose={onClose} title="Final Jeopardy" subtitle="Set the final clue — teams will wager and answer">
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="The final clue…"
        rows={3}
        className="w-full rounded-2xl border-2 border-input bg-background p-3 text-sm outline-none focus:border-gold"
      />
      <input
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Correct answer"
        className="mt-2 h-11 w-full rounded-2xl border-2 border-input bg-background px-3 text-sm outline-none focus:border-gold"
      />
      <button
        disabled={!question.trim() || !answer.trim()}
        onClick={async () => {
          await startFinal({ data: { sessionId, question: question.trim(), answer: answer.trim() } });
          toast.success("Final Jeopardy started — teams are wagering");
          onClose();
        }}
        className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
      >
        Start Final Jeopardy
      </button>
    </Dialog>
  );
}

/* ------------------------------- Final panel ------------------------------- */

function FinalPanel({
  session,
  finalAnswers,
  players,
}: {
  session: Session;
  finalAnswers: FinalAnswer[];
  players: Player[];
}) {
  const teams: Team[] = ["alpha", "bravo"];
  return (
    <div className="rounded-[24px] bg-card p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Final Jeopardy</h3>
      {session.phase === "final_wager" && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">Teams are placing wagers…</p>
          <div className="mb-3 flex gap-2">
            {teams.map((t) => {
              const submitted = finalAnswers.some((f) => f.team === t);
              return (
                <span key={t} className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${submitted ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
                  {t} {submitted ? "✓ wagered" : "…"}
                </span>
              );
            })}
          </div>
          <button
            onClick={() => void beginFinalAnswers({ data: { sessionId: session.id } })}
            className="w-full rounded-full bg-primary py-2.5 text-xs font-bold text-primary-foreground"
          >
            Reveal question
          </button>
        </>
      )}
      {session.phase === "final_answer" && (
        <div className="space-y-3">
          <p className="rounded-xl bg-secondary p-3 text-sm font-semibold">{session.final_question}</p>
          <p className="text-xs italic text-muted-foreground">Answer: {session.final_answer}</p>
          {teams.map((t) => {
            const entry = finalAnswers.find((f) => f.team === t);
            const members = players.filter((p) => p.team === t).map((p) => p.avatar + " " + p.name).join(", ");
            return (
              <div key={t} className="rounded-2xl bg-secondary p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className={`text-xs font-black uppercase ${t === "alpha" ? "text-team-alpha" : "text-team-bravo"}`}>{t}</span>
                  <span className="text-[10px] text-muted-foreground">{members || "no players"}</span>
                </div>
                {entry ? (
                  <>
                    <p className="text-sm">“{entry.answer}”</p>
                    <p className="mb-2 text-xs text-muted-foreground">Wager: ${entry.wager}</p>
                    {entry.judged === null ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            sfx.ding();
                            void judgeFinal({ data: { sessionId: session.id, team: t, correct: true } });
                          }}
                          className="flex-1 rounded-full bg-emerald-500 py-1.5 text-xs font-bold text-white"
                        >
                          Correct
                        </button>
                        <button
                          onClick={() => {
                            sfx.wrong();
                            void judgeFinal({ data: { sessionId: session.id, team: t, correct: false } });
                          }}
                          className="flex-1 rounded-full bg-red-500 py-1.5 text-xs font-bold text-white"
                        >
                          Wrong
                        </button>
                      </div>
                    ) : (
                      <p className={`text-xs font-bold ${entry.judged ? "text-emerald-400" : "text-red-400"}`}>
                        Judged {entry.judged ? "correct" : "wrong"}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs italic text-muted-foreground">No answer submitted</p>
                )}
              </div>
            );
          })}
          <button
            onClick={() => void finishSession({ data: { sessionId: session.id } })}
            className="w-full rounded-full bg-secondary py-2.5 text-xs font-bold text-secondary-foreground"
          >
            Finish game
          </button>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Podium --------------------------------- */

function Podium({ session, players }: { session: Session; players: Player[] }) {
  const winner: Team = session.score_alpha >= session.score_bravo ? "alpha" : "bravo";
  const loser: Team = winner === "alpha" ? "bravo" : "alpha";
  const winScore = winner === "alpha" ? session.score_alpha : session.score_bravo;
  const loseScore = loser === "alpha" ? session.score_alpha : session.score_bravo;
  const winners = players.filter((p) => p.team === winner);
  const losers = players.filter((p) => p.team === loser);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 16 }}
        className="w-full max-w-md rounded-[32px] bg-card p-8 text-center shadow-2xl"
      >
        <Crown className="mx-auto mb-3 h-12 w-12 text-gold" />
        <h2 className="font-display text-3xl font-black text-gold text-glow-gold">
          Team {winner === "alpha" ? "Alpha" : "Bravo"} wins!
        </h2>
        <p className="mt-1 font-display text-5xl font-black">${winScore}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {winners.map((p) => (
            <span key={p.id} className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold">
              {p.avatar} {p.name}
            </span>
          ))}
        </div>
        <div className="mt-6 rounded-2xl bg-secondary p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">
            Team {loser === "alpha" ? "Alpha" : "Bravo"} — ${loseScore}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {losers.map((p) => (
              <span key={p.id} className="rounded-full bg-background px-3 py-1 text-xs">
                {p.avatar} {p.name}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Close this tab or reset the board to play again.</p>
      </motion.div>
    </motion.div>
  );
}

/* --------------------------------- Dialog --------------------------------- */

function Dialog({
  children,
  onClose,
  title,
  subtitle,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  subtitle?: string;
  wide?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-[28px] bg-card p-6 text-foreground shadow-2xl`}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-black">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
