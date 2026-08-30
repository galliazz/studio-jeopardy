import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clampTimerSeconds, shuffleIds, timerEnd } from "@/lib/sessions.server";

/** Starts a fresh live session for a game. Picks Daily Double tiles. */
export const startSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        gameId: z.string().uuid(),
        /** Preferenza dell'host, dal pannello Impostazioni. */
        timerSeconds: z.number().int().min(5).max(120).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: game, error: gErr } = await supabase.from("games").select("*").eq("id", data.gameId).single();
    if (gErr) throw new Error(gErr.message);

    const { error: finishErr } = await supabase
      .from("sessions")
      .update({ status: "finished", phase: "idle", current_tile_id: null, active_player_id: null, timer_ends_at: null })
      .eq("game_id", data.gameId)
      .in("status", ["lobby", "live", "final"]);
    if (finishErr) throw new Error(finishErr.message);

    const { data: categories } = await supabase.from("categories").select("id").eq("game_id", data.gameId);
    const catIds = (categories ?? []).map((c) => c.id);
    const { data: tiles } = catIds.length
      ? await supabase.from("tiles").select("id").in("category_id", catIds)
      : { data: [] };
    const dailyDoubles = shuffleIds((tiles ?? []).map((t) => t.id)).slice(0, Math.min(2, tiles?.length ?? 0));

    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        game_id: data.gameId,
        host_id: userId,
        status: "lobby",
        phase: "idle",
        current_tile_id: null,
        active_player_id: null,
        timer_ends_at: null,
        timer_seconds: clampTimerSeconds(data.timerSeconds),
        score_alpha: 0,
        score_bravo: 0,
        used_tile_ids: [],
        daily_double_tile_ids: dailyDoubles,
        dd_wager: null,
        final_question: null,
        final_answer: null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { session, game };
  });

/** Full host-side snapshot of a session: session, game, board, players, queue, final answers. */
export const getHostState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: session, error } = await supabase.from("sessions").select("*").eq("id", data.sessionId).single();
    if (error) throw new Error(error.message);
    const { data: game } = await supabase.from("games").select("*").eq("id", session.game_id).single();
    const { data: categories } = await supabase
      .from("categories")
      .select("*")
      .eq("game_id", session.game_id)
      .order("position");
    const catIds = (categories ?? []).map((c) => c.id);
    const { data: tiles } = catIds.length
      ? await supabase.from("tiles").select("*").in("category_id", catIds)
      : { data: [] };
    // Colonne esplicite: `players.secret` è la credenziale dei giocatori e non
    // deve raggiungere nemmeno il browser dell'host.
    const { data: players } = await supabase
      .from("players")
      .select("id, session_id, name, avatar, team, locked_out, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at");
    const { data: queue } = await supabase
      .from("buzzer_queue")
      .select("*")
      .eq("session_id", data.sessionId)
      .order("created_at");
    const { data: finalAnswers } = await supabase
      .from("final_answers")
      .select("*")
      .eq("session_id", data.sessionId);
    return {
      session,
      game,
      categories: categories ?? [],
      tiles: tiles ?? [],
      players: players ?? [],
      queue: queue ?? [],
      finalAnswers: finalAnswers ?? [],
    };
  });

/** Opens a tile for play. Daily Double tiles enter the wager phase first. */
export const openTile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ sessionId: z.string().uuid(), tileId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: session, error } = await supabase.from("sessions").select("*").eq("id", data.sessionId).single();
    if (error) throw new Error(error.message);
    if (session.status === "finished") throw new Error("Session already finished");
    const isDD = (session.daily_double_tile_ids as string[]).includes(data.tileId);
    const { error: uErr } = await supabase
      .from("sessions")
      .update({
        status: "live",
        current_tile_id: data.tileId,
        phase: isDD ? "daily_double_wager" : "question_open",
        active_player_id: null,
        timer_ends_at: null,
        dd_wager: null,
      })
      .eq("id", data.sessionId);
    if (uErr) throw new Error(uErr.message);
    if (!isDD) {
      await supabase.from("players").update({ locked_out: false }).eq("session_id", data.sessionId);
    }
    return { dailyDouble: isDD };
  });

