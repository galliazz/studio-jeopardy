/**
 * Le regole della partita, senza database.
 *
 * Le funzioni server leggono le righe, chiedono qui cosa fare e poi scrivono:
 * chi può premere, chi risponde dopo, quanto vale una risposta, quando i
 * buzzer vanno riarmati, come si chiude la finale. Tenerle separate da
 * Supabase è ciò che permette di provarle con un test, e sono proprio le
 * regole che in diretta non possono sbagliare.
 *
 * Qui dentro niente rete, niente DOM, niente orologio implicito: chi ha
 * bisogno dell'ora la passa.
 */
import { z } from "zod";
import type { Session, Team } from "@/lib/types";

/* ---------------------------------- Timer ---------------------------------- */

/**
 * Il tempo per rispondere. Lo stesso numero è scritto anche nel trigger
 * `on_buzz` del database, che avvia l'orologio del primo che preme: un test
 * controlla che i due restino uguali.
 */
export const TIMER_DURATION_MS = 15_000;

export function timerEndsAt(nowMs: number): string {
  return new Date(nowMs + TIMER_DURATION_MS).toISOString();
}

/* ------------------------------- Daily Double ------------------------------ */

export const MAX_DAILY_DOUBLES = 2;

/**
 * Daily Double scelte a mano, lette dal tema del gioco. Stanno lì e non in una
 * colonna propria perché il tema è già il posto dove la pagina di Edit salva
 * le scelte dell'host, e non serviva una migrazione per una lista di id.
 */
export function themeDailyDoubles(theme: unknown): string[] | null {
  if (!theme || typeof theme !== "object") return null;
  const value = (theme as { dailyDoubleTileIds?: unknown }).dailyDoubleTileIds;
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : null;
}

/**
 * Le Daily Double di una nuova partita: quelle scelte dall'host se ancora
 * esistono sulla board, altrimenti due a sorte. Il sorteggio arriva da fuori
 * perché il caso non si prova in un test.
 */
export function pickDailyDoubles(
  theme: unknown,
  boardTileIds: Iterable<string>,
  shuffle: (ids: string[]) => string[],
): string[] {
  const tileIds = new Set(boardTileIds);
  const chosen = (themeDailyDoubles(theme) ?? []).filter((id) => tileIds.has(id));
  return chosen.length
    ? chosen.slice(0, MAX_DAILY_DOUBLES)
    : shuffle([...tileIds]).slice(0, Math.min(MAX_DAILY_DOUBLES, tileIds.size));
}

export function isDailyDouble(dailyDoubleTileIds: readonly string[], tileId: string): boolean {
  return dailyDoubleTileIds.includes(tileId);
}

/* --------------------------------- Punteggi -------------------------------- */

type Scores = Pick<Session, "score_alpha" | "score_bravo">;

/**
 * Quanto sposta il punteggio una risposta: giusta vale la casella, sbagliata
 * ne toglie metà. Una Daily Double raddoppia in entrambe le direzioni: una
 * casella da 1000 ne dà 2000 se giusta e ne toglie 1000 se sbagliata.
 */
export function answerDelta(points: number, dailyDouble: boolean, correct: boolean): number {
  const multiplier = dailyDouble ? 2 : 1;
  return correct ? points * multiplier : -Math.round((points / 2) * multiplier);
}

/**
 * La sola colonna di punteggio che cambia. Le righe arrivano dal database
 * con `team` come testo libero: tutto ciò che non è "alpha" è Bravo.
 */
export function scorePatch(
  scores: Scores,
  team: string,
  delta: number,
): { score_alpha: number } | { score_bravo: number } {
  return team === "alpha"
    ? { score_alpha: scores.score_alpha + delta }
    : { score_bravo: scores.score_bravo + delta };
}

/* ---------------------------------- Buzzer --------------------------------- */

type BuzzSession = Pick<Session, "current_tile_id"> & { status: string; phase: string };

