import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useObsState } from "@/hooks/use-obs-state";
import { ObsBoardGrid, useObsTheme, useTransparentBody } from "@/components/ObsPieces";

export const Route = createFileRoute("/obs/board")({
  validateSearch: (search) => z.object({ code: z.string().catch("") }).parse(search),
  head: () => ({ meta: [{ title: "OBS Board Overlay — JEOPARDESTINY" }] }),
  component: ObsBoardPage,
});

function ObsBoardPage() {
  const { code } = Route.useSearch();
  useTransparentBody();
  const state = useObsState(code);
  const theme = useObsTheme(state);

  if (!state || !theme) return null;

  return (
    <div className="flex min-h-[100svh] items-center justify-center p-4">
      <div className="w-full max-w-[1100px]">
        <ObsBoardGrid
          categories={state.categories}
          tiles={state.tiles}
          usedTileIds={state.session.used_tile_ids}
          theme={theme}
        />
      </div>
    </div>
  );
}
