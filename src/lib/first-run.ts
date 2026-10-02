/**
 * La guida del primo giro.
 *
 * Chi arriva per la prima volta trova lo Studio con dentro un tabellone demo e
 * nessuna indicazione su cosa farne. Le tre cose da sapere sono poche e sempre
 * le stesse — apri, premi Gioca, detta il codice — e stanno in una scheda che
 * sparisce da sola appena non serve più.
 *
 * Qui c'è solo la decisione «si mostra o no», perché è quella che si sbaglia:
 * una scheda di benvenuto che torna a ogni visita è peggio che non averla.
 */

const KEY = "jd-first-run-done";

export interface FirstRunInput {
  /** Quanti tabelloni ha in libreria. */
  boards: number;
  /** Ha già chiuso la scheda una volta? */
  dismissed: boolean;
  /** Ha già condotto almeno una partita? */
  hasPlayed: boolean;
}

/**
 * Si mostra solo a chi non ha ancora fatto niente.
 *
 * Il secondo tabellone, o la prima partita, dicono che la cosa è chiara: da lì
 * in poi la scheda sarebbe soltanto una riga in più fra l'host e la sua
 * libreria, e sparisce senza che nessuno debba chiuderla.
 */
export function shouldShowFirstRun({ boards, dismissed, hasPlayed }: FirstRunInput): boolean {
  if (dismissed || hasPlayed) return false;
  return boards > 0 && boards <= 1;
}

/** Il ricordo sta nel browser: è una scheda, non un dato dell'account. */
export function firstRunDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    /* Navigazione privata o cookie bloccati: meglio mostrarla di nuovo che
       rompere la pagina per una scheda di benvenuto. */
    return false;
  }
}

export function dismissFirstRun(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* Se non si può ricordare, pazienza: la scheda si richiude lo stesso. */
  }
}
