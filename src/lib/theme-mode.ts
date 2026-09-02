/**
 * Presentation-only dark/light mode store.
 * Toggles the `dark` class on <html> and remembers the choice locally.
 * No game logic, state or data depends on this.
 */
export type ThemeMode = "light" | "dark";
/** What the user picked; "system" follows prefers-color-scheme. */
export type ThemePreference = ThemeMode | "system";

const KEY = "jeopardestiny:mode";
let mode: ThemeMode = "light";
let preference: ThemePreference = "system";
const listeners = new Set<() => void>();

function systemMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(next: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", next === "dark");
  document.documentElement.style.colorScheme = next;
}

export function initThemeMode() {
  if (typeof window === "undefined") return;
  const stored = window.localStorage.getItem(KEY);
  preference = stored === "dark" || stored === "light" || stored === "system" ? stored : "system";
  mode = preference === "system" ? systemMode() : preference;
  apply(mode);
  // Keep following the OS while the preference is "system".
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (preference !== "system") return;
    mode = systemMode();
    apply(mode);
    listeners.forEach((l) => l());
  });
  listeners.forEach((l) => l());
}

export function getThemeMode(): ThemeMode {
  return mode;
}

export function getThemePreference(): ThemePreference {
  return preference;
}

export function setThemePreference(next: ThemePreference) {
  preference = next;
  mode = next === "system" ? systemMode() : next;
  apply(mode);
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable — mode still applies for this session */
  }
  listeners.forEach((l) => l());
}

export function setThemeMode(next: ThemeMode) {
  setThemePreference(next);
}

export function toggleThemeMode() {
  setThemeMode(mode === "dark" ? "light" : "dark");
}

export function subscribeThemeMode(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---------- Board palette adaptation (visual only) ---------- */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360 / 360;
  const f = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) r = g = b = l;
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3);
  }
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Re-map a pastel color to its dark-pastel counterpart at a target lightness. */
function toDark(hex: string, lightness: number, sat = 0.22): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [h, s] = rgbToHsl(...rgb);
  return hslToHex(h, Math.min(Math.max(s, 0.12), sat), lightness);
}

/**
 * Board surfaces come from the saved game theme (hex). In dark mode we present
 * the same hues at deep-pastel lightness. Data is never modified.
 */
export function darkBoardColors(
  theme: { bg: string; card: string; accent: string },
  isDark: boolean,
) {
  if (!isDark) return theme;
  return {
    ...theme,
    bg: toDark(theme.bg, 0.13, 0.18),
    card: toDark(theme.card, 0.24, 0.16),
    accent: toDark(theme.accent, 0.84, 0.14),
  };
}

/**
 * Broadcast surfaces (OBS overlays) have no session and no stored preference,
 * so they pin dark mode for the lifetime of the page without persisting it.
 * A light overlay is never correct.
 */
export function forceDarkMode() {
  preference = "dark";
  mode = "dark";
  apply("dark");
  listeners.forEach((l) => l());
}
