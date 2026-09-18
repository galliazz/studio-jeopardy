import { useEffect, useState } from "react";
import { getThemeMode, subscribeThemeMode, type ThemeMode } from "@/lib/theme-mode";

/**
 * Reactive access to the current presentation mode.
 *
 * Il file si chiama ancora ThemeToggle per non spostare gli import delle tre
 * pagine che usano questo hook. L'interruttore giorno/notte che conteneva non
 * esiste più: stava nella pillola galleggiante e nella barra di Edit, e il
 * tema adesso si sceglie in un posto solo — le impostazioni.
 */
export function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>(() => getThemeMode());
  useEffect(() => {
    const unsub = subscribeThemeMode(() => setMode(getThemeMode()));
    return () => {
      unsub();
    };
  }, []);
  return mode;
}
