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
      {/* Corner-pinned: anchored to the top-left of the canvas, never centred. */}
      <div
        style={{
          position: "absolute",
          top: SAFE,
          left: SAFE,
          display: "flex",
          flexDirection: "column",
          gap: 48,
          alignItems: "flex-start",
        }}
      >
        <OverlayScores state={state} />
        <OverlayQueue state={state} />
      </div>
    </OverlayCanvas>
  );
}
