/**
 * Quanto si legge un colore sopra un altro.
 *
 * Serve ai colori che sceglie l'host: il tema dell'applicazione lo
 * controlliamo noi, il tabellone no. Un accento troppo chiaro su una casella
 * chiara è illeggibile in diretta, e chi lo sceglie se ne accorge quando il
 * pubblico non legge più le domande.
 *
 * Il calcolo è quello delle linee guida WCAG 2: luminanza relativa e rapporto
 * (L1 + 0,05) / (L2 + 0,05). La soglia per il testo normale è 4,5; per il
 * testo grande, come i numeri della board, basta 3.
 */

/** Soglia per il testo piccolo (WCAG AA). */
export const CONTRAST_TEXT = 4.5;
/** Soglia per il testo grande: i numeri delle caselle stanno qui. */
export const CONTRAST_LARGE_TEXT = 3;

/** `#abc`, `#aabbcc` o `#aabbccdd`; tutto il resto torna null. */
export function parseHex(color: string): [number, number, number] | null {
  const hex = color.trim().replace(/^#/, "");
  const full =
    hex.length === 3 || hex.length === 4
      ? hex
          .slice(0, 3)
          .split("")
          .map((c) => c + c)
          .join("")
      : hex.length === 6 || hex.length === 8
        ? hex.slice(0, 6)
        : null;
  if (!full || !/^[0-9a-f]{6}$/i.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function luminance([r, g, b]: [number, number, number]): number {
  const [rl, gl, bl] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** Il rapporto fra due colori, da 1 (identici) a 21 (nero su bianco). */
export function contrastRatio(a: string, b: string): number | null {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return null;
  const la = luminance(ca);
  const lb = luminance(cb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Arrotondato a un decimale, come si scrive nelle linee guida. */
export function contrastLabel(ratio: number): string {
  return `${Math.round(ratio * 10) / 10}:1`;
}

export function meetsContrast(ratio: number | null, large = false): boolean {
  if (ratio === null) return true; // colori che non sappiamo leggere: non si avvisa a vuoto
  return ratio >= (large ? CONTRAST_LARGE_TEXT : CONTRAST_TEXT);
}
