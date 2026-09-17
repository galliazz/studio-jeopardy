/**
 * La barra nera in cima, definita una volta sola.
 *
 * Studio, la console e l'editor la disegnavano ognuno per conto suo: 64 pixel
 * qui, 69 di là, e due tetti di larghezza diversi (1440 contro 1600). Passando
 * da una schermata all'altra la barra cambiava spessore e i comandi ai lati
 * scattavano di venti pixel. Sono le due cose che si notano di più fra una
 * pagina e l'altra, perché restano ferme mentre tutto il resto cambia.
 *
 * `min-h-16` e non `h-16`: la console sotto gli 840px manda i punteggi a capo
 * su una riga propria, e una barra ad altezza fissa glieli taglierebbe. Lì
 * cresce, ma il passo di partenza è lo stesso per tutti.
 */
export const APP_BAR =
  "z-50 shrink-0 border-b border-foreground/10 bg-background/90 backdrop-blur-md";

/**
 * Il contenuto della barra: stesso tetto di larghezza e stesso margine laterale
 * ovunque, così i comandi non si appiccicano al bordo dello schermo e cadono
 * sulla stessa verticale in tutte le pagine.
 */
export const APP_BAR_INNER =
  "mx-auto min-h-16 w-full max-w-[1600px] items-center gap-3 px-5 sm:px-8";
