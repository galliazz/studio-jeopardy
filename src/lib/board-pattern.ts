import type { ThemeSettings } from "@/lib/types";

/**
 * Il motivo di fondo del tabellone.
 *
 * Disegnato in CSS a partire dai colori del tema, e non caricato come
 * immagine, per tre ragioni: lo vedono anche le sorgenti di OBS, che entrano
 * senza account e non possono firmare un file privato; non pesa niente da
 * scaricare; e resta coerente quando l'host cambia i colori, invece di
 * stonare con loro.
 */
export type BoardPattern = "none" | "dots" | "grid" | "diagonal" | "glow";

export const BOARD_PATTERNS: BoardPattern[] = ["none", "dots", "grid", "diagonal", "glow"];

export function patternOf(theme: Pick<ThemeSettings, "pattern">): BoardPattern {
  const value = theme.pattern;
  return BOARD_PATTERNS.includes(value as BoardPattern) ? (value as BoardPattern) : "none";
}

/**
 * Gli strati di sfondo da mettere sotto le caselle. L'accento è usato a bassa
 * opacità: il motivo deve sentirsi, non competere con le domande.
 */
export function patternStyle(theme: Pick<ThemeSettings, "pattern" | "accent" | "bg">): {
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
} {
  const ink = `color-mix(in srgb, ${theme.accent} 14%, transparent)`;
  switch (patternOf(theme)) {
    case "dots":
      return {
        backgroundImage: `radial-gradient(${ink} 1.5px, transparent 1.6px)`,
        backgroundSize: "22px 22px",
      };
    case "grid":
      return {
        backgroundImage: `linear-gradient(${ink} 1px, transparent 1px), linear-gradient(90deg, ${ink} 1px, transparent 1px)`,
        backgroundSize: "40px 40px, 40px 40px",
      };
    case "diagonal":
      return {
        backgroundImage: `repeating-linear-gradient(135deg, ${ink} 0 2px, transparent 2px 16px)`,
        backgroundSize: "auto",
      };
    case "glow":
      return {
        backgroundImage: `radial-gradient(80% 60% at 50% 0%, color-mix(in srgb, ${theme.accent} 20%, transparent), transparent 70%)`,
        backgroundSize: "auto",
        backgroundPosition: "center top",
      };
    default:
      return {};
  }
}
