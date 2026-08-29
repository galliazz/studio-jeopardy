import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  User,
  Volume2,
  VolumeX,
  Users,
  Timer,
  Smartphone,
  Download,
  Trash2,
  LogOut,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { bootstrapStudio, exportGame, updateProfile } from "@/lib/games.functions";
import { getSettings, resetSettings, setSettings, useSettings } from "@/lib/settings";
import { PLAYER_AVATARS, type Game } from "@/lib/types";
import { sfx } from "@/lib/sfx";

type Tab = "profile" | "audio" | "teams" | "gameplay" | "data";

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "audio", label: "Audio", icon: Volume2 },
  { id: "teams", label: "Teams", icon: Users },
  { id: "gameplay", label: "Gameplay", icon: Timer },
  { id: "data", label: "Data", icon: Download },
];

/** Low-emphasis gear pill available on every screen. */
export function SettingsButton({ className = "" }: { className?: string }) {
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
      {open && <SettingsDialog onClose={() => setOpen(false)} />}
    </>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const settings = useSettings();
  const [tab, setTab] = useState<Tab>("profile");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<string>(PLAYER_AVATARS[0] ?? "🎩");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (!data.session) return;
      setSignedIn(true);
      try {
        const boot = await bootstrapStudio();
        if (!alive) return;
        const profile = (boot as { profile?: { username?: string; avatar_url?: string | null } }).profile;
        if (profile?.username) setUsername(profile.username);
        if (profile?.avatar_url) setAvatar(profile.avatar_url);
      } catch {
        /* profile stays blank */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const saveProfile = async () => {
    const v = username.trim();
    if (v.length < 2) return;
    await updateProfile({ data: { username: v, avatar_url: avatar } });
    toast.success("Profile updated");
  };

  const exportAll = async () => {
    try {
      const boot = (await bootstrapStudio()) as unknown as { games: Game[] };
      const payloads = [];
      for (const g of boot.games ?? []) payloads.push(await exportGame({ data: { gameId: g.id } }));
      const blob = new Blob([JSON.stringify({ games: payloads }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jeopardestiny-backup.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${payloads.length} board${payloads.length === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
      <button aria-label="Close settings" onClick={onClose} className="absolute inset-0 cursor-default" />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative flex max-h-[88svh] w-full max-w-lg flex-col overflow-hidden rounded-[32px] bg-card p-6 elev-3"
      >
        <h2 className="font-display text-2xl font-black text-foreground">Settings</h2>
        <p className="mb-4 text-sm text-muted-foreground">Studio preferences for this device</p>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-colors ${
                tab === t.id ? "bg-mint text-foreground elev-1" : "bg-muted text-muted-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-52 flex-1 overflow-y-auto pr-1">
          {tab === "profile" && (
            <div>
              {signedIn ? (
                <>
                  <Label>Host display name</Label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={24}
                    className="mb-4 h-11 w-full rounded-full bg-muted px-4 text-sm font-semibold outline-none ring-2 ring-transparent focus:ring-ink-accent"
                  />
                  <Label>Avatar</Label>
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {PLAYER_AVATARS.map((a) => (
                      <button
                        key={a}
                        onClick={() => setAvatar(a)}
                        className={`flex h-10 w-10 items-center justify-center text-lg scallop ${
                          avatar === a ? "bg-coral" : "bg-muted"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void saveProfile()}
                      className="rounded-full bg-coral px-6 py-3 text-sm font-black text-foreground elev-1"
                    >
                      Save profile
                    </button>
                    <button
                      onClick={() => void supabase.auth.signOut().then(() => (window.location.href = "/auth"))}
                      className="flex items-center gap-2 rounded-full bg-blush px-5 py-3 text-sm font-semibold text-foreground elev-1"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Sign in as a host to edit your profile.</p>
              )}
            </div>
          )}

          {tab === "audio" && (
            <div>
              <Label>Master FX volume — {Math.round(settings.volume * 100)}%</Label>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.volume * 100)}
                onChange={(e) => setSettings({ volume: Number(e.target.value) / 100 })}
                onMouseUp={() => sfx.click()}
                className="mb-5 w-full accent-[var(--ink-accent)]"
              />
              <Toggle
                label="Mute all audio"
                icon={settings.muted ? VolumeX : Volume2}
                on={settings.muted}
                onChange={(v) => setSettings({ muted: v })}
              />
              <button
                onClick={() => sfx.victory()}
                className="mt-4 rounded-full bg-mint px-5 py-3 text-sm font-bold text-foreground elev-1"
              >
                Test sound
              </button>
            </div>
          )}

          {tab === "teams" && (
            <div>
              <Label>Default Team A name</Label>
              <input
                value={settings.teamAlpha}
                onChange={(e) => setSettings({ teamAlpha: e.target.value })}
                maxLength={24}
                className="mb-4 h-11 w-full rounded-full bg-muted px-4 text-sm font-semibold outline-none ring-2 ring-transparent focus:ring-ink-accent"
              />
              <Label>Default Team B name</Label>
              <input
                value={settings.teamBravo}
                onChange={(e) => setSettings({ teamBravo: e.target.value })}
                maxLength={24}
                className="h-11 w-full rounded-full bg-muted px-4 text-sm font-semibold outline-none ring-2 ring-transparent focus:ring-ink-accent"
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Used as the starting names for new boards. Per-board names stay editable in the editor.
              </p>
            </div>
          )}

          {tab === "gameplay" && (
            <div>
              <Label>Default timer duration</Label>
              <div className="mb-5 flex gap-2">
                {[10, 15, 30].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSettings({ timerSeconds: s })}
                    className={`h-11 rounded-full px-5 text-sm font-bold ${
                      settings.timerSeconds === s ? "bg-coral text-foreground elev-1" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
              <Toggle
                label="Mobile haptic feedback"
                icon={Smartphone}
                on={settings.haptics}
                onChange={(v) => setSettings({ haptics: v })}
              />
            </div>
          )}

          {tab === "data" && (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => void exportAll()}
                disabled={!signedIn}
                className="flex items-center justify-center gap-2 rounded-full bg-mint px-5 py-3.5 text-sm font-bold text-foreground elev-1 disabled:opacity-40"
              >
                <Download className="h-4 w-4" /> Export all games (backup JSON)
              </button>
              <button
                onClick={() => {
                  if (!window.confirm("Reset all local studio preferences on this device?")) return;
                  resetSettings();
                  toast.success("Local studio data reset");
                }}
                className="flex items-center justify-center gap-2 rounded-full bg-blush px-5 py-3.5 text-sm font-bold text-danger-ink elev-1"
              >
                <Trash2 className="h-4 w-4" /> Clear local storage / reset studio data
              </button>
              <p className="text-xs text-muted-foreground">
                Boards live in your account — resetting only clears preferences stored in this browser.
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-full bg-muted px-6 py-3 text-sm font-bold text-foreground">
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">{children}</p>
  );
}

function Toggle({
  label,
  icon: Icon,
  on,
  onChange,
}: {
  label: string;
  icon: typeof User;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className="flex w-full items-center justify-between rounded-full bg-muted px-5 py-3"
    >
      <span className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className={`relative h-7 w-12 rounded-full transition-colors ${on ? "bg-coral" : "bg-card"}`}>
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 h-5 w-5 rounded-full bg-card elev-1"
          style={{ left: on ? 26 : 4, backgroundColor: on ? "var(--foreground)" : "var(--muted-foreground)" }}
        />
      </span>
    </button>
  );
}

/** Read the local preference at call time — used by the mobile buzzer. */
export function hapticsEnabled(): boolean {
  return getSettings().haptics;
}
