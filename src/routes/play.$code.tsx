import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock, Ban, Trophy, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { lookupSession, joinGame, getPlayerState, buzz, submitFinalAnswer } from "@/lib/play.functions";
import { useSessionRealtime } from "@/hooks/use-session-realtime";
import { useCountdown } from "@/hooks/use-countdown";
import { sfx, vibrate } from "@/lib/sfx";
import {
  PLAYER_AVATARS,
  teamName,
  type Player,
  type Session,
  type QueueEntry,
  type Team,
  type ThemeSettings,
} from "@/lib/types";

export const Route = createFileRoute("/play/$code")({
  head: () => ({
    meta: [
      { title: "Join Game — JEOPARDESTINY" },
      { name: "description", content: "Join a live JEOPARDESTINY game and buzz in from your phone." },
      { property: "og:title", content: "Join Game — JEOPARDESTINY" },
      { property: "og:description", content: "Join a live JEOPARDESTINY game and buzz in from your phone." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PlayerPage,
});

interface StoredIdentity {
  playerId: string;
  name: string;
  avatar: string;
  team: Team;
}

function PlayerPage() {
  const { code } = Route.useParams();
  const lookup = useServerFn(lookupSession);
  const { data, isLoading } = useQuery({
    queryKey: ["lookup", code],
    queryFn: () => lookup({ data: { code } }),
    retry: 1,
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-[28px] bg-lilac" />
          <p className="text-sm text-muted-foreground">Finding your game…</p>
        </div>
      </Shell>
    );
  }

  if (!data || "error" in data) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center">
          <Ban className="h-12 w-12 text-muted-foreground" />
          <h1 className="font-display text-xl font-bold">
            {data && "error" in data && data.error === "not_started" ? "Game not started yet" : "Game not found"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data && "error" in data && data.error === "not_started"
              ? "The host hasn't gone live with this board yet. Wait a moment and refresh."
              : `No live game matches code “${code}”. Check the code and try again.`}
          </p>
        </div>
      </Shell>
    );
  }

  const theme = (data.game.theme ?? {}) as unknown as ThemeSettings;

  return (
    <PlayerLobby
      key={data.session.id}
      session={data.session as unknown as Session}
      gameTitle={data.game.title}
      code={code}
      theme={theme}
    />
  );
}

function PlayerLobby({
  session,
  gameTitle,
  code,
  theme,
}: {
  session: Session;
  gameTitle: string;
  code: string;
  theme: ThemeSettings;
}) {
  const storageKey = `jd:player:${session.id}`;
  const [identity, setIdentity] = useState<StoredIdentity | null>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as StoredIdentity) : null;
    } catch {
      return null;
    }
  });

  if (!identity) {
    return (
      <JoinForm
        code={code}
        gameTitle={gameTitle}
        theme={theme}
        onJoined={(id) => {
          localStorage.setItem(storageKey, JSON.stringify(id));
          setIdentity(id);
        }}
      />
    );
  }
  return <LivePlayer sessionId={session.id} identity={identity} gameTitle={gameTitle} theme={theme} />;
}

/* -------------------------------- Join form ------------------------------- */

