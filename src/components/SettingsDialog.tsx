import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Volume2, Pencil, Keyboard, RotateCcw, Languages, ChevronDown } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { LOCALES, isLocale, localizeError, useT, type MessageKey } from "@/i18n";
import { bootstrapStudio, updateProfile } from "@/lib/games.functions";
import {
  getSettings,
  setSettings,
  syncablePreferences,
  useSettings,
  type GraphicsQuality,
  type StudioSettings,
} from "@/lib/settings";
import {
  getThemePreference,
  setThemePreference,
  subscribeThemeMode,
  type ThemePreference,
} from "@/lib/theme-mode";
import { sfx } from "@/lib/sfx";
import {
  FIXED_SHORTCUTS,
  SHORTCUT_ACTIONS,
  keyLabel,
  normalizeKey,
  resolveShortcuts,
  type ShortcutAction,
} from "@/lib/shortcuts";
import { AccountAvatar, setAvatarValue, useAvatarValue } from "@/lib/avatar";
import { ChooseAvatarDialog } from "@/components/ChooseAvatarDialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

/**
 * Riassegnazione dei tasti. Si preme il tasto che si vuole: il precedente
 * proprietario viene liberato, perché due azioni sullo stesso tasto vorrebbero
 * dire che una delle due non parte mai.
 */
