import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Volume2, Pencil, Keyboard, RotateCcw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
          <span className="text-sm text-muted-foreground">{a.label}</span>
          <button
            onClick={() => setListening(listening === a.id ? null : a.id)}
            className={`min-w-16 shrink-0 rounded-md border px-2 py-1 font-mono text-xs font-bold transition-colors ${
              listening === a.id
                ? "animate-pulse border-ink-accent bg-lilac text-foreground"
                : "border-border text-foreground hover:bg-muted"
            }`}
          >
            {listening === a.id ? "press a key…" : keyLabel(resolved[a.id])}
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 pt-1">
        <span className="text-xs text-muted-foreground">Shortcuts pause while a field, dialog or menu has focus.</span>
        <button
          onClick={() => onChange({})}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-muted-foreground hover:bg-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>
      <ul className="space-y-1 pt-2">
        {FIXED_SHORTCUTS.map(([k, label]) => (
          <li key={k} className="flex min-h-9 items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">{label}</span>
            <kbd className="shrink-0 rounded-md border border-border px-2 py-1 font-mono text-xs font-bold text-foreground">
              {k}
            </kbd>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Low-emphasis gear pill available on every screen. */
export function SettingsButton({ className = "", variant = "full" }: { className?: string; variant?: "full" | "guest" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => {
          sfx.pop();
          setOpen(true);
        }}
        aria-label="Settings"
        title="Settings"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lilac text-foreground transition-transform hover:scale-110 ${className}`}
      >
        <SettingsIcon className="h-4 w-4" />
      </button>
      {open && <SettingsDialog variant={variant} onClose={() => setOpen(false)} />}
    </>
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
export function SettingsDialog({ onClose, variant = "full" }: { onClose: () => void; variant?: "full" | "guest" }) {
  const guest = variant === "guest";
  const settings = useSettings();
  const queryClient = useQueryClient();

  const [theme, setTheme] = useState<ThemePreference>(() => getThemePreference());
  const [username, setUsername] = useState("");
  const [savedName, setSavedName] = useState("");
  const [email, setEmail] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
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
      void updateProfile({ data: { preferences: syncablePreferences(getSettings()) } }).catch(() => {
        /* offline — localStorage still holds the value */
      });
    }, 600);
  };

  const saveName = async () => {
    const v = username.trim();
    // Guests have no account: the profile endpoint requires a session.
    if (!signedIn) return;
    // Never scold an untouched, still-loading field (e.g. signed-out preview).
    if (!v && !savedName) return;
    if (v.length < 2 || v.length > 24) {
      setNameError("Use 2 to 24 characters");
      return;
    }
    setNameError(null);
    if (v === savedName) return;
    try {
      await updateProfile({ data: { username: v } });
      setSavedName(v);
      // Studio header + avatar initial refresh without a reload.
      void queryClient.invalidateQueries({ queryKey: ["studio"] });
      toast.success("Display name updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save name");
    }
  };

  const initial = (username || savedName || email || "H").trim().charAt(0).toUpperCase();

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
            <DialogTitle className="font-display text-2xl font-black text-foreground">Settings</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Changes apply immediately.
            </DialogDescription>
          </div>

          {/* 1. Account */}
          {!guest && <Section title="Account">
            <div className="flex items-center gap-3">
              <button
                ref={avatarBtnRef}
                type="button"
                onClick={() => setAvatarOpen(true)}
                aria-label="Change avatar"
                title="Change avatar"
                className="relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <AccountAvatar
                  value={avatarValue}
                  initial={initial}
                  className="h-12 w-12 text-lg"
                  iconClassName="h-6 w-6"
                />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-card text-foreground elev-1">
                  <Pencil className="h-3 w-3" />
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <label htmlFor="display-name" className="text-xs font-semibold text-muted-foreground">
                  Display name
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
                {nameError && <p className="mt-1 text-xs text-destructive">{nameError}</p>}
              </div>
              <button
                onClick={() => void saveName()}
                className="mt-4 h-11 shrink-0 rounded-full bg-muted px-4 text-sm font-bold text-foreground"
              >
                Save
              </button>
            </div>
            <Row label="Email">
              <span className="max-w-[240px] truncate text-sm text-muted-foreground">
                {email || "Not signed in"}
              </span>
            </Row>
          </Section>}

          {/* 2. Appearance */}
          <Section title="Appearance">
            <Row label="Theme">
              <Segmented
                ariaLabel="Theme"
                value={theme}
                onChange={(v) => setThemePreference(v)}
                options={[
                  { value: "system", label: "System" },
                  { value: "light", label: "Day" },
                  { value: "dark", label: "Night" },
                ]}
              />
            </Row>
            <Row label="Reduce motion" hint="Disables non-essential animations">
              <Switch
                checked={settings.reduceMotion}
                onCheckedChange={(v) => syncPrefs({ reduceMotion: v })}
              />
            </Row>
          </Section>

          {/* 3. Audio */}
          <Section title="Audio">
            <Row label="Master volume" disabled={settings.muted}>
              <div className="flex w-40 items-center gap-2">
                <Slider
                  value={[Math.round(settings.masterVolume * 100)]}
                  onValueChange={([v]) => syncPrefs({ masterVolume: (v ?? 0) / 100 })}
                  max={100}
                  step={1}
                />
                <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                  {Math.round(settings.masterVolume * 100)}
                </span>
              </div>
            </Row>
            <Row label="Sound effects" disabled={settings.muted}>
              <div className="flex w-40 items-center gap-2">
                <Slider
                  value={[Math.round(settings.volume * 100)]}
                  onValueChange={([v]) => syncPrefs({ volume: (v ?? 0) / 100 })}
                  max={100}
                  step={1}
                />
                <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                  {Math.round(settings.volume * 100)}
                </span>
              </div>
            </Row>
            <Row label="Mute all">
              <Switch checked={settings.muted} onCheckedChange={(v) => syncPrefs({ muted: v })} />
            </Row>
            <Row label="Test sound">
              <button
                onClick={() => sfx.ding()}
                className="flex h-10 items-center gap-2 rounded-full bg-muted px-4 text-sm font-bold text-foreground"
              >
                <Volume2 className="h-4 w-4" /> Play
              </button>
            </Row>
          </Section>

          {/* 4. Performance */}
          {!guest && <Section title="Performance">
            <Row label="Graphics quality" hint="Blur, gradients and heavy animations">
              <Segmented<GraphicsQuality>
                ariaLabel="Graphics quality"
                value={settings.graphics}
                onChange={(v) => syncPrefs({ graphics: v })}
                options={[
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                ]}
              />
            </Row>
            <Row label="Background effects" hint="Ambient colored blobs">
              <Switch
                checked={settings.backgroundEffects}
                onCheckedChange={(v) => syncPrefs({ backgroundEffects: v })}
              />
            </Row>
          </Section>}

          {/* 5. Keyboard shortcuts — chiuse, e riassegnabili. */}
          {!guest && (
            <Section title="Keyboard shortcuts">
              <Row label="Custom keys" hint="Saved to your profile — same keys on any computer">
                <button
                  onClick={() => setKeysOpen((v) => !v)}
                  aria-expanded={keysOpen}
                  className="flex h-10 items-center gap-2 rounded-full bg-muted px-4 text-sm font-bold text-foreground"
                >
                  <Keyboard className="h-4 w-4" />
                  {keysOpen ? "Hide" : "Customise"}
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
              Done
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
