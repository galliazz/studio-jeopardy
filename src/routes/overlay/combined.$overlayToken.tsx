import { createFileRoute } from "@tanstack/react-router";

import { OverlayBoard, OverlayCanvas, OverlayQueue, OverlayScores } from "@/components/overlay/OverlayPieces";
import { SAFE, useOverlayState, useTransparentPage } from "@/components/overlay/overlay-state";

export const Route = createFileRoute("/overlay/combined/$overlayToken")({
  head: () => ({
    meta: [
      { title: "Combined overlay — JEOPARDESTINY" },
      { name: "description", content: "Board, scores and buzzer queue on one transparent OBS canvas." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Combined overlay — JEOPARDESTINY" },
      { property: "og:description", content: "Board, scores and buzzer queue on one transparent OBS canvas." },
    ],
  }),
  component: CombinedOverlay,
});

function CombinedOverlay() {
  const { overlayToken } = Route.useParams();
  useTransparentPage();
  const state = useOverlayState(overlayToken);
  if (!state) return null;

  return (
    <OverlayCanvas>
      {/* Three isolated regions with generous gaps so each can be cropped alone. */}
      <div style={{ position: "absolute", top: SAFE, left: 0, width: "100%", display: "flex", justifyContent: "center" }}>
        <OverlayScores state={state} />
      </div>

      {/* Board: centre of the canvas and the dominant block. */}
      <div
        style={{
          position: "absolute",
          top: 260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <OverlayBoard state={state} size={700} />
      </div>

      {/* Queue: right side, clear of the board so a crop isolates it. */}
      <div style={{ position: "absolute", top: 320, right: SAFE, width: 480 }}>
        <OverlayQueue state={state} />
      </div>
    </OverlayCanvas>
  );
}