function ShortcutEditor({
  value,
  onChange,
}: {
  value: Partial<Record<ShortcutAction, string>>;
  onChange: (next: Partial<Record<ShortcutAction, string>>) => void;
}) {
  const t = useT();
  const [listening, setListening] = useState<ShortcutAction | null>(null);
  const resolved = resolveShortcuts(value);

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      // Esc annulla, tranne quando è Esc che si sta proprio assegnando.
      if (e.key === "Escape" && listening !== "closeTile") {
        setListening(null);
        return;
      }
      const key = normalizeKey(e.key);
      const next: Partial<Record<ShortcutAction, string>> = { ...value };
      for (const a of SHORTCUT_ACTIONS) {
        if (normalizeKey(next[a.id] ?? a.fallback) === key) delete next[a.id];
      }
      next[listening] = key;
      onChange(next);
      setListening(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [listening, value, onChange]);

  return (
    <div className="mt-2 space-y-1">
      {SHORTCUT_ACTIONS.map((a) => (
        <div key={a.id} className="flex min-h-11 items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">{t(a.labelKey)}</span>
          <button
            onClick={() => setListening(listening === a.id ? null : a.id)}
            className={`min-w-16 shrink-0 rounded-md border px-2 py-1 font-mono text-xs font-bold transition-colors ${
              listening === a.id
                ? "animate-pulse border-ink-accent bg-lilac text-foreground"
                : "border-border text-foreground hover:bg-muted"
            }`}
          >
            {listening === a.id ? t("shortcuts.editor.pressAKey") : keyLabel(resolved[a.id])}
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 pt-1">
        <span className="text-xs text-muted-foreground">{t("shortcuts.editor.pausedHint")}</span>
        <button
          onClick={() => onChange({})}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-muted-foreground hover:bg-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" /> {t("common.reset")}
        </button>
      </div>
      <ul className="space-y-1 pt-2">
        {FIXED_SHORTCUTS.map(([k, descriptionKey]) => (
          <li key={k} className="flex min-h-9 items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">{t(descriptionKey)}</span>
            <kbd className="shrink-0 rounded-md border border-border px-2 py-1 font-mono text-xs font-bold text-foreground">
              {k}
            </kbd>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- building blocks ---------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-4">
      <h3 className="mb-3 text-sm font-bold tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
  disabled,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex rounded-full bg-muted p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`h-8 rounded-full px-3 text-xs font-bold transition-colors ${
              active
                ? "bg-card text-foreground elev-1"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- dialog ---------------- */

/** `guest` drops Account and Performance: a phone player has no profile to edit. */
export function SettingsDialog({
  onClose,
  variant = "full",
}: {
  onClose: () => void;
  variant?: "full" | "guest";
}) {
  const t = useT();
  const guest = variant === "guest";
  const settings = useSettings();
  const queryClient = useQueryClient();

  const [theme, setTheme] = useState<ThemePreference>(() => getThemePreference());
  const [username, setUsername] = useState("");
  const [savedName, setSavedName] = useState("");
  const [email, setEmail] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [nameError, setNameError] = useState<MessageKey | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const avatarValue = useAvatarValue();

  useEffect(() => {
    const unsub = subscribeThemeMode(() => setTheme(getThemePreference()));
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive || !data.session) return;
      setSignedIn(true);
      setEmail(data.session.user.email ?? "");
      try {
        const boot = (await bootstrapStudio()) as {
          profile?: {
            username?: string;
            avatar_url?: string | null;
            preferences?: Partial<StudioSettings> | null;
          };
        };
        if (!alive) return;
        if (boot.profile?.avatar_url) setAvatarValue(boot.profile.avatar_url);
        if (boot.profile?.username) {
          setUsername(boot.profile.username);
          setSavedName(boot.profile.username);
        }
        const remote = boot.profile?.preferences;
        if (remote && typeof remote === "object" && Object.keys(remote).length) {
          setSettings(remote);
        }
      } catch {
        /* profile stays blank in preview / signed-out */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Persist presentation preferences to the host profile (debounced). */
  const syncPrefs = (patch: Partial<StudioSettings>) => {
    setSettings(patch);
    if (!signedIn) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      void updateProfile({ data: { preferences: syncablePreferences(getSettings()) } }).catch(
        () => {
          /* offline — localStorage still holds the value */
        },
      );
    }, 600);
  };

  const saveName = async () => {
    const v = username.trim();
    // Guests have no account: the profile endpoint requires a session.
    if (!signedIn) return;
    // Never scold an untouched, still-loading field (e.g. signed-out preview).
    if (!v && !savedName) return;
    if (v.length < 2 || v.length > 24) {
      setNameError("settings.account.nameLength");
      return;
    }
    setNameError(null);
    if (v === savedName) return;
    try {
      await updateProfile({ data: { username: v } });
      setSavedName(v);
      // Studio header + avatar initial refresh without a reload.
      void queryClient.invalidateQueries({ queryKey: ["studio"] });
      toast.success(t("settings.account.nameUpdated"));
    } catch (err) {
      toast.error(localizeError(err, "settings.account.nameSaveFailed"));
    }
  };

  const initial = (username || savedName || email || "H").trim().charAt(0).toUpperCase();

  const setLanguage = (code: string) => {
    if (isLocale(code)) syncPrefs({ language: code });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      {/*
       * Una finestra sola, uguale ovunque. Sul telefono era a tutto schermo con
       * una barra sua e gli angoli vivi: sembrava un'altra applicazione. Qui
       * resta la stessa scheda, semplicemente più stretta.
       */}
      <DialogContent className="max-h-[88svh] w-[calc(100vw-1.5rem)] max-w-[560px] gap-0 overflow-y-auto rounded-[32px] border p-0">
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <DialogTitle className="font-display text-2xl font-black text-foreground">
              {t("common.settings")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t("settings.description")}
            </DialogDescription>
          </div>

          {/*
           * 0. Lingua, prima di tutto e in entrambe le versioni: chi ne ha scelta
           * una che non sa leggere deve ritrovarla senza capire le altre voci.
           * Per questo ogni lingua ha il suo nome scritto in sé stessa, e
           * l'icona dice cos'è anche a chi non legge l'etichetta.
           */}
          <Section title={t("common.language")}>
            <div className="relative">
              <Languages
                aria-hidden
                className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <select
                aria-label={t("common.language")}
                value={settings.language}
                onChange={(e) => setLanguage(e.target.value)}
                className="h-11 w-full cursor-pointer appearance-none rounded-full bg-muted pe-10 ps-11 text-sm font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {LOCALES.map((l) => (
                  <option key={l.code} value={l.code} lang={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </Section>

          {/* 1. Account */}
          {!guest && (
            <Section title={t("settings.account.title")}>
              <div className="flex items-center gap-3">
                <button
                  ref={avatarBtnRef}
                  type="button"
                  onClick={() => setAvatarOpen(true)}
                  aria-label={t("settings.account.changeAvatar")}
                  title={t("settings.account.changeAvatar")}
                  className="relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <AccountAvatar
                    value={avatarValue}
                    initial={initial}
                    className="h-12 w-12 text-lg"
                    iconClassName="h-6 w-6"
                  />
                  <span className="absolute -bottom-0.5 -end-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-card text-foreground elev-1">
                    <Pencil className="h-3 w-3" />
                  </span>
                </button>

                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="display-name"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    {t("settings.account.displayName")}
                  </label>
                  <input
                    id="display-name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => void saveName()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveName();
                    }}
                    maxLength={24}
                    className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                  {nameError && <p className="mt-1 text-xs text-destructive">{t(nameError)}</p>}
                </div>
                <button
                  onClick={() => void saveName()}
                  className="mt-4 h-11 shrink-0 rounded-full bg-muted px-4 text-sm font-bold text-foreground"
                >
                  {t("common.save")}
                </button>
              </div>
              <Row label={t("settings.account.email")}>
                <span className="max-w-[240px] truncate text-sm text-muted-foreground">
                  {email || t("settings.account.notSignedIn")}
                </span>
              </Row>
            </Section>
          )}

          {/* 2. Appearance */}
          <Section title={t("settings.appearance.title")}>
            <Row label={t("settings.appearance.theme")}>
              <Segmented
                ariaLabel={t("settings.appearance.theme")}
                value={theme}
                onChange={(v) => setThemePreference(v)}
                options={[
                  { value: "system", label: t("settings.appearance.themeSystem") },
                  { value: "light", label: t("settings.appearance.themeDay") },
                  { value: "dark", label: t("settings.appearance.themeNight") },
                ]}
              />
            </Row>
            <Row
              label={t("settings.appearance.reduceMotion")}
              hint={t("settings.appearance.reduceMotionHint")}
            >
              <Switch
                checked={settings.reduceMotion}
                onCheckedChange={(v) => syncPrefs({ reduceMotion: v })}
              />
            </Row>
          </Section>

          {/* 3. Audio */}
          <Section title={t("settings.audio.title")}>
            <Row label={t("settings.audio.masterVolume")} disabled={settings.muted}>
              <div className="flex w-40 items-center gap-2">
                <Slider
                  value={[Math.round(settings.masterVolume * 100)]}
                  onValueChange={([v]) => syncPrefs({ masterVolume: (v ?? 0) / 100 })}
                  max={100}
                  step={1}
                />
                <span className="w-8 text-end text-xs tabular-nums text-muted-foreground">
                  {Math.round(settings.masterVolume * 100)}
                </span>
              </div>
            </Row>
            <Row label={t("settings.audio.soundEffects")} disabled={settings.muted}>
              <div className="flex w-40 items-center gap-2">
                <Slider
                  value={[Math.round(settings.volume * 100)]}
                  onValueChange={([v]) => syncPrefs({ volume: (v ?? 0) / 100 })}
                  max={100}
                  step={1}
                />
                <span className="w-8 text-end text-xs tabular-nums text-muted-foreground">
                  {Math.round(settings.volume * 100)}
                </span>
              </div>
            </Row>
            <Row label={t("settings.audio.muteAll")}>
              <Switch checked={settings.muted} onCheckedChange={(v) => syncPrefs({ muted: v })} />
            </Row>
            <Row label={t("settings.audio.testSound")}>
              <button
                onClick={() => sfx.ding()}
                className="flex h-10 items-center gap-2 rounded-full bg-muted px-4 text-sm font-bold text-foreground"
              >
                <Volume2 className="h-4 w-4" /> {t("settings.audio.play")}
              </button>
            </Row>
          </Section>

          {/* 4. Performance */}
          {!guest && (
            <Section title={t("settings.performance.title")}>
              <Row
                label={t("settings.performance.graphicsQuality")}
                hint={t("settings.performance.graphicsQualityHint")}
              >
                <Segmented<GraphicsQuality>
                  ariaLabel={t("settings.performance.graphicsQuality")}
                  value={settings.graphics}
                  onChange={(v) => syncPrefs({ graphics: v })}
                  options={[
                    { value: "high", label: t("settings.performance.qualityHigh") },
                    { value: "medium", label: t("settings.performance.qualityMedium") },
                    { value: "low", label: t("settings.performance.qualityLow") },
                  ]}
                />
              </Row>
              <Row
                label={t("settings.performance.backgroundEffects")}
                hint={t("settings.performance.backgroundEffectsHint")}
              >
                <Switch
                  checked={settings.backgroundEffects}
                  onCheckedChange={(v) => syncPrefs({ backgroundEffects: v })}
                />
              </Row>
            </Section>
          )}

          {/* 5. Keyboard shortcuts — chiuse, e riassegnabili. */}
          {!guest && (
            <Section title={t("settings.keyboard.title")}>
              <Row
                label={t("settings.keyboard.customKeys")}
                hint={t("settings.keyboard.customKeysHint")}
              >
                <button
                  onClick={() => setKeysOpen((v) => !v)}
                  aria-expanded={keysOpen}
                  className="flex h-10 items-center gap-2 rounded-full bg-muted px-4 text-sm font-bold text-foreground"
                >
                  <Keyboard className="h-4 w-4" />
                  {keysOpen ? t("settings.keyboard.hide") : t("settings.keyboard.customise")}
                </button>
              </Row>
              {keysOpen && (
                <ShortcutEditor
                  value={settings.shortcuts}
                  onChange={(next) => syncPrefs({ shortcuts: next })}
                />
              )}
            </Section>
          )}

          <div className="flex justify-end border-t border-border pt-4">
            <button
              onClick={onClose}
              className="h-12 rounded-full bg-coral px-8 font-display text-base font-black text-foreground elev-2 transition-transform hover:scale-105"
            >
              {t("common.done")}
            </button>
          </div>
        </div>
      </DialogContent>
      {avatarOpen && (
        <ChooseAvatarDialog
          current={avatarValue}
          initial={initial}
          onClose={() => {
            setAvatarOpen(false);
            void queryClient.invalidateQueries({ queryKey: ["studio"] });
            requestAnimationFrame(() => avatarBtnRef.current?.focus());
          }}
        />
      )}
    </Dialog>
  );
}