/** Locks in a Daily Double wager and hands the question to one player. */
export const startDailyDouble = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        sessionId: z.string().uuid(),
        playerId: z.string().uuid(),
        wager: z.number().int().min(1).max(100000),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: session } = await supabase
      .from("sessions")
      .select("timer_seconds")
      .eq("id", data.sessionId)
      .maybeSingle();
    const { error } = await supabase
      .from("sessions")
      .update({
        phase: "answering",
        active_player_id: data.playerId,
        dd_wager: data.wager,
        timer_ends_at: timerEnd(session?.timer_seconds),
      })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Judges the active answer. Correct: +value, reveal. Wrong: -(value / 2)
 * (full wager on Daily Doubles), lock the player out, promote the next buzzer.
 */
export const judgeAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        sessionId: z.string().uuid(),
        correct: z.boolean(),
        /**
         * Giocatore che l'host aveva davanti quando ha premuto. Obbligatorio:
         * dopo un "Wrong" il server promuove subito il successivo in coda, e
         * senza questo controllo un secondo click penalizzerebbe lui.
         */
        expectedPlayerId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: session, error } = await supabase.from("sessions").select("*").eq("id", data.sessionId).single();
    if (error) throw new Error(error.message);
    if (!session.current_tile_id || !session.active_player_id) throw new Error("No active answer to judge");
    if (session.active_player_id !== data.expectedPlayerId) {
      throw new Error("The active player changed — nothing was judged");
    }

    const { data: tile } = await supabase.from("tiles").select("*").eq("id", session.current_tile_id).single();
    const { data: player } = await supabase
      .from("players")
      .select("id, session_id, name, avatar, team, locked_out, created_at")
      .eq("id", session.active_player_id)
      .single();
    if (!tile || !player) throw new Error("Missing tile or player");

    // Guard against double-judging: there must be an active queue row.
    const { data: activeRow } = await supabase
      .from("buzzer_queue")
      .select("id")
      .eq("session_id", data.sessionId)
      .eq("tile_id", session.current_tile_id)
      .eq("player_id", session.active_player_id)
      .eq("status", "active")
      .maybeSingle();
    if (!activeRow && session.dd_wager == null) throw new Error("Already judged");

    const isDD = session.dd_wager != null;
    const value = session.dd_wager ?? tile.points;
    const delta = data.correct ? value : -(isDD ? value : Math.round(value / 2));
    const teamCol = player.team === "alpha" ? "score_alpha" : "score_bravo";
    const newScore = (teamCol === "score_alpha" ? session.score_alpha : session.score_bravo) + delta;

    if (isDD) {
      /*
       * Un Daily Double non passa dai buzzer, quindi non esiste una riga di
       * coda da aggiornare: senza crearla, i suoi punti restavano invisibili
       * al grafico Analytics, che contraddiceva il tabellone.
       */
      await supabase.from("buzzer_queue").upsert(
        {
          session_id: data.sessionId,
          tile_id: session.current_tile_id,
          player_id: session.active_player_id,
          status: data.correct ? "correct" : "wrong",
          judged_at: new Date().toISOString(),
          delta,
        },
        { onConflict: "session_id,tile_id,player_id" },
      );
    }

    await supabase
      .from("buzzer_queue")
      .update({
        status: data.correct ? "correct" : "wrong",
        judged_at: new Date().toISOString(),
        // Valore realmente applicato: comprende la puntata dei Daily Double.
        delta,
      })
      .eq("session_id", data.sessionId)
      .eq("tile_id", session.current_tile_id)
      .eq("player_id", session.active_player_id)
      .eq("status", "active");

    if (data.correct) {
      await supabase
        .from("buzzer_queue")
        .update({ status: "cleared", judged_at: new Date().toISOString() })
        .eq("session_id", data.sessionId)
        .eq("tile_id", session.current_tile_id)
        .eq("status", "queued");
      const { error: sErr } = await supabase
        .from("sessions")
        .update({
          phase: "reveal",
          dd_wager: null,
          timer_ends_at: null,
          ...(teamCol === "score_alpha" ? { score_alpha: newScore } : { score_bravo: newScore }),
        })
        .eq("id", data.sessionId);
      if (sErr) throw new Error(sErr.message);
      return { outcome: "correct" as const, delta };
    }

    await supabase.from("players").update({ locked_out: true }).eq("id", player.id);

    // Daily Doubles have no queue to promote — straight to reveal.
    if (isDD) {
      const { error: sErr } = await supabase
        .from("sessions")
        .update({
          phase: "reveal",
          dd_wager: null,
          timer_ends_at: null,
          ...(teamCol === "score_alpha" ? { score_alpha: newScore } : { score_bravo: newScore }),
        })
        .eq("id", data.sessionId);
      if (sErr) throw new Error(sErr.message);
      return { outcome: "dd_wrong" as const, delta };
    }

    const { data: queued } = await supabase
      .from("buzzer_queue")
      .select("*")
      .eq("session_id", data.sessionId)
      .eq("tile_id", session.current_tile_id)
      .eq("status", "queued")
      .order("created_at");
    let nextPlayerId: string | null = null;
    for (const entry of queued ?? []) {
      const { data: p } = await supabase.from("players").select("locked_out").eq("id", entry.player_id).single();
      if (p && !p.locked_out) {
        await supabase.from("buzzer_queue").update({ status: "active" }).eq("id", entry.id);
        nextPlayerId = entry.player_id;
        break;
      }
    }

    const { error: sErr } = await supabase
      .from("sessions")
      .update({
        ...(teamCol === "score_alpha" ? { score_alpha: newScore } : { score_bravo: newScore }),
        ...(nextPlayerId
          ? {
              phase: "answering" as const,
              active_player_id: nextPlayerId,
              timer_ends_at: timerEnd(session.timer_seconds),
            }
          : { phase: "question_open" as const, active_player_id: null, timer_ends_at: null }),
      })
      .eq("id", data.sessionId);
    if (sErr) throw new Error(sErr.message);
    return { outcome: nextPlayerId ? ("promoted" as const) : ("reopened" as const), delta };
  });