/**
 * Si può premere solo a casella aperta, prima che qualcuno la chiuda. Chi ha
 * già sbagliato questa casella è fuori finché non la si riarma.
 */
export function mayBuzz<S extends BuzzSession>(
  player: { locked_out: boolean },
  session: S,
): session is S & { current_tile_id: string } {
  return (
    !player.locked_out &&
    session.status === "live" &&
    !!session.current_tile_id &&
    (session.phase === "question_open" || session.phase === "answering")
  );
}

/** Codice Postgres della violazione di unicità. */
export const UNIQUE_VIOLATION = "23505";

/**
 * Una seconda pressione sulla stessa casella urta il vincolo
 * `unique (session_id, tile_id, player_id)`: non è un errore, è lo stesso buzz
 * arrivato due volte, e il giocatore resta dov'era in coda.
 */
export function buzzInsertRejected(error: { code?: string } | null): boolean {
  return !!error && error.code !== UNIQUE_VIOLATION;
}

/**
 * La risposta a chi ha premuto: la sua posizione fra le righe ancora in gioco.
 *
 * Se fra quelle righe non c'è, la prenotazione NON è entrata: era un doppione
 * assorbito dal vincolo unico su una riga già archiviata. Prima si rispondeva
 * comunque «va bene, sei in coda alla posizione 0», e il telefono restava
 * acceso ad aspettare un turno che non sarebbe arrivato.
 */
export function buzzReply(
  rows: readonly { player_id: string }[],
  playerId: string,
  activePlayerId: string | null,
) {
  const position = rows.findIndex((r) => r.player_id === playerId) + 1;
  if (position === 0) return { ok: false as const, reason: "closed" as const };
  return { ok: true as const, position, active: activePlayerId === playerId };
}

/* --------------------------------- Giudizio -------------------------------- */

/**
 * Chi si sta giudicando, o `null` se non c'è niente da giudicare. L'host dice
 * chi aveva davanti: dopo un "Wrong" il server promuove subito il successivo,
 * e un secondo click impaziente penalizzerebbe lui, che non ha aperto bocca.
 */
export function judgeTarget(
  session: Pick<Session, "current_tile_id" | "active_player_id">,
  expectedPlayerId: string,
): { tileId: string; playerId: string } | null {
  if (!session.current_tile_id || !session.active_player_id) return null;
  if (session.active_player_id !== expectedPlayerId) return null;
  return { tileId: session.current_tile_id, playerId: session.active_player_id };
}

/**
 * Il prossimo in coda che può ancora rispondere, nell'ordine d'arrivo. Chi ha
 * appena sbagliato non può essere ripescato dalla sua stessa coda. Lo stato
 * del giocatore si chiede uno alla volta, e ci si ferma al primo buono.
 */
export async function findNextBuzzer<E extends { player_id: string }>(
  queued: readonly E[],
  judgedPlayerId: string,
  canAnswer: (playerId: string) => Promise<boolean>,
): Promise<E | null> {
  for (const entry of queued) {
    if (entry.player_id === judgedPlayerId) continue;
    if (await canAnswer(entry.player_id)) return entry;
  }
  return null;
}

/**
 * Tutti fuori: ogni giocatore ha già sbagliato questa casella, compreso chi è
 * appena stato giudicato. Chi non ha mai premuto non conta come fuori: finché
 * resta anche un solo giocatore che può rispondere, la casella aspetta lui.
 */
export function everyoneLockedOut(
  players: readonly { id: string; locked_out: boolean }[],
  judgedPlayerId: string,
): boolean {
  return players.length > 0 && players.every((p) => p.id === judgedPlayerId || p.locked_out);
}

/**
 * A chi tocca: il prossimo con il suo orologio, oppure buzzer riaperti per
 * tutti. `endsAt` si chiama solo se serve un orologio.
 */
