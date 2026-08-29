import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useObsState } from "@/hooks/use-obs-state";
import { ObsBoardGrid, ObsQueueList, ObsScoreboard, useObsTheme, useTransparentBody } from "@/components/ObsPieces";

export const Route = createFileRoute("/obs/combined")({
  validateSearch: (search) => z.object({ code: z.string().catch("") }).parse(search),
  head: () => ({ meta: [{ title: "OBS Combined Overlay — JEOPARDESTINY" }] }),
  component: ObsCombinedPage,
});

function ObsCombinedPage() {
  const { code } = Route.useSearch();
  useTransparentBody();
  const state = useObsState(code);
  const theme = useObsTheme(state);

  if (!state || !theme) return null;

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center gap-4 p-4">
      <ObsScoreboard state={state} />
      <div className="w-full max-w-[1000px]">
        <ObsBoardGrid
          categories={state.categories}
          tiles={state.tiles}
          usedTileIds={state.session.used_tile_ids}
          theme={theme}
        />
      </div>
      <div className="w-full max-w-xs">
        <ObsQueueList state={state} />
      </div>
    </div>
  );
}
