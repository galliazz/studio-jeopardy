import { createFileRoute } from "@tanstack/react-router";

import { useForcedLocale } from "@/i18n";
import { OverlayCanvas, OverlayQueue } from "@/components/overlay/OverlayPieces";
import {
  SAFE,
  overlaySearch,
  useOverlayState,
  useTransparentPage,
} from "@/components/overlay/overlay-state";

export const Route = createFileRoute("/overlay/buzzer/$overlayToken")({
  validateSearch: overlaySearch,
  head: () => ({
    meta: [
      { title: "Buzzer overlay — JEOPARDESTINY" },
      { name: "description", content: "Transparent buzzer queue for OBS browser sources." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Buzzer overlay — JEOPARDESTINY" },
      { property: "og:description", content: "Transparent buzzer queue for OBS browser sources." },
    ],
  }),
  component: BuzzerOverlay,
});

/**
 * Solo la coda del buzzer, ancorata in alto a sinistra (a destra in arabo)
 * dentro il margine di sicurezza: così in OBS basta ritagliare dall'angolo,
 * qualunque sia la lunghezza della coda.
 */
function BuzzerOverlay() {
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
          insetInlineStart: SAFE,
          width: 700,
          maxHeight: 1080 - SAFE * 2,
          overflow: "hidden",
        }}
      >
        <OverlayQueue state={state} align="start" />
      </div>
    </OverlayCanvas>
  );
}
