/**
 * Il tabellone mentre arriva.
 *
 * Prima c'era un quadratino che pulsava al centro dello schermo: diceva
 * «aspetta», non diceva cosa. Questa è la stessa griglia che comparirà fra un
 * istante, in grigio: l'occhio trova già le colonne al posto giusto e il
 * passaggio non sposta niente.
 */
export function BoardSkeleton({ withColumns = false }: { withColumns?: boolean }) {
  const board = (
    <div
      aria-hidden
      className="grid aspect-[5/5.4] w-full max-w-3xl grid-cols-5 grid-rows-[auto_repeat(5,1fr)] gap-2 rounded-[32px] bg-muted/40 p-3"
    >
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-[14px] bg-foreground/10"
          /* Ritardi diversi: la griglia respira invece di lampeggiare tutta
             insieme, che a schermo intero dà fastidio. */
          style={{ animationDelay: `${(i % 7) * 90}ms` }}
        />
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen w-full items-center justify-center gap-4 p-4" role="status">
      {withColumns && (
        <div className="hidden w-full max-w-[22rem] flex-col gap-3 min-[1100px]:flex">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-[28px] bg-muted/50"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      )}
      {board}
      {withColumns && (
        <div className="hidden h-[60vh] w-full max-w-[22rem] animate-pulse rounded-[28px] bg-muted/50 min-[1100px]:block" />
      )}
    </div>
  );
}
