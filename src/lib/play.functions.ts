import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient } from "@/lib/public-client.server";

/**
 * Colonne di `sessions` visibili al pubblico. Enumerate a mano di proposito:
 * `select("*")` spedirebbe ai telefoni dei giocatori `final_answer` (la
 * soluzione del Final Jeopardy) e `daily_double_tile_ids` (quali caselle
 * nascondono un Daily Double). Il ruolo anon non ha più il permesso di
 * leggere quelle due colonne, quindi un `*` fallirebbe comunque.
 */
const PUBLIC_SESSION_COLUMNS =
  "id, game_id, host_id, status, phase, current_tile_id, active_player_id, timer_ends_at, timer_seconds, score_alpha, score_bravo, used_tile_ids, dd_wager, created_at, updated_at";

/** Colonne di `players` visibili al pubblico: tutte tranne `secret`. */
const PUBLIC_PLAYER_COLUMNS = "id, session_id, name, avatar, team, locked_out, created_at";

/** Le funzioni SECURITY DEFINER restituiscono jsonb: qui lo si legge in sicurezza. */
function readRpcResult(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Public: look up an active session by the game's join code. */
export const lookupSession = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ code: z.string().trim().min(4).max(10) }).parse(data))
  .handler(async ({ data }) => {
    const client = createPublicClient();
    const code = data.code.toUpperCase();
    const { data: game } = await client
      .from("games")
      .select("id, title, join_code, theme")
      .eq("join_code", code)
      .maybeSingle();
    if (!game) return { error: "not_found" as const };
    const { data: session } = await client
      .from("sessions")
      .select(PUBLIC_SESSION_COLUMNS)
      .eq("game_id", game.id)
      // "finished" incluso: senza, a partita conclusa la sessione spariva dai
      // telefoni e il podio non veniva mai mostrato.
      .in("status", ["lobby", "live", "final", "finished"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) return { error: "not_started" as const };
    return { game, session };
  });

/**
 * Public: join a live session as a contestant.
 *
 * Passa dalla funzione `join_session` perché anon non può più inserire
 * direttamente in `players`, e perché il segreto del giocatore va restituito
 * una sola volta, qui: è la credenziale che autorizza buzz e risposta finale.
 */
export const joinGame = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        code: z.string().trim().min(4).max(10),
        name: z.string().trim().min(1).max(20),
        avatar: z.string().min(1).max(8),
        team: z.enum(["alpha", "bravo"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const client = createPublicClient();
    const { data: raw, error } = await client.rpc("join_session", {
      p_code: data.code.toUpperCase(),
      p_name: data.name,
      p_avatar: data.avatar,
      p_team: data.team,
    });
    if (error) return { error: "join_failed" as const, message: error.message };

    const res = readRpcResult(raw);
    if (res["ok"] !== true) {
      const reason = String(res["reason"] ?? "join_failed");
      if (reason === "not_found") return { error: "not_found" as const };
      if (reason === "not_started") return { error: "not_started" as const };
      if (reason === "full") return { error: "full" as const };
      if (reason === "closed") return { error: "closed" as const };
      return { error: "join_failed" as const, message: reason };
    }

    return {
      player: {
        id: String(res["player_id"]),
        session_id: String(res["session_id"]),
        name: String(res["name"]),
        avatar: String(res["avatar"]),
        team: String(res["team"]),
      },
      /** Da conservare sul dispositivo del giocatore: autorizza le sue scritture. */
      secret: String(res["secret"]),
      sessionId: String(res["session_id"]),
      gameTitle: String(res["game_title"] ?? ""),
    };
  });

/**
 * Public: snapshot for OBS browser-source overlays (board/queue/combined).
 * Deliberately omits question/answer/hint text — overlays only ever render
 * points, categories, scores and the buzzer queue.
 */
export const getObsState = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ code: z.string().trim().min(4).max(10) }).parse(data))
  .handler(async ({ data }) => {
    const client = createPublicClient();
    const code = data.code.toUpperCase();
    const { data: game } = await client
      .from("games")
      .select("id, title, join_code, theme")
      .eq("join_code", code)
      .maybeSingle();
    if (!game) return { error: "not_found" as const };
    const { data: session } = await client
      .from("sessions")
      .select(PUBLIC_SESSION_COLUMNS)
      .eq("game_id", game.id)
      // "finished" incluso: senza, a partita conclusa la sessione spariva dai
      // telefoni e il podio non veniva mai mostrato.
      .in("status", ["lobby", "live", "final", "finished"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) return { error: "not_started" as const };
    const sessionId = (session as unknown as { id: string }).id;
    const { data: categories } = await client
      .from("categories")
      .select("id, game_id, title, position")
      .eq("game_id", game.id)
      .order("position");
    // Security-definer RPC: returns points/positions only, never question/answer/hint text.
    const { data: tiles } = await client.rpc("get_public_tile_points", { p_join_code: code });
    const { data: players } = await client
      .from("players")
      .select(PUBLIC_PLAYER_COLUMNS)
      .eq("session_id", sessionId)
      .order("created_at");
    const { data: queue } = await client
      .from("buzzer_queue")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at");
    return {
      game,
      session,
      categories: categories ?? [],
      tiles: tiles ?? [],
      players: players ?? [],
      queue: queue ?? [],
    };
  });

/** Public: snapshot for a player's view (initial load; realtime takes over after). */
export const getPlayerState = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const client = createPublicClient();
    const { data: session } = await client
      .from("sessions")
      .select(PUBLIC_SESSION_COLUMNS)
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session) return { error: "not_found" as const };
    const { data: players } = await client
      .from("players")
      .select(PUBLIC_PLAYER_COLUMNS)
      .eq("session_id", data.sessionId)
      .order("created_at");
    const { data: queue } = await client
      .from("buzzer_queue")
      .select("*")
      .eq("session_id", data.sessionId)
      .order("created_at");

    /*
     * La domanda finale non è fra le colonne leggibili da anon: la funzione
     * `get_final_question` la restituisce solo quando l'host l'ha davvero
     * rivelata (fase `final_answer`). Prima era leggibile già in fase di
     * puntata, quindi si poteva scommettere conoscendola in anticipo.
     */
    const { data: finalQuestion } = await client.rpc("get_final_question", {
      p_session_id: data.sessionId,
    });

    return {
      session: { ...(session as Record<string, unknown>), final_question: finalQuestion ?? null },
      players: players ?? [],
      queue: queue ?? [],
    };
  });

