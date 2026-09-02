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

  /* Three isolated regions with clear empty space between them, so each copy
     of the browser source can be cropped to exactly one region. */
  const boardHeight = 600;
  return (
    <OverlayCanvas>
      {/* Scores: top centre. */}
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

      {/* Board and clue: centre of the canvas and the dominant block. */}
      <div
        style={{
          position: "absolute",
          top: 270,
          left: "50%",
          transform: "translateX(-50%)",
          height: boardHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <OverlayBoard state={state} width={Math.round(boardHeight * (5 / 5.4))} height={boardHeight} />
      </div>

      {/* Queue: right column, clear of the board so a crop isolates it. */}
      <div
        style={{
          position: "absolute",
          top: 270,
          right: SAFE,
          width: 544,
          maxHeight: 1080 - 270 - SAFE,
          overflow: "hidden",
        }}
      >
        <OverlayQueue state={state} />
      </div>
    </OverlayCanvas>
  );
}
