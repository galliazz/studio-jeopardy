import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
          <div className="h-16 w-16 animate-pulse rounded-[24px] bg-accent" />
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

  const theme = (data.game.theme ?? {}) as ThemeSettings;

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
          You're joining
        </p>
        <h1 className="mb-6 text-center font-display text-2xl font-black">{gameTitle}</h1>

        <p className="mb-2 text-xs font-semibold text-muted-foreground">Pick your avatar</p>
        <div className="mb-4 grid grid-cols-8 gap-1.5">
          {PLAYER_AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={`flex aspect-square items-center justify-center rounded-2xl text-xl transition-all ${
                avatar === a ? "scale-110 bg-gold/25 ring-2 ring-gold" : "bg-secondary"
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
          className="mb-4 h-14 w-full rounded-2xl border-2 border-input bg-background px-5 text-center text-lg font-bold outline-none focus:border-gold"
        />

        <p className="mb-2 text-xs font-semibold text-muted-foreground">Choose your team</p>
        <div className="mb-6 grid grid-cols-2 gap-2">
          {(["alpha", "bravo"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTeam(t)}
              className={`rounded-2xl py-3.5 font-display text-sm font-black uppercase tracking-wider text-white transition-all ${
                t === "alpha" ? "bg-team-alpha" : "bg-team-bravo"
              } ${team === t ? "ring-4 ring-gold" : "opacity-40"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={!name.trim() || busy}
          onClick={() => void join()}
          className="h-14 w-full rounded-full bg-primary font-display text-lg font-black text-primary-foreground shadow-lg disabled:opacity-40"
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
}: {
  sessionId: string;
  identity: StoredIdentity;
  gameTitle: string;
}) {
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
    vibrate(50);
    sfx.click();
    try {
      const res = await buzz({ data: { playerId: identity.playerId } });
      if (!res.ok) {
        if (res.reason === "closed") toast.error("Buzzers are closed");
        else toast.error(res.message ?? "Buzz rejected");
      }
    } catch {
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
          <TeamScore team="alpha" score={session?.score_alpha ?? 0} mine={myTeam === "alpha"} />
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{gameTitle}</p>
            <p className="text-xs text-muted-foreground">
              {identity.avatar} {identity.name}
            </p>
          </div>
          <TeamScore team="bravo" score={session?.score_bravo ?? 0} mine={myTeam === "bravo"} />
        </div>

        <AnimatePresence mode="wait">
          {status === "lobby" && (
            <StatusCard key="lobby" icon={<Hourglass className="h-10 w-10 text-gold" />} title="You're in!">
              Waiting for the host to open the board…
            </StatusCard>
          )}

          {status === "live" && phase === "idle" && (
            <StatusCard key="idle" icon={<Clock className="h-10 w-10 text-muted-foreground" />} title="Get ready">
              Waiting for the next question.
            </StatusCard>
          )}

          {status === "live" && phase === "daily_double_wager" && (
            <StatusCard key="dd" icon={<Zap className="h-10 w-10 text-gold" />} title="Daily Double!">
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
                    className="flex h-56 w-56 flex-col items-center justify-center rounded-full bg-gold text-center shadow-2xl shadow-gold/40"
                  >
                    <span className="font-display text-2xl font-black text-black">YOU'RE UP!</span>
                    <span className="mt-1 font-display text-4xl font-black text-black">
                      {countdown.seconds ?? "–"}s
                    </span>
                  </motion.div>
                  <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${countdown.seconds != null && countdown.seconds <= 5 ? "bg-red-400" : "bg-gold"}`}
                      style={{ width: `${countdown.fraction * 100}%` }}
                    />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">Answer out loud — the host is listening!</p>
                </div>
              ) : locked ? (
                <StatusCard icon={<Ban className="h-10 w-10 text-red-400" />} title="Locked out">
                  Incorrect — wait for the next question.
                </StatusCard>
              ) : myEntry ? (
                <div className="flex flex-col items-center">
                  <div className="flex h-56 w-56 flex-col items-center justify-center rounded-full bg-secondary">
                    <span className="font-display text-lg font-bold text-muted-foreground">IN LINE</span>
                    <span className="font-display text-6xl font-black text-gold">#{myPosition}</span>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">Your buzz is locked in!</p>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => void doBuzz()}
                  disabled={!buzzerLive}
                  className={`flex h-64 w-64 flex-col items-center justify-center rounded-full font-display shadow-2xl transition-colors ${
                    myTeam === "alpha"
                      ? "bg-team-alpha shadow-team-alpha/40"
                      : "bg-team-bravo shadow-team-bravo/40"
                  }`}
                >
                  <Zap className="mb-1 h-12 w-12 text-white" />
                  <span className="text-4xl font-black tracking-wide text-white">BUZZ</span>
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
            <FinalForm key="final" session={session!} identity={identity} myTeam={myTeam} />
          )}

          {status === "finished" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center"
            >
              <Trophy className="mb-3 h-14 w-14 text-gold" />
              <h2 className="font-display text-2xl font-black">
                {(session?.score_alpha ?? 0) >= (session?.score_bravo ?? 0) ? "Team Alpha" : "Team Bravo"} wins!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your team scored <span className="font-bold text-gold">${myScore ?? 0}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}

function Check2() {
  return <Zap className="h-10 w-10 text-gold" />;
}

/* ------------------------------- Final form ------------------------------- */

function FinalForm({ session, identity, myTeam }: { session: Session; identity: StoredIdentity; myTeam: Team }) {
  const [wager, setWager] = useState(0);
  const [answer, setAnswer] = useState("");
  const [sent, setSent] = useState(false);
  const maxWager = Math.max(0, myTeam === "alpha" ? session.score_alpha : session.score_bravo);

  if (sent) {
    return (
      <StatusCard icon={<Hourglass className="h-10 w-10 text-gold" />} title="Locked in">
        Your team's final answer is in. Waiting for the host…
      </StatusCard>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <h2 className="mb-1 text-center font-display text-2xl font-black text-gold">Final Jeopardy</h2>
      <p className="mb-5 text-center text-xs text-muted-foreground">
        One submission per team — {myTeam === "alpha" ? "Alpha" : "Bravo"} · max wager ${maxWager}
      </p>
      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-semibold text-muted-foreground">Wager</span>
        <input
          type="number"
          min={0}
          max={maxWager}
          value={wager}
          onChange={(e) => setWager(Math.max(0, Math.min(maxWager, Number(e.target.value))))}
          className="h-14 w-full rounded-2xl border-2 border-input bg-background px-5 text-center font-display text-xl font-black text-gold outline-none focus:border-gold"
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
            className="w-full rounded-2xl border-2 border-input bg-background p-4 text-sm outline-none focus:border-gold"
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
        className="h-14 w-full rounded-full bg-primary font-display text-lg font-black text-primary-foreground disabled:opacity-40"
      >
        {session.phase === "final_wager" ? "Lock in wager" : "Submit final answer"}
      </motion.button>
    </motion.div>
  );
}

/* --------------------------------- Pieces --------------------------------- */

function TeamScore({ team, score, mine }: { team: Team; score: number; mine: boolean }) {
  return (
    <div
      className={`rounded-2xl px-3 py-2 text-center text-white ${team === "alpha" ? "bg-team-alpha" : "bg-team-bravo"} ${
        mine ? "ring-2 ring-gold" : "opacity-70"
      }`}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider">{team}</p>
      <p className="font-display text-lg font-black leading-none">${score}</p>
    </div>
  );
}

function StatusCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex w-full flex-col items-center rounded-[28px] bg-card px-6 py-10 text-center"
    >
      {icon}
      <h2 className="mt-3 font-display text-xl font-black">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </motion.div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
