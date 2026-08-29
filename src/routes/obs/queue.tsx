import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useObsState } from "@/hooks/use-obs-state";
import { ObsQueueList, ObsScoreboard, useTransparentBody } from "@/components/ObsPieces";

export const Route = createFileRoute("/obs/queue")({
  validateSearch: (search) => z.object({ code: z.string().catch("") }).parse(search),
  head: () => ({ meta: [{ title: "OBS Queue Overlay — JEOPARDESTINY" }] }),
  component: ObsQueuePage,
});

function ObsQueuePage() {
  const { code } = Route.useSearch();
  useTransparentBody();
  const state = useObsState(code);

  if (!state) return null;

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-start gap-4 p-4">
      <ObsScoreboard state={state} />
      <div className="w-full max-w-xs">
        <ObsQueueList state={state} />
      </div>
    </div>
  );
}