/** Reveals the answer text while a question is open or being answered. */
export const revealAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("sessions")
      .update({ phase: "reveal", timer_ends_at: null })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Closes the current tile: marks it used, clears the queue, unlocks everyone. */
export const closeTile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: session, error } = await supabase.from("sessions").select("*").eq("id", data.sessionId).single();
    if (error) throw new Error(error.message);
    const tileId = session.current_tile_id;
    const used = new Set(session.used_tile_ids as string[]);
    if (tileId) {
      used.add(tileId);
      await supabase
        .from("buzzer_queue")
        .update({ status: "cleared", judged_at: new Date().toISOString() })
        .eq("session_id", data.sessionId)
        .eq("tile_id", tileId)
        .in("status", ["queued", "active"]);
    }
    await supabase.from("players").update({ locked_out: false }).eq("session_id", data.sessionId);
    const usedArr = [...used];
    const { error: uErr } = await supabase
      .from("sessions")
      .update({
        current_tile_id: null,
        phase: "idle",
        timer_ends_at: null,
        active_player_id: null,
        dd_wager: null,
        used_tile_ids: usedArr,
      })
      .eq("id", data.sessionId);
    if (uErr) throw new Error(uErr.message);
    return { remaining: 25 - usedArr.length };
  });

/** Void the current buzzer queue and re-open buzzers on the same tile. */
export const clearQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: session, error } = await supabase.from("sessions").select("*").eq("id", data.sessionId).single();
    if (error) throw new Error(error.message);
    if (session.current_tile_id) {
      // Le righe vanno CANCELLATE, non marcate: `unique (session_id, tile_id,
      // player_id)` impedirebbe altrimenti a chi ha già buzzato di rientrare,
      // rendendo la casella ingiocabile proprio per chi era stato più veloce.
      /*
       * TUTTE le righe della casella, non solo quelle in attesa: chi era già
       * stato giudicato conserva una riga 'wrong' o 'correct', e il vincolo di
       * unicità gli impedirebbe comunque di ripremere. Filtrare per stato
       * lasciava fuori proprio i giocatori che l'host vuole rimettere in gioco.
       */
      await supabase
        .from("buzzer_queue")
        .delete()
        .eq("session_id", data.sessionId)
        .eq("tile_id", session.current_tile_id);
    }
    // Riaprire i buzzer senza sbloccare chi era stato giudicato male non li
    // riapre davvero: quei giocatori resterebbero esclusi dalla casella.
    await supabase.from("players").update({ locked_out: false }).eq("session_id", data.sessionId);
    const { error: uErr } = await supabase
      .from("sessions")
      .update({
        phase: "question_open",
        active_player_id: null,
        timer_ends_at: null,
        // Senza azzerarla, una coda ripulita durante un Daily Double lasciava
        // la puntata impostata e il controllo lato database rifiutava ogni
        // buzz: la casella diventava impremibile per tutti.
        dd_wager: null,
      })
      .eq("id", data.sessionId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

/** Full board reset: zero scores, new Daily Doubles, fresh queue. */
export const resetBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: session, error } = await supabase.from("sessions").select("*").eq("id", data.sessionId).single();
    if (error) throw new Error(error.message);
    const { data: categories } = await supabase.from("categories").select("id").eq("game_id", session.game_id);
    const catIds = (categories ?? []).map((c) => c.id);
    const { data: tiles } = catIds.length
      ? await supabase.from("tiles").select("id").in("category_id", catIds)
      : { data: [] };
    const dailyDoubles = shuffleIds((tiles ?? []).map((t) => t.id)).slice(0, Math.min(2, tiles?.length ?? 0));

    await supabase.from("buzzer_queue").delete().eq("session_id", data.sessionId);
    await supabase.from("final_answers").delete().eq("session_id", data.sessionId);
    await supabase.from("players").update({ locked_out: false }).eq("session_id", data.sessionId);
    const { error: uErr } = await supabase
      .from("sessions")
      .update({
        status: "live",
        phase: "idle",
        current_tile_id: null,
        active_player_id: null,
        timer_ends_at: null,
        score_alpha: 0,
        score_bravo: 0,
        used_tile_ids: [],
        daily_double_tile_ids: dailyDoubles,
        dd_wager: null,
        final_question: null,
        final_answer: null,
      })
      .eq("id", data.sessionId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

/** Choose which tiles are Daily Doubles (max 2). */
export const setDailyDoubles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ sessionId: z.string().uuid(), tileIds: z.array(z.string().uuid()).max(2) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("sessions")
      .update({ daily_double_tile_ids: data.tileIds })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Enter Final Jeopardy: collect wagers first. */
export const startFinal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ sessionId: z.string().uuid(), question: z.string().min(1).max(4000), answer: z.string().max(2000) })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("sessions")
      .update({
        status: "final",
        phase: "final_wager",
        final_question: data.question,
        final_answer: data.answer,
        current_tile_id: null,
        active_player_id: null,
        timer_ends_at: null,
      })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Reveal the Final Jeopardy question; teams submit their answers. */
