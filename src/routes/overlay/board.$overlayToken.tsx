import { createFileRoute } from "@tanstack/react-router";

import { OverlayBoard, OverlayCanvas } from "@/components/overlay/OverlayPieces";
import { SAFE, useOverlayState, useTransparentPage } from "@/components/overlay/overlay-state";

export const Route = createFileRoute("/overlay/board/$overlayToken")({
  head: () => ({
    meta: [
      { title: "Board overlay — JEOPARDESTINY" },
      { name: "description", content: "Transparent board and clue mirror for OBS browser sources." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Board overlay — JEOPARDESTINY" },
      { property: "og:description", content: "Transparent board and clue mirror for OBS browser sources." },
    ],
  }),
  component: BoardOverlay,
});

function BoardOverlay() {
  const { overlayToken } = Route.useParams();
  useTransparentPage();
  const state = useOverlayState(overlayToken);
  if (!state) return null;

  const height = 1080 - SAFE * 2;
  return (
    <OverlayCanvas>
      <div
        style={{
          position: "absolute",
          inset: SAFE,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <OverlayBoard state={state} width={Math.round(height * (5 / 5.4))} height={height} />
      </div>
    </OverlayCanvas>
  );
}
