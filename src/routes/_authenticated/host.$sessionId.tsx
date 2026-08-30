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
  ChevronDown,
  Copy,
  Radio,
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
import { useOrigin } from "@/hooks/use-origin";
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
  type ThemeSettings,
} from "@/lib/types";
import { ThemeToggle, useThemeMode } from "@/components/ThemeToggle";
import { darkBoardColors } from "@/lib/theme-mode";

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

  const queryClient = useQueryClient();
  const state = data as unknown as HostState | undefined;
  const [ddOpen, setDdOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const setHostState = (patch: Omit<Partial<HostState>, "session"> & { session?: Partial<Session> }) => {
    queryClient.setQueryData(["host", sessionId], (old: unknown) => {
      const prev = old as HostState | undefined;
      if (!prev) return old;
      const { session: sessionPatch, ...rest } = patch;
      return { ...prev, ...rest, session: { ...prev.session, ...(sessionPatch ?? {}) } };
    });
  };
  const setHostSession = (patch: Partial<Session>) => setHostState({ session: patch });

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

  const isDark = useThemeMode() === "dark";

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-pulse rounded-[28px] bg-lilac" />
      </div>
    );
  }

  const { session, game, categories, tiles, players, queue, finalAnswers } = state;
  const theme = darkBoardColors(themeOf(game), isDark) as ReturnType<typeof themeOf>;
  const usedSet = new Set(session.used_tile_ids);
  const remaining = tiles.length - usedSet.size;
  const currentTile = tiles.find((t) => t.id === session.current_tile_id) ?? null;
  const currentCategory = currentTile
    ? categories.find((c) => c.id === currentTile.category_id)
    : null;

  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 rounded-[32px] bg-card/80 p-4 pr-14 elev-1 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4">
          <div className="flex items-center gap-3">
            {/* Visible exit pill — confirms first while a game is live */}
            <Link
              to="/edit/$gameId"
              params={{ gameId: game.id }}
              onClick={(e) => {
                if (
                  session.status === "live" &&
                  !window.confirm("Leave the live game? Players stay connected and you can rejoin from Studio.")
                ) {
                  e.preventDefault();
                }
              }}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-card px-4 text-sm font-bold text-foreground elev-1 transition-transform hover:scale-105"
              aria-label="Close game and back to editor"
            >
              <ArrowLeft className="h-5 w-5" /> <span className="hidden sm:inline">Close</span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-black leading-tight sm:text-xl">{game.title}</h1>
              <p className="text-xs text-muted-foreground">
                Code <span className="font-mono font-bold text-ink-gold">{game.join_code}</span> ·{" "}
                {session.status === "lobby" ? "Waiting in lobby" : `${Math.max(0, remaining)} questions remain`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ScorePill team="alpha" name={teamName(theme, "alpha")} score={session.score_alpha} players={players} />
            <ScorePill team="bravo" name={teamName(theme, "bravo")} score={session.score_bravo} players={players} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <ThemeToggle />
            <button
              onClick={async () => {
                setHostSession({
                  status: "live",
                  phase: "idle",
                  current_tile_id: null,
                  active_player_id: null,
                  timer_ends_at: null,
                  score_alpha: 0,
                  score_bravo: 0,
                  used_tile_ids: [],
                  dd_wager: null,
                  final_question: null,
                  final_answer: null,
                });
                await resetBoard({ data: { sessionId } });
                toast.success("Board reset — new Daily Doubles picked");
              }}
              className="flex items-center gap-1.5 rounded-full bg-blush px-5 py-2.5 text-xs font-bold text-foreground elev-1 transition-transform hover:scale-105"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Board
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
          {/* LEFT: preview + soundboard + tools */}
          <div className="order-2 space-y-4 lg:order-1">
            <JoinCard joinCode={game.join_code} />
            <AnswerPreview tile={currentTile} phase={session.phase} />
            <Soundboard game={game} />
            <ObsLinksPanel joinCode={game.join_code} />
            <div className="rounded-[32px] bg-card p-5 elev-1">
              <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tools
              </h3>
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
            <div
              className="mx-auto w-full max-w-[1100px] p-2.5 elev-2 sm:p-5"
              style={{ backgroundColor: theme.bg, borderRadius: theme.radius + 8 }}
            >
              <div className="grid grid-cols-5 gap-1 sm:gap-2.5">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex min-h-10 items-center justify-center overflow-hidden p-1 text-center text-[8px] font-bold uppercase leading-tight tracking-wide sm:min-h-16 sm:p-1.5 sm:text-xs"
                    style={{ backgroundColor: theme.card, borderRadius: theme.radius * 0.6, color: theme.accent }}
                  >
                    <span className="line-clamp-2 w-full break-words">{cat.title}</span>
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
                        onClick={() => {
                          const isDD = session.daily_double_tile_ids.includes(tile.id);
                          setHostSession({
                            status: "live",
                            current_tile_id: tile.id,
                            active_player_id: null,
                            timer_ends_at: null,
                            dd_wager: null,
                            phase: isDD ? "daily_double_wager" : "question_open",
                          });
                          void openTile({ data: { sessionId, tileId: tile.id } });
                        }}
                        className="flex aspect-square items-center justify-center font-display text-base font-black tracking-tight transition-all sm:aspect-[4/3] sm:text-3xl"
                        style={{
                          backgroundColor: used ? "transparent" : theme.card,
                          borderRadius: theme.radius,
                          color: used ? "transparent" : theme.accent,
                          opacity: used ? 0.35 : 1,
                          boxShadow: used
                            ? "none"
                            : `0 2px 6px -2px color-mix(in srgb, ${theme.accent} 22%, transparent), 0 10px 22px -14px color-mix(in srgb, ${theme.accent} 30%, transparent)`,
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
                    onHostStatePatch={setHostState}
                  />
                )}
            </AnimatePresence>
          </div>

          {/* RIGHT: queue + controls */}
          <div className="order-3 space-y-4">
            <QueuePanel session={session} players={players} queue={queue} />
            {session.status === "final" && (
              <FinalPanel session={session} finalAnswers={finalAnswers} players={players} theme={theme} />
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
        {session.status === "finished" && <Podium session={session} players={players} theme={theme} />}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------- Score pill ------------------------------- */

function ScorePill({ team, name, score, players }: { team: Team; name: string; score: number; players: Player[] }) {
  const members = players.filter((p) => p.team === team);
  return (
    <motion.div
      key={score}
      initial={{ scale: 1.12 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={`flex w-fit items-center gap-2.5 rounded-full px-5 py-2.5 elev-1 ${
        team === "alpha" ? "bg-team-alpha" : "bg-team-bravo"
      }`}
    >
      <div className="flex -space-x-1.5">
        {members.slice(0, 4).map((p) => (
          <span key={p.id} className="flex h-7 w-7 items-center justify-center bg-card text-sm scallop">
            {p.avatar}
          </span>
        ))}
      </div>
      <div className="text-foreground">
        <div className="text-[9px] font-bold uppercase tracking-wider opacity-70">{name}</div>
        <div className="font-display text-base font-black leading-none">{score}</div>
      </div>
    </motion.div>
  );
}

/* -------------------------------- Join card ------------------------------- */

function JoinCard({ joinCode }: { joinCode: string }) {
  const origin = useOrigin();
  const joinUrl = origin ? `${origin}/play/${joinCode}` : "";
  const [open, setOpen] = useState(true);

  return (
    <div className="overflow-hidden rounded-[32px] bg-mint text-center elev-1">
      <button
        onClick={() => {
          sfx.pop();
          setOpen((v) => !v);
        }}
        className="flex w-full items-center justify-center gap-2 px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground"
        aria-expanded={open}
      >
        Players join anytime
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          >
            <div className="px-5 pb-5">
              <div className="mx-auto mb-3 w-fit rounded-[22px] bg-card p-2.5">
                {joinUrl ? <QRCodeSVG value={joinUrl} size={128} /> : <div className="h-32 w-32" />}
              </div>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(joinCode);
                  toast.success("Join code copied");
                }}
                className="mx-auto flex items-center gap-2 rounded-full px-2 py-1 font-display text-2xl font-black tracking-[0.2em] text-ink-gold transition-transform hover:scale-105"
                title="Copy join code"
              >
                {joinCode} <Copy className="h-4 w-4 opacity-60" />
              </button>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(joinUrl);
                  toast.success("Join link copied");
                }}
                className="mx-auto mt-3 flex items-center gap-2 rounded-full bg-card px-4 py-2 text-xs font-bold text-foreground elev-1 transition-transform hover:scale-105"
              >
                <Copy className="h-3.5 w-3.5" /> Copy link
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ OBS overlays ------------------------------ */

const OBS_VIEWS: { path: string; label: string; hint: string }[] = [
  { path: "board", label: "Board only", hint: "5×5 grid with live used tiles" },
  { path: "queue", label: "Buzzer queue + scores", hint: "Queue order and team scores" },
  { path: "combined", label: "Combined overlay", hint: "Board, scores and queue together" },
];

function ObsLinksPanel({ joinCode }: { joinCode: string }) {
  const origin = useOrigin();
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[32px] bg-card p-5 elev-1">
      <button
        onClick={() => {
          sfx.pop();
          setOpen((v) => !v);
        }}
        className="flex w-full items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"
        aria-expanded={open}
      >
        <Radio className="h-3.5 w-3.5" /> OBS overlay links
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-3">
              {OBS_VIEWS.map((v) => {
                const url = origin ? `${origin}/obs/${v.path}?code=${joinCode}` : "";
                return (
                  <button
                    key={v.path}
                    onClick={() => {
                      void navigator.clipboard.writeText(url);
                      toast.success(`${v.label} URL copied — paste into an OBS browser source`);
                    }}
                    className="w-full rounded-[22px] bg-muted px-4 py-3 text-left transition-transform hover:scale-[1.02]"
                  >
                    <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                      <Copy className="h-3.5 w-3.5" /> {v.label}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{v.hint}</p>
                  </button>
                );
              })}
              <p className="text-[11px] text-muted-foreground">
                Transparent background — add as a Browser Source in OBS and it stays in sync live.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ----------------------------- Answer preview ----------------------------- */

function AnswerPreview({ tile, phase }: { tile: Tile | null; phase: Session["phase"] }) {
  const revealed = phase === "reveal";
  return (
    <div className="rounded-[32px] bg-card p-5 elev-1">
      <h3 className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Answer Preview</h3>
      {tile ? (
        <div className={revealed ? "" : "select-none"}>
          <p className={`text-center text-xl font-black leading-snug ${revealed ? "text-ink-gold" : "text-foreground"}`}>
            {revealed || phase === "answering" || phase === "question_open" ? tile.answer || "—" : "—"}
          </p>
          {tile.hint && <p className="mt-2 text-center text-sm italic text-muted-foreground">Hint: {tile.hint}</p>}
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
  { key: "wrong", label: "Wrong answer", play: () => sfx.wrong() },
  { key: "victory", label: "Victory", play: () => sfx.victory() },
  { key: "sad", label: "Sad", play: () => sfx.sad() },
  { key: "drumroll", label: "Drum roll", play: () => sfx.drumroll() },
  { key: "funny", label: "Funny", play: () => sfx.funny() },
  { key: "suspense", label: "Suspense", play: () => sfx.suspense() },
  { key: "dd", label: "Daily Double", play: () => sfx.dailyDouble() },
  { key: "alarm", label: "Time's Up", play: () => sfx.alarm() },
  { key: "fanfare", label: "Fanfare", play: () => sfx.fanfare() },
];

function Soundboard({ game }: { game: Game }) {
  const theme = darkBoardColors(themeOf(game), useThemeMode() === "dark") as ReturnType<typeof themeOf>;
  const fileRef = useRef<HTMLInputElement>(null);
  const custom = theme.customSounds ?? [];

  return (
    <div className="rounded-[32px] bg-card p-5 elev-1">
      <h3 className="mb-3 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Volume2 className="h-3.5 w-3.5" /> Soundboard
      </h3>
      <div className="flex flex-wrap gap-2">
        {SFX_BUTTONS.map((b) => (
          <button
            key={b.key}
            onClick={b.play}
            className="rounded-full bg-lilac px-4 py-2 text-xs font-bold text-foreground elev-1 transition-transform hover:scale-105 active:scale-95"
          >
            {b.label}
          </button>
        ))}
        {custom.map((c) => (
          <CustomSound key={c.path} name={c.name} path={c.path} />
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 rounded-full border-2 border-dashed border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
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
      className="max-w-28 truncate rounded-full bg-peach px-4 py-2 text-xs font-bold text-foreground elev-1 transition-transform hover:scale-105"
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
      className="flex items-center gap-2.5 rounded-full bg-butter px-5 py-3 text-xs font-bold text-foreground transition-transform hover:scale-[1.03]"
    >
      <Icon className="h-4 w-4 text-ink-gold" /> {label}
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
  onHostStatePatch,
}: {
  session: Session;
  tile: Tile;
  category: Category | null | undefined;
  players: Player[];
  queue: QueueEntry[];
  accent: string;
  onHostStatePatch: (patch: Omit<Partial<HostState>, "session"> & { session?: Partial<Session> }) => void;
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
    if (countdown.seconds == null) return;
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
  }, [countdown.seconds, countdown.expired, session.timer_ends_at]);

  const flashRed =
    countdown.expired && session.phase === "answering" && armed.current === session.timer_ends_at;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex items-center justify-center bg-foreground/40 p-2 backdrop-blur-sm lg:absolute lg:z-40 lg:rounded-[36px] lg:bg-foreground/25 lg:p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="flex h-full max-h-[100svh] w-full flex-col overflow-y-auto rounded-[32px] bg-card p-4 elev-3 sm:p-8 lg:overflow-hidden"
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
                className={`h-full rounded-full transition-[width] duration-100 ${countdown.seconds <= 5 ? "bg-danger-ink" : "bg-ink-gold"}`}
                style={{ width: `${countdown.fraction * 100}%` }}
              />
            </div>
          )}

          {/* Category + value, big and centered */}
          <div className="mt-4 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-muted-foreground sm:text-sm">
              {category?.title ?? "Question"}
            </p>
            <p className="font-display text-4xl font-black sm:text-6xl" style={{ color: accent }}>
              {session.dd_wager ? `DD ${session.dd_wager}` : tile.points}
            </p>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto py-4 text-center">
            <div
              className="max-w-3xl font-display text-xl font-bold leading-snug text-foreground sm:text-3xl [&_b]:text-ink-gold [&_strong]:text-ink-gold"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(tile.question || "…") }}
            />
            {imageUrl && <img src={imageUrl} alt="Question media" className="max-h-48 rounded-[24px] object-contain" />}
            {audioUrl && <audio controls src={audioUrl} className="h-10" autoPlay />}

            {session.phase === "reveal" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 rounded-full bg-butter px-9 py-4 font-display text-2xl font-black leading-snug text-ink-gold sm:text-4xl"
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
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex justify-start">
              {activePlayer && !alreadyJudged && (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    sfx.ding();
                    if (activePlayer) {
                      const value = session.dd_wager ?? tile.points;
                      onHostStatePatch({
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
                    }
                    void judgeAnswer({ data: { sessionId: session.id, correct: true } });
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
                    onHostStatePatch({ session: { phase: "reveal", timer_ends_at: null } });
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
                    onHostStatePatch({
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
                      onHostStatePatch({
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
                    }
                    void judgeAnswer({ data: { sessionId: session.id, correct: false } });
                  }}
                  className="flex items-center gap-2 rounded-full bg-danger px-9 py-3.5 font-display text-base font-black text-danger-ink elev-2"
                >
                  <X className="h-5 w-5" /> Wrong
                </motion.button>
              )}
            </div>
          </div>
        </>
      )}
      </motion.div>
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
    <div className="relative rounded-[32px] bg-card p-5 elev-1">
      <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Buzzer Queue</h3>
      <button
        onClick={() => void clearQueue({ data: { sessionId: session.id } })}
        disabled={!session.current_tile_id}
        aria-label="Clear queue"
        title="Clear queue"
        className="absolute right-4 top-[10px] flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-danger hover:text-danger-ink disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
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
                className={`flex items-center gap-3 rounded-[26px] px-3 py-3 ${
                  isActive ? "bg-butter elev-1" : "bg-muted"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center font-display text-xs font-black text-foreground scallop ${
                    isActive ? "bg-peach" : "bg-card"
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
      )}
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
                className={`rounded-[18px] py-3 text-xs font-black transition-all ${
                  on ? "bg-butter text-ink-gold elev-1" : "bg-muted text-foreground hover:bg-lilac"
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
        className="mt-4 w-full rounded-full bg-coral py-3.5 text-sm font-black text-foreground elev-1"
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
                contentStyle={{ background: "var(--card)", border: "none", borderRadius: 18, fontSize: 12, color: "var(--foreground)" }}
              />
              <Legend />
              <Line type="monotone" dataKey="alpha" stroke="var(--team-alpha-ink)" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="bravo" stroke="var(--team-bravo-ink)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {playerStats.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {playerStats.map((s) => (
            <div key={s.player.id} className="flex items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-xs">
              <span>{s.player.avatar}</span>
              <span className="flex-1 font-bold">{s.player.name}</span>
              <span className="text-muted-foreground">{s.buzzes} buzzes</span>
              <span className="font-bold text-success-ink">✓{s.correct}</span>
              <span className="font-bold text-danger-ink">✗{s.wrong}</span>
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
        className="w-full rounded-[24px] bg-muted p-4 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent"
      />
      <input
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Correct answer"
        className="mt-2 h-12 w-full rounded-full bg-muted px-5 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent"
      />
      <button
        disabled={!question.trim() || !answer.trim()}
        onClick={async () => {
          await startFinal({ data: { sessionId, question: question.trim(), answer: answer.trim() } });
          toast.success("Final Jeopardy started — teams are wagering");
          onClose();
        }}
        className="mt-4 w-full rounded-full bg-coral py-3.5 text-sm font-black text-foreground elev-1 disabled:opacity-40"
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
  theme,
}: {
  session: Session;
  finalAnswers: FinalAnswer[];
  players: Player[];
  theme: ThemeSettings;
}) {
  const teams: Team[] = ["alpha", "bravo"];
  return (
    <div className="rounded-[32px] bg-card p-5 elev-1">
      <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Final Jeopardy</h3>
      {session.phase === "final_wager" && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">Teams are placing wagers…</p>
          <div className="mb-3 flex gap-2">
            {teams.map((t) => {
              const submitted = finalAnswers.some((f) => f.team === t);
              return (
                <span key={t} className={`rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase ${submitted ? "bg-success text-success-ink" : "bg-muted text-muted-foreground"}`}>
                  {teamName(theme, t)} {submitted ? "✓ wagered" : "…"}
                </span>
              );
            })}
          </div>
          <button
            onClick={() => void beginFinalAnswers({ data: { sessionId: session.id } })}
            className="w-full rounded-full bg-coral py-3 text-xs font-black text-foreground elev-1"
          >
            Reveal question
          </button>
        </>
      )}
      {session.phase === "final_answer" && (
        <div className="space-y-3">
          <p className="rounded-[24px] bg-lilac p-4 text-sm font-semibold">{session.final_question}</p>
          <p className="text-xs italic text-muted-foreground">Answer: {session.final_answer}</p>
          {teams.map((t) => {
            const entry = finalAnswers.find((f) => f.team === t);
            const members = players.filter((p) => p.team === t).map((p) => p.avatar + " " + p.name).join(", ");
            return (
              <div key={t} className="rounded-[26px] bg-muted p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className={`text-xs font-black uppercase ${t === "alpha" ? "text-team-alpha-ink" : "text-team-bravo-ink"}`}>{teamName(theme, t)}</span>
                  <span className="text-[10px] text-muted-foreground">{members || "no players"}</span>
                </div>
                {entry ? (
                  <>
                    <p className="text-sm">“{entry.answer}”</p>
                    <p className="mb-2 text-xs text-muted-foreground">Wager: {entry.wager}</p>
                    {entry.judged === null ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            sfx.ding();
                            void judgeFinal({ data: { sessionId: session.id, team: t, correct: true } });
                          }}
                          className="flex-1 rounded-full bg-success py-2 text-xs font-black text-success-ink"
                        >
                          Correct
                        </button>
                        <button
                          onClick={() => {
                            sfx.wrong();
                            void judgeFinal({ data: { sessionId: session.id, team: t, correct: false } });
                          }}
                          className="flex-1 rounded-full bg-danger py-2 text-xs font-black text-danger-ink"
                        >
                          Wrong
                        </button>
                      </div>
                    ) : (
                      <p className={`text-xs font-bold ${entry.judged ? "text-success-ink" : "text-danger-ink"}`}>
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
            className="w-full rounded-full bg-lilac py-3 text-xs font-bold text-foreground"
          >
            Finish game
          </button>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Podium --------------------------------- */

function Podium({ session, players, theme }: { session: Session; players: Player[]; theme: ThemeSettings }) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 16 }}
        className="w-full max-w-md rounded-[36px] bg-card p-8 text-center elev-3"
      >
        <span className="mx-auto mb-4 flex h-20 w-20 items-center justify-center bg-butter scallop"><Crown className="h-10 w-10 text-ink-gold" /></span>
        <h2 className="font-display text-3xl font-black text-ink-gold text-glow-gold">
          {teamName(theme, winner)} wins!
        </h2>
        <p className="mt-1 font-display text-5xl font-black">{winScore}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {winners.map((p) => (
            <span key={p.id} className="rounded-full bg-butter px-3.5 py-1.5 text-xs font-bold text-ink-gold">
              {p.avatar} {p.name}
            </span>
          ))}
        </div>
        <div className="mt-6 rounded-[28px] bg-muted p-5">
          <p className="text-xs font-bold uppercase text-muted-foreground">
            {teamName(theme, loser)} — {loseScore}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {losers.map((p) => (
              <span key={p.id} className="rounded-full bg-card px-3.5 py-1.5 text-xs">
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-[36px] bg-card p-7 text-foreground elev-3`}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-black">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-full bg-muted p-2.5 text-muted-foreground hover:bg-lilac" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
