/**
 * La chiamata a Claude, lato server.
 *
 * Sta qui e non nel browser per un motivo solo: la chiave API. Una chiave
 * messa in una `VITE_*` finisce dentro il bundle, e chiunque apra il sito può
 * copiarla e spendere i soldi di qualcun altro. Da qui invece non esce: il
 * browser chiede un tabellone, il server chiede a Claude, torna indietro il
 * tabellone.
 *
 * Senza chiave la funzione non esiste per l'interfaccia: `aiAvailable` dice se
 * mostrare il bottone, così nessuno preme qualcosa che non può funzionare.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { boardFromAi, boardPrompt, countTiles, extractJson } from "@/lib/ai-board";

/** Il modello: capace quanto serve per scriverne venticinque di seguito. */
const MODEL = "claude-sonnet-5-5";
/** Venticinque domande con le risposte stanno larghe in quattromila token. */
const MAX_TOKENS = 4000;
/** Oltre il minuto è un guasto, non una generazione lenta. */
const TIMEOUT_MS = 90_000;

function apiKey(): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env["ANTHROPIC_API_KEY"] || process.env["CLAUDE_API_KEY"];
}

/** Mostrare o no il bottone: lo chiede la pagina Studio insieme al resto. */
export const aiAvailable = createServerFn({ method: "GET" }).handler(() => ({
  available: Boolean(apiKey()),
}));

const inputSchema = z.object({
  topic: z.string().trim().min(2).max(120),
  language: z.string().trim().min(2).max(12),
  difficulty: z.enum(["easy", "mixed", "hard"]),
});

export const generateBoard = createServerFn({ method: "POST" })
  // Autenticato: generare costa, e un bottone aperto a tutti è una bolletta.
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const key = apiKey();
    if (!key) throw new Error("ai.noKey");

    /* `AbortSignal.timeout` non basta: va passato a fetch, e il messaggio che
       arriva all'utente deve dire «riprova», non «AbortError». */
    let res: Response;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          messages: [{ role: "user", content: boardPrompt(data) }],
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new Error("ai.unreachable");
    }

    if (!res.ok) {
      /* Il corpo dell'errore di Anthropic contiene la chiave in nessun caso,
         ma può contenere il prompt: si tiene il tipo e si butta il resto. */
      const kind = res.status === 401 ? "ai.badKey" : res.status === 429 ? "ai.busy" : "ai.failed";
      throw new Error(kind);
    }

    const payload = (await res.json()) as {
      content?: { type?: string; text?: string }[];
      stop_reason?: string;
    };
    const text = (payload.content ?? [])
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("");
    if (!text.trim()) throw new Error("ai.empty");

    const board = boardFromAi(extractJson(text), data.topic);
    /* Meno di cinque caselle non è un tabellone: meglio un errore chiaro che
       una partita da riempire a mano dall'inizio. */
    if (countTiles(board) < 5) throw new Error("ai.tooFew");
    return { board, tiles: countTiles(board) };
  });
