import { createFileRoute } from "@tanstack/react-router";

import { useForcedLocale } from "@/i18n";
import { OverlayCanvas, OverlayScores } from "@/components/overlay/OverlayPieces";
import {
  SAFE,
  overlaySearch,
  useOverlayState,
  useTransparentPage,
} from "@/components/overlay/overlay-state";

export const Route = createFileRoute("/overlay/scores/$overlayToken")({
  validateSearch: overlaySearch,
  head: () => ({
    meta: [
      { title: "Scores overlay — JEOPARDESTINY" },
      { name: "description", content: "Transparent team scores for OBS browser sources." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Scores overlay — JEOPARDESTINY" },
      { property: "og:description", content: "Transparent team scores for OBS browser sources." },
    ],
  }),
  component: ScoresOverlay,
});

/**
 * Solo i punteggi, in alto al centro: la stessa posizione che hanno
 * nell'overlay combinato, così passare dall'uno all'altro in una scena OBS non
 * sposta niente.
 */
function ScoresOverlay() {
  const { overlayToken } = Route.useParams();
  const { lang } = Route.useSearch();
  useForcedLocale(lang);
  useTransparentPage();
  const state = useOverlayState(overlayToken);
  if (!state) return null;

  return (
    <OverlayCanvas>
      <div
        style={{
          position: "absolute",
          top: SAFE,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <OverlayScores state={state} />
      </div>
    </OverlayCanvas>
  );
}