export function turnPatch(nextPlayerId: string | null, endsAt: () => string) {
  return nextPlayerId
    ? {
        phase: "answering" as const,
        active_player_id: nextPlayerId,
        timer_ends_at: endsAt(),
      }
    : { phase: "question_open" as const, active_player_id: null, timer_ends_at: null };
}

/* ---------------------------------- Board ---------------------------------- */

export const BOARD_TILES = 25;

/** Le caselle giocate dopo aver chiuso quella aperta, senza doppioni. */
export function markTileUsed(usedTileIds: readonly string[], tileId: string | null): string[] {
  const used = new Set(usedTileIds);
  if (tileId) used.add(tileId);
  return [...used];
}

/* ---------------------------------- Finale --------------------------------- */

/** I telefoni mandano puntata e risposta solo mentre la finale le aspetta. */
export function finalSubmissionOpen(session: { status: string; phase: string }): boolean {
  return (
    session.status === "final" &&
    (session.phase === "final_wager" || session.phase === "final_answer")
  );
}

/**
 * La puntata non può superare quello che la squadra ha in cassa. Il telefono
 * lo impedisce già, ma il limite vero sta qui: una richiesta costruita a mano
 * con una puntata da centomila deciderebbe la partita.
 */
export function clampWager(scores: Scores, team: string, wager: number): number {
  const available = team === "alpha" ? scores.score_alpha : scores.score_bravo;
  return Math.max(0, Math.min(Math.trunc(wager), Math.max(0, available)));
}

/**
 * La riga da salvare per la squadra. La squadra viene dal giocatore
 * verificato, mai da quello che scrive il telefono.
 *
 * Si scrive solo il campo della fase in corso. Le due fasi condividono una
 * riga sola: quando si rispondeva scrivendo anche la puntata, un secondo
 * telefono — o lo stesso dopo una ricarica, che riparte da zero — azzerava la
 * puntata già bloccata, e chiunque poteva rifarla dopo aver letto la domanda.
 */
export function finalAnswerRow(
  session: Pick<Session, "id" | "score_alpha" | "score_bravo"> & { phase: string },
  team: string,
  input: { wager: number; answer: string },
): { session_id: string; team: string; wager?: number; answer?: string } {
  const base = { session_id: session.id, team };
  return session.phase === "final_answer"
    ? { ...base, answer: input.answer }
    : { ...base, wager: clampWager(session, team, input.wager) };
}

/** La domanda della finale arriva ai telefoni solo quando è ora di rispondere. */
export function finalQuestionVisible(phase: string): boolean {
  return phase === "final_answer";
}

export interface FinalEntry {
  team?: string | null;
  judged: boolean | null;
  wager: number | null;
}

/**
 * Le due regole possibili per la finale, scelte dall'host nella pagina di
 * Edit e salvate sul tema del gioco.
 *
 * - `classic`: come in televisione. Chi indovina guadagna la propria puntata,
 *   chi sbaglia la perde. Le due squadre non si toccano fra loro, e si può
 *   vincere anche se l'altra sbaglia.
 * - `duel`: la puntata di chi sbaglia passa a chi ha indovinato. Se sbagliano
 *   entrambe ognuna perde la propria, se indovinano entrambe non si muove
 *   niente.
 */
export type FinalScoring = "classic" | "duel";

export const DEFAULT_FINAL_SCORING: FinalScoring = "classic";

/** La regola scelta sul tema del gioco; in mancanza, quella televisiva. */
export function finalScoringOf(theme: unknown): FinalScoring {
  if (!theme || typeof theme !== "object") return DEFAULT_FINAL_SCORING;
  return (theme as { finalScoring?: unknown }).finalScoring === "duel"
    ? "duel"
    : DEFAULT_FINAL_SCORING;
}

