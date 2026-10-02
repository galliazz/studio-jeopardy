/**
 * Importare un tabellone da un foglio di calcolo.
 *
 * Il formato è quello che l'app stessa esporta in Excel: una riga per
 * casella, con categoria, punti, domanda, risposta e suggerimento. Così chi
 * scrive le domande può farlo in due su Google Sheets — che è come le
 * scrivono quasi tutti — e poi portarle qui.
 *
 * Il lettore CSV è scritto a mano perché serve poco: virgolette, virgolette
 * doppie dentro le virgolette, e campi che vanno a capo. Una libreria per
 * questo sarebbe una dipendenza in più da aggiornare per sempre.
 */

/** Quante colonne ha un tabellone: il formato dell'app, non una scelta qui. */
const BOARD_COLUMNS = 5;

/** Divide un CSV in righe e campi, rispettando virgolette e a capo interni. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  // Il separatore si indovina dalla prima riga: Google e Excel italiano
  // esportano col punto e virgola, il resto del mondo con la virgola.
  const firstLine = clean.split("\n")[0] ?? "";
  const sep =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]!;
    if (quoted) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim()));
}

/** I nomi che può avere ogni colonna, nelle lingue in cui l'app esporta. */
const HEADERS: Record<"category" | "points" | "question" | "answer" | "hint", string[]> = {
  category: [
    "category",
    "categoria",
    "categoría",
    "kategorie",
    "catégorie",
    "категория",
    "分类",
    "カテゴリ",
  ],
  points: [
    "points",
    "punti",
    "puntos",
    "punkte",
    "points",
    "очки",
    "分值",
    "ポイント",
    "value",
    "valore",
  ],
  question: [
    "clue",
    "question",
    "domanda",
    "pregunta",
    "frage",
    "indice",
    "вопрос",
    "题目",
    "問題",
  ],
  answer: ["answer", "risposta", "respuesta", "antwort", "réponse", "ответ", "答案", "答え"],
  hint: ["hint", "suggerimento", "pista", "hinweis", "indice", "подсказка", "提示", "ヒント"],
};

function columnIndexes(header: string[]): Record<keyof typeof HEADERS, number> {
  const normalised = header.map((h) => h.trim().toLowerCase());
  const find = (key: keyof typeof HEADERS) => normalised.findIndex((h) => HEADERS[key].includes(h));
  return {
    category: find("category"),
    points: find("points"),
    question: find("question"),
    answer: find("answer"),
    hint: find("hint"),
  };
}

export interface ImportedBoard {
  version: 1;
  title: string;
  categories: {
    title: string;
    tiles: { row_index: number; points: number; question: string; answer: string; hint?: string }[];
  }[];
}

export interface CsvImportResult {
  board: ImportedBoard;
  /** Quello che è stato lasciato indietro, da dire a chi importa. */
  skipped: number;
  /** Vero se le colonne sono state riconosciute dall'intestazione. */
  hadHeader: boolean;
}

/**
 * Da righe a tabellone. Le colonne si riconoscono dall'intestazione; senza
 * intestazione si usa l'ordine dell'esportazione (categoria, punti, domanda,
 * risposta, suggerimento), che è l'unico ordine che l'app ha mai prodotto.
 *
 * Più di cinque caselle per categoria, o più di cinque categorie, vengono
 * lasciate fuori e contate: meglio un tabellone valido con un avviso che un
 * errore che non spiega cosa togliere.
 */
export function boardFromRows(rows: string[][], fallbackTitle: string): CsvImportResult {
  if (!rows.length)
    return {
      board: { version: 1, title: fallbackTitle, categories: [] },
      skipped: 0,
      hadHeader: false,
    };

  const idx = columnIndexes(rows[0]!);
  const hadHeader = idx.category >= 0 && idx.question >= 0;
  const cols = hadHeader ? idx : { category: 0, points: 1, question: 2, answer: 3, hint: 4 };
  const body = hadHeader ? rows.slice(1) : rows;

  const byCategory = new Map<string, ImportedBoard["categories"][number]>();
  let skipped = 0;

  for (const row of body) {
    const title = (row[cols.category] ?? "").trim();
    const question = (row[cols.question] ?? "").trim();
    const answer = (row[cols.answer] ?? "").trim();
    if (!title || (!question && !answer)) {
      skipped++;
      continue;
    }
    let category = byCategory.get(title);
    if (!category) {
      if (byCategory.size >= BOARD_COLUMNS) {
        skipped++;
        continue;
      }
      category = { title: title.slice(0, 60), tiles: [] };
      byCategory.set(title, category);
    }
    if (category.tiles.length >= BOARD_COLUMNS) {
      skipped++;
      continue;
    }
    const points = Number((row[cols.points] ?? "").replace(/[^\d-]/g, ""));
    const hint = (row[cols.hint] ?? "").trim();
    category.tiles.push({
      row_index: category.tiles.length,
      points: Number.isFinite(points) && points > 0 ? points : (category.tiles.length + 1) * 200,
      question: question.slice(0, 4000),
      answer: answer.slice(0, 2000),
      ...(hint ? { hint: hint.slice(0, 500) } : {}),
    });
  }

  /*
   * Il tabellone vuole cinque colonne: un foglio con tre categorie diventa
   * un tabellone con due colonne da riempire, non un errore. Le caselle
   * mancanti restano vuote, e il pannello «Pronto per giocare» dirà quante
   * sono — che è esattamente l'informazione che serve dopo un'importazione
   * parziale.
   */
  const categories = [...byCategory.values()];
  while (categories.length < BOARD_COLUMNS) categories.push({ title: "", tiles: [] });

  return {
    board: { version: 1, title: fallbackTitle, categories },
    skipped,
    hadHeader,
  };
}

/**
 * Da un link di Google Sheets al link che restituisce il CSV.
 *
 * Funziona col foglio «pubblicato sul web» (File → Condividi → Pubblica sul
 * web), che è l'unico modo di leggerlo senza chiedere l'accesso all'account
 * di Google: nessun permesso da concedere, nessun dato in più che passa di
 * qui. Un foglio solo condiviso col link non basta, e lo si dice a chi prova.
 */
export function sheetCsvUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!/^https:\/\/docs\.google\.com\/spreadsheets\//i.test(trimmed)) return null;
  if (/[?&]output=csv/i.test(trimmed)) return trimmed;
  if (/\/pub\b/i.test(trimmed)) {
    return trimmed.includes("?") ? `${trimmed}&output=csv` : `${trimmed}?output=csv`;
  }
  const published = trimmed.match(/\/spreadsheets\/d\/e\/([^/]+)/i);
  if (published) return `https://docs.google.com/spreadsheets/d/e/${published[1]}/pub?output=csv`;
  const plain = trimmed.match(/\/spreadsheets\/d\/([^/]+)/i);
  if (plain) {
    const gid = trimmed.match(/[#&]gid=(\d+)/)?.[1] ?? "0";
    return `https://docs.google.com/spreadsheets/d/${plain[1]}/export?format=csv&gid=${gid}`;
  }
  return null;
}
