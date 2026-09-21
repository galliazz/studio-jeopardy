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

import { useT, type MessageKey } from "@/i18n";
import { useSignedUrl } from "@/lib/media";

/**
 * An avatar value is stored in `profiles.avatar_url` as either
 *  - `preset:<id>`  → one of the built-in illustrated presets, or
 *  - a storage path → an uploaded photo in the private `avatars` bucket.
 * `null` falls back to the initial-letter circle.
 */
export type AvatarValue = string | null;

/** Il nome letto dagli screen reader si traduce quando si mostra: qui c'è la chiave. */
export const AVATAR_PRESETS: {
  id: string;
  icon: LucideIcon;
  bg: string;
  labelKey: MessageKey;
}[] = [
  { id: "star", icon: Star, bg: "bg-butter", labelKey: "avatar.presets.star" },
  { id: "rocket", icon: Rocket, bg: "bg-sky", labelKey: "avatar.presets.rocket" },
  { id: "cat", icon: Cat, bg: "bg-peach", labelKey: "avatar.presets.cat" },
  { id: "dog", icon: Dog, bg: "bg-coral", labelKey: "avatar.presets.dog" },
  { id: "ghost", icon: Ghost, bg: "bg-lilac", labelKey: "avatar.presets.ghost" },
  { id: "crown", icon: Crown, bg: "bg-blush", labelKey: "avatar.presets.crown" },
  { id: "sun", icon: Sun, bg: "bg-mint", labelKey: "avatar.presets.sun" },
  { id: "bolt", icon: Zap, bg: "bg-butter", labelKey: "avatar.presets.bolt" },
  { id: "trophy", icon: Trophy, bg: "bg-peach", labelKey: "avatar.presets.trophy" },
  { id: "sparkles", icon: Sparkles, bg: "bg-lilac", labelKey: "avatar.presets.sparkles" },
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
  const t = useT();
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
        alt={t("avatar.yours")}
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