/**
 * Il giudizio di una squadra nella finale, con la regola scelta per la
 * partita. La partita finisce quando anche l'altra squadra è stata giudicata.
 *
 * Nel duello la puntata cambia mano UNA VOLTA SOLA, ed è il giudizio di chi la
 * perde a spostarla: prima si toglieva a chi sbagliava anche quando
 * l'avversaria, indovinando, se l'era già presa — e con 250 in palio chi
 * sbagliava ne perdeva 500. Contare sulla riga di chi paga, e non su quella di
 * chi incassa, rende anche indifferente l'ordine in cui l'host giudica.
 */
export function judgeFinalScores({
  rule = DEFAULT_FINAL_SCORING,
  team,
  correct,
  ownWager,
  rivals,
  scores,
}: {
  rule?: FinalScoring;
  team: Team;
  correct: boolean;
  ownWager: number | null;
  rivals: readonly FinalEntry[];
  scores: Scores;
}): { score_alpha: number; score_bravo: number; finished: boolean; delta: number } {
  const finished = rivals.every((o) => o.judged !== null) && rivals.length > 0;
  const own = ownWager ?? 0;
  let scoreAlpha = scores.score_alpha;
  let scoreBravo = scores.score_bravo;
  const add = (side: string | null | undefined, amount: number) => {
    if (side === "alpha") scoreAlpha += amount;
    else if (side === "bravo") scoreBravo += amount;
  };

  let delta: number;
  if (rule === "classic") {
    delta = correct ? own : -own;
    add(team, delta);
  } else if (correct) {
    // Incassa le puntate delle rivali già giudicate sbagliate: quelle ancora
    // da giudicare pagheranno quando toccherà a loro.
    delta = rivals.reduce((sum, o) => sum + (o.judged === false ? (o.wager ?? 0) : 0), 0);
    add(team, delta);
  } else {
    delta = -own;
    add(team, delta);
    // La puntata persa va alle rivali che hanno già indovinato.
    for (const rival of rivals) if (rival.judged === true) add(rival.team, own);
  }

  // `delta || 0` normalizza lo zero negativo: a schermo sarebbe "-0", e in un
  // confronto stretto non risulta uguale a zero.
  return { score_alpha: scoreAlpha, score_bravo: scoreBravo, finished, delta: delta || 0 };
}

/* --------------------------------- Overlay --------------------------------- */

/**
 * La domanda come la vede OBS. La risposta viaggia solo dopo che l'host l'ha
 * rivelata: prima di allora, in diretta, sarebbe uno spoiler per tutti.
 */
export function overlayClue(
  session: { phase: string; dd_wager: number | null },
  tile: { category_id: string; points: number; question: string; answer: string },
  categories: readonly { id: string; title: string }[],
): { category: string; points: number; question: string; answer: string | null } {
  return {
    category: categories.find((c) => c.id === tile.category_id)?.title ?? "",
    points: session.dd_wager ?? tile.points,
    question: tile.question,
    answer: session.phase === "reveal" ? tile.answer : null,
  };
}

/* ---------------------------------- Ingresso -------------------------------- */

export const JOIN_CODE_MIN = 4;
export const JOIN_CODE_MAX = 10;
export const NAME_MIN = 2;
export const NAME_MAX = 25;
export const AVATAR_MAX = 8;

export const joinCodeInput = z.string().trim().min(JOIN_CODE_MIN).max(JOIN_CODE_MAX);

export const joinGameInput = z.object({
  code: joinCodeInput,
  name: z.string().trim().min(NAME_MIN).max(NAME_MAX),
  avatar: z.string().min(1).max(AVATAR_MAX),
  team: z.enum(["alpha", "bravo"]),
});

/** I codici sono generati in maiuscolo: chi li digita in minuscolo entra lo stesso. */
export function normalizeJoinCode(code: string): string {
  return code.toUpperCase();
}

/** Si entra in sala d'attesa o a partita in corso, non durante la finale. */
export function canJoinSession(status: string): boolean {
  return status === "lobby" || status === "live";
}
