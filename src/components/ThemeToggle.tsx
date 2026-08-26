import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import {
  getThemeMode,
  subscribeThemeMode,
  toggleThemeMode,
  type ThemeMode,
} from "@/lib/theme-mode";

/** Reactive access to the current presentation mode. */
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

/**
 * Labelled Day/Night switch — the label reads the current mode and the
 * spring-animated thumb slides between the two ends of the pill.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const mode = useThemeMode();
  const dark = mode === "dark";

  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={dark}
      whileTap={{ scale: 0.95 }}
      onClick={toggleThemeMode}
      aria-label={dark ? "Switch to day mode" : "Switch to night mode"}
      title={dark ? "Switch to Day" : "Switch to Night"}
      className={`relative flex h-10 shrink-0 items-center gap-2 rounded-full bg-lilac pl-1.5 pr-3.5 text-foreground elev-1 transition-colors hover:brightness-[1.04] ${className}`}
    >
      <span className="relative flex h-7 w-7 items-center justify-center">
        <motion.span
          layout
          className="absolute inset-0 rounded-full bg-card elev-1"
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
        />
        <motion.span
          key={mode}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 16 }}
          className="relative flex items-center justify-center text-ink-accent"
        >
          {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </motion.span>
      </span>
      <span className="text-xs font-black uppercase tracking-wider">{dark ? "Night" : "Day"}</span>
    </motion.button>
  );
}
