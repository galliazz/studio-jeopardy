import { useEffect, useMemo } from "react";
import { themeOf, teamName } from "@/lib/types";
import { darkBoardColors } from "@/lib/theme-mode";
import { useThemeMode } from "@/components/ThemeToggle";
import type { ObsState } from "@/hooks/use-obs-state";

type ObsTileLite = ObsState["tiles"][number];

/** Strips the page's opaque background so the OBS browser source stays transparent. */
export function useTransparentBody() {
  useEffect(() => {
    const body = document.body;
    const prevBg = body.style.backgroundColor;
    const prevImg = body.style.backgroundImage;
    body.style.backgroundColor = "transparent";
    body.style.backgroundImage = "none";
    return () => {
      body.style.backgroundColor = prevBg;
      body.style.backgroundImage = prevImg;
    };
  }, []);
}

export function useObsTheme(state: ObsState | null) {
  const isDark = useThemeMode() === "dark";
  return useMemo(() => {
    if (!state) return null;
    return darkBoardColors(themeOf(state.game), isDark) as ReturnType<typeof themeOf>;
  }, [state, isDark]);
}

export function ObsBoardGrid({
  categories,
  tiles,
  usedTileIds,
  theme,
}: {
  categories: ObsState["categories"];
  tiles: ObsTileLite[];
  usedTileIds: string[];
  theme: ReturnType<typeof themeOf>;
}) {
  const usedSet = new Set(usedTileIds);
  return (
    <div
      className="w-full p-2.5 elev-2 sm:p-4"
      style={{ backgroundColor: theme.bg, borderRadius: theme.radius + 8 }}
    >
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex min-h-9 items-center justify-center overflow-hidden p-1 text-center text-[8px] font-bold uppercase leading-tight tracking-wide sm:min-h-12 sm:text-[11px]"
            style={{ backgroundColor: theme.card, borderRadius: theme.radius * 0.6, color: theme.accent }}
          >
            <span className="line-clamp-2 w-full break-words">{cat.title}</span>
          </div>
        ))}
        {[0, 1, 2, 3, 4].map((row) =>
          categories.map((cat) => {
            const tile = tiles.find((t) => t.category_id === cat.id && t.row_index === row);
            if (!tile) return <div key={`${cat.id}-${row}`} />;
            const used = usedSet.has(tile.id);
            return (
              <div
                key={tile.id}
                className="flex aspect-square items-center justify-center font-display text-sm font-black tracking-tight sm:aspect-[4/3] sm:text-xl"
                style={{
                  backgroundColor: used ? "transparent" : theme.card,
                  borderRadius: theme.radius,
                  color: used ? "transparent" : theme.accent,
                  opacity: used ? 0.3 : 1,
                }}
              >
                {used ? "✓" : tile.points}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

export function ObsScoreboard({ state }: { state: ObsState }) {
  const theme = themeOf(state.game);
  return (
    <div className="flex items-center justify-center gap-3">
      <ObsTeamPill team="alpha" name={teamName(theme, "alpha")} score={state.session.score_alpha} />
      <ObsTeamPill team="bravo" name={teamName(theme, "bravo")} score={state.session.score_bravo} />
    </div>
  );
}

function ObsTeamPill({ team, name, score }: { team: "alpha" | "bravo"; name: string; score: number }) {
  return (
    <div
      className={`rounded-full px-5 py-2.5 text-center elev-1 ${team === "alpha" ? "bg-team-alpha" : "bg-team-bravo"}`}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{name}</p>
      <p className="font-display text-xl font-black leading-none">{score}</p>
    </div>
  );
}

export function ObsQueueList({ state }: { state: ObsState }) {
  const tileQueue = useMemo(() => {
    if (!state.session.current_tile_id) return [];
    return state.queue
      .filter((q) => q.tile_id === state.session.current_tile_id && (q.status === "queued" || q.status === "active"))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [state.queue, state.session.current_tile_id]);

  if (tileQueue.length === 0) return null;

  return (
    <ol className="space-y-1.5">
      {tileQueue.map((entry, i) => {
        const player = state.players.find((p) => p.id === entry.player_id);
        if (!player) return null;
        const isActive = entry.status === "active";
        return (
          <li
            key={entry.id}
            className={`flex items-center gap-2.5 rounded-[22px] px-3 py-2 elev-1 ${isActive ? "bg-butter" : "bg-card"}`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center font-display text-[10px] font-black scallop bg-peach">
              #{i + 1}
            </span>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center text-sm scallop ${
                player.team === "alpha" ? "bg-team-alpha" : "bg-team-bravo"
              }`}
            >
              {player.avatar}
            </span>
            <span className="truncate text-sm font-bold text-foreground">{player.name}</span>
          </li>
        );
      })}
    </ol>
  );
}
