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

export function ThemeToggle({ className = "" }: { className?: string }) {
  const mode = useThemeMode();
  const dark = mode === "dark";

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={toggleThemeMode}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-ink-accent elev-1 transition-colors hover:bg-lilac ${className}`}
    >
      <motion.span
        key={mode}
        initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="flex items-center justify-center"
      >
        {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      </motion.span>
    </motion.button>
  );
}
