/**
 * The board surface: the single implementation shared by the Host Console and
 * the OBS overlays. Omitting onOpenTile renders the read-only mirror, so the
 * board colour, radii, tile contrast and typography can never drift apart.
 *
 * In `fill` mode the grid takes the whole box the caller gives it and becomes a
 * size container: padding, gaps and type are then expressed in `cqmin`, so they
 * follow the board's real size instead of the viewport's. Sizing the numbers by
 * viewport breakpoints made them look enormous whenever the window was wide but
 * short, because the board shrank and the type did not.
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
  fill = false,
  ownContainer = true,
}: {
  theme: ThemeSettings;
  categories: { id: string; title: string }[];
  tiles: BoardTile[];
  usedIds: Set<string>;
  disabled?: boolean;
  onOpenTile?: ((tileId: string) => void) | undefined;
  /** Multiplier for the broadcast canvas, where 1080p needs heavier type. */
  scale?: number;
  /** Fill the caller's box exactly instead of imposing the 5/5.4 ratio. */
  fill?: boolean;
  /**
   * Whether this board is the box its own `cqmin` lengths measure. The Host
   * Console says yes. The broadcast says NO and lets them resolve against the
   * 1920x1080 canvas instead, which is what the fixed pixel spacing used to be
   * calibrated against — so the overlay keeps exactly the geometry it had.
   */
  ownContainer?: boolean;
}) {
  const readOnly = !onOpenTile;

  /* An explicit scale wins; otherwise fill mode sizes type off the board. */
  const headerFont =
    scale !== 1
      ? { fontSize: 20 * scale }
      : fill
        ? { fontSize: "clamp(0.5rem, 2.6cqmin, 0.95rem)" }
        : null;
  const tileFont =
    scale !== 1
      ? { fontSize: 44 * scale }
      : fill
        ? { fontSize: "clamp(0.7rem, 7.5cqmin, 3.25rem)" }
        : null;

  return (
    <div
      className={
        fill
          ? `h-full w-full overflow-hidden elev-2 ${ownContainer ? "[container-type:size]" : ""}`
          : "flex h-full max-h-full w-auto max-w-full flex-col elev-2"
      }
      style={{
        backgroundColor: theme.bg,
        borderRadius: theme.radius + 8,
        ...(fill ? null : { aspectRatio: "5 / 5.4" }),
      }}
    >
      {/*
       * The padding lives one level in: container units resolve against the
       * nearest ANCESTOR container, so the box that declares `container-type`
       * cannot size itself with them.
       */}
      <div
        className={`flex h-full w-full flex-col ${
          fill ? "p-[clamp(6px,2.2cqmin,20px)]" : "p-2.5 sm:p-5"
        }`}
      >
        <div
          className={`grid flex-1 grid-cols-5 grid-rows-[auto_repeat(5,1fr)] ${
            fill ? "gap-[clamp(3px,1.2cqmin,10px)]" : "gap-1 sm:gap-2.5"
          }`}
        >
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-center justify-center overflow-hidden text-center font-bold uppercase leading-tight tracking-wide ${
                fill
                  ? "min-h-[6cqmin] p-[clamp(2px,0.8cqmin,6px)]"
                  : "min-h-10 p-1 text-[8px] sm:min-h-16 sm:p-1.5 sm:text-xs"
              }`}
              style={{
                /* Headers are the board colour shifted toward the accent so
                   they separate from the tiles by ~6% luminance. */
                backgroundColor: `color-mix(in srgb, ${theme.card} 88%, ${theme.accent} 12%)`,
                borderRadius: theme.radius * 0.6,
                color: theme.accent,
                ...headerFont,
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
                  className={`flex items-center justify-center overflow-hidden font-display font-black tracking-tight transition-all ${
                    fill ? "min-h-0" : "min-h-12 text-base sm:text-3xl"
                  }`}
                  style={{
                    backgroundColor: used ? "transparent" : theme.card,
                    borderRadius: theme.radius,
                    color: used ? "transparent" : theme.accent,
                    opacity: used ? 0.35 : 1,
                    ...tileFont,
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
    </div>
  );
}
