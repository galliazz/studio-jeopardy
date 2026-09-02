/**
 * The board surface: the single implementation shared by the Host Console and
 * the OBS overlays. Omitting onOpenTile renders the read-only mirror, so the
 * board colour, radii, tile contrast and typography can never drift apart.
 */
import { motion } from "framer-motion";
import type { ThemeSettings } from "@/lib/types";

export interface BoardTile {
  id: string;
  category_id: string;
  row_index: number;
  points: number;
}

export function BoardGrid({
  theme,
  categories,
  tiles,
  usedIds,
  disabled = false,
  onOpenTile,
  scale = 1,
}: {
  theme: ThemeSettings;
  categories: { id: string; title: string }[];
  tiles: BoardTile[];
  usedIds: Set<string>;
  disabled?: boolean;
  onOpenTile?: ((tileId: string) => void) | undefined;
  /** Multiplier for the broadcast canvas, where 1080p needs heavier type. */
  scale?: number;
}) {
  const readOnly = !onOpenTile;

  return (
    <div
      className="flex h-full max-h-full w-auto max-w-full flex-col p-2.5 elev-2 sm:p-5"
      style={{
        backgroundColor: theme.bg,
        borderRadius: theme.radius + 8,
        aspectRatio: "5 / 5.4",
      }}
    >
      <div className="grid flex-1 grid-cols-5 grid-rows-[auto_repeat(5,1fr)] gap-1 sm:gap-2.5">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex min-h-10 items-center justify-center overflow-hidden p-1 text-center text-[8px] font-bold uppercase leading-tight tracking-wide sm:min-h-16 sm:p-1.5 sm:text-xs"
            style={{
              /* Headers are the board colour shifted toward the accent so
                 they separate from the tiles by ~6% luminance. */
              backgroundColor: `color-mix(in srgb, ${theme.card} 88%, ${theme.accent} 12%)`,
              borderRadius: theme.radius * 0.6,
              color: theme.accent,
              ...(scale !== 1 ? { fontSize: 20 * scale } : null),
            }}
          >
            <span className="line-clamp-2 w-full break-words">{cat.title}</span>
          </div>
        ))}
        {[0, 1, 2, 3, 4].map((row) =>
          categories.map((cat) => {
            const tile = tiles.find((t) => t.category_id === cat.id && t.row_index === row);
            if (!tile) return <div key={`${cat.id}-${row}`} />;
            const used = usedIds.has(tile.id);
            return (
              <motion.button
                key={tile.id}
                {...(used || readOnly ? {} : { whileTap: { scale: 0.94 } })}
                disabled={used || disabled || readOnly}
                onClick={onOpenTile ? () => onOpenTile(tile.id) : undefined}
                className="flex min-h-12 items-center justify-center font-display text-base font-black tracking-tight transition-all sm:text-3xl"
                style={{
                  backgroundColor: used ? "transparent" : theme.card,
                  borderRadius: theme.radius,
                  color: used ? "transparent" : theme.accent,
                  opacity: used ? 0.35 : 1,
                  ...(scale !== 1 ? { fontSize: 44 * scale } : null),
                  boxShadow: used
                    ? "none"
                    : `0 2px 6px -2px color-mix(in srgb, ${theme.accent} 22%, transparent), 0 10px 22px -14px color-mix(in srgb, ${theme.accent} 30%, transparent)`,
                }}
              >
                {used ? "✓" : tile.points}
              </motion.button>
            );
          }),
        )}
      </div>
    </div>
  );
}
