import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { shuffleIds, timerEnd } from "@/lib/sessions.server";

/** Starts a fresh live session for a game. Picks Daily Double tiles. */
export const startSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ gameId: z.string().uuid() }).parse(data))
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
    const { data: players } = await supabase
      .from("players")
      .select("*")
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
    const { error } = await supabase
      .from("sessions")
      .update({
        phase: "answering",
        active_player_id: data.playerId,
        dd_wager: data.wager,
        timer_ends_at: timerEnd(),
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
         * senza questo controllo un secondo click — istintivo se l'app sembra
         * lenta — penalizzerebbe lui, che non ha nemmeno aperto bocca.
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
    // Fissati dopo la guardia: il restringimento di tipo su una proprietà non
    // sopravvive dentro una closure, e `markJudged` più sotto è una closure.
    const openTileId: string = session.current_tile_id;
    const judgedPlayerId: string = session.active_player_id;

    const { data: tile } = await supabase.from("tiles").select("*").eq("id", session.current_tile_id).single();
    const { data: player } = await supabase.from("players").select("*").eq("id", session.active_player_id).single();
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
    // Doppio click dell'host: già giudicato, non è un errore — nessun effetto.
    if (!activeRow && session.dd_wager == null) return { outcome: "noop" as const, delta: 0 };

    const isDD = session.dd_wager != null;
    const value = session.dd_wager ?? tile.points;
    const delta = data.correct ? value : -(isDD ? value : Math.round(value / 2));
    const teamCol = player.team === "alpha" ? "score_alpha" : "score_bravo";
    const newScore = (teamCol === "score_alpha" ? session.score_alpha : session.score_bravo) + delta;

    /*
     * Stesso ordine di `closeTile`: `sessions` PER PRIMA, poi coda e giocatori.
     * Ogni scrittura fa scattare un evento realtime che ricarica lo stato
     * dell'host; se la sessione fosse l'ultima, quelle ricariche tornerebbero
     * con la fase ancora precedente. E siccome la vista domanda è montata con
     * `key` che contiene la fase, un rimbalzo la smonta e la rimonta: animazione
     * da capo, timer che riappare, tick di troppo. È lo stesso sfarfallio della
     * casella che si chiudeva, su un percorso che l'host attraversa a ogni
     * giudizio.
     */
    const judgedAt = new Date().toISOString();
    const markJudged = () =>
      supabase
        .from("buzzer_queue")
        .update({ status: data.correct ? "correct" : "wrong", judged_at: judgedAt })
        .eq("session_id", data.sessionId)
        .eq("tile_id", openTileId)
        .eq("player_id", judgedPlayerId)
        .eq("status", "active");

    if (data.correct) {
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

      await markJudged();
      await supabase
        .from("buzzer_queue")
        .update({ status: "cleared", judged_at: judgedAt })
        .eq("session_id", data.sessionId)
        .eq("tile_id", session.current_tile_id)
        .eq("status", "queued");
      return { outcome: "correct" as const, delta };
    }

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

      await markJudged();
      await supabase.from("players").update({ locked_out: true }).eq("id", player.id);
      return { outcome: "dd_wrong" as const, delta };
    }

    /*
     * Chi tocca adesso si decide LEGGENDO soltanto: nessuna scrittura prima di
     * `sessions`, altrimenti si torna a far rimbalzare la fase.
     */
    const { data: queued } = await supabase
      .from("buzzer_queue")
      .select("*")
      .eq("session_id", data.sessionId)
      .eq("tile_id", session.current_tile_id)
      .eq("status", "queued")
      .order("created_at");
    let nextEntryId: string | null = null;
    let nextPlayerId: string | null = null;
    for (const entry of queued ?? []) {
      // Chi ha appena sbagliato non può essere ripescato dalla sua stessa coda.
      if (entry.player_id === judgedPlayerId) continue;
      const { data: p } = await supabase.from("players").select("locked_out").eq("id", entry.player_id).single();
      if (p && !p.locked_out) {
        nextEntryId = entry.id;
        nextPlayerId = entry.player_id;
        break;
      }
    }

    const { error: sErr } = await supabase
      .from("sessions")
      .update({
        ...(teamCol === "score_alpha" ? { score_alpha: newScore } : { score_bravo: newScore }),
        ...(nextPlayerId
          ? { phase: "answering" as const, active_player_id: nextPlayerId, timer_ends_at: timerEnd() }
          : { phase: "question_open" as const, active_player_id: null, timer_ends_at: null }),
      })
      .eq("id", data.sessionId);
    if (sErr) throw new Error(sErr.message);

    await markJudged();
    if (nextEntryId) await supabase.from("buzzer_queue").update({ status: "active" }).eq("id", nextEntryId);
    await supabase.from("players").update({ locked_out: true }).eq("id", player.id);
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
    if (tileId) used.add(tileId);
    const usedArr = [...used];

    /*
     * `sessions` PRIMA di tutto il resto. Ogni scrittura fa scattare un evento
     * realtime, e ogni evento invalida la query dell'host: se la sessione
     * fosse l'ultima a cambiare, il refetch innescato dalla coda tornerebbe con
     * `current_tile_id` ancora valorizzato e la casella appena chiusa si
     * riaprirebbe per un istante prima dell'aggiornamento finale.
     * `openTile` segue già quest'ordine, ed è il motivo per cui aprire non
     * sfarfalla mentre chiudere lo faceva.
     */
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

    if (tileId) {
      await supabase
        .from("buzzer_queue")
        .update({ status: "cleared", judged_at: new Date().toISOString() })
        .eq("session_id", data.sessionId)
        .eq("tile_id", tileId)
        .in("status", ["queued", "active"]);
    }
    await supabase.from("players").update({ locked_out: false }).eq("session_id", data.sessionId);
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
      /*
       * Le righe vanno CANCELLATE, non marcate. Il vincolo
       * `unique (session_id, tile_id, player_id)` impedisce altrimenti a chi ha
       * già premuto di rientrare: la casella resta ingiocabile proprio per chi
       * era stato più veloce. Si cancella tutto, comprese le righe già
       * giudicate, che altrimenti bloccherebbero allo stesso modo.
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
    /*
     * Qui `sessions` resta l'ULTIMA scrittura, al contrario di closeTile e
     * judgeAnswer: questa funzione serve a far ripremere tutti, e armare i
     * buzzer prima di aver cancellato la coda e sbloccato i giocatori
     * respingerebbe proprio chi si sta cercando di riammettere. Nessuna
     * modifica ottimistica corre contro di lei, quindi non sfarfalla.
     */
    const { error: uErr } = await supabase
      .from("sessions")
      // `dd_wager` va azzerato: se resta impostato, la casella è un Daily
      // Double a cui nessuno può più rispondere.
      .update({ phase: "question_open", active_player_id: null, timer_ends_at: null, dd_wager: null })
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

    // `sessions` per prima: l'host applica una modifica ottimistica enorme
    // (punteggi a zero, board vuota) e le ricariche innescate dalle altre
    // scritture la cancellerebbero per un istante, facendo riapparire la
    // partita appena azzerata.
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

    await supabase.from("buzzer_queue").delete().eq("session_id", data.sessionId);
    await supabase.from("final_answers").delete().eq("session_id", data.sessionId);
    await supabase.from("players").update({ locked_out: false }).eq("session_id", data.sessionId);
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
     * Aggiornamento condizionale: di due click ravvicinati solo il primo trova
     * la riga ancora da giudicare. Senza, il secondo accreditava la puntata una
     * seconda volta — con una puntata da 800 la squadra guadagnava 800 punti
     * inesistenti, e questo decide chi vince.
     */
    // Anche qui `sessions` viene per ultima, e deve: questa rivendicazione è la
    // guardia contro il doppio clic, e accreditare la puntata prima di averla
    // ottenuta significherebbe accreditarla due volte.
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

/* ------------------------- Live host corrections -------------------------- */

/** Manual score correction, available at any phase. */
export const adjustScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        sessionId: z.string().uuid(),
        team: z.enum(["alpha", "bravo"]),
        delta: z.number().int().min(-100000).max(100000),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: session, error } = await supabase
      .from("sessions")
      .select("score_alpha, score_bravo")
      .eq("id", data.sessionId)
      .single();
    if (error) throw new Error(error.message);
    const patch =
      data.team === "alpha"
        ? { score_alpha: session.score_alpha + data.delta }
        : { score_bravo: session.score_bravo + data.delta };
    const { error: uErr } = await supabase.from("sessions").update(patch).eq("id", data.sessionId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

/** Promotes the next queued buzzer for the open tile and restarts the clock. */
export const passToNext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: session, error } = await supabase.from("sessions").select("*").eq("id", data.sessionId).single();
    if (error) throw new Error(error.message);
    if (!session.current_tile_id) throw new Error("No open tile");

    // Chi tocca adesso si decide leggendo; `sessions` resta la prima scrittura,
    // così le ricariche innescate dalla coda non mostrano il giocatore vecchio.
    const { data: queued } = await supabase
      .from("buzzer_queue")
      .select("*")
      .eq("session_id", data.sessionId)
      .eq("tile_id", session.current_tile_id)
      .eq("status", "queued")
      .order("created_at");
    const next = (queued ?? [])[0] ?? null;

    const { error: uErr } = await supabase
      .from("sessions")
      .update(
        next
          ? { phase: "answering" as const, active_player_id: next.player_id, timer_ends_at: timerEnd() }
          : { phase: "question_open" as const, active_player_id: null, timer_ends_at: null },
      )
      .eq("id", data.sessionId);
    if (uErr) throw new Error(uErr.message);

    if (session.active_player_id) {
      await supabase
        .from("buzzer_queue")
        .update({ status: "cleared", judged_at: new Date().toISOString() })
        .eq("session_id", data.sessionId)
        .eq("tile_id", session.current_tile_id)
        .eq("player_id", session.active_player_id)
        .eq("status", "active");
    }
    if (next) await supabase.from("buzzer_queue").update({ status: "active" }).eq("id", next.id);
    return { ok: true, promoted: next?.player_id ?? null };
  });

/** Restarts the 15s clock for the player currently answering. */
export const restartTimer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("sessions")
      .update({ timer_ends_at: timerEnd() })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Moves a player to the other team. */
export const switchPlayerTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ sessionId: z.string().uuid(), playerId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: player, error } = await supabase
      .from("players")
      .select("team")
      .eq("id", data.playerId)
      .eq("session_id", data.sessionId)
      .single();
    if (error) throw new Error(error.message);
    const { error: uErr } = await supabase
      .from("players")
      .update({ team: player.team === "alpha" ? "bravo" : "alpha" })
      .eq("id", data.playerId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

/** Removes a player from the session. */
export const removePlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ sessionId: z.string().uuid(), playerId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    await supabase.from("buzzer_queue").delete().eq("session_id", data.sessionId).eq("player_id", data.playerId);
    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", data.playerId)
      .eq("session_id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