export const beginFinalAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("sessions")
      .update({ phase: "final_answer" })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Judge one team's Final Jeopardy answer; ends the game when both are judged. */
export const judgeFinal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ sessionId: z.string().uuid(), team: z.enum(["alpha", "bravo"]), correct: z.boolean() })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: session, error } = await supabase.from("sessions").select("*").eq("id", data.sessionId).single();
    if (error) throw new Error(error.message);
    const { data: entry } = await supabase
      .from("final_answers")
      .select("*")
      .eq("session_id", data.sessionId)
      .eq("team", data.team)
      .maybeSingle();
    if (!entry) throw new Error("This team has no final answer to judge");
    if (entry.judged !== null) return { ok: true, finished: false, alreadyJudged: true };

    /*
     * Aggiornamento condizionale: `.is("judged", null)` fa sì che di due click
     * ravvicinati solo il primo trovi la riga ancora da giudicare. Senza questo,
     * il secondo click accreditava la puntata una seconda volta e decideva la
     * partita.
     */
    const { data: claimed } = await supabase
      .from("final_answers")
      .update({ judged: data.correct })
      .eq("id", entry.id)
      .is("judged", null)
      .select("id");
    if (!claimed || claimed.length === 0) {
      return { ok: true, finished: false, alreadyJudged: true };
    }

    const wager = entry.wager ?? 0;
    const delta = data.correct ? wager : -wager;
    const newScore = (data.team === "alpha" ? session.score_alpha : session.score_bravo) + delta;
    const { data: others } = await supabase
      .from("final_answers")
      .select("judged")
      .eq("session_id", data.sessionId)
      .neq("team", data.team);
    const otherJudged = (others ?? []).every((o) => o.judged !== null) && (others ?? []).length > 0;
    const { error: uErr } = await supabase
      .from("sessions")
      .update({
        ...(data.team === "alpha" ? { score_alpha: newScore } : { score_bravo: newScore }),
        ...(otherJudged ? { status: "finished" as const, phase: "idle" as const } : {}),
      })
      .eq("id", data.sessionId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true, finished: otherJudged };
  });

/** End the session outright (skip Final Jeopardy). */
export const finishSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("sessions")
      .update({ status: "finished", phase: "idle", timer_ends_at: null })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
