import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock, Ban, Trophy, Hourglass, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  lookupSession,
  joinGame,
  getPlayerState,
  buzz,
  submitFinalAnswer,
} from "@/lib/play.functions";
import { GUEST_TABLES, useSessionRealtime } from "@/hooks/use-session-realtime";
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
  teamColorVars,
} from "@/lib/types";
import { SPRING_UI } from "@/lib/motion";
import { AppBar, GuestSettingsButton } from "@/components/AppBar";
import { localizeError, useT } from "@/i18n";

export const Route = createFileRoute("/play/$code")({
  head: () => ({
    meta: [
      { title: "Join Game — JEOPARDESTINY" },
      {
        name: "description",
        content: "Join a live JEOPARDESTINY game and buzz in from your phone.",
      },
      { property: "og:title", content: "Join Game — JEOPARDESTINY" },
      {
        property: "og:description",
        content: "Join a live JEOPARDESTINY game and buzz in from your phone.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PlayerPage,
});

interface StoredIdentity {
  playerId: string;
  /** Private per-player token issued at join time; proves ownership on buzz/final submit. */
  token: string;
  name: string;
  avatar: string;
  team: Team;
}

function PlayerPage() {
  const t = useT();
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
          <p className="text-sm text-muted-foreground">{t("play.lookup.finding")}</p>
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
            {data && "error" in data && data.error === "unavailable"
              ? t("play.lookup.serverErrorTitle")
              : data && "error" in data && data.error === "not_started"
                ? t("play.lookup.notStartedTitle")
                : t("play.lookup.notFoundTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data && "error" in data && data.error === "unavailable"
              ? t("play.lookup.serverErrorBody")
              : data && "error" in data && data.error === "not_started"
                ? t("play.lookup.notStartedBody")
                : t("play.lookup.notFoundBody", { code })}
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
      const parsed = raw ? (JSON.parse(raw) as Partial<StoredIdentity>) : null;
      // Identities saved before per-player tokens existed must re-join.
      return parsed?.playerId && parsed.token ? (parsed as StoredIdentity) : null;
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
  return (
    <LivePlayer
      sessionId={session.id}
      identity={identity}
      gameTitle={gameTitle}
      theme={theme}
      onChangeIdentity={() => {
        localStorage.removeItem(storageKey);
        setIdentity(null);
      }}
    />
  );
}

/* -------------------------------- Join form ------------------------------- */

const NAME_MIN = 2;
const NAME_MAX = 25;

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
  const t = useT();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [team, setTeam] = useState<Team>("alpha");
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const trimmed = name.trim();
  const nameOk = trimmed.length >= NAME_MIN && trimmed.length <= NAME_MAX;
  const canJoin = nameOk && !!avatar && !busy;

  const join = async () => {
    if (!avatar || busy) return;
    if (!nameOk) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setJoinError(null);
    setBusy(true);
    try {
      const res = await joinGame({ data: { code, name: trimmed, avatar, team } });
      if ("error" in res) {
        setJoinError(
          res.error === "not_started"
            ? t("play.join.notAccepting")
            : res.error === "not_found"
              ? t("play.join.gameGone")
              : t("play.join.fullOrClosed"),
        );
        return;
      }
      vibrate(30);
      onJoined({
        playerId: res.player.id,
        token: res.token,
        name: res.player.name,
        avatar: res.player.avatar,
        team: res.player.team as Team,
      });
    } catch (err) {
      setJoinError(localizeError(err, "play.join.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={gameTitle}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_UI}
        className="w-full"
      >
        <h1 className="mb-1 text-center font-display text-2xl font-black">{gameTitle}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">{t("play.join.intro")}</p>

        {/* Name */}
        <div className="mb-5">
          <label
            htmlFor="player-name"
            className="mb-1.5 block text-sm font-semibold text-muted-foreground"
          >
            {t("play.join.nameLabel")}
          </label>
          <input
            id="player-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(false);
            }}
            onBlur={() => {
              const v = name.trim();
              setNameError(!!v && !nameOk);
            }}
            onKeyDown={(e) => e.key === "Enter" && void join()}
            maxLength={NAME_MAX}
            autoComplete="off"
            aria-invalid={nameError}
            className={`h-14 w-full rounded-2xl border bg-background px-4 text-base font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background ${
              nameError ? "border-destructive" : "border-border"
            }`}
          />
          <div className="mt-1 flex min-h-4 items-center justify-between gap-3">
            <span className="text-xs text-destructive">
              {nameError ? t("play.join.nameLength", { min: NAME_MIN, max: NAME_MAX }) : null}
            </span>
            {name.length > 20 && (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {name.length}/{NAME_MAX}
              </span>
            )}
          </div>
        </div>

        {/* Avatar */}
        <p className="mb-2 text-sm font-semibold text-muted-foreground">
          {t("play.join.avatarLabel")}
        </p>
        <div className="mb-5 grid grid-cols-6 gap-2 sm:grid-cols-8">
          {PLAYER_AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              aria-label={t("play.join.avatarOption", { avatar: a })}
              aria-pressed={avatar === a}
              onClick={() => setAvatar(a)}
              className={`flex aspect-square min-h-12 min-w-12 items-center justify-center rounded-full bg-muted text-2xl outline-none transition-transform active:scale-95 ${
                avatar === a ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Team */}
        <p className="mb-2 text-sm font-semibold text-muted-foreground">
          {t("play.join.teamLabel")}
        </p>
        <div className="mb-6 grid grid-cols-2 gap-3">
          {(["alpha", "bravo"] as const).map((option) => {
            const selected = team === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => setTeam(option)}
                className={`min-h-12 rounded-full px-3 py-3 font-display text-sm font-black uppercase tracking-wider outline-none transition-colors ${
                  selected
                    ? `text-foreground elev-2 ${option === "alpha" ? "bg-team-alpha" : "bg-team-bravo"}`
                    : "border-2 border-border bg-transparent text-muted-foreground"
                }`}
              >
                {teamName(theme, option)}
              </button>
            );
          })}
        </div>

        {joinError && (
          <p role="alert" className="mb-3 text-center text-sm font-semibold text-destructive">
            {joinError}
          </p>
        )}

        {/* Primary action, kept in thumb reach at the bottom of the content block */}
        <motion.button
          whileTap={{ scale: canJoin ? 0.96 : 1 }}
          disabled={!canJoin}
          onClick={() => void join()}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-coral font-display text-lg font-black text-foreground elev-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none"
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" />}
          {busy ? t("play.join.joining") : t("play.join.joinGame")}
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
  onChangeIdentity,
}: {
  sessionId: string;
  identity: StoredIdentity;
  gameTitle: string;
  theme: ThemeSettings;
  onChangeIdentity: () => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const fetchState = useServerFn(getPlayerState);
  const { data } = useQuery({
    queryKey: ["play", sessionId],
    queryFn: () => fetchState({ data: { sessionId } }),
    refetchOnWindowFocus: true,
  });
  useSessionRealtime(sessionId, [["play", sessionId]], GUEST_TABLES);

  const state = data && !("error" in data) ? (data as unknown as PlayerState) : null;
  const session = state?.session ?? null;
  const players = state?.players ?? [];
  const queue = useMemo(() => state?.queue ?? [], [state]);

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
            .filter(
              (q) =>
                q.tile_id === session.current_tile_id &&
                (q.status === "queued" || q.status === "active"),
            )
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
        : [],
    [queue, session?.current_tile_id],
  );
  const myPosition = myEntry
    ? tileQueue.findIndex((q) => q.player_id === identity.playerId) + 1
    : 0;
  const iAmActive = session?.active_player_id === identity.playerId;

  const countdown = useCountdown(session?.timer_ends_at);

  // Haptics/audio cues on becoming active
  const wasActive = useRef(false);
  /** Ultima casella per cui è già partita una prenotazione: evita i doppi invii. */
  const buzzSentFor = useRef<string | null>(null);

  useEffect(() => {
    if (iAmActive && !wasActive.current) {
      vibrate([60, 40, 60]);
      sfx.buzz();
    }
    wasActive.current = iAmActive;
  }, [iAmActive]);

  // Quando la casella si chiude il fermo cade: se l'host la riapre, il buzzer
  // torna disponibile invece di restare muto per il resto della partita.
  useEffect(() => {
    const open = session?.phase === "question_open" || session?.phase === "answering";
    if (!open) buzzSentFor.current = null;
  }, [session?.phase, session?.current_tile_id]);

  const doBuzz = async () => {
    if (!session?.current_tile_id || !buzzerLive) return;
    const tileId = session.current_tile_id;
    // `pointerdown` può arrivare due volte sulla stessa pressione (due dita, penna
    // più tocco). `buzzerLive` non fa da scudo: si spegne solo quando lo stato è
    // già tornato indietro. Una casella, una richiesta.
    if (buzzSentFor.current === tileId) return;
    buzzSentFor.current = tileId;
    vibrate(50);
    sfx.click();
    const now = new Date().toISOString();
    queryClient.setQueryData(["play", sessionId], (old: unknown) => {
      const prev = old as PlayerState | undefined;
      if (!prev || "error" in prev) return old;
      if (
        prev.queue.some(
          (q) =>
            q.tile_id === tileId &&
            q.player_id === identity.playerId &&
            (q.status === "queued" || q.status === "active"),
        )
      ) {
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
        session: hasActive
          ? prev.session
          : { ...prev.session, active_player_id: identity.playerId, phase: "answering" },
        queue: [...prev.queue, optimistic],
      };
    });
    try {
      const res = await buzz({ data: { playerId: identity.playerId, token: identity.token } });
      if (!res.ok) {
        // Rifiutata: la casella torna libera, altrimenti "riprova" sarebbe una bugia.
        buzzSentFor.current = null;
        void queryClient.invalidateQueries({ queryKey: ["play", sessionId] });
        if (res.reason === "closed") toast.error(t("play.buzzer.closed"));
        else toast.error(t("play.buzzer.rejected"));
      }
    } catch {
      buzzSentFor.current = null;
      void queryClient.invalidateQueries({ queryKey: ["play", sessionId] });
      toast.error(t("play.buzzer.failed"));
    }
  };

  const phase = session?.phase ?? "idle";
  const status = session?.status ?? "lobby";
  const locked = me?.locked_out ?? false;
  const buzzerLive =
    status === "live" &&
    (phase === "question_open" || phase === "answering") &&
    !locked &&
    !myEntry;

  return (
    <Shell title={gameTitle}>
      {/* Le tinte scelte dall'host per le squadre valgono anche sul telefono:
          il buzzer è del colore della propria squadra. */}
      <div className="flex w-full flex-col items-center" style={teamColorVars(theme)}>
        {/* Scoreboard strip */}
        <div className="mb-5 flex w-full items-center justify-between gap-2">
          <TeamScore
            team="alpha"
            name={teamName(theme, "alpha")}
            score={session?.score_alpha ?? 0}
            mine={myTeam === "alpha"}
          />
          {/* Il titolo del gioco è salito nella barra: qui resta chi sei. */}
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-semibold text-foreground">
              {identity.avatar} {identity.name}
            </p>
          </div>
          <TeamScore
            team="bravo"
            name={teamName(theme, "bravo")}
            score={session?.score_bravo ?? 0}
            mine={myTeam === "bravo"}
          />
        </div>

        <AnimatePresence mode="wait">
          {status === "lobby" && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex w-full flex-col items-center rounded-[36px] bg-card px-6 py-9 text-center elev-2"
            >
              <Hourglass className="h-10 w-10 text-ink-gold" />
              <h2 className="mt-3 font-display text-xl font-black">{t("play.lobby.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("play.lobby.waiting")}</p>

              <div className="mt-6 flex w-full items-center gap-3 rounded-[28px] bg-muted p-3 text-start">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background text-2xl">
                  {identity.avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-foreground">{identity.name}</p>
                  <span
                    className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-foreground ${
                      myTeam === "alpha" ? "bg-team-alpha" : "bg-team-bravo"
                    }`}
                  >
                    {teamName(theme, myTeam)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onChangeIdentity}
                className="mt-3 min-h-12 w-full rounded-full border-2 border-border px-4 text-sm font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t("play.lobby.changeIdentity")}
              </button>
            </motion.div>
          )}

          {status === "live" && phase === "idle" && (
            <StatusCard
              key="idle"
              icon={<Clock className="h-10 w-10 text-muted-foreground" />}
              title={t("play.idle.title")}
            >
              {t("play.idle.body")}
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
                    <span className="font-display text-2xl font-black text-foreground">
                      {t("play.buzzer.youreUp")}
                    </span>
                    <span className="mt-1 font-display text-4xl font-black text-foreground">
                      {t("play.buzzer.secondsLeft", { seconds: countdown.seconds ?? "–" })}
                    </span>
                  </motion.div>
                  <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${countdown.seconds != null && countdown.seconds <= 5 ? "bg-danger-ink" : "bg-ink-gold"}`}
                      style={{ width: `${countdown.fraction * 100}%` }}
                    />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {t("play.buzzer.answerOutLoud")}
                  </p>
                </div>
              ) : locked ? (
                <StatusCard
                  icon={<Ban className="h-10 w-10 text-danger-ink" />}
                  title={t("play.buzzer.lockedOutTitle")}
                >
                  {t("play.buzzer.lockedOutBody")}
                </StatusCard>
              ) : myEntry ? (
                <div className="flex flex-col items-center">
                  <div className="flex aspect-square w-[min(72vw,16rem)] flex-col items-center justify-center bg-lilac elev-2 scallop">
                    <span className="font-display text-lg font-bold text-muted-foreground">
                      {t("play.buzzer.inLine")}
                    </span>
                    <span className="font-display text-6xl font-black text-ink-gold">
                      {t("play.buzzer.position", { position: myPosition })}
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{t("play.buzzer.lockedIn")}</p>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  /*
                   * Parte alla PRESSIONE, non al rilascio. La coda la decide l'ordine
                   * di arrivo al server, e fra il momento in cui il dito tocca e quello
                   * in cui si stacca passano decimi interi: con `onClick` chi preme per
                   * primo ma tiene giù il dito perde il punto contro chi tocca e molla.
                   */
                  onPointerDown={(e) => {
                    // Solo il pulsante principale: col destro si apre un menu, non si prenota.
                    if (e.button !== 0) return;
                    void doBuzz();
                  }}
                  /* La tastiera non emette pointerdown: Invio e Spazio restano la via. */
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void doBuzz();
                    }
                  }}
                  disabled={!buzzerLive}
                  className={`flex aspect-square w-[min(78vw,20rem)] touch-manipulation select-none flex-col items-center justify-center rounded-full font-display elev-3 transition-[filter,background-color] duration-75 active:brightness-95 disabled:opacity-60 ${
                    myTeam === "alpha" ? "bg-team-alpha" : "bg-team-bravo"
                  }`}
                >
                  <Zap className="mb-1 h-12 w-12 text-foreground" />
                  <span className="text-4xl font-black tracking-tight text-foreground">
                    {t("play.buzzer.buzz")}
                  </span>
                </motion.button>
              )}
            </motion.div>
          )}

          {status === "live" && phase === "reveal" && (
            <StatusCard key="reveal" icon={<Check2 />} title={t("play.reveal.title")}>
              {t("play.reveal.body")}
            </StatusCard>
          )}

          {(status === "final" || phase === "final_wager" || phase === "final_answer") &&
            status !== "finished" && (
              <FinalForm
                key="final"
                session={session!}
                identity={identity}
                myTeam={myTeam}
                theme={theme}
              />
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
                {(session?.score_alpha ?? 0) === (session?.score_bravo ?? 0)
                  ? t("play.finished.tie")
                  : t("play.finished.wins", {
                      team: teamName(
                        theme,
                        (session?.score_alpha ?? 0) > (session?.score_bravo ?? 0)
                          ? "alpha"
                          : "bravo",
                      ),
                    })}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t.rich(
                  "play.finished.yourTeamScored",
                  { score: myScore ?? 0 },
                  { b: (chunk) => <span className="font-bold text-ink-gold">{chunk}</span> },
                )}
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
  const t = useT();
  const [wager, setWager] = useState(0);
  const [answer, setAnswer] = useState("");
  const [sent, setSent] = useState(false);
  const maxWager = Math.max(0, myTeam === "alpha" ? session.score_alpha : session.score_bravo);

  if (sent) {
    return (
      <StatusCard
        icon={<Hourglass className="h-10 w-10 text-ink-gold" />}
        title={t("play.final.sentTitle")}
      >
        {t("play.final.sentBody")}
      </StatusCard>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <h2 className="mb-1 text-center font-display text-2xl font-black text-ink-gold">
        {t("play.final.title")}
      </h2>
      <p className="mb-5 text-center text-xs text-muted-foreground">
        {t("play.final.rules", { team: teamName(theme, myTeam), max: maxWager })}
      </p>
      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-semibold text-muted-foreground">
          {t("play.final.wager")}
        </span>
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
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">
            {session.final_question}
          </span>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t("play.final.answerPlaceholder")}
            rows={3}
            className="w-full rounded-[26px] bg-muted p-4 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent"
          />
        </label>
      )}
      <motion.button
        whileTap={{ scale: 0.96 }}
        disabled={session.phase === "final_answer" && !answer.trim()}
        onClick={async () => {
          const res = await submitFinalAnswer({
            data: {
              playerId: identity.playerId,
              token: identity.token,
              wager,
              answer: answer.trim(),
            },
          });
          if (res.ok) {
            vibrate([40, 40, 40]);
            setSent(true);
          } else {
            toast.error(t("play.final.rejected"));
          }
        }}
        className="h-14 w-full rounded-full bg-coral font-display text-lg font-black text-foreground elev-2 disabled:opacity-40"
      >
        {session.phase === "final_wager"
          ? t("play.final.lockInWager")
          : t("play.final.submitAnswer")}
      </motion.button>
    </motion.div>
  );
}

/* --------------------------------- Pieces --------------------------------- */

function TeamScore({
  team,
  name,
  score,
  mine,
}: {
  team: Team;
  name: string;
  score: number;
  mine: boolean;
}) {
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

function StatusCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
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

function Shell({ children, title }: { children: React.ReactNode; title?: string | undefined }) {
  return (
    // Centred when there is room, scrollable (never clipped) when there is not,
    // so a short landscape viewport or an open keyboard keeps the button reachable.
    <div className="relative flex min-h-[100svh] flex-col text-foreground">
      {/*
       * Anche il telefono ha la barra. Prima c'era solo un ingranaggio
       * galleggiante a 12 pixel dal bordo, con un'ombra sua, sopra il
       * contenuto: l'unica pagina dell'app senza una testata. Ora le
       * impostazioni stanno nel cerchio in alto a destra, dove sta l'avatar
       * sulle altre pagine.
       */}
      <AppBar
        sticky
        left={
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-butter scallop">
            <Zap className="h-5 w-5 text-ink-gold" />
          </span>
        }
        center={
          title ? (
            <span className="truncate font-display text-lg font-semibold tracking-tight">
              {title}
            </span>
          ) : null
        }
        right={<GuestSettingsButton />}
      />
      <div className="flex flex-1 items-center justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <div className="w-full max-w-md lg:max-w-xl">{children}</div>
      </div>
    </div>
  );
}
