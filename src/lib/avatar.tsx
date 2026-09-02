import { useEffect, useState } from "react";
import {
  Cat,
  Crown,
  Dog,
  Ghost,
  Rocket,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { useSignedUrl } from "@/lib/media";

/**
 * An avatar value is stored in `profiles.avatar_url` as either
 *  - `preset:<id>`  → one of the built-in illustrated presets, or
 *  - a storage path → an uploaded photo in the private `avatars` bucket.
 * `null` falls back to the initial-letter circle.
 */
export type AvatarValue = string | null;

export const AVATAR_PRESETS: { id: string; icon: LucideIcon; bg: string; label: string }[] = [
  { id: "star", icon: Star, bg: "bg-butter", label: "Avatar option 1: star" },
  { id: "rocket", icon: Rocket, bg: "bg-sky", label: "Avatar option 2: rocket" },
  { id: "cat", icon: Cat, bg: "bg-peach", label: "Avatar option 3: cat" },
  { id: "dog", icon: Dog, bg: "bg-coral", label: "Avatar option 4: dog" },
  { id: "ghost", icon: Ghost, bg: "bg-lilac", label: "Avatar option 5: ghost" },
  { id: "crown", icon: Crown, bg: "bg-blush", label: "Avatar option 6: crown" },
  { id: "sun", icon: Sun, bg: "bg-mint", label: "Avatar option 7: sun" },
  { id: "bolt", icon: Zap, bg: "bg-butter", label: "Avatar option 8: lightning bolt" },
  { id: "trophy", icon: Trophy, bg: "bg-peach", label: "Avatar option 9: trophy" },
  { id: "sparkles", icon: Sparkles, bg: "bg-lilac", label: "Avatar option 10: sparkles" },
];

export function presetOf(value: AvatarValue) {
  if (!value || !value.startsWith("preset:")) return null;
  return AVATAR_PRESETS.find((p) => p.id === value.slice(7)) ?? null;
}

/* ---------- tiny reactive store so every surface updates instantly ---------- */

let current: AvatarValue = null;
const listeners = new Set<() => void>();

export function getAvatarValue() {
  return current;
}

export function setAvatarValue(value: AvatarValue) {
  current = value;
  listeners.forEach((l) => l());
}

/** Reads the live avatar, seeding the store from a server value once. */
export function useAvatarValue(seed?: AvatarValue): AvatarValue {
  const [, force] = useState(0);
  useEffect(() => {
    if (seed !== undefined && current === null && seed) setAvatarValue(seed);
  }, [seed]);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return current;
}

/** Renders a preset, an uploaded photo, or the initial-letter fallback. */
export function AccountAvatar({
  value,
  initial,
  className = "h-10 w-10",
  iconClassName = "h-5 w-5",
}: {
  value: AvatarValue;
  initial: string;
  className?: string;
  iconClassName?: string;
}) {
  const preset = presetOf(value);
  const photoPath = value && !value.startsWith("preset:") ? value : null;
  const photoUrl = useSignedUrl("avatars", photoPath);

  if (preset) {
    const Icon = preset.icon;
    return (
      <span
        className={`flex items-center justify-center rounded-full text-foreground ${preset.bg} ${className}`}
      >
        <Icon className={iconClassName} />
      </span>
    );
  }
  if (photoPath && photoUrl) {
    return (
      <img
        src={photoUrl}
        alt="Your avatar"
        className={`rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-lilac font-display font-black text-foreground ${className}`}
    >
      {initial}
    </span>
  );
}