function JoinForm({
  code,
  gameTitle,
  theme,
  onJoined,
}: {
  code: string;
  gameTitle: string;
  theme: ThemeSettings;
  onJoined: (id: StoredIdentity) => void;
}) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(PLAYER_AVATARS[0]!);
  const [team, setTeam] = useState<Team>("alpha");
  const [busy, setBusy] = useState(false);

  const join = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const res = await joinGame({ data: { code, name: name.trim(), avatar, team } });
      if ("error" in res) {
        toast.error(res.error === "not_started" ? "The host hasn't started yet" : "Could not join");
        return;
      }
      vibrate(30);
      onJoined({
        playerId: res.player.id,
        name: res.player.name,
        avatar: res.player.avatar,
        team: res.player.team as Team,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
        className="w-full"
      >
        <p className="mb-1 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Guest Player Setup
        </p>
        <h1 className="mb-1 text-center font-display text-2xl font-black">{gameTitle}</h1>
        <p className="mb-6 text-center text-xs text-muted-foreground">
          No account needed — just pick a name, avatar and team.
        </p>

        <p className="mb-2 text-xs font-semibold text-muted-foreground">Pick your avatar</p>
        <div className="mb-4 grid grid-cols-8 gap-1.5">
          {PLAYER_AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={`flex aspect-square items-center justify-center text-xl transition-all scallop ${
                avatar === a ? "scale-110 bg-butter" : "bg-muted"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void join()}
          placeholder="Your name"
          maxLength={20}
          className="mb-4 h-14 w-full rounded-full bg-muted px-5 text-center text-lg font-bold outline-none ring-2 ring-transparent focus:ring-ink-accent"
        />

        <p className="mb-2 text-xs font-semibold text-muted-foreground">Choose your team</p>
        <div className="mb-6 grid grid-cols-2 gap-2">
          {(["alpha", "bravo"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTeam(t)}
              className={`rounded-full py-4 font-display text-sm font-black uppercase tracking-wider text-foreground transition-all ${
                t === "alpha" ? "bg-team-alpha" : "bg-team-bravo"
              } ${team === t ? "elev-2 ring-4 ring-ink-accent" : "opacity-50"}`}
            >
              {teamName(theme, t)}
            </button>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={!name.trim() || busy}
          onClick={() => void join()}
          className="h-14 w-full rounded-full bg-coral font-display text-lg font-black text-foreground elev-2 disabled:opacity-40"
        >
          {busy ? "Joining…" : "Join Game"}
        </motion.button>
      </motion.div>
    </Shell>
  );
}

/* ------------------------------- Live player ------------------------------ */

interface PlayerState {
  session: Session;
  players: Player[];
  queue: QueueEntry[];
}

function LivePlayer({
  sessionId,
  identity,
  gameTitle,
  theme,
}: {
  sessionId: string;
  identity: StoredIdentity;
  gameTitle: string;
  theme: ThemeSettings;
}) {
  const queryClient = useQueryClient();
  const fetchState = useServerFn(getPlayerState);
  const { data } = useQuery({
    queryKey: ["play", sessionId],
    queryFn: () => fetchState({ data: { sessionId } }),
    refetchOnWindowFocus: true,
  });
  useSessionRealtime(sessionId, [["play", sessionId]]);

  const state = data && !("error" in data) ? (data as unknown as PlayerState) : null;
  const session = state?.session ?? null;
  const players = state?.players ?? [];
  const queue = state?.queue ?? [];

  const me = players.find((p) => p.id === identity.playerId);
  const myTeam: Team = me?.team ?? identity.team;
  const myScore = myTeam === "alpha" ? session?.score_alpha : session?.score_bravo;

  const myEntry = useMemo(
    () =>
      session?.current_tile_id
        ? queue.find(
            (q) =>
              q.tile_id === session.current_tile_id &&
              q.player_id === identity.playerId &&
              (q.status === "queued" || q.status === "active"),
          )
        : undefined,
    [queue, session?.current_tile_id, identity.playerId],
  );

  const tileQueue = useMemo(
    () =>
      session?.current_tile_id
        ? queue
            .filter((q) => q.tile_id === session.current_tile_id && (q.status === "queued" || q.status === "active"))
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
        : [],
    [queue, session?.current_tile_id],
  );
  const myPosition = myEntry ? tileQueue.findIndex((q) => q.player_id === identity.playerId) + 1 : 0;
  const iAmActive = session?.active_player_id === identity.playerId;

  const countdown = useCountdown(session?.timer_ends_at);

  // Haptics/audio cues on becoming active
  const wasActive = useRef(false);
  useEffect(() => {
    if (iAmActive && !wasActive.current) {
      vibrate([60, 40, 60]);
      sfx.buzz();
    }
    wasActive.current = iAmActive;
  }, [iAmActive]);

  const doBuzz = async () => {
    if (!session?.current_tile_id || !buzzerLive) return;
    vibrate(50);
    sfx.click();
    const now = new Date().toISOString();
    const tileId = session.current_tile_id;
    queryClient.setQueryData(["play", sessionId], (old: unknown) => {
      const prev = old as PlayerState | undefined;
      if (!prev || "error" in prev) return old;
      if (prev.queue.some((q) => q.tile_id === tileId && q.player_id === identity.playerId && (q.status === "queued" || q.status === "active"))) {
        return old;
      }
      const hasActive = prev.queue.some((q) => q.tile_id === tileId && q.status === "active");
      const optimistic: QueueEntry = {
        id: `optimistic-${identity.playerId}-${now}`,
        session_id: sessionId,
        tile_id: tileId,
        player_id: identity.playerId,
        status: hasActive ? "queued" : "active",
        created_at: now,
        judged_at: null,
      };
      return {
        ...prev,
        session: hasActive ? prev.session : { ...prev.session, active_player_id: identity.playerId, phase: "answering" },
        queue: [...prev.queue, optimistic],
      };
    });
    try {
      const res = await buzz({ data: { playerId: identity.playerId, token: identity.token } });
      if (!res.ok) {
        void queryClient.invalidateQueries({ queryKey: ["play", sessionId] });
        if (res.reason === "closed") toast.error("Buzzers are closed");
        else toast.error("Buzz rejected");
      }
    } catch {
      void queryClient.invalidateQueries({ queryKey: ["play", sessionId] });
      toast.error("Buzz failed — try again");
    }
  };

  const phase = session?.phase ?? "idle";
  const status = session?.status ?? "lobby";
  const locked = me?.locked_out ?? false;
  const buzzerLive = status === "live" && (phase === "question_open" || phase === "answering") && !locked && !myEntry;

  return (
    <Shell>
      <div className="flex w-full flex-col items-center">
        {/* Scoreboard strip */}
        <div className="mb-5 flex w-full items-center justify-between gap-2">
          <TeamScore team="alpha" name={teamName(theme, "alpha")} score={session?.score_alpha ?? 0} mine={myTeam === "alpha"} />
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{gameTitle}</p>
            <p className="truncate text-xs text-muted-foreground">
              {identity.avatar} {identity.name}
            </p>
          </div>
          <TeamScore team="bravo" name={teamName(theme, "bravo")} score={session?.score_bravo ?? 0} mine={myTeam === "bravo"} />
        </div>

        <AnimatePresence mode="wait">
          {status === "lobby" && (
            <StatusCard key="lobby" icon={<Hourglass className="h-10 w-10 text-ink-gold" />} title="You're in!">
              Waiting for the host to open the board…
            </StatusCard>
          )}

          {status === "live" && phase === "idle" && (
            <StatusCard key="idle" icon={<Clock className="h-10 w-10 text-muted-foreground" />} title="Get ready">
              Waiting for the next question.
            </StatusCard>
          )}

          {status === "live" && phase === "daily_double_wager" && (
            <StatusCard key="dd" icon={<Zap className="h-10 w-10 text-ink-gold" />} title="Daily Double!">
              The host is setting a wager…
            </StatusCard>
          )}

          {status === "live" && (phase === "question_open" || phase === "answering") && (
            <motion.div
              key="buzz"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex w-full flex-col items-center"
            >
              {iAmActive ? (
                <div className="flex w-full flex-col items-center">
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="flex aspect-square w-[min(72vw,16rem)] flex-col items-center justify-center rounded-full bg-butter text-center elev-3"
                  >
                    <span className="font-display text-2xl font-black text-foreground">YOU'RE UP!</span>
                    <span className="mt-1 font-display text-4xl font-black text-foreground">
                      {countdown.seconds ?? "–"}s
                    </span>
                  </motion.div>
                  <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${countdown.seconds != null && countdown.seconds <= 5 ? "bg-danger-ink" : "bg-ink-gold"}`}
                      style={{ width: `${countdown.fraction * 100}%` }}
                    />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">Answer out loud — the host is listening!</p>
                </div>
              ) : locked ? (
                <StatusCard icon={<Ban className="h-10 w-10 text-danger-ink" />} title="Locked out">
                  Incorrect — wait for the next question.
                </StatusCard>
              ) : myEntry ? (
                <div className="flex flex-col items-center">
                  <div className="flex aspect-square w-[min(72vw,16rem)] flex-col items-center justify-center bg-lilac elev-2 scallop">
                    <span className="font-display text-lg font-bold text-muted-foreground">IN LINE</span>
                    <span className="font-display text-6xl font-black text-ink-gold">#{myPosition}</span>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">Your buzz is locked in!</p>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => void doBuzz()}
                  disabled={!buzzerLive}
                  className={`flex aspect-square w-[min(78vw,20rem)] flex-col items-center justify-center rounded-full font-display elev-3 transition-colors disabled:opacity-60 ${
                    myTeam === "alpha" ? "bg-team-alpha" : "bg-team-bravo"
                  }`}
                >
                  <Zap className="mb-1 h-12 w-12 text-foreground" />
                  <span className="text-4xl font-black tracking-wide text-foreground">BUZZ</span>
                </motion.button>
              )}
            </motion.div>
          )}

          {status === "live" && phase === "reveal" && (
            <StatusCard key="reveal" icon={<Check2 />} title="Answer revealed">
              Watch the board — next tile coming up.
            </StatusCard>
          )}

          {(status === "final" || phase === "final_wager" || phase === "final_answer") && status !== "finished" && (
            <FinalForm key="final" session={session!} identity={identity} myTeam={myTeam} theme={theme} />
          )}

          {status === "finished" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center"
            >
              <Trophy className="mb-3 h-14 w-14 text-ink-gold" />
              <h2 className="font-display text-2xl font-black">
                {teamName(theme, (session?.score_alpha ?? 0) >= (session?.score_bravo ?? 0) ? "alpha" : "bravo")} wins!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your team scored <span className="font-bold text-ink-gold">{myScore ?? 0}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}

