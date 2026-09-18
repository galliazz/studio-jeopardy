import { createFileRoute } from "@tanstack/react-router";

import { OverlayCanvas, OverlayQueue, OverlayScores } from "@/components/overlay/OverlayPieces";
import { SAFE, useOverlayState, useTransparentPage } from "@/components/overlay/overlay-state";

export const Route = createFileRoute("/overlay/queue/$overlayToken")({
  head: () => ({
    meta: [
      { title: "Queue overlay — JEOPARDESTINY" },
      { name: "description", content: "Transparent scores and buzzer queue mirror for OBS browser sources." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Queue overlay — JEOPARDESTINY" },
      {
        property: "og:description",
        content: "Transparent scores and buzzer queue mirror for OBS browser sources.",
      },
    ],
  }),
  component: QueueOverlay,
});

function QueueOverlay() {
  const { overlayToken } = Route.useParams();
  useTransparentPage();
  const state = useOverlayState(overlayToken);
  if (!state) return null;

  return (
    <OverlayCanvas>
      <div
        style={{
          position: "absolute",
          top: SAFE,
          left: SAFE,
          /*
           * Tutta la larghezza sicura, non 700. Le due pillole dei punteggi,
           * ingrandite 2.6 volte, occupano circa 800 pixel — di più se una
           * squadra ha molti giocatori — e la colonna da 700 ne tagliava via
           * 95 della seconda. Il contenuto resta allineato a sinistra, quindi
           * in OBS si ritaglia sempre dallo stesso angolo.
           */
          width: 1920 - SAFE * 2,
          maxHeight: 1080 - SAFE * 2,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          /*
           * 140 era tarato sulla vecchia trasformazione, che riservava al
           * layout la scatola NON ingrandita: fra punteggi e coda se ne
           * vedevano una quarantina. Ora che la scatola è quella vera, questo
           * è lo spazio che si vede davvero.
           */
          gap: 48,
        }}
      >
        <OverlayScores state={state} />
        <OverlayQueue state={state} align="left" />
      </div>
    </OverlayCanvas>
  );
}
