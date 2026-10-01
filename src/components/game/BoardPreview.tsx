import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, RotateCcw, X } from "lucide-react";

import { BoardGrid } from "@/components/game/BoardGrid";
import { QuestionOverlay } from "@/components/game/QuestionOverlay";
import { useT } from "@/i18n";
import { FADE } from "@/lib/motion";
import type { Category, Session, ThemeSettings, Tile } from "@/lib/types";

/**
 * La prova partita: il tabellone come lo vedranno i giocatori, con le domande
 * che si aprono davvero, ma senza sessione, senza codice e senza telefoni.
 *
 * Serve a rileggere un gioco com'è fatto — i caratteri che hai scelto, il
 * testo che va a capo, la risposta che compare — prima di scoprirlo in
 * diretta. Niente di quello che succede qui tocca il database: le caselle
 * «giocate» vivono in questo componente e spariscono chiudendo.
 */
export function BoardPreview({
  game,
  categories,
  tiles,
  theme,
  dailyDoubleTileIds,
  onClose,
}: {
  game: { id: string; host_id: string };
  categories: Category[];
  tiles: Tile[];
  theme: ThemeSettings;
  dailyDoubleTileIds: string[];
  onClose: () => void;
}) {
  const t = useT();
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [openTileId, setOpenTileId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const openTile = tiles.find((tile) => tile.id === openTileId) ?? null;
  const openCategory = categories.find((c) => c.id === openTile?.category_id) ?? null;

  const close = useCallback(() => {
    if (openTileId) {
      setUsedIds((ids) => (ids.includes(openTileId) ? ids : [...ids, openTileId]));
      setOpenTileId(null);
      setRevealed(false);
      return;
    }
    onClose();
  }, [openTileId, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === " " && openTileId) {
        e.preventDefault();
        setRevealed(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, openTileId]);

  /*
   * Una sessione finta, con i campi che la domanda si aspetta: niente
   * giocatore di turno, niente orologio — in prova non c'è nessuno che deve
   * rispondere entro quindici secondi.
   */
  const session = useMemo<Session>(
    () => ({
      id: "preview",
      game_id: game.id,
      host_id: game.host_id,
      status: "live",
      phase: revealed ? "reveal" : "question_open",
      current_tile_id: openTileId,
      active_player_id: null,
      timer_ends_at: null,
      score_alpha: 0,
      score_bravo: 0,
      used_tile_ids: usedIds,
      daily_double_tile_ids: dailyDoubleTileIds,
      dd_wager: null,
      final_question: null,
      final_answer: null,
      created_at: "",
      updated_at: "",
    }),
    [game.id, game.host_id, revealed, openTileId, usedIds, dailyDoubleTileIds],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={FADE}
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="rounded-full bg-muted px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("edit.preview.badge")}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setUsedIds([]);
              setOpenTileId(null);
              setRevealed(false);
            }}
            disabled={!usedIds.length && !openTileId}
            className="flex h-11 items-center gap-2 rounded-full border border-foreground/20 px-4 text-sm font-bold transition-colors hover:bg-foreground/5 disabled:opacity-35"
          >
            <RotateCcw className="h-4 w-4" /> {t("edit.preview.restart")}
          </button>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-foreground/20 transition-colors hover:bg-foreground/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
        <div className="relative h-full w-full max-w-5xl">
          <BoardGrid
            theme={theme}
            categories={categories}
            tiles={tiles}
            usedIds={new Set(usedIds)}
            onOpenTile={(tileId) => {
              setOpenTileId(tileId);
              setRevealed(false);
            }}
            fill
          />
          <AnimatePresence>
            {openTile && (
              <QuestionOverlay
                key={openTile.id}
                session={session}
                tile={openTile}
                category={openCategory}
                players={[]}
                theme={theme}
                readOnly
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs text-muted-foreground">
        {openTile ? (
          <>
            <button
              onClick={() => setRevealed(true)}
              disabled={revealed}
              className="flex h-11 items-center gap-2 rounded-full bg-lilac px-5 text-sm font-bold text-foreground elev-1 disabled:opacity-40"
            >
              <Eye className="h-4 w-4" /> {t("edit.preview.reveal")}
            </button>
            <button
              onClick={close}
              className="flex h-11 items-center gap-2 rounded-full bg-muted px-5 text-sm font-bold"
            >
              {t("edit.preview.closeTile")}
            </button>
          </>
        ) : (
          <span>{t("edit.preview.hint")}</span>
        )}
      </footer>
    </motion.div>
  );
}
