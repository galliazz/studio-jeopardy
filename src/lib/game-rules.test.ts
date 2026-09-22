/// <reference types="node" />
/**
 * Le regole che in diretta non possono sbagliare: chi preme, chi risponde
 * dopo, quanto vale una risposta, quando i buzzer si riarmano, come si chiude
 * la finale. Ognuna di queste ha già rotto una partita almeno una volta — il
 * buzzer rimasto muto dopo che tutti avevano sbagliato, la doppia pressione,
 * il secondo click dell'host che penalizzava il giocatore sbagliato — e qui
 * si prova che non ricapiti.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";

import {
  BOARD_TILES,
  MAX_DAILY_DOUBLES,
  NAME_MAX,
  TIMER_DURATION_MS,
  answerDelta,
  buzzInsertRejected,
  buzzReply,
  canJoinSession,
  everyoneLockedOut,
  finalAnswerRow,
  finalQuestionVisible,
  finalScoringOf,
  finalSubmissionOpen,
  findNextBuzzer,
  isDailyDouble,
  joinCodeInput,
  joinGameInput,
  judgeFinalScores,
  judgeTarget,
  markTileUsed,
  mayBuzz,
  normalizeJoinCode,
  overlayClue,
  pickDailyDoubles,
  scorePatch,
  themeDailyDoubles,
  timerEndsAt,
  turnPatch,
  type FinalEntry,
  type FinalScoring,
} from "./game-rules.ts";
import { PLAYER_AVATARS, type Session, type Team } from "./types.ts";

/* -------------------------------- Fixture -------------------------------- */

function session(over: Partial<Session> = {}): Session {
  return {
    id: "s1",
    game_id: "g1",
    host_id: "h1",
    status: "live",
    phase: "question_open",
    current_tile_id: "t1",
    active_player_id: null,
    timer_ends_at: null,
    score_alpha: 0,
    score_bravo: 0,
    used_tile_ids: [],
    daily_double_tile_ids: [],
    dd_wager: null,
    final_question: null,
    final_answer: null,
    created_at: "2026-09-01T20:00:00.000Z",
    updated_at: "2026-09-01T20:00:00.000Z",
    ...over,
  };
}

interface Row {
  id: string;
  player_id: string;
}

const row = (player: string): Row => ({ id: `q-${player}`, player_id: player });

/** Lo stato dei giocatori come lo leggerebbe il server, uno alla volta. */
function lockLookup(players: Record<string, boolean>) {
  const asked: string[] = [];
  const canAnswer = async (id: string) => {
    asked.push(id);
    return id in players && !players[id];
  };
  return { canAnswer, asked };
}

/**
 * Come `judgeAnswer` decide dopo un "Wrong": prima il prossimo in coda, e
 * solo se non c'è si guarda se sono tutti fuori. Le decisioni sono le funzioni
 * vere; qui c'è solo l'ordine in cui il server le chiama.
 */
async function afterWrong(
  queued: Row[],
  players: { id: string; locked_out: boolean }[],
  judged: string,
) {
  const lock = Object.fromEntries(players.map((p) => [p.id, p.locked_out]));
  const next = await findNextBuzzer(queued, judged, lockLookup(lock).canAnswer);
  if (next) return { outcome: "promoted" as const, next: next.player_id };
  if (everyoneLockedOut(players, judged)) return { outcome: "reset" as const, next: null };
  return { outcome: "reopened" as const, next: null };
}

/* ---------------------------------- Timer --------------------------------- */