/**
 * Public: slam the buzzer.
 *
 * Il segreto del giocatore è obbligatorio: senza, chiunque conoscesse un
 * playerId (pubblico) poteva far buzzare un avversario e farlo penalizzare.
 * L'inserimento avviene dentro `buzz_in`, che replica i controlli della
 * vecchia policy RLS; il trigger `on_buzz` continua a promuovere il primo.
 */
export const buzz = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ playerId: z.string().uuid(), secret: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const client = createPublicClient();
    const { data: raw, error } = await client.rpc("buzz_in", {
      p_player_id: data.playerId,
      p_secret: data.secret,
    });
    if (error) return { ok: false as const, reason: "rejected" as const, message: error.message };

    const res = readRpcResult(raw);
    if (res["ok"] !== true) {
      return { ok: false as const, reason: String(res["reason"] ?? "rejected") };
    }
    return {
      ok: true as const,
      position: Number(res["position"] ?? 0),
      active: res["active"] === true,
    };
  });

/**
 * Public: submit a Final Jeopardy wager / answer for the player's team.
 *
 * La squadra non arriva più dal client: è quella del giocatore identificato
 * dal segreto, così non si può sovrascrivere la riga della squadra avversaria.
 */
export const submitFinalAnswer = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        playerId: z.string().uuid(),
        secret: z.string().uuid(),
        wager: z.number().int().min(0).max(100000),
        answer: z.string().max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const client = createPublicClient();
    const { data: raw, error } = await client.rpc("submit_final", {
      p_player_id: data.playerId,
      p_secret: data.secret,
      p_wager: data.wager,
      p_answer: data.answer,
    });
    if (error) return { ok: false as const, reason: "rejected" as const, message: error.message };

    const res = readRpcResult(raw);
    if (res["ok"] !== true) {
      return { ok: false as const, reason: String(res["reason"] ?? "rejected") };
    }
    return { ok: true as const };
  });
