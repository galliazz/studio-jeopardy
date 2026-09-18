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
 * Il margine laterale dell'app, uno solo per la barra e per il corpo di ogni
 * pagina.
 *
 * Prima la barra aveva un tetto a 1600 pixel e un margine di 32, mentre il
 * corpo sotto aveva 24 di margine e — a seconda della pagina — nessun tetto
 * (console, editor) o un tetto a 1440 (Studio). Su uno schermo da 1750 il
 * "← Close" stava a 107 pixel dal bordo e la colonna sotto a 24: il bordo
 * sinistro dei comandi e quello del contenuto non si incontravano mai.
 *
 * La barra non ha più tetto, come in Canva. Mettere il tetto al corpo avrebbe
 * allineato le cose rimpicciolendo la board della console sugli schermi
 * grandi: su un 2560 sarebbe scesa da 1290 a 800 pixel.
 */
export const APP_GUTTER = "px-4 sm:px-6 lg:px-8";

/** Il contenuto della barra: stesso margine del corpo, a tutta larghezza. */
export const APP_BAR_INNER = `min-h-16 w-full items-center gap-3 ${APP_GUTTER}`;

/**
 * Il bottone di navigazione a sinistra della barra — "← Studio", "← Close",
 * "← Home". Uno solo: prima quello di Edit era alto 44 e quello della console
 * 48, e passando da una pagina all'altra il bordo del bottone saltava.
 */
export const NAV_BUTTON =
  "flex h-12 shrink-0 items-center gap-2 rounded-full border border-foreground/20 px-4 text-sm font-bold transition-colors hover:bg-foreground/5";