describe("timer", () => {
  test("il tempo per rispondere scade quindici secondi dopo", () => {
    const now = Date.parse("2026-09-01T20:00:00.000Z");
    assert.equal(TIMER_DURATION_MS, 15_000);
    assert.equal(timerEndsAt(now), "2026-09-01T20:00:15.000Z");
  });

  test("il trigger del database dà al primo che preme lo stesso tempo degli altri", () => {
    // Il primo buzz lo promuove il trigger `on_buzz`, i successivi il server:
    // se i due numeri divergessero, il primo giocatore avrebbe un orologio
    // diverso da chi viene dopo, e i telefoni mostrerebbero conti sbagliati.
    const dir = new URL("../../supabase/migrations/", import.meta.url);
    const definition = /create\s+(or\s+replace\s+)?function\s+public\.on_buzz\s*\(/i;
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .filter((f) => definition.test(readFileSync(new URL(f, dir), "utf8")));
    const latest = files.at(-1);
    assert.ok(latest, "nessuna migrazione definisce on_buzz");
    const sql = readFileSync(new URL(latest, dir), "utf8");
    const body = sql.slice(sql.search(definition));
    const seconds = /interval\s+'(\d+)\s+seconds?'/i.exec(body)?.[1];
    assert.equal(Number(seconds) * 1000, TIMER_DURATION_MS);
  });

  test("la barra del conto alla rovescia usa la stessa durata del server", () => {
    // Il resto lo dà la scadenza scritta dal server, ma la frazione della
    // barra si calcola su questa durata: se divergessero, la barra partirebbe
    // già mezza vuota o non arriverebbe mai a zero. Il file è un hook React,
    // quindi si legge come testo invece di importarlo.
    const source = readFileSync(new URL("../hooks/use-countdown.ts", import.meta.url), "utf8");
    const literal = /DEFAULT_TIMER_DURATION_MS\s*=\s*([\d_]+)\s*;/.exec(source)?.[1];
    if (literal !== undefined) {
      assert.equal(Number(literal.replace(/_/g, "")), TIMER_DURATION_MS);
    } else {
      assert.match(source, /TIMER_DURATION_MS[\s\S]*from\s+["']@\/lib\/game-rules["']/);
    }
  });

  test("turnPatch: il prossimo parte col suo orologio", () => {
    const patch = turnPatch("p2", () => "2026-09-01T20:00:15.000Z");
    assert.deepEqual(patch, {
      phase: "answering",
      active_player_id: "p2",
      timer_ends_at: "2026-09-01T20:00:15.000Z",
    });
  });

  test("turnPatch: senza nessuno in coda i buzzer si riaprono e l'orologio si ferma", () => {
    let asked = false;
    const patch = turnPatch(null, () => {
      asked = true;
      return "x";
    });
    assert.deepEqual(patch, {
      phase: "question_open",
      active_player_id: null,
      timer_ends_at: null,
    });
    assert.equal(asked, false, "un orologio che nessuno usa non va nemmeno calcolato");
  });
});

/* ------------------------------ Daily Double ------------------------------ */

describe("Daily Double", () => {
  const board = ["t1", "t2", "t3", "t4"];
  const never = () => assert.fail("con una scelta dell'host non si sorteggia");

  test("il tema senza una lista valida non ha scelte", () => {
    assert.equal(themeDailyDoubles(null), null);
    assert.equal(themeDailyDoubles(undefined), null);
    assert.equal(themeDailyDoubles("t1"), null);
    assert.equal(themeDailyDoubles({}), null);
    assert.equal(themeDailyDoubles({ dailyDoubleTileIds: "t1" }), null);
  });

  test("dal tema passano solo gli id testuali", () => {
    // Il tema è JSON scritto dal client o importato da file: può contenere di tutto.
    assert.deepEqual(themeDailyDoubles({ dailyDoubleTileIds: ["t1", 2, null, "t3"] }), [
      "t1",
      "t3",
    ]);
  });

  test("le caselle scelte dall'host vincono sul sorteggio", () => {
    assert.deepEqual(pickDailyDoubles({ dailyDoubleTileIds: ["t3", "t1"] }, board, never), [
      "t3",
      "t1",
    ]);
  });

  test("mai più di due, anche se il tema ne elenca di più", () => {
    const picked = pickDailyDoubles({ dailyDoubleTileIds: ["t1", "t2", "t3"] }, board, never);
    assert.equal(picked.length, MAX_DAILY_DOUBLES);
    assert.deepEqual(picked, ["t1", "t2"]);
  });

  test("una scelta che non esiste più sulla board non conta", () => {
    // Un gioco duplicato o una casella rigenerata lasciano nel tema id morti:
    // una Daily Double fantasma non uscirebbe mai.
    assert.deepEqual(pickDailyDoubles({ dailyDoubleTileIds: ["gone", "t2"] }, board, never), [
      "t2",
    ]);
  });

  test("se nessuna scelta è valida si sorteggiano due caselle della board", () => {
    let shuffled: string[] = [];
    const picked = pickDailyDoubles({ dailyDoubleTileIds: ["gone"] }, board, (ids) => {
      shuffled = ids;
      return [...ids].reverse();
    });
    assert.deepEqual(shuffled, board, "il sorteggio pesca da tutte e sole le caselle");
    assert.deepEqual(picked, ["t4", "t3"]);
  });

  test("una board piccola o vuota non inventa caselle", () => {
    assert.deepEqual(
      pickDailyDoubles(null, ["solo"], (ids) => ids),
      ["solo"],
    );
    assert.deepEqual(
      pickDailyDoubles(null, [], (ids) => ids),
      [],
    );
  });

  test("una casella è Daily Double solo se è nella lista della sessione", () => {
    assert.equal(isDailyDouble(["t1", "t2"], "t2"), true);
    assert.equal(isDailyDouble(["t1", "t2"], "t3"), false);
    assert.equal(isDailyDouble([], "t1"), false);
  });
});

/* --------------------------------- Punteggi -------------------------------- */

describe("punteggio di una risposta", () => {
  test("giusta vale la casella, sbagliata ne toglie metà", () => {
    assert.equal(answerDelta(200, false, true), 200);
    assert.equal(answerDelta(200, false, false), -100);
    assert.equal(answerDelta(1000, false, false), -500);
  });

  test("una Daily Double raddoppia in entrambe le direzioni", () => {
    assert.equal(answerDelta(1000, true, true), 2000);
    assert.equal(answerDelta(1000, true, false), -1000);
  });

  test("una penalità dispari si arrotonda, e resta un intero", () => {
    // Il punteggio è una colonna intera: 12.5 punti non si possono scrivere.
    assert.equal(answerDelta(25, false, false), -13);
    assert.equal(answerDelta(25, true, false), -25);
    assert.ok(Number.isInteger(answerDelta(333, false, false)));
  });

  test("sbagliare non costa mai più di quanto rende indovinare", () => {
    for (const points of [0, 1, 25, 100, 200, 400, 600, 800, 1000, 99_999]) {
      for (const dd of [false, true]) {
        const gain = answerDelta(points, dd, true);
        const loss = -answerDelta(points, dd, false);
        assert.ok(loss >= 0 && loss <= gain, `${points} dd=${dd}: -${loss} contro +${gain}`);
      }
    }
  });

  test("una casella da zero punti non muove il punteggio", () => {
    assert.equal(answerDelta(0, false, true), 0);
    assert.equal(answerDelta(0, true, false) + 0, 0);
  });
});

describe("scorePatch", () => {
  const scores = { score_alpha: 1000, score_bravo: 400 };

  test("tocca solo la colonna della squadra che ha risposto", () => {
    // Scrivere anche l'altra colonna con un valore letto prima potrebbe
    // cancellare una correzione dell'host arrivata nel frattempo.
    assert.deepEqual(scorePatch(scores, "alpha", 200), { score_alpha: 1200 });
    assert.deepEqual(scorePatch(scores, "bravo", -100), { score_bravo: 300 });
  });

  test("il punteggio può scendere sotto zero", () => {
    assert.deepEqual(scorePatch(scores, "bravo", -1000), { score_bravo: -600 });
  });

  test("una correzione a zero lascia il punteggio com'è", () => {
    assert.deepEqual(scorePatch(scores, "alpha", 0), { score_alpha: 1000 });
  });
});

/* ---------------------------------- Buzzer --------------------------------- */

describe("chi può premere", () => {
  const free = { locked_out: false };

  test("a casella aperta si preme, anche se qualcuno sta già rispondendo", () => {
    // Durante "answering" chi preme si mette in coda: se il primo sbaglia,
    // tocca a lui senza dover ripremere.
    assert.equal(mayBuzz(free, session({ phase: "question_open" })), true);
    assert.equal(mayBuzz(free, session({ phase: "answering", active_player_id: "p1" })), true);
  });

  test("chi ha già sbagliato questa casella non può ripremere", () => {
    assert.equal(mayBuzz({ locked_out: true }, session({ phase: "question_open" })), false);
    assert.equal(mayBuzz({ locked_out: true }, session({ phase: "answering" })), false);
  });

  test("senza una casella aperta i buzzer sono chiusi", () => {
    assert.equal(mayBuzz(free, session({ current_tile_id: null })), false);
    for (const phase of ["idle", "reveal", "final_wager", "final_answer"] as const) {
      assert.equal(mayBuzz(free, session({ phase })), false, phase);
    }
  });

  test("fuori dalla partita in corso non si preme", () => {
    for (const status of ["lobby", "final", "finished"] as const) {
      assert.equal(mayBuzz(free, session({ status })), false, status);
    }
  });
});

describe("la pressione arriva al server", () => {
  test("la seconda pressione dello stesso dito non è un errore", () => {
    // `pointerdown` può arrivare due volte: il vincolo unico del database
    // respinge la seconda riga, e il giocatore deve restare dov'era.
    assert.equal(buzzInsertRejected(null), false);
    assert.equal(buzzInsertRejected({ code: "23505" }), false);
  });

  test("ogni altro errore del database respinge il buzz", () => {
    assert.equal(buzzInsertRejected({ code: "23503" }), true);
    assert.equal(buzzInsertRejected({}), true);
  });

  test("la posizione segue l'ordine d'arrivo, non l'ordine dei nomi", () => {
    const rows = [row("zeta"), row("alfa"), row("mike")];
    assert.equal(buzzReply(rows, "zeta", "zeta").position, 1);
    assert.equal(buzzReply(rows, "alfa", "zeta").position, 2);
    assert.equal(buzzReply(rows, "mike", "zeta").position, 3);
  });

  test("un buzz doppio riceve la stessa risposta del primo", () => {
    const rows = [row("p1"), row("p2")];
    assert.deepEqual(buzzReply(rows, "p2", "p1"), buzzReply(rows, "p2", "p1"));
    assert.deepEqual(buzzReply(rows, "p2", "p1"), { ok: true, position: 2, active: false });
  });

  test("attivo solo chi la sessione indica come tale", () => {
    assert.equal(buzzReply([row("p1")], "p1", "p1").active, true);
    assert.equal(buzzReply([row("p1")], "p1", null).active, false);
  });

  test("un buzz assorbito come doppione, senza una riga in gioco, non risponde ok", () => {
    // Il giocatore ha già una riga archiviata per questa casella: fra quelle
    // ancora in gioco non c'è. Rispondergli «va bene» lo lascerebbe ad
    // aspettare un turno che non arriva.
    assert.deepEqual(buzzReply([row("p2")], "p1", "p2"), { ok: false, reason: "closed" });
  });
});

/* --------------------------------- Giudizio -------------------------------- */

describe("chi si giudica", () => {
  test("il giocatore che l'host aveva davanti", () => {
    const s = session({ phase: "answering", active_player_id: "p1" });
    assert.deepEqual(judgeTarget(s, "p1"), { tileId: "t1", playerId: "p1" });
  });

  test("un secondo click dopo la promozione non penalizza il successivo", () => {
    // Dopo "Wrong" su p1 il server ha già promosso p2: un click ripetuto
    // porta ancora p1 come atteso, e non deve toccare p2.
    const s = session({ phase: "answering", active_player_id: "p2" });
    assert.equal(judgeTarget(s, "p1"), null);
  });

  test("senza casella o senza giocatore attivo non c'è niente da giudicare", () => {
    assert.equal(judgeTarget(session({ active_player_id: null }), "p1"), null);
    assert.equal(
      judgeTarget(session({ current_tile_id: null, active_player_id: "p1" }), "p1"),
      null,
    );
  });
});

describe("il prossimo in coda", () => {
  test("si prende il primo arrivato che può ancora rispondere", async () => {
    const { canAnswer } = lockLookup({ p2: false, p3: false });
    const next = await findNextBuzzer([row("p2"), row("p3")], "p1", canAnswer);
    assert.equal(next?.player_id, "p2");
  });

  test("chi ha appena sbagliato non viene ripescato dalla sua stessa coda", async () => {
    const { canAnswer, asked } = lockLookup({ p1: false, p2: false });
    const next = await findNextBuzzer([row("p1"), row("p2")], "p1", canAnswer);
    assert.equal(next?.player_id, "p2");
    assert.ok(!asked.includes("p1"), "non serve nemmeno chiedere al database");
  });

  test("chi è bloccato si salta", async () => {
    const { canAnswer } = lockLookup({ p2: true, p3: false });
    const next = await findNextBuzzer([row("p2"), row("p3")], "p1", canAnswer);
    assert.equal(next?.player_id, "p3");
  });

  test("un giocatore uscito dalla partita si salta", async () => {
    const { canAnswer } = lockLookup({ p3: false });
    const next = await findNextBuzzer([row("ghost"), row("p3")], "p1", canAnswer);
    assert.equal(next?.player_id, "p3");
  });

  test("ci si ferma al primo buono, senza interrogare il resto della coda", async () => {
    const { canAnswer, asked } = lockLookup({ p2: false, p3: false, p4: false });
    await findNextBuzzer([row("p2"), row("p3"), row("p4")], "p1", canAnswer);
    assert.deepEqual(asked, ["p2"]);
  });

  test("coda vuota o tutta bloccata: nessuno", async () => {
    assert.equal(await findNextBuzzer([], "p1", lockLookup({}).canAnswer), null);
    const { canAnswer } = lockLookup({ p2: true });
    assert.equal(await findNextBuzzer([row("p2")], "p1", canAnswer), null);
  });

  test("restituisce la riga intera, con l'id da promuovere", async () => {
    const entry = { id: "row-7", player_id: "p2", status: "queued" };
    const next = await findNextBuzzer([entry], "p1", lockLookup({ p2: false }).canAnswer);
    assert.equal(next, entry);
  });
});

describe("tutti fuori", () => {
  test("nessun giocatore: niente da azzerare", () => {
    assert.equal(everyoneLockedOut([], "p1"), false);
  });

  test("l'unico giocatore ha sbagliato: la casella si riarma per lui", () => {
    assert.equal(everyoneLockedOut([{ id: "p1", locked_out: false }], "p1"), true);
  });

  test("chi non ha mai premuto tiene aperta la casella", () => {
    const players = [
      { id: "p1", locked_out: false },
      { id: "p2", locked_out: true },
      { id: "p3", locked_out: false },
    ];
    assert.equal(everyoneLockedOut(players, "p1"), false);
  });

  test("tutti gli altri hanno già sbagliato: si riparte", () => {
    const players = [
      { id: "p1", locked_out: false },
      { id: "p2", locked_out: true },
      { id: "p3", locked_out: true },
    ];
    assert.equal(everyoneLockedOut(players, "p1"), true);
  });
});

describe("scenari del buzzer dopo un errore", () => {
  test("tre giocatori sbagliano uno dopo l'altro: alla fine si riparte, non ci si blocca", async () => {
    // È il vicolo cieco di prima: dopo il terzo errore i buzzer si riaprivano,
    // ma tutti erano bloccati e il vincolo unico respingeva ogni nuova riga.
    const players = [
      { id: "p1", locked_out: false },
      { id: "p2", locked_out: false },
      { id: "p3", locked_out: false },
    ];
    const lock = (id: string) => (players.find((p) => p.id === id)!.locked_out = true);

    assert.deepEqual(await afterWrong([row("p2"), row("p3")], players, "p1"), {
      outcome: "promoted",
      next: "p2",
    });
    lock("p1");
    assert.deepEqual(await afterWrong([row("p3")], players, "p2"), {
      outcome: "promoted",
      next: "p3",
    });
    lock("p2");
    assert.deepEqual(await afterWrong([], players, "p3"), { outcome: "reset", next: null });
  });

  test("se qualcuno non ha ancora premuto, la casella resta aperta per lui", async () => {
    const players = [
      { id: "p1", locked_out: true },
      { id: "p2", locked_out: false },
      { id: "p3", locked_out: false },
    ];
    assert.deepEqual(await afterWrong([], players, "p2"), { outcome: "reopened", next: null });
  });

  test("un bloccato rimasto in coda non viene promosso, e non impedisce il reset", async () => {
    const players = [
      { id: "p1", locked_out: false },
      { id: "p2", locked_out: true },
    ];
    assert.deepEqual(await afterWrong([row("p2")], players, "p1"), {
      outcome: "reset",
      next: null,
    });
  });
});

/* ---------------------------------- Board ---------------------------------- */

describe("caselle giocate", () => {
  test("chiudere una casella la segna come giocata", () => {
    assert.deepEqual(markTileUsed(["t1"], "t2"), ["t1", "t2"]);
  });

  test("chiuderla due volte non la conta due volte", () => {
    // Un doppio click su "chiudi" non deve far credere che la board sia finita.
    const used = markTileUsed(markTileUsed([], "t1"), "t1");
    assert.deepEqual(used, ["t1"]);
    assert.equal(BOARD_TILES - used.length, 24);
  });

  test("senza casella aperta non cambia niente, e l'originale resta intatto", () => {
    const before = ["t1"];
    const after = markTileUsed(before, null);
    assert.deepEqual(after, ["t1"]);
    assert.notEqual(after, before);
  });
});

/* ---------------------------------- Finale --------------------------------- */

describe("invio della finale", () => {
  test("si accettano puntata e risposta solo durante la finale", () => {
    assert.equal(finalSubmissionOpen({ status: "final", phase: "final_wager" }), true);
    assert.equal(finalSubmissionOpen({ status: "final", phase: "final_answer" }), true);
    assert.equal(finalSubmissionOpen({ status: "final", phase: "idle" }), false);
    assert.equal(finalSubmissionOpen({ status: "live", phase: "final_wager" }), false);
    assert.equal(finalSubmissionOpen({ status: "finished", phase: "final_answer" }), false);
  });

  test("la squadra viene dal giocatore verificato, non da ciò che manda il telefono", () => {
    const fromPhone = { wager: 300, answer: "Chi è Verdi?", team: "bravo" };
    const s = session({ id: "s9", status: "final", phase: "final_wager", score_alpha: 1000 });
    assert.deepEqual(finalAnswerRow(s, "alpha", fromPhone), {
      session_id: "s9",
      team: "alpha",
      wager: 300,
    });
  });

  test("la puntata non supera il punteggio della squadra", () => {
    const s = session({ status: "final", phase: "final_wager", score_alpha: 500 });
    assert.equal(finalAnswerRow(s, "alpha", { wager: 100_000, answer: "" }).wager, 500);
    assert.equal(finalAnswerRow(s, "alpha", { wager: 200, answer: "" }).wager, 200);
    // Una squadra in rosso non può puntare nulla, e nessuno può puntare meno di zero.
    const rosso = session({ status: "final", phase: "final_wager", score_bravo: -300 });
    assert.equal(finalAnswerRow(rosso, "bravo", { wager: 100, answer: "" }).wager, 0);
    assert.equal(finalAnswerRow(s, "alpha", { wager: -50, answer: "" }).wager, 0);
  });

  test("una volta rivelata la domanda, la puntata già bloccata non si riscrive", () => {
    const s = session({ status: "final", phase: "final_answer" });
    const row = finalAnswerRow(s, "alpha", { wager: 0, answer: "Chi è Verdi?" });
    assert.deepEqual(row, { session_id: s.id, team: "alpha", answer: "Chi è Verdi?" });
  });

  test("mentre si punta non si scrive la risposta", () => {
    const s = session({ status: "final", phase: "final_wager", score_alpha: 900 });
    const row = finalAnswerRow(s, "alpha", { wager: 400, answer: "provo a sbirciare" });
    assert.deepEqual(row, { session_id: s.id, team: "alpha", wager: 400 });
  });

  test("la domanda arriva ai telefoni solo quando è ora di rispondere", () => {
    assert.equal(finalQuestionVisible("final_answer"), true);
    for (const phase of ["final_wager", "idle", "question_open", "reveal"]) {
      assert.equal(finalQuestionVisible(phase), false, phase);
    }
  });
});

describe("giudizio della finale", () => {
  const start = { score_alpha: 1000, score_bravo: 800 };
  const pending = (wager: number | null): FinalEntry => ({ team: "bravo", judged: null, wager });

  test("la regola sta sul tema del gioco, e in mancanza è quella televisiva", () => {
    assert.equal(finalScoringOf({ finalScoring: "duel" }), "duel");
    assert.equal(finalScoringOf({ finalScoring: "classic" }), "classic");
    assert.equal(finalScoringOf({}), "classic");
    assert.equal(finalScoringOf(null), "classic");
    assert.equal(finalScoringOf({ finalScoring: "qualcosa" }), "classic");
  });

  test("regola televisiva: chi indovina guadagna la propria puntata", () => {
    const r = judgeFinalScores({
      rule: "classic",
      team: "alpha",
      correct: true,
      ownWager: 500,
      rivals: [pending(300)],
      scores: start,
    });
    assert.deepEqual(r, { score_alpha: 1500, score_bravo: 800, finished: false, delta: 500 });
  });

  test("regola televisiva: chi sbaglia perde la propria, e l'altra non si muove", () => {
    const r = judgeFinalScores({
      rule: "classic",
      team: "bravo",
      correct: false,
      ownWager: 300,
      rivals: [{ team: "alpha", judged: null, wager: 500 }],
      scores: start,
    });
    assert.deepEqual(r, { score_alpha: 1000, score_bravo: 500, finished: false, delta: -300 });
  });

  test("duello: la puntata passa a chi ha indovinato", () => {
    // Alpha ha già indovinato; ora Bravo sbaglia e le lascia i suoi 300.
    const r = judgeFinalScores({
      rule: "duel",
      team: "bravo",
      correct: false,
      ownWager: 300,
      rivals: [{ team: "alpha", judged: true, wager: 500 }],
      scores: start,
    });
    assert.deepEqual(r, { score_alpha: 1300, score_bravo: 500, finished: true, delta: -300 });
  });

  test("duello: chi indovina per primo aspetta il giudizio dell'altra", () => {
    const r = judgeFinalScores({
      rule: "duel",
      team: "alpha",
      correct: true,
      ownWager: 500,
      rivals: [pending(300)],
      scores: start,
    });
    assert.deepEqual(r, { score_alpha: 1000, score_bravo: 800, finished: false, delta: 0 });
  });

  test("la partita finisce solo quando anche l'altra squadra è stata giudicata", () => {
    const base = { team: "alpha" as const, correct: true, ownWager: 100, scores: start };
    assert.equal(judgeFinalScores({ ...base, rivals: [pending(100)] }).finished, false);
    assert.equal(
      judgeFinalScores({ ...base, rivals: [{ team: "bravo", judged: false, wager: 100 }] })
        .finished,
      true,
    );
  });

  test("senza l'altra squadra non si chiude da sola: la chiude l'host", () => {
    const r = judgeFinalScores({
      rule: "duel",
      team: "alpha",
      correct: true,
      ownWager: 100,
      rivals: [],
      scores: start,
    });
    assert.deepEqual(r, { score_alpha: 1000, score_bravo: 800, finished: false, delta: 0 });
  });

  test("una puntata mancante vale zero", () => {
    for (const rule of ["classic", "duel"] as const) {
      const r = judgeFinalScores({
        rule,
        team: "bravo",
        correct: false,
        ownWager: null,
        rivals: [pending(null)],
        scores: start,
      });
      assert.equal(r.score_bravo, 800, rule);
      assert.equal(r.delta, 0, rule);
    }
  });

  /** Giudica entrambe le squadre come fa l'host, una dopo l'altra. */
  function judgeBoth(
    rule: FinalScoring,
    wagers: Record<Team, number>,
    correct: Record<Team, boolean>,
    first: Team,
  ): { score_alpha: number; score_bravo: number } {
    const second: Team = first === "alpha" ? "bravo" : "alpha";
    const a = judgeFinalScores({
      rule,
      team: first,
      correct: correct[first],
      ownWager: wagers[first],
      rivals: [{ team: second, judged: null, wager: wagers[second] }],
      scores: start,
    });
    const b = judgeFinalScores({
      rule,
      team: second,
      correct: correct[second],
      ownWager: wagers[second],
      rivals: [{ team: first, judged: correct[first], wager: wagers[first] }],
      scores: a,
    });
    assert.equal(a.finished, false);
    assert.equal(b.finished, true);
    return { score_alpha: b.score_alpha, score_bravo: b.score_bravo };
  }

  test("l'ordine in cui l'host giudica non cambia il risultato, con nessuna delle due regole", () => {
    const wagers = { alpha: 600, bravo: 250 };
    for (const rule of ["classic", "duel"] as const) {
      for (const alpha of [true, false]) {
        for (const bravo of [true, false]) {
          const correct = { alpha, bravo };
          assert.deepEqual(
            judgeBoth(rule, wagers, correct, "alpha"),
            judgeBoth(rule, wagers, correct, "bravo"),
            `${rule}: alpha ${alpha}, bravo ${bravo}`,
          );
        }
      }
    }
  });

  test("se sbagliano entrambe, ciascuna perde la propria puntata", () => {
    for (const rule of ["classic", "duel"] as const) {
      assert.deepEqual(
        judgeBoth(rule, { alpha: 600, bravo: 250 }, { alpha: false, bravo: false }, "alpha"),
        { score_alpha: 400, score_bravo: 550 },
        rule,
      );
    }
  });

  test("chi sbaglia mentre l'altra indovina perde la sua puntata una volta sola", () => {
    // Era il difetto: con 250 in palio Bravo ne perdeva 500, e chiudeva a 300.
    assert.deepEqual(
      judgeBoth("duel", { alpha: 600, bravo: 250 }, { alpha: true, bravo: false }, "alpha"),
      { score_alpha: 1250, score_bravo: 550 },
    );
    // Con la regola televisiva ognuna risponde solo della propria puntata.
    assert.deepEqual(
      judgeBoth("classic", { alpha: 600, bravo: 250 }, { alpha: true, bravo: false }, "alpha"),
      { score_alpha: 1600, score_bravo: 550 },
    );
  });

  test("duello: se indovinano entrambe non si muove niente", () => {
    assert.deepEqual(
      judgeBoth("duel", { alpha: 600, bravo: 250 }, { alpha: true, bravo: true }, "alpha"),
      { score_alpha: 1000, score_bravo: 800 },
    );
  });

  test("regola televisiva: se indovinano entrambe, ognuna incassa la propria", () => {
    assert.deepEqual(
      judgeBoth("classic", { alpha: 600, bravo: 250 }, { alpha: true, bravo: true }, "alpha"),
      { score_alpha: 1600, score_bravo: 1050 },
    );
  });
});

/* --------------------------------- Overlay --------------------------------- */

describe("la domanda su OBS", () => {
  const tile = { category_id: "c1", points: 400, question: "Q", answer: "A" };
  const categories = [{ id: "c1", title: "Storia" }];

  test("la risposta non esce prima che l'host la riveli", () => {
    for (const phase of ["question_open", "answering", "idle", "daily_double_wager"]) {
      assert.equal(overlayClue({ phase, dd_wager: null }, tile, categories).answer, null, phase);
    }
    assert.equal(overlayClue({ phase: "reveal", dd_wager: null }, tile, categories).answer, "A");
  });

  test("categoria e punti della casella aperta", () => {
    assert.deepEqual(overlayClue({ phase: "question_open", dd_wager: null }, tile, categories), {
      category: "Storia",
      points: 400,
      question: "Q",
      answer: null,
    });
  });

  test("una categoria sparita lascia il titolo vuoto, non rompe l'overlay", () => {
    assert.equal(overlayClue({ phase: "reveal", dd_wager: null }, tile, []).category, "");
  });
});

/* ---------------------------------- Ingresso -------------------------------- */

describe("ingresso in partita", () => {
  const valid = { code: "ABCD23", name: "Giulia", avatar: "🦊", team: "alpha" };

  test("i dati buoni passano, ripuliti dagli spazi", () => {
    const parsed = joinGameInput.parse({ ...valid, code: "  abcd23 ", name: "  Giulia  " });
    assert.equal(parsed.code, "abcd23");
    assert.equal(parsed.name, "Giulia");
    assert.equal(normalizeJoinCode(parsed.code), "ABCD23");
  });

  test("il nome si misura dopo aver tolto gli spazi", () => {
    // "  a  " sembra lungo abbastanza, ma a schermo resterebbe una lettera.
    assert.equal(joinGameInput.safeParse({ ...valid, name: "  a  " }).success, false);
    assert.equal(joinGameInput.safeParse({ ...valid, name: "Al" }).success, true);
    assert.equal(joinGameInput.safeParse({ ...valid, name: "x".repeat(NAME_MAX) }).success, true);
    assert.equal(
      joinGameInput.safeParse({ ...valid, name: "x".repeat(NAME_MAX + 1) }).success,
      false,
    );
  });

  test("solo le due squadre che esistono", () => {
    assert.equal(joinGameInput.safeParse({ ...valid, team: "bravo" }).success, true);
    assert.equal(joinGameInput.safeParse({ ...valid, team: "charlie" }).success, false);
    assert.equal(joinGameInput.safeParse({ ...valid, team: "Alpha" }).success, false);
  });

  test("il codice ha fra 4 e 10 caratteri", () => {
    assert.equal(joinCodeInput.safeParse("ABC").success, false);
    assert.equal(joinCodeInput.safeParse("ABCD").success, true);
    assert.equal(joinCodeInput.safeParse("A".repeat(10)).success, true);
    assert.equal(joinCodeInput.safeParse("A".repeat(11)).success, false);
  });

  test("ogni avatar offerto dal telefono è accettato dal server", () => {
    // Un emoji composto (famiglie, bandiere) occupa più di 8 unità: se
    // finisse nella lista, chi lo sceglie non riuscirebbe a entrare.
    for (const avatar of PLAYER_AVATARS) {
      assert.equal(joinGameInput.safeParse({ ...valid, avatar }).success, true, avatar);
    }
    assert.equal(joinGameInput.safeParse({ ...valid, avatar: "" }).success, false);
  });

  test("si entra in sala d'attesa o a partita in corso, non durante la finale", () => {
    // Un nuovo arrivato durante la finale potrebbe riscrivere la puntata della squadra.
    assert.equal(canJoinSession("lobby"), true);
    assert.equal(canJoinSession("live"), true);
    assert.equal(canJoinSession("final"), false);
    assert.equal(canJoinSession("finished"), false);
  });
});
