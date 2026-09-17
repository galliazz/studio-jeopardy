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
 *
 * Ogni misura qui dentro è una frazione della board e basta: nessun tetto in
 * pixel, nessun tetto in rem, nessun moltiplicatore per la tela. Disegnata a
 * 556 pixel o a 942, la griglia ha le stesse proporzioni — e l'unica cosa che
 * le cambia è il moltiplicatore che l'host sceglie nella pagina di Edit.
 *
 * Non è sempre stato così. Sulla trasmissione questo componente riceveva uno
 * `scale` che RISCRIVEVA il `fontSize` con un numero di pixel fisso, buttando
 * via la scelta fatta in Edit, e misurava i suoi `cqmin` sulla tela 1920x1080
 * invece che su sé stesso. Il risultato: nella vista combinata, testo calcolato
 * per una tela intera dentro una board da 556 pixel — "MISCELLANEA" andava a
 * capo e "1000" usciva dalla casella.
 */
import { motion, type MotionStyle } from "framer-motion";
import { boardTextCss, type ThemeSettings } from "@/lib/types";

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
  fill = false,
}: {
  theme: ThemeSettings;
  categories: { id: string; title: string }[];
  tiles: BoardTile[];
  usedIds: Set<string>;
  disabled?: boolean;
  onOpenTile?: ((tileId: string) => void) | undefined;
  /** Fill the caller's box exactly instead of imposing the 5/5.4 ratio. */
  fill?: boolean;
}) {
  const readOnly = !onOpenTile;

  /*
   * Font e proporzioni vengono da quanto l'host ha impostato nella pagina di
   * Edit, e da niente altro.
   *
   * I coefficienti sono tarati su come la console disegna la board oggi: a 942
   * pixel di larghezza le cifre escono a 52px e le categorie a 15.2px, cioè
   * 5.5% e 1.6% del lato corto. Espressi così, quegli stessi rapporti valgono a
   * ogni dimensione invece che solo a quella.
   */
  const headerFont = fill ? boardTextCss(theme, "categories", null, 1.6) : null;
  const tileFont = fill ? boardTextCss(theme, "numbers", null, 5.5) : null;

  return (
    <div
      className={
        fill
          ? "h-full w-full overflow-hidden elev-2 [container-type:size]"
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
        className={`flex h-full w-full flex-col ${fill ? "p-[2.2cqmin]" : "p-2.5 sm:p-5"}`}
      >
        <div
          className={`grid flex-1 grid-cols-5 grid-rows-[auto_repeat(5,1fr)] ${
            fill ? "gap-[1.2cqmin]" : "gap-1 sm:gap-2.5"
          }`}
        >
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-center justify-center overflow-hidden text-center font-bold uppercase leading-tight tracking-wide ${
                fill
                  ? "min-h-[6cqmin] p-[0.8cqmin]"
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
              // `boardTextCss` restituisce proprietà facoltative, e con
              // exactOptionalPropertyTypes MotionStyle non ne accetta l'`undefined`.
              // A runtime una chiave non impostata è identica a una chiave assente:
              // l'annotazione dice questo, non nasconde niente.
              const tileStyle = {
                backgroundColor: used ? "transparent" : theme.card,
                borderRadius: theme.radius,
                color: used ? "transparent" : theme.accent,
                opacity: used ? 0.35 : 1,
                ...tileFont,
                boxShadow: used
                  ? "none"
                  : `0 2px 6px -2px color-mix(in srgb, ${theme.accent} 22%, transparent), 0 10px 22px -14px color-mix(in srgb, ${theme.accent} 30%, transparent)`,
              } as MotionStyle;
              return (
                <motion.button
                  key={tile.id}
                  {...(used || readOnly ? {} : { whileTap: { scale: 0.94 } })}
                  disabled={used || disabled || readOnly}
                  onClick={onOpenTile ? () => onOpenTile(tile.id) : undefined}
                  className={`flex items-center justify-center overflow-hidden font-display font-black tracking-tight transition-all ${
                    fill ? "min-h-0" : "min-h-12 text-base sm:text-3xl"
                  }`}
                  style={tileStyle}
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
