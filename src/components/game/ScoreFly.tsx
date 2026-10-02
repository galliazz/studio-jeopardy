import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { SPRING_PLAYFUL } from "@/lib/motion";
import type { Team } from "@/lib/types";

export interface ScoreFlight {
  /** Cambia a ogni giudizio: fa ripartire l'animazione anche con lo stesso valore. */
  id: number;
  delta: number;
  team: Team;
}

/**
 * Il punteggio che vola dalla board alla pillola della squadra.
 *
 * Senza, i numeri cambiano in un angolo dello schermo mentre tutti guardano
 * la domanda: chi gioca scopre di aver segnato solo quando qualcuno lo dice.
 * Il «+400» parte da dove si stava guardando e finisce dove il punteggio
 * vive, così il legame fra le due cose si vede invece di spiegarlo.
 *
 * Le misure si leggono dal DOM al momento del volo: la console cambia
 * disposizione con la larghezza della finestra, e due coordinate scritte a
 * mano sarebbero giuste su un solo schermo.
 */
export function ScoreFly({ flight, onDone }: { flight: ScoreFlight | null; onDone: () => void }) {
  const [path, setPath] = useState<{
    id: number;
    delta: number;
    from: { x: number; y: number };
    to: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (!flight) return;
    const board = document.querySelector("[data-board-root]")?.getBoundingClientRect();
    const pill = document
      .querySelector(`[data-score-pill="${flight.team}"]`)
      ?.getBoundingClientRect();
    if (!board || !pill) return;
    setPath({
      id: flight.id,
      delta: flight.delta,
      from: { x: board.left + board.width / 2, y: board.top + board.height / 2 },
      to: { x: pill.left + pill.width / 2, y: pill.top + pill.height / 2 },
    });
    const timer = setTimeout(onDone, 1100);
    return () => clearTimeout(timer);
  }, [flight, onDone]);

  return (
    <AnimatePresence>
      {path && flight && (
        /*
         * Due elementi e non uno: framer scrive `transform` inline, e si
         * mangerebbe le classi di centratura di Tailwind. Fuori il volo,
         * dentro lo spostamento di mezza altezza che mette il numero sul
         * punto invece che sotto e a destra.
         */
        <motion.span
          key={path.id}
          aria-hidden
          initial={{ x: path.from.x, y: path.from.y, scale: 0.6, opacity: 0 }}
          animate={{
            x: [path.from.x, path.to.x],
            y: [path.from.y, path.to.y],
            scale: [1.6, 0.9],
            opacity: [1, 1, 0],
          }}
          exit={{ opacity: 0 }}
          transition={{ ...SPRING_PLAYFUL, opacity: { times: [0, 0.7, 1], duration: 1 } }}
          className="pointer-events-none fixed left-0 top-0 z-[60]"
        >
          <span
            className={`block -translate-x-1/2 -translate-y-1/2 font-display text-5xl font-black drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] ${
              path.delta >= 0 ? "text-success-ink" : "text-danger-ink"
            }`}
          >
            {path.delta >= 0 ? `+${path.delta}` : path.delta}
          </span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}
