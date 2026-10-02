/**
 * Un tabellone scritto da Claude.
 *
 * Preparare venticinque domande con cinque livelli di difficoltà coerenti è il
 * lavoro che tiene lontana la gente dal creare il proprio quiz: il tabellone
 * vuoto è facile da aprire e lungo da riempire. Qui si chiede a Claude una
 * prima stesura, che poi si corregge nell'editor come qualunque altra.
 *
 * Questo file non parla con la rete: costruisce la richiesta e interpreta la
 * risposta. La chiamata vera sta in `ai-board.functions.ts`, lato server, dove
 * la chiave API resta al sicuro. Tenere separate le due cose vuol dire poter
 * provare la parte che sbaglia davvero — leggere JSON scritto da un modello —
 * senza chiamare nessuno.
 */

/** Quanto deve essere difficile, nelle parole che si usano nel prompt. */
export type AiDifficulty = "easy" | "mixed" | "hard";

export interface AiBoardRequest {
  /** Di cosa parla la partita: «storia del rock», «anatomia», «Napoli». */
  topic: string;
  /** In che lingua vanno scritte le domande: il codice della UI va benissimo. */
  language: string;
  difficulty: AiDifficulty;
}

/** Le stesse misure del tabellone vero. */
export const AI_COLUMNS = 5;
export const AI_ROWS = 5;
/** La scala dei punti classica: la riga in basso vale cinque volte la prima. */
export const AI_POINTS = [100, 200, 300, 400, 500] as const;

const DIFFICULTY_NOTE: Record<AiDifficulty, string> = {
  easy: "Keep every clue answerable by a casual player: common knowledge, nothing obscure.",
  mixed:
    "Row 1 should be easy for anyone, row 5 should stump all but an expert, with a smooth climb between.",
  hard: "Aim at an expert audience: specific dates, names and details, no warm-up questions.",
};

/**
 * Il testo che si manda a Claude.
 *
 * Si chiede JSON e niente altro, con lo schema scritto per esteso: un modello
 * che spiega cosa sta per fare prima di farlo è gradevole da leggere e
 * impossibile da interpretare. Il formato Jeopardy va detto esplicitamente,
 * perché «domanda» e «risposta» qui sono invertite rispetto al senso comune:
 * sul tabellone compare l'indizio, e chi gioca risponde con la domanda.
 */
export function boardPrompt(req: AiBoardRequest): string {
  return [
    `Write a complete Jeopardy board about: ${req.topic}`,
    "",
    `Write every clue and answer in this language (BCP-47 code): ${req.language}. Category titles too.`,
    DIFFICULTY_NOTE[req.difficulty],
    "",
    `Exactly ${AI_COLUMNS} categories, exactly ${AI_ROWS} clues each, ordered from easiest to hardest.`,
    "A category title is at most 24 characters so it fits the board header.",
    "A clue is a statement, not a question — the classic Jeopardy form. Keep it under 160 characters.",
    "The answer is the short fact itself (no need for the 'What is…' wrapper), under 60 characters.",
    "Every answer must be unambiguous and verifiable. Do not invent facts, and leave out anything you are unsure about by choosing a different clue instead.",
    "Vary the categories: five different angles on the subject, not five rewordings of it.",
    "",
    "Reply with JSON only — no prose, no code fence:",
    '{"title":"…","categories":[{"title":"…","clues":[{"clue":"…","answer":"…"}]}]}',
  ].join("\n");
}

/** La forma che `importGame` accetta. */
export interface AiBoard {
  version: 1;
  title: string;
  categories: { title: string; tiles: AiTile[] }[];
}
interface AiTile {
  row_index: number;
  points: number;
  question: string;
  answer: string;
}

/**
 * Estrae il JSON da quello che è arrivato.
 *
 * I modelli a volte incorniciano la risposta in un blocco di codice o
 * aggiungono una riga di cortesia prima, nonostante le istruzioni. Invece di
 * fidarsi si cerca la prima graffa e si chiude sull'ultima: se dentro non c'è
 * JSON valido se ne accorge `JSON.parse`, e allora è un errore vero.
 */
export function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("ai.noJson");
  return JSON.parse(raw.slice(start, end + 1));
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * Da JSON qualunque a tabellone valido.
 *
 * Il modello sbaglia il conto: quattro categorie invece di cinque, sei indizi
 * in una colonna, un campo vuoto. Rifiutare tutto per un indizio mancante
 * vorrebbe dire buttare le altre ventiquattro domande, quindi si taglia il
 * troppo, si riempie il poco con caselle vuote e si lascia all'editor il
 * compito di segnalare i buchi — che è esattamente quello che sa già fare.
 *
 * I punti non arrivano dal modello: sono la scala della riga. Così un indizio
 * spostato di posto vale sempre quello che vale la sua riga.
 */
export function boardFromAi(parsed: unknown, fallbackTitle: string): AiBoard {
  const root = (parsed ?? {}) as Record<string, unknown>;
  const rawCats = Array.isArray(root["categories"]) ? root["categories"] : [];

  const categories = rawCats.slice(0, AI_COLUMNS).map((entry) => {
    const cat = (entry ?? {}) as Record<string, unknown>;
    const rawClues = Array.isArray(cat["clues"]) ? cat["clues"] : [];
    const tiles: AiTile[] = [];
    for (const item of rawClues.slice(0, AI_ROWS)) {
      const clue = (item ?? {}) as Record<string, unknown>;
      const question = str(clue["clue"]) || str(clue["question"]);
      const answer = str(clue["answer"]);
      /* Una casella senza domanda o senza risposta non è giocabile: meglio
         lasciare il posto vuoto, che nell'editor si vede. */
      if (!question || !answer) continue;
      tiles.push({
        row_index: tiles.length,
        points: AI_POINTS[tiles.length] ?? 500,
        question: question.slice(0, 4000),
        answer: answer.slice(0, 2000),
      });
    }
    return { title: str(cat["title"]).slice(0, 60), tiles };
  });

  // `importGame` vuole cinque colonne esatte: quelle che mancano arrivano vuote.
  while (categories.length < AI_COLUMNS) categories.push({ title: "", tiles: [] });

  const title = (str(root["title"]) || fallbackTitle).slice(0, 80);
  return { version: 1, title: title || "Jeopardy", categories };
}

/** Quante caselle sono arrivate davvero: serve al messaggio di fine. */
export const countTiles = (board: AiBoard) =>
  board.categories.reduce((n, c) => n + c.tiles.length, 0);