function Check2() {
  return <Zap className="h-10 w-10 text-ink-gold" />;
}

/* ------------------------------- Final form ------------------------------- */

function FinalForm({
  session,
  identity,
  myTeam,
  theme,
}: {
  session: Session;
  identity: StoredIdentity;
  myTeam: Team;
  theme: ThemeSettings;
}) {
  const [wager, setWager] = useState(0);
  const [answer, setAnswer] = useState("");
  const [sent, setSent] = useState(false);
  const maxWager = Math.max(0, myTeam === "alpha" ? session.score_alpha : session.score_bravo);

  if (sent) {
    return (
      <StatusCard icon={<Hourglass className="h-10 w-10 text-ink-gold" />} title="Locked in">
        Your team's final answer is in. Waiting for the host…
      </StatusCard>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <h2 className="mb-1 text-center font-display text-2xl font-black text-ink-gold">Final Jeopardy</h2>
      <p className="mb-5 text-center text-xs text-muted-foreground">
        One submission per team — {teamName(theme, myTeam)} · max wager {maxWager}
      </p>
      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-semibold text-muted-foreground">Wager</span>
        <input
          type="number"
          min={0}
          max={maxWager}
          value={wager}
          onChange={(e) => setWager(Math.max(0, Math.min(maxWager, Number(e.target.value))))}
          className="h-14 w-full rounded-full bg-butter px-5 text-center font-display text-xl font-black text-ink-gold outline-none"
        />
      </label>
      {session.phase === "final_answer" && (
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">{session.final_question}</span>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your team's answer…"
            rows={3}
            className="w-full rounded-[26px] bg-muted p-4 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent"
          />
        </label>
      )}
      <motion.button
        whileTap={{ scale: 0.96 }}
        disabled={session.phase === "final_answer" && !answer.trim()}
        onClick={async () => {
          const res = await submitFinalAnswer({ data: { playerId: identity.playerId, wager, answer: answer.trim() } });
          if (res.ok) {
            vibrate([40, 40, 40]);
            setSent(true);
          } else {
            toast.error("Submission rejected");
          }
        }}
        className="h-14 w-full rounded-full bg-coral font-display text-lg font-black text-foreground elev-2 disabled:opacity-40"
      >
        {session.phase === "final_wager" ? "Lock in wager" : "Submit final answer"}
      </motion.button>
    </motion.div>
  );
}

/* --------------------------------- Pieces --------------------------------- */

function TeamScore({ team, name, score, mine }: { team: Team; name: string; score: number; mine: boolean }) {
  return (
    <div
      className={`max-w-[8rem] shrink-0 rounded-[22px] px-3 py-2.5 text-center text-foreground elev-1 sm:px-4 ${team === "alpha" ? "bg-team-alpha" : "bg-team-bravo"} ${
        mine ? "ring-2 ring-gold" : "opacity-70"
      }`}
    >
      <p className="truncate text-[9px] font-bold uppercase tracking-wider">{name}</p>
      <p className="font-display text-lg font-black leading-none">{score}</p>
    </div>
  );
}

function StatusCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex w-full flex-col items-center rounded-[36px] bg-card px-6 py-10 text-center elev-2"
    >
      {icon}
      <h2 className="mt-3 font-display text-xl font-black">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </motion.div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100svh] items-center justify-center px-4 pb-8 pt-16 text-foreground">
      <div className="w-full max-w-md lg:max-w-xl">{children}</div>
    </div>
  );
}
