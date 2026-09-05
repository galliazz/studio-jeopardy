import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  BarChart3,
  Crown,
  X,
  Check,
  Flag,
  Copy,
  Radio,
  QrCode,
  MoreHorizontal,
  ExternalLink,
  PanelRight,
} from "lucide-react";
import { toast } from "sonner";
import { Soundboard } from "@/components/Soundboard";
import { SettingsDialog } from "@/components/SettingsDialog";
import { AccountMenu } from "@/components/AccountMenu";
import { QRCodeSVG } from "qrcode.react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  getHostState,
  openTile,
  closeTile,
  clearQueue,

  resetBoard,
  judgeAnswer,
  revealAnswer,
  setDailyDoubles,
  startFinal,
  beginFinalAnswers,
  judgeFinal,
  finishSession,
  adjustScore,
  passToNext,
  restartTimer,
  switchPlayerTeam,
  removePlayer,
} from "@/lib/sessions.functions";
import { bootstrapStudio, regenerateOverlayToken, updateGame } from "@/lib/games.functions";
import { useSessionRealtime } from "@/hooks/use-session-realtime";
import {
  keyLabel,
  normalizeKey,
  resolveShortcuts,
  shortcutLookup,
  shortcutsSuppressed,
} from "@/lib/shortcuts";
import { useSettings } from "@/lib/settings";
import { useCountdown } from "@/hooks/use-countdown";
import { useOrigin } from "@/hooks/use-origin";
import { sfx } from "@/lib/sfx";
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
import { useThemeMode } from "@/components/ThemeToggle";
import { BoardGrid } from "@/components/game/BoardGrid";
import { QuestionOverlay } from "@/components/game/QuestionOverlay";
import { QueueList } from "@/components/game/QueueList";
import { ScorePill } from "@/components/game/ScorePill";
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

/**
 * The board's aspect (width / height) in the Host Console. 1 is the square the
 * brief asks for; 0.75 would be the 3:4 fallback. The clue view is drawn inside
 * the same box, so this one number governs the board and the open tile alike.
 *
 * The broadcast overlays deliberately stay at 5/5.4: their board box is part of
 * a scene the streamer has already composed, and reshaping it here would move
 * everything around it on someone's live layout.
 */
const BOARD_RATIO = 1;

export interface HostActions {
  reveal: () => void;
  judgeCorrect: () => void;
  judgeWrong: () => void;
  passToNext: () => void;
  restartTimer: () => void;
  closeTile: () => void;
  clearQueue: () => void;
}


/* ------------------------------ Confirmation ------------------------------ */

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal
      aria-label={title}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[32px] bg-card p-6 elev-2"
      >
        <h2 className="font-display text-xl font-black">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="min-h-12 rounded-full border border-foreground/25 px-5 text-sm font-bold transition-colors hover:bg-foreground/5"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="min-h-12 rounded-full bg-danger px-5 text-sm font-black text-danger-ink elev-1"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */

function HostPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const fetchState = useServerFn(getHostState);
  const queryClient = useQueryClient();

  /*
   * Ogni azione locale incrementa questo contatore. Una risposta partita prima
   * dell'azione descrive lo stato PRECEDENTE: accettarla cancellerebbe la
   * modifica ottimistica per un istante, ed è esattamente lo sfarfallio che si
   * vedeva chiudendo una casella. La si scarta tenendo quel che c'è in cache;
   * l'evento realtime dell'azione porta subito dopo lo stato vero.
   */
  const localGeneration = useRef(0);
  const { data } = useQuery({
    queryKey: ["host", sessionId],
    queryFn: async () => {
      const issuedAt = localGeneration.current;
      const fresh = await fetchState({ data: { sessionId } });
      if (issuedAt !== localGeneration.current) {
        return queryClient.getQueryData<typeof fresh>(["host", sessionId]) ?? fresh;
      }
      return fresh;
    },
    refetchOnWindowFocus: false,
  });
  useSessionRealtime(sessionId, [["host", sessionId]]);

  const rotateOverlayToken = useServerFn(regenerateOverlayToken);
  const bootstrap = useServerFn(bootstrapStudio);
  const { data: account } = useQuery({
    queryKey: ["studio"],
    queryFn: () => bootstrap(),
    staleTime: 60_000,
    retry: false,
  });
  const profile = (account as { profile?: { username?: string; avatar_url?: string | null } } | undefined)?.profile;

  const state = data as unknown as HostState | undefined;
  const [ddOpen, setDdOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "reset" | "end" | "rotate">(null);
  /** Join e overlay stanno nel menu come tastini, e si aprono in grande. */
  const [menuPanel, setMenuPanel] = useState<null | "join" | "overlays">(null);
  /** Below 1200px the right column becomes a togglable slide-over panel. */
  const [panelOpen, setPanelOpen] = useState(false);


  const setHostState = useCallback(
    (patch: Omit<Partial<HostState>, "session"> & { session?: Partial<Session> }) => {
      localGeneration.current += 1;
      queryClient.setQueryData(["host", sessionId], (old: unknown) => {
        const prev = old as HostState | undefined;
        if (!prev) return old;
        const { session: sessionPatch, ...rest } = patch;
        return { ...prev, ...rest, session: { ...prev.session, ...(sessionPatch ?? {}) } };
      });
    },
    [queryClient, sessionId],
  );
  const setHostSession = useCallback(
    (patch: Partial<Session>) => setHostState({ session: patch }),
    [setHostState],
  );

  // ---- SFX triggers on state transitions --------------------------------
  const prevActive = useRef<string | null>(null);
  const prevTile = useRef<string | null>(null);
  const prevPhase = useRef<string | null>(null);
  const prevStatus = useRef<string | null>(null);
  useEffect(() => {
    if (!state) return;
    const s = state.session;
    if (s.active_player_id && s.active_player_id !== prevActive.current) sfx.buzz();
    if (
      s.current_tile_id &&
      s.current_tile_id !== prevTile.current &&
      s.daily_double_tile_ids.includes(s.current_tile_id)
    ) {
      sfx.dailyDouble();
    }
    if (s.status === "finished" && prevStatus.current !== "finished") {
      sfx.fanfare();
      void confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
      setTimeout(() => void confetti({ particleCount: 100, spread: 120, origin: { y: 0.4 } }), 500);
    }
    prevActive.current = s.active_player_id;
    prevTile.current = s.current_tile_id;
    prevPhase.current = s.phase;
    prevStatus.current = s.status;
  }, [state]);

  const isDark = useThemeMode() === "dark";

  const session = state?.session;
  const currentTileId = session?.current_tile_id ?? null;
  const activePlayerId = session?.active_player_id ?? null;

  /*
   * Un solo giudizio per volta, sempre riferito al giocatore che l'host aveva
   * davanti. Dopo un "Wrong" il server promuove subito il successivo in coda:
   * un secondo click — o una seconda pressione di "x" — penalizzerebbe lui.
   * Il server rifiuta se il bersaglio è cambiato; qui si ricarica lo stato vero
   * e si avvisa, invece di lasciare l'interfaccia a raccontare una bugia.
   */
  /*
   * Un'azione ottimistica senza via d'uscita mente. Se la chiamata fallisce non
   * arriva nessun evento realtime, e la guardia di generazione ha già scartato
   * la risposta che avrebbe rimesso a posto lo schermo: l'host resterebbe
   * davanti a una board che non corrisponde a quella dei giocatori. Qui ogni
   * chiamata, riuscita o no, finisce con una ricarica dello stato vero.
   */
  const settle = useCallback(
    (call: Promise<unknown>) => {
      void call
        .catch((err: unknown) => {
          toast.error(err instanceof Error ? err.message : "The action did not go through");
        })
        .finally(() => {
          void queryClient.invalidateQueries({ queryKey: ["host", sessionId] });
        });
    },
    [queryClient, sessionId],
  );

  const judging = useRef(false);
  const runJudge = useCallback(
    async (correct: boolean, judgedPlayerId: string) => {
      judging.current = true;
      try {
        await judgeAnswer({ data: { sessionId, correct, expectedPlayerId: judgedPlayerId } });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Nothing was judged");
      } finally {
        judging.current = false;
        void queryClient.invalidateQueries({ queryKey: ["host", sessionId] });
      }
    },
    [queryClient, sessionId],
  );

  // ---- Game-loop actions, shared by the panel and the keyboard ----------
  const actions: HostActions = useMemo(
    () => ({
      reveal: () => {
        if (!currentTileId) return;
        setHostSession({ phase: "reveal", timer_ends_at: null });
        settle(revealAnswer({ data: { sessionId } }));
      },
      judgeCorrect: () => {
        if (!activePlayerId || judging.current) return;
        sfx.ding();
        void runJudge(true, activePlayerId);
      },
      judgeWrong: () => {
        if (!activePlayerId || judging.current) return;
        sfx.wrong();
        void runJudge(false, activePlayerId);
      },
      passToNext: () => {
        if (!currentTileId) return;
        settle(passToNext({ data: { sessionId } }));
      },
      restartTimer: () => {
        if (!activePlayerId) return;
        settle(restartTimer({ data: { sessionId } }));
      },
      closeTile: () => {
        if (!currentTileId) return;
        setHostSession({
          phase: "idle",
          current_tile_id: null,
          active_player_id: null,
          timer_ends_at: null,
          dd_wager: null,
        });
        settle(closeTile({ data: { sessionId } }));
      },
      clearQueue: () => {
        settle(clearQueue({ data: { sessionId } }));
      },
    }),

    [activePlayerId, currentTileId, runJudge, sessionId, setHostSession, settle],
  );

  /*
   * I tasti sono quelli che l'host si è scelto nelle impostazioni, e stanno nel
   * suo profilo: la stessa mappa su qualunque computer si sieda.
   */
  const settings = useSettings();
  const keyMap = useMemo(
    () => shortcutLookup(resolveShortcuts(settings.shortcuts)),
    [settings.shortcuts],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shortcutsSuppressed() || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "?") {
        e.preventDefault();
        setSettingsOpen(true);
        return;
      }
      const action = keyMap[normalizeKey(e.key)];
      if (action) {
        e.preventDefault();
        actions[action]();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions, keyMap]);

  if (!state || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-pulse rounded-[28px] bg-lilac" />
      </div>
    );
  }

  const { game, categories, tiles, players, queue, finalAnswers } = state;
  const theme = darkBoardColors(themeOf(game), isDark) as ReturnType<typeof themeOf>;
  const usedSet = new Set(session.used_tile_ids);
  const played = usedSet.size;
  /** players[].connected — the only signal for "live" status and join-card collapse. */
  const connectedCount = players.filter((p) => !p.locked_out).length;
  const currentTile = tiles.find((t) => t.id === session.current_tile_id) ?? null;
  const currentCategory = currentTile ? categories.find((c) => c.id === currentTile.category_id) : null;
  /** The board's distinct point values, used as quick picks in the custom-score popover. */
  const pointValues = Array.from(new Set(tiles.map((t) => t.points))).sort((a, b) => a - b);



  const bumpScore = (team: Team, delta: number) => {
    setHostSession(
      team === "alpha" ? { score_alpha: session.score_alpha + delta } : { score_bravo: session.score_bravo + delta },
    );
    settle(adjustScore({ data: { sessionId, team, delta } }));
  };

  const leaveSession = () => {
    void navigate({ to: "/edit/$gameId", params: { gameId: game.id } });
  };

  return (
    <div data-host-console className="flex h-screen flex-col overflow-hidden text-foreground">
      {/*
       * TOP APP BAR — one line, vertically centred: leave + title on the left,
       * the two scores in the middle, the account menu on the right. It sits a
       * little below the window edge instead of flush against it, and below
       * 840px the scores drop to their own full-width row rather than colliding
       * with the title.
       */}
      <header className="z-50 shrink-0 border-b border-foreground/10 bg-background/90 pt-2 backdrop-blur-md sm:pt-3">
        <div className="mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 pb-2 sm:px-6 min-[840px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => {
                if (
                  session.status === "live" &&
                  !window.confirm("Leave the live game? Players stay connected and you can rejoin from Studio.")
                )
                  return;
                leaveSession();
              }}
              className="flex h-12 shrink-0 items-center gap-2 rounded-full border border-foreground/20 px-4 text-sm font-bold transition-colors hover:bg-foreground/5"
              aria-label="Close session and back to editor"
            >
              <ArrowLeft className="h-5 w-5" /> <span className="hidden sm:inline">Close</span>
            </button>
            <h1 className="min-w-0 truncate font-display text-lg font-semibold leading-tight" title={game.title}>
              {game.title}
            </h1>
          </div>

          {/* The scores read as one centred unit, not as two edge-anchored chips. */}
          <div className="order-last col-span-2 flex min-w-0 items-center justify-center gap-3 min-[840px]:order-none min-[840px]:col-span-1">
            <ScorePill
              team="alpha"
              side="left"
              name={teamName(theme, "alpha")}
              score={session.score_alpha}
              players={players}
              step={currentTile ? (session.dd_wager ?? currentTile.points) : 100}
              quickValues={pointValues}
              onAdjust={(d) => bumpScore("alpha", d)}
              onSet={(v) => bumpScore("alpha", v - session.score_alpha)}
            />
            <ScorePill
              team="bravo"
              side="right"
              name={teamName(theme, "bravo")}
              score={session.score_bravo}
              players={players}
              step={currentTile ? (session.dd_wager ?? currentTile.points) : 100}
              quickValues={pointValues}
              onAdjust={(d) => bumpScore("bravo", d)}
              onSet={(v) => bumpScore("bravo", v - session.score_bravo)}
            />
          </div>

          {/*
           * The account menu is the only control on this side, and it now holds
           * everything that is not the board: join code, overlay links, tools.
           */}
          <div className="flex justify-end">
            <AccountMenu
              wide
              displayName={profile?.username ?? "Host"}
              avatarUrl={profile?.avatar_url ?? null}
              onOpenSettings={() => setSettingsOpen(true)}
              items={[
                { icon: QrCode, label: "Join code & QR", onSelect: () => setMenuPanel("join") },
                { icon: Radio, label: "Broadcast overlays", onSelect: () => setMenuPanel("overlays") },
                { icon: Sparkles, label: "Daily Double tiles", onSelect: () => setDdOpen(true) },
                { icon: BarChart3, label: "Analytics", onSelect: () => setAnalyticsOpen(true) },
                { icon: Flag, label: "Final Jeopardy", onSelect: () => setFinalOpen(true) },
                {
                  icon: PanelRight,
                  label: "Live control panel",
                  onSelect: () => setPanelOpen((v) => !v),
                  className: "min-[1200px]:hidden",
                },
              ]}
              dangerItems={[
                { icon: RotateCcw, label: "Reset board", onSelect: () => setConfirm("reset") },
                { icon: Crown, label: "End game", onSelect: () => setConfirm("end") },
              ]}
            />
          </div>
        </div>
      </header>



      {/*
       * Body. From 840px up it is exactly one viewport tall and only the side
       * columns scroll; below that the whole body scrolls, so nothing is ever
       * clipped by a short window.
       */}
      <div className="min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 [container-type:size] sm:px-6 min-[840px]:overflow-y-hidden min-[840px]:py-0">
        <div className="grid h-full grid-cols-1 gap-4 min-[840px]:min-h-0 min-[840px]:grid-cols-[minmax(0,1fr)_auto] min-[1200px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          {/*
           * SINISTRA: stato, giocatori, soundboard e — in fondo — i comandi
           * della domanda. Stavano a destra, lontani dalla board e a fianco
           * degli stessi pulsanti ripetuti nella casella centrale.
           */}
          <div className="order-2 min-h-0 w-full space-y-4 self-center min-[840px]:order-1 min-[840px]:max-h-full min-[840px]:max-w-[340px] min-[840px]:justify-self-end min-[840px]:overflow-y-auto min-[840px]:py-4 min-[840px]:pr-1">
            <SessionStatus
              connectedCount={connectedCount}
              remaining={tiles.length - played}
              total={tiles.length}
              dailyDoublesLeft={session.daily_double_tile_ids.filter((id) => !usedSet.has(id)).length}
            />
            <PlayerRoster
              players={players}
              connectedCount={connectedCount}
              onSwitchTeam={(playerId) => {
                setHostState({
                  players: players.map((p) =>
                    p.id === playerId ? { ...p, team: (p.team === "alpha" ? "bravo" : "alpha") as Team } : p,
                  ),
                });
                settle(switchPlayerTeam({ data: { sessionId, playerId } }));
              }}
              onRemove={(playerId) => {
                setHostState({ players: players.filter((p) => p.id !== playerId) });
                settle(removePlayer({ data: { sessionId, playerId } }));
              }}
            />
            <Soundboard gameId={game.id} hostId={game.host_id} />
            <LiveControlPanel
              session={session}
              tile={currentTile}
              category={currentCategory}
              players={players}
              queue={queue}
              actions={actions}
            />
          </div>

          {/*
           * CENTRO: un solo riquadro tiene la board e, quando una casella si
           * apre, la domanda — così la trasformazione occupa esattamente
           * l'impronta della board.
           *
           * È alto quanto lo schermo e perfettamente quadrato: il lato è
           * l'altezza disponibile, a meno che non ci sia abbastanza larghezza,
           * nel qual caso si restringe lasciando alle colonne lo spazio che
           * `--board-reserve` tiene da parte per loro. Le colonne si accostano
           * ai suoi bordi invece di stare inchiodate a quelli della finestra.
           */}
          <div
            className="relative order-1 mx-auto [--board-reserve:0px] [container-type:size] min-[840px]:order-2 min-[840px]:[--board-reserve:23rem] min-[1200px]:[--board-reserve:46rem]"
            style={{
              width: `min(100cqh, max(16rem, calc((100cqw - var(--board-reserve)) * ${BOARD_RATIO})))`,
              height: `min(100cqh, max(16rem, calc((100cqw - var(--board-reserve)) / ${BOARD_RATIO})))`,
            }}
          >
            <BoardGrid
              fill
              theme={theme}
              categories={categories}
              tiles={tiles}
              usedIds={usedSet}
              disabled={session.status === "final" || session.status === "finished"}
              onOpenTile={(tileId) => {
                setHostSession({
                  status: "live",
                  current_tile_id: tileId,
                  active_player_id: null,
                  timer_ends_at: null,
                  dd_wager: null,
                  phase: "question_open",
                });
                settle(openTile({ data: { sessionId, tileId } }));
              }}
            />

            <AnimatePresence>
              {(session.phase === "question_open" ||
                session.phase === "answering" ||
                session.phase === "reveal") &&
                currentTile && (
                  <QuestionOverlay
                    key={currentTile.id + session.phase}
                    session={session}
                    tile={currentTile}
                    category={currentCategory}
                    players={players}
                    theme={theme}
                  />
                )}
            </AnimatePresence>
          </div>

          {/*
           * DESTRA: soltanto i buzzer e chi si è prenotato. Niente altro: era
           * la colonna dove finiva tutto, e il "Reveal answer" qui accanto a
           * quello nella casella centrale era la stessa azione due volte.
           */}
          <div
            className={`order-3 min-h-0 w-full flex-col gap-4 self-center overflow-y-auto min-[1200px]:flex min-[1200px]:max-h-full min-[1200px]:max-w-[340px] min-[1200px]:justify-self-start min-[1200px]:py-4 ${
              panelOpen
                ? "fixed inset-y-0 right-0 z-40 flex w-[min(380px,90vw)] border-l border-foreground/10 bg-background p-4 elev-3 min-[1200px]:static min-[1200px]:w-auto min-[1200px]:border-0 min-[1200px]:bg-transparent min-[1200px]:p-0 min-[1200px]:shadow-none"
                : "hidden"
            }`}
          >
            <BuzzerPanel session={session} players={players} queue={queue} onClearQueue={actions.clearQueue} />
            {session.status === "final" && (
              <FinalPanel session={session} finalAnswers={finalAnswers} players={players} theme={theme} />
            )}
          </div>

        </div>
      </div>


      <AnimatePresence>
        {menuPanel === "join" && (
          <Dialog onClose={() => setMenuPanel(null)} title="Join" subtitle="Inquadra il codice o manda il link">
            <MenuJoinBlock joinCode={game.join_code} />
          </Dialog>
        )}
        {menuPanel === "overlays" && (
          <Dialog
            onClose={() => setMenuPanel(null)}
            title="Broadcast overlays"
            subtitle="Sorgenti browser per OBS, 1920×1080"
          >
            <MenuObsLinks overlayToken={game.overlay_token} onRegenerate={() => setConfirm("rotate")} />
          </Dialog>
        )}
      </AnimatePresence>
      <AnimatePresence>{ddOpen && <DDTilesDialog state={state} onClose={() => setDdOpen(false)} />}</AnimatePresence>
      <AnimatePresence>
        {analyticsOpen && <AnalyticsDialog state={state} onClose={() => setAnalyticsOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>{finalOpen && <FinalDialog sessionId={sessionId} onClose={() => setFinalOpen(false)} />}</AnimatePresence>
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      <AnimatePresence>
        {confirm === "reset" && (
          <ConfirmDialog
            title="Reset the board?"
            body="Scores go back to zero, every tile reopens and new Daily Doubles are picked."
            confirmLabel="Reset board"
            onClose={() => setConfirm(null)}
            onConfirm={() => {
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
              void resetBoard({ data: { sessionId } }).then(() => toast.success("Board reset"));
            }}
          />
        )}
        {confirm === "rotate" && (
          <ConfirmDialog
            title="Regenerate overlay links?"
            body="The current links stop working immediately. Any OBS browser source still using them goes blank until you paste the new links."
            confirmLabel="Regenerate"
            onClose={() => setConfirm(null)}
            onConfirm={() => {
              void (async () => {
                await rotateOverlayToken({ data: { gameId: game.id } });
                void queryClient.invalidateQueries();
                toast.success("Overlay links regenerated");
              })();
            }}
          />
        )}
        {confirm === "end" && (
          <ConfirmDialog
            title="End the game?"
            body="This closes the session and shows the podium. It cannot be undone."
            confirmLabel="End game"
            onClose={() => setConfirm(null)}
            onConfirm={() => void finishSession({ data: { sessionId } })}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {session.status === "finished" && (
          <Podium
            session={session}
            players={players}
            theme={theme}
            onExit={() => void navigate({ to: "/studio" })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


/* ----------------------------- Session status ----------------------------- */

/**
 * Quanto resta da giocare, in cima alla colonna di sinistra. Lo stato "in
 * diretta" non sta più qui: diceva lo stesso numero che il riquadro dei
 * giocatori aveva due righe sotto, e ora vive lì.
 */
function SessionStatus({
  remaining,
  total,
  dailyDoublesLeft,
}: {
  remaining: number;
  total: number;
  dailyDoublesLeft: number;
}) {
  return (
    <div className="flex min-h-12 flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-foreground/15 px-4 py-2">
      <span className="text-xs font-bold text-muted-foreground">
        {remaining}/{total} left
      </span>
      <span aria-hidden className="h-3.5 w-px bg-foreground/15" />
      <span className="flex items-center gap-1.5 text-xs font-bold text-ink-gold">
        <Sparkles className="h-3.5 w-3.5" />
        {dailyDoublesLeft} Daily Double
      </span>
    </div>
  );
}

/* --------------------------- Account-menu panels -------------------------- */

/**
 * QR, join code and the one link-copy control. There is deliberately a single
 * copy affordance: the separate "copy code" chip said the same thing twice.
 */
function MenuJoinBlock({ joinCode }: { joinCode: string }) {
  const origin = useOrigin();
  const joinUrl = origin ? `${origin}/play/${joinCode}` : "";

  return (
    <div className="rounded-[20px] bg-muted p-3 text-center">
      <div className="mx-auto mb-2 w-fit rounded-[16px] bg-card p-2 text-foreground">
        {joinUrl ? (
          <QRCodeSVG value={joinUrl} size={104} bgColor="transparent" fgColor="currentColor" />
        ) : (
          <div className="h-[104px] w-[104px]" />
        )}
      </div>
      <p className="font-display text-2xl font-black tracking-[0.2em] text-ink-gold">{joinCode}</p>
      <button
        disabled={!joinUrl}
        onClick={() => {
          void navigator.clipboard.writeText(joinUrl);
          toast.success("Join link copied");
        }}
        className="mx-auto mt-3 flex min-h-12 items-center gap-2 rounded-full border border-foreground/20 px-5 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-40"
      >
        <Copy className="h-4 w-4" /> Copy link
      </button>
    </div>
  );
}

/* ------------------------------ Player roster ----------------------------- */

function PlayerRoster({
  players,
  connectedCount,
  onSwitchTeam,
  onRemove,
}: {
  players: Player[];
  connectedCount: number;
  onSwitchTeam: (playerId: string) => void;
  onRemove: (playerId: string) => void;
}) {
  const live = connectedCount > 0;
  return (
    <div className="rounded-[32px] bg-card p-5 elev-1">
      {/* Un'intestazione sola: prima diceva "Players", poi "2 players
          connected", poi la stessa cosa in verde nella pillola sopra. */}
      <h3 className="mb-2 flex items-center justify-center gap-1.5 text-sm font-bold">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${live ? "bg-success-ink" : "bg-foreground/30"}`}
          aria-hidden
        />
        <span className={live ? "text-success-ink" : "text-muted-foreground"}>
          {live ? `Live · ${connectedCount} ${connectedCount === 1 ? "player" : "players"}` : "In lobby"}
        </span>
      </h3>
      {players.length === 0 && (
        <p className="py-3 text-center text-sm text-muted-foreground">Nobody has joined yet.</p>
      )}
      {players.length > 0 && (

        <ul className="space-y-1">
          {players.map((p) => {
            const connected = !p.locked_out;
            return (
              <li
                key={p.id}
                className={`flex min-h-12 items-center gap-2.5 rounded-full px-2 ${connected ? "" : "opacity-45"}`}
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.team === "alpha" ? "bg-team-alpha-ink" : "bg-team-bravo-ink"}`}
                  aria-hidden
                />
                <span className="shrink-0 text-base">{p.avatar}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.name}</span>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {connected ? "Live" : "Locked"}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label={`Options for ${p.name}`}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-foreground/5"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-[24px] p-2">
                    <DropdownMenuItem
                      className="rounded-full px-3 py-2.5 text-sm font-semibold"
                      onSelect={() => onSwitchTeam(p.id)}
                    >
                      Switch team
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-full px-3 py-2.5 text-sm font-semibold text-danger-ink"
                      onSelect={() => onRemove(p.id)}
                    >
                      Remove player
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}


/* ------------------------------ OBS overlays ------------------------------ */

const OBS_VIEWS: { path: string; label: string; hint: string }[] = [
  { path: "board", label: "Board only", hint: "5×5 grid with live used tiles" },
  { path: "queue", label: "Buzzer queue + scores", hint: "Queue order and team scores" },
  { path: "combined", label: "Combined overlay", hint: "Board, scores and queue together" },
];

/**
 * The overlay links. Ogni riga copia il proprio link; l'icona in coda apre
 * l'anteprima in una scheda nuova, per controllare che la sorgente si veda.
 */
function MenuObsLinks({ overlayToken, onRegenerate }: { overlayToken: string; onRegenerate: () => void }) {
  const origin = useOrigin();

  return (
    <div className="space-y-1.5">
      {OBS_VIEWS.map((v) => {
        const url = origin ? `${origin}/overlay/${v.path}/${overlayToken}` : "";
        return (
          <div key={v.path} className="flex items-center gap-1 rounded-[20px] bg-muted px-4 py-2">
            <button
              disabled={!url}
              aria-label={`Copy ${v.label} link`}
              onClick={() => {
                void navigator.clipboard.writeText(url);
                toast.success("Link copied");
              }}
              className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-40"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-foreground">{v.label}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{v.hint}</span>
              </span>
              <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
            <a
              href={url || undefined}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${v.label} in a new tab`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        );
      })}
      <ul className="space-y-0.5 px-2 pt-1 text-[11px] text-muted-foreground">
        <li>· Add as a Browser Source</li>
        <li>· Width 1920, height 1080</li>
        <li>· Uncheck “Shutdown source when not visible”</li>
        <li>· Uncheck “Refresh browser when scene becomes active”</li>
      </ul>
      <button
        onClick={onRegenerate}
        className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-danger-ink/40 text-sm font-bold text-danger-ink transition-colors hover:bg-danger/20"
      >
        <Radio className="h-4 w-4" /> Regenerate links
      </button>
    </div>
  );
}

/* --------------------------- Live control panel --------------------------- */

/** Small key-hint label so the host learns the shortcuts in place. */
function KeyHint({ k }: { k: string }) {
  return (
    <kbd className="ml-2 rounded-md border border-current/30 px-1.5 py-0.5 font-mono text-[10px] font-bold opacity-70">
      {k}
    </kbd>
  );
}

function LiveControlPanel({
  session,
  tile,
  category,
  players,
  queue,
  actions,
}: {
  session: Session;
  tile: Tile | null;
  category: Category | null | undefined;
  players: Player[];
  queue: QueueEntry[];
  actions: HostActions;
}) {
  const countdown = useCountdown(session.timer_ends_at);
  // I suggerimenti devono dire il tasto VERO: se l'host se li è riassegnati,
  // un'etichetta di fabbrica sarebbe una bugia stampata sul pulsante.
  const keys = resolveShortcuts(useSettings().shortcuts);
  const activePlayer = players.find((p) => p.id === session.active_player_id) ?? null;
  const tileQueue = queue
    .filter((q) => q.tile_id === session.current_tile_id && (q.status === "queued" || q.status === "active"))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const hasNext = tileQueue.some((q) => q.status === "queued");
  const isDD = tile ? session.daily_double_tile_ids.includes(tile.id) : false;
  /** Una Daily Double paga il doppio: il pulsante deve dire la cifra vera. */
  const value = (tile?.points ?? 0) * (isDD ? 2 : 1);
  const phase = session.phase;

  return (
    /* Una scheda, non una colonna: si alza quando compaiono i comandi e si
       riabbassa quando la casella si chiude. Prima era alta quanto lo schermo
       e quasi sempre vuota, e per arrivare in fondo bisognava scorrere. */
    <div className="rounded-[32px] bg-card p-5 elev-2">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        <h3 className="text-center text-sm font-semibold text-muted-foreground">Live control</h3>
        {tile && (
          <span className="truncate rounded-full border border-foreground/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {category?.title ?? "Clue"} · {value}{isDD ? " · DD" : ""}
          </span>
        )}
      </div>

      {!tile || phase === "idle" ? (
        <p className="py-2 text-center text-sm text-muted-foreground">Open a tile to arm the buzzers</p>
      ) : phase === "reveal" ? (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-foreground/15 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Answer</p>
            <p className="mt-1 font-display text-xl font-black text-ink-gold">{tile.answer || "—"}</p>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {activePlayer ? `Scored for ${activePlayer.name}` : "No score change"}
          </p>
          <button
            onClick={actions.closeTile}
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-coral px-6 font-display text-base font-black text-foreground elev-2"
          >
            Close tile <KeyHint k={keyLabel(keys.closeTile)} />
          </button>
        </div>
      ) : activePlayer ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center text-lg scallop ${
                  activePlayer.team === "alpha" ? "bg-team-alpha" : "bg-team-bravo"
                }`}
              >
                {activePlayer.avatar}
              </span>
              <span
                className={`truncate font-display text-2xl font-black leading-none ${
                  activePlayer.team === "alpha" ? "text-team-alpha-ink" : "text-team-bravo-ink"
                }`}
              >
                {activePlayer.name}
              </span>
            </div>
            {countdown.seconds != null && (
              <span
                className={`shrink-0 font-display text-4xl font-black tabular-nums ${
                  countdown.seconds <= 5 ? "text-danger-ink" : "text-foreground"
                }`}
              >
                0:{String(countdown.seconds).padStart(2, "0")}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={actions.judgeCorrect}
              className="flex min-h-12 items-center justify-center rounded-full bg-success px-4 font-display text-base font-black text-success-ink elev-2"
            >
              <Check className="mr-1.5 h-5 w-5" /> +{value} <KeyHint k={keyLabel(keys.judgeCorrect)} />
            </button>
            <button
              onClick={actions.judgeWrong}
              className="flex min-h-12 items-center justify-center rounded-full bg-danger px-4 font-display text-base font-black text-danger-ink elev-2"
            >
              <X className="mr-1.5 h-5 w-5" /> Wrong <KeyHint k={keyLabel(keys.judgeWrong)} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={actions.passToNext}
              disabled={!hasNext}
              className="flex min-h-12 items-center justify-center rounded-full border border-foreground/25 px-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-40"
            >
              Pass to next <KeyHint k={keyLabel(keys.passToNext)} />
            </button>
            <button
              onClick={actions.restartTimer}
              className="flex min-h-12 items-center justify-center rounded-full border border-foreground/25 px-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Timer <KeyHint k={keyLabel(keys.restartTimer)} />
            </button>
          </div>

        </div>
      ) : (
        <div className="space-y-3">
          <p className="line-clamp-4 text-sm font-semibold text-foreground">
            {tile.question.replace(/<[^>]*>/g, "") || "…"}
          </p>
          <div className="rounded-[24px] border border-dashed border-foreground/30 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Host only · answer</p>
            <p className="mt-1 font-display text-lg font-black text-ink-gold">{tile.answer || "—"}</p>
            {tile.hint && <p className="mt-1 text-xs italic text-muted-foreground">Hint: {tile.hint}</p>}
          </div>
          <button
            onClick={actions.reveal}
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-lilac px-6 font-display text-base font-black text-foreground"
          >
            Reveal answer <KeyHint k={keyLabel(keys.reveal)} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Buzzer panel ------------------------------ */

/**
 * La colonna di destra, e nient'altro: se i buzzer sono aperti e chi si è
 * prenotato, in ordine. Giudizio e rivelazione stanno a sinistra, dove l'host
 * guarda mentre conduce.
 */
function BuzzerPanel({
  session,
  players,
  queue,
  onClearQueue,
}: {
  session: Session;
  players: Player[];
  queue: QueueEntry[];
  onClearQueue: () => void;
}) {
  const armed = session.phase === "question_open" || session.phase === "answering";
  const waiting = queue.filter(
    (q) => q.tile_id === session.current_tile_id && (q.status === "queued" || q.status === "active"),
  );

  return (
    <div className="rounded-[32px] bg-card p-5 elev-2">
      <h3 className="mb-3 text-center text-sm font-semibold text-muted-foreground">Buzzer</h3>
      <p
        className={`mb-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider ${
          armed ? "text-ink-gold" : "text-muted-foreground"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${armed ? "animate-pulse bg-ink-gold" : "bg-foreground/25"}`}
          aria-hidden
        />
        {armed ? "Buzzers armed" : "Buzzers closed"}
      </p>
      {waiting.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted-foreground">
          {armed ? "Nobody has buzzed yet" : "Open a tile to arm the buzzers"}
        </p>
      ) : (
        <QueueList session={session} players={players} queue={queue} onClear={onClearQueue} />
      )}
    </div>
  );
}

/* ---------------------------- Question overlay ---------------------------- */


/* --------------------------- Daily Double wager --------------------------- */


/* ------------------------------- Queue list ------------------------------- */



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
          // Sulla sessione perché valga subito, e sul gioco perché la scelta
          // sopravviva alla partita: le prossime la ereditano.
          await setDailyDoubles({ data: { sessionId: session.id, tileIds: selected } });
          await updateGame({
            data: { gameId: state.game.id, theme: { ...themeOf(state.game), dailyDoubleTileIds: selected } },
          });
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
      <h3 className="mb-3 text-center text-sm font-semibold text-muted-foreground">Final Jeopardy</h3>
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

function Podium({
  session,
  players,
  theme,
  onExit,
}: {
  session: Session;
  players: Player[];
  theme: ThemeSettings;
  onExit: () => void;
}) {
  // Esc, spazio o un clic fuori: la partita è finita, non serve spiegare come
  // uscire da una schermata che si chiude in tutti i modi in cui ci si prova.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" && e.key !== " ") return;
      e.preventDefault();
      onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  // A parità di punteggio non c'è un vincitore: il `>=` proclamava sempre
  // Alpha, con l'altra squadra elencata sotto con lo stesso identico numero.
  const tie = session.score_alpha === session.score_bravo;
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
      role="dialog"
      aria-modal
      aria-label="Risultato finale"
      onClick={onExit}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[36px] bg-card p-8 text-center elev-3"
      >
        <span className="mx-auto mb-4 flex h-20 w-20 items-center justify-center bg-butter scallop"><Crown className="h-10 w-10 text-ink-gold" /></span>
        <h2 className="font-display text-3xl font-black text-ink-gold text-glow-gold">
          {tie ? "It's a tie!" : `${teamName(theme, winner)} wins!`}
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
