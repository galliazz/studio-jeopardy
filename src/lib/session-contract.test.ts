/// <reference types="node" />
/**
 * Il contratto è una proiezione in sola lettura delle righe del database:
 * non inventa stato, lo traduce. Due cose non possono sbagliare: la risposta
 * compare solo a domanda rivelata, e l'orologio si legge sull'ora del server,
 * non su quella del dispositivo che guarda.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { TIMER_DURATION_MS } from "./game-rules.ts";
import { toSessionState, type ContractSources } from "./session-contract.ts";
import type { Game, Player, QueueEntry, Session, SessionPhase, SessionStatus } from "./types.ts";

const game: Game = {
  id: "g1",
  host_id: "h1",
  title: "Quiz",
  join_code: "ABCD23",
  overlay_token: "tok",
  theme: { bg: "#fff", card: "#E3D3F5", accent: "#000", radius: 30, rowPoints: [] },
  created_at: "2026-09-01T20:00:00.000Z",
  updated_at: "2026-09-01T20:00:00.000Z",
};

function session(over: Partial<Session> = {}): Session {
  return {
    id: "s1",
    game_id: "g1",
    host_id: "h1",
    status: "live",
    phase: "idle",
    current_tile_id: null,
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

function player(id: string, over: Partial<Player> = {}): Player {
  return {
    id,
    session_id: "s1",
    name: id.toUpperCase(),
    avatar: "🦊",
    team: "alpha",
    locked_out: false,
    created_at: "2026-09-01T20:00:00.000Z",
    ...over,
  };
}

function entry(playerId: string, over: Partial<QueueEntry> = {}): QueueEntry {
  return {
    id: `q-${playerId}`,
    session_id: "s1",
    tile_id: "t1",
    player_id: playerId,
    status: "queued",
    created_at: "2026-09-01T20:01:00.000Z",
    judged_at: null,
    ...over,
  };
}

const activeTile = { id: "t1", category_id: "c1", points: 400, question: "Q?", answer: "A!" };

function state(over: Partial<ContractSources> = {}) {
  return toSessionState({
    game,
    session: session(),
    categories: [{ id: "c1", game_id: "g1", title: "Storia", position: 0 }],
    tiles: [
      { id: "t1", category_id: "c1", points: 400 },
      { id: "t2", category_id: "c1", points: 800 },
    ],
    players: [],
    queue: [],
    ...over,
  });
}

describe("fase", () => {
  const cases: [SessionStatus, SessionPhase, string][] = [
    ["lobby", "idle", "lobby"],
    ["live", "idle", "board"],
    ["live", "question_open", "clue_open"],
    ["live", "daily_double_wager", "clue_open"],
    ["live", "answering", "buzzed"],
    ["live", "reveal", "revealed"],
    ["live", "final_wager", "final"],
    ["final", "final_wager", "final"],
    ["final", "final_answer", "final"],
    ["finished", "reveal", "ended"],
  ];
  for (const [status, phase, expected] of cases) {
    test(`${status} + ${phase} → ${expected}`, () => {
      assert.equal(state({ session: session({ status, phase }) }).phase, expected);
    });
  }

  test("una partita finita è finita, qualunque fase sia rimasta scritta", () => {
    // Chiudere salta la pulizia della fase: lo stato conta più della fase.
    assert.equal(
      state({ session: session({ status: "finished", phase: "answering" }) }).phase,
      "ended",
    );
  });
});

describe("domanda e risposta", () => {
  test("la risposta compare solo a domanda rivelata", () => {
    for (const phase of ["question_open", "answering", "idle"] as const) {
      const s = state({ session: session({ phase, current_tile_id: "t1" }), activeTile });
      assert.equal(s.active_answer, null, phase);
    }
    const revealed = state({
      session: session({ phase: "reveal", current_tile_id: "t1" }),
      activeTile,
    });
    assert.equal(revealed.active_answer, "A!");
  });

  test("senza la riga completa della casella non c'è né domanda né risposta", () => {
    // Chi non ha il permesso di vedere la domanda riceve `activeTile` nullo.
    const s = state({
      session: session({ phase: "reveal", current_tile_id: "t1" }),
      activeTile: null,
    });
    assert.equal(s.active_clue, null);
    assert.equal(s.active_answer, null);
  });

  test("a casella chiusa la domanda sparisce, anche se la riga arriva", () => {
    const s = state({ session: session({ current_tile_id: null }), activeTile });
    assert.equal(s.active_clue, null);
  });

  test("la domanda porta categoria e valore della casella", () => {
    const s = state({
      session: session({ phase: "question_open", current_tile_id: "t1" }),
      activeTile,
    });
    assert.deepEqual(s.active_clue, { category: "Storia", value: 400, text: "Q?" });
    assert.equal(s.active_tile_id, "t1");
  });
});

describe("orologio", () => {
  test("senza scadenza l'orologio è fermo", () => {
    const s = state();
    assert.equal(s.timer_state, "idle");
    assert.equal(s.timer_started_at, null);
    assert.equal(s.timer_duration_ms, TIMER_DURATION_MS);
  });

  test("l'inizio si ricava dalla scadenza, senza essere salvato", () => {
    const ends = Date.now() + 10_000;
    const s = state({ session: session({ timer_ends_at: new Date(ends).toISOString() }) });
    assert.equal(s.timer_state, "running");
    assert.equal(s.timer_started_at, new Date(ends - TIMER_DURATION_MS).toISOString());
  });

  test("una scadenza passata è scaduta", () => {
    const s = state({
      session: session({ timer_ends_at: new Date(Date.now() - 1_000).toISOString() }),
    });
    assert.equal(s.timer_state, "expired");
  });

  test("conta l'ora del server, non quella del dispositivo", () => {
    // Un telefono indietro di 5 secondi vedrebbe ancora 3 secondi di tempo
    // che per il server sono già finiti.
    const ends = new Date(Date.now() + 3_000).toISOString();
    const behind = state({ session: session({ timer_ends_at: ends }), serverTimeOffsetMs: 5_000 });
    assert.equal(behind.timer_state, "expired");
    assert.equal(behind.server_time_offset_ms, 5_000);
    const same = state({ session: session({ timer_ends_at: ends }) });
    assert.equal(same.timer_state, "running");
  });
});

describe("giocatori, squadre e board", () => {
  test("la coda porta nome e squadra di chi ha premuto", () => {
    const s = state({
      players: [player("p1", { name: "Giulia", team: "bravo" })],
      queue: [entry("p1")],
    });
    assert.deepEqual(s.buzz_order, [
      {
        player_id: "p1",
        display_name: "Giulia",
        team_id: "bravo",
        buzzed_at: "2026-09-01T20:01:00.000Z",
      },
    ]);
  });

  test("un giocatore uscito resta in coda con un nome di ripiego", () => {
    const s = state({ queue: [entry("ghost")] });
    assert.equal(s.buzz_order[0]?.display_name, "Player");
    assert.equal(s.buzz_order[0]?.team_id, "alpha");
  });

  test(
    "la coda mostra solo chi è ancora in gioco sulla casella aperta",
    {
      todo: "buzz_order proietta ogni riga ricevuta, e le pagine leggono la coda per sessione: comparirebbero i buzz delle caselle già chiuse. Latente, toSessionState oggi non ha chiamanti",
    },
    () => {
      const s = state({
        session: session({ phase: "answering", current_tile_id: "t2", active_player_id: "p2" }),
        players: [player("p1"), player("p2")],
        queue: [
          entry("p1", { tile_id: "t1", status: "correct" }),
          entry("p2", { tile_id: "t2", status: "active" }),
        ],
      });
      assert.deepEqual(
        s.buzz_order.map((b) => b.player_id),
        ["p2"],
      );
    },
  );

  test("le squadre portano punteggio e nome scelto dall'host", () => {
    const s = state({
      session: session({ score_alpha: 1200, score_bravo: -400 }),
      teamNames: { alpha: "Volpi", bravo: "Gufi" },
    });
    assert.deepEqual(
      s.teams.map((t) => [t.id, t.name, t.score]),
      [
        ["alpha", "Volpi", 1200],
        ["bravo", "Gufi", -400],
      ],
    );
  });

  test("senza nomi scelti, le squadre si chiamano Alpha e Bravo", () => {
    assert.deepEqual(
      state().teams.map((t) => t.name),
      ["Alpha", "Bravo"],
    );
  });

  test("le caselle giocate risultano usate", () => {
    const s = state({ session: session({ used_tile_ids: ["t2"] }) });
    assert.deepEqual(
      s.tiles.map((t) => [t.id, t.category, t.value, t.used]),
      [
        ["t1", "Storia", 400, false],
        ["t2", "Storia", 800, true],
      ],
    );
    assert.equal(s.board_color, "#E3D3F5");
  });
});
