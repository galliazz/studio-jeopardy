import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient } from "@/lib/public-client.server";

/** Columns of `sessions` that are safe to hand to a guest device. */
const SESSION_PUBLIC_COLS =
  "id, game_id, host_id, status, phase, current_tile_id, active_player_id, timer_ends_at, score_alpha, score_bravo, used_tile_ids, daily_double_tile_ids, dd_wager, created_at, updated_at";
/** Columns of `players` that are safe to hand to a guest device. */
const PLAYER_PUBLIC_COLS = "id, session_id, name, avatar, team, locked_out, created_at";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Resolves a player only when the caller proves ownership with the token issued
 * at join time. Il token vive in `player_secrets`, non più su `players`: finché
 * stava lì, gli ospiti potevano leggere la tabella solo a colonne scelte, e con
 * un permesso parziale Supabase Realtime non consegna alcun evento.
 */
async function authenticatePlayer(playerId: string, token: string) {
  const db = await admin();
  const { data: secret } = await db
    .from("player_secrets")
    .select("player_id")
    .eq("player_id", playerId)
    .eq("player_token", token)
    .maybeSingle();
  if (!secret) return null;
  const { data } = await db
    .from("players")
    .select("id, session_id, team, locked_out")
    .eq("id", playerId)
    .maybeSingle();
  return data ?? null;
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
      .select(SESSION_PUBLIC_COLS)
      .eq("game_id", game.id)
      .in("status", ["lobby", "live", "final"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) return { error: "not_started" as const };
    return { game, session };
  });

/** Public: join a live session as a contestant. Returns a private token bound to the new player. */
export const joinGame = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        code: z.string().trim().min(4).max(10),
        name: z.string().trim().min(2).max(25),
        avatar: z.string().min(1).max(8),
        team: z.enum(["alpha", "bravo"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const client = createPublicClient();
    const code = data.code.toUpperCase();
    const { data: game } = await client
      .from("games")
      .select("id, title")
      .eq("join_code", code)
      .maybeSingle();
    if (!game) return { error: "not_found" as const };
    const { data: session } = await client
      .from("sessions")
      .select(SESSION_PUBLIC_COLS)
      .eq("game_id", game.id)
      .in("status", ["lobby", "live", "final"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) return { error: "not_started" as const };
    if (session.status !== "lobby" && session.status !== "live") {
      return { error: "not_started" as const };
    }

    const db = await admin();
    const { data: player, error } = await db
      .from("players")
      .insert({ session_id: session.id, name: data.name, avatar: data.avatar, team: data.team })
      .select(PLAYER_PUBLIC_COLS)
      .single();
    if (error || !player) return { error: "join_failed" as const, message: error?.message ?? "join failed" };
    // Il token lo emette un trigger sull'insert; qui si legge soltanto.
    const { data: secret } = await db
      .from("player_secrets")
      .select("player_token")
      .eq("player_id", player.id)
      .maybeSingle();
    if (!secret) return { error: "join_failed" as const, message: "token not issued" };
    return { player, token: secret.player_token, session, gameTitle: game.title };
  });

/** Public: snapshot for a player's view (initial load; realtime takes over after). */
export const getPlayerState = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const client = createPublicClient();
    const { data: session } = await client
      .from("sessions")
      .select(SESSION_PUBLIC_COLS)
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session) return { error: "not_found" as const };
    const { data: players } = await client
      .from("players")
      .select(PLAYER_PUBLIC_COLS)
      .eq("session_id", data.sessionId)
      .order("created_at");
    const { data: queue } = await client
      .from("buzzer_queue")
      .select("*")
      .eq("session_id", data.sessionId)
      .order("created_at");
    /*
     * La domanda finale raggiunge i telefoni SOLO quando è ora di rispondere,
     * e la risposta non li raggiunge mai. Vive in `session_secrets`, che il
     * ruolo ospite non può leggere: qui la si preleva con la chiave di
     * servizio e si consegna solo nella fase giusta.
     */
    let finalQuestion: string | null = null;
    if (session.phase === "final_answer") {
      const db = await admin();
      const { data: secrets } = await db
        .from("session_secrets")
        .select("final_question")
        .eq("session_id", data.sessionId)
        .maybeSingle();
      finalQuestion = secrets?.final_question ?? null;
    }
    return { session: { ...session, final_question: finalQuestion }, players: players ?? [], queue: queue ?? [] };
  });

