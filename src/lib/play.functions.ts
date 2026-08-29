import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient } from "@/lib/public-client.server";

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
      .select("*")
      .eq("game_id", game.id)
      .in("status", ["lobby", "live", "final"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) return { error: "not_started" as const };
    return { game, session };
  });

/** Public: join a live session as a contestant. */
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
    const code = data.code.toUpperCase();
    const { data: game } = await client
      .from("games")
      .select("id, title")
      .eq("join_code", code)
      .maybeSingle();
    if (!game) return { error: "not_found" as const };
    const { data: session } = await client
      .from("sessions")
      .select("*")
      .eq("game_id", game.id)
      .in("status", ["lobby", "live", "final"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) return { error: "not_started" as const };

    const { data: player, error } = await client
      .from("players")
      .insert({ session_id: session.id, name: data.name, avatar: data.avatar, team: data.team })
      .select()
      .single();
    if (error) return { error: "join_failed" as const, message: error.message };
    return { player, session, gameTitle: game.title };
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
      .select("*")
      .eq("game_id", game.id)
      .in("status", ["lobby", "live", "final"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) return { error: "not_started" as const };
    const { data: categories } = await client
      .from("categories")
      .select("id, game_id, title, position")
      .eq("game_id", game.id)
      .order("position");
    // Security-definer RPC: returns points/positions only, never question/answer/hint text.
    const { data: tiles } = await client.rpc("get_public_tile_points", { p_join_code: code });
    const { data: players } = await client
      .from("players")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at");
    const { data: queue } = await client
      .from("buzzer_queue")
      .select("*")
      .eq("session_id", session.id)
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
    const { data: session } = await client.from("sessions").select("*").eq("id", data.sessionId).single();
    if (!session) return { error: "not_found" as const };
    const { data: players } = await client
      .from("players")
      .select("*")
      .eq("session_id", data.sessionId)
      .order("created_at");
    const { data: queue } = await client
      .from("buzzer_queue")
      .select("*")
      .eq("session_id", data.sessionId)
      .order("created_at");
    return { session, players: players ?? [], queue: queue ?? [] };
  });

/** Public: slam the buzzer. The DB trigger promotes the first buzzer instantly. */
export const buzz = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ playerId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const client = createPublicClient();
    const { data: player } = await client.from("players").select("*").eq("id", data.playerId).maybeSingle();
    if (!player) return { ok: false as const, reason: "no_player" as const };
    const { data: session } = await client.from("sessions").select("*").eq("id", player.session_id).single();
    if (!session) return { ok: false as const, reason: "no_session" as const };
    if (session.status !== "live" || !session.current_tile_id) {
      return { ok: false as const, reason: "closed" as const };
    }
    if (session.phase !== "question_open" && session.phase !== "answering") {
      return { ok: false as const, reason: "closed" as const };
    }
    const tileId = session.current_tile_id;

    const { error } = await client.from("buzzer_queue").insert({
      session_id: session.id,
      tile_id: tileId,
      player_id: player.id,
    });
    if (error && error.code !== "23505") {
      return { ok: false as const, reason: "rejected" as const, message: error.message };
    }

    const { data: rows } = await client
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

/** Public: submit a Final Jeopardy wager / answer for the player's team. */
export const submitFinalAnswer = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        playerId: z.string().uuid(),
        wager: z.number().int().min(0).max(100000),
        answer: z.string().max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const client = createPublicClient();
    const { data: player } = await client.from("players").select("*").eq("id", data.playerId).maybeSingle();
    if (!player) return { ok: false as const, reason: "no_player" as const };
    const { data: session } = await client.from("sessions").select("*").eq("id", player.session_id).single();
    if (!session || session.status !== "final") return { ok: false as const, reason: "closed" as const };
    if (session.phase !== "final_wager" && session.phase !== "final_answer") {
      return { ok: false as const, reason: "closed" as const };
    }
    const { error } = await client
      .from("final_answers")
      .upsert(
        { session_id: session.id, team: player.team, wager: data.wager, answer: data.answer },
        { onConflict: "session_id,team" },
      );
    if (error) return { ok: false as const, reason: "rejected" as const, message: error.message };
    return { ok: true as const };
  });
