/*
 * Molle condivise dell'interfaccia.
 *
 * Il rimbalzo di una molla non lo decide `stiffness` né `damping` da soli, ma il
 * loro rapporto di smorzamento:
 *
 *     ζ = damping / (2 · √stiffness)      (massa 1, il default di framer-motion)
 *
 * ζ = 1 arriva a destinazione e si ferma. ζ < 1 la supera e torna indietro.
 *
 * La regola: il rimbalzo si guadagna. Un pannello che compare non ha preso
 * slancio da nessun gesto, quindi non deve oscillare — sembra un giocattolo.
 * `PLAYFUL` è riservato ai momenti in cui la festa È il contenuto: il punteggio
 * che cambia, la Daily Double che si annuncia, il podio finale.
 *
 * Il rispetto di "riduci movimento" non sta qui: lo applica <MotionConfig> alla
 * radice (src/routes/__root.tsx), che spegne trasformazioni e spostamenti per
 * tutte le animazioni insieme e lascia in piedi solo l'opacità.
 */

import { createContext, useContext } from "react";
import type { Transition } from "framer-motion";

/** Comparse, uscite, pannelli, modali. ζ ≈ 0.99 — nessun rimbalzo. */
export const SPRING_UI: Transition = { type: "spring", stiffness: 200, damping: 28 };

/** Controlli che rispondono al dito: toggle, campi che si aprono. ζ = 1.00, più corta. */
export const SPRING_SNAP: Transition = { type: "spring", stiffness: 400, damping: 40 };

/** Solo dove l'esultanza è il punto. ζ ≈ 0.81 — supera di poco e rientra. */
export const SPRING_PLAYFUL: Transition = { type: "spring", stiffness: 300, damping: 28 };

/** Dissolvenza secca, per quando una molla non c'entra niente. */
export const FADE: Transition = { type: "tween", duration: 0.2, ease: "easeOut" };

/**
 * Vero dentro un elemento con `zoom` CSS: lì le animazioni di layout vanno
 * spente.
 *
 * framer-motion misura l'elemento prima e dopo con `getBoundingClientRect`,
 * che restituisce pixel VISIVI, già ingranditi; poi applica la correzione con
 * un `transform` dentro l'elemento zoomato, dove ogni pixel vale di nuovo 2.6
 * volte. Il movimento esce quindi 2.6 volte più ampio sulla pillola dei
 * punteggi, 1.6 sulla coda: quando un punteggio cambia o qualcuno si
 * prenota, l'elemento scatta lontano e poi rientra. Negli overlay gli
 * elementi ora si posizionano e basta; sulla console, dove non c'è zoom,
 * continuano ad animarsi.
 */
const InsideZoomContext = createContext(false);
export const InsideZoom = InsideZoomContext.Provider;
export function useLayoutAnimation(): boolean {
  return !useContext(InsideZoomContext);
}