/** Public: slam the buzzer. Requires the player's private token; the DB trigger promotes the first buzzer. */
export const buzz = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ playerId: z.string().uuid(), token: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const player = await authenticatePlayer(data.playerId, data.token);
    if (!player) return { ok: false as const, reason: "no_player" as const };
    if (player.locked_out) return { ok: false as const, reason: "closed" as const };
    const db = await admin();
    const { data: session } = await db.from("sessions").select("*").eq("id", player.session_id).maybeSingle();
    if (!session) return { ok: false as const, reason: "no_session" as const };
    if (session.status !== "live" || !session.current_tile_id) {
      return { ok: false as const, reason: "closed" as const };
    }
    if (session.phase !== "question_open" && session.phase !== "answering") {
      return { ok: false as const, reason: "closed" as const };
    }
    const tileId = session.current_tile_id;

    const { error } = await db.from("buzzer_queue").insert({
      session_id: session.id,
      tile_id: tileId,
      player_id: player.id,
    });
    if (error && error.code !== "23505") {
      return { ok: false as const, reason: "rejected" as const };
    }

    const { data: rows } = await db
      .from("buzzer_queue")
      .select("*")
      .eq("session_id", session.id)
      .eq("tile_id", tileId)
      .in("status", ["queued", "active"])
      .order("created_at");
    const position = (rows ?? []).findIndex((r) => r.player_id === player.id) + 1;
    return {
      ok: true as const,
      position,
      active: session.active_player_id === player.id,
    };
  });

/** Public: submit a Final Jeopardy wager / answer for the authenticated player's own team. */
export const submitFinalAnswer = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        playerId: z.string().uuid(),
        token: z.string().uuid(),
        wager: z.number().int().min(0).max(100000),
        answer: z.string().max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const player = await authenticatePlayer(data.playerId, data.token);
    if (!player) return { ok: false as const, reason: "no_player" as const };
    const db = await admin();
    const { data: session } = await db.from("sessions").select("*").eq("id", player.session_id).maybeSingle();
    if (!session || session.status !== "final") return { ok: false as const, reason: "closed" as const };
    if (session.phase !== "final_wager" && session.phase !== "final_answer") {
      return { ok: false as const, reason: "closed" as const };
    }
    // Team is taken from the verified player row — never from client input.
    const { error } = await db
      .from("final_answers")
      .upsert(
        { session_id: session.id, team: player.team, wager: data.wager, answer: data.answer },
        { onConflict: "session_id,team" },
      );
    if (error) return { ok: false as const, reason: "rejected" as const };
    return { ok: true as const };
  });

/**
 * Public: token-scoped snapshot for the OBS mirror overlays.
 * The clue text ships only while a tile is open; the answer text ships only
 * once the host has revealed it. An unknown or rotated token returns null so
 * the overlay can render a fully transparent page.
 */
export const getOverlayState = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: game } = await db
      .from("games")
      .select("id, title, join_code, theme")
      .eq("overlay_token", data.token)
      .maybeSingle();
    if (!game) return null;

    const { data: session } = await db
      .from("sessions")
      .select(SESSION_PUBLIC_COLS)
      .eq("game_id", game.id)
      .in("status", ["lobby", "live", "final"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) return null;

    const { data: categories } = await db
      .from("categories")
      .select("id, game_id, title, position")
      .eq("game_id", game.id)
      .order("position");
    const catIds = (categories ?? []).map((c) => c.id);
    const { data: tiles } = catIds.length
      ? await db.from("tiles").select("id, category_id, row_index, points").in("category_id", catIds)
      : { data: [] };
    const { data: players } = await db
      .from("players")
      .select(PLAYER_PUBLIC_COLS)
      .eq("session_id", session.id)
      .order("created_at");
    const { data: queue } = await db
      .from("buzzer_queue")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at");

    let clue: { category: string; points: number; question: string; answer: string | null } | null = null;
    if (session.current_tile_id) {
      const { data: tile } = await db
        .from("tiles")
        .select("id, category_id, points, question, answer")
        .eq("id", session.current_tile_id)
        .maybeSingle();
      if (tile) {
        clue = {
          category: (categories ?? []).find((c) => c.id === tile.category_id)?.title ?? "",
          points: session.dd_wager ?? tile.points,
          question: tile.question,
          answer: session.phase === "reveal" ? tile.answer : null,
        };
      }
    }

    return {
      game,
      session,
      categories: categories ?? [],
      tiles: tiles ?? [],
      players: players ?? [],
      queue: queue ?? [],
      clue,
    };
  });
