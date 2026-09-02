import { useEffect, useState } from "react";
import { Settings as SettingsIcon, LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AccountAvatar, useAvatarValue } from "@/lib/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Shared account avatar + dropdown used by every app bar (Studio, Host).
 * Emphasis: text-only menu items, no filled surfaces.
 */
export function AccountMenu({
  displayName,
  avatarUrl,
  onOpenSettings,
}: {
  displayName: string;
  avatarUrl?: string | null;
  onOpenSettings: () => void;
}) {
  const [email, setEmail] = useState("");

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setEmail(data.session?.user.email ?? "");
    });
    return () => {
      alive = false;
    };
  }, []);

  const initial = (displayName.trim()[0] ?? "?").toUpperCase();
  const avatarValue = useAvatarValue(avatarUrl ?? null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ink-accent"
        >
          <AccountAvatar value={avatarValue} initial={initial} className="h-10 w-10 text-base" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-[24px] p-2">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{email || "Signed in"}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="rounded-full px-3 py-2.5 text-sm font-semibold" onSelect={onOpenSettings}>
          <SettingsIcon className="mr-2 h-4 w-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-full px-3 py-2.5 text-sm font-semibold"
          onSelect={() => {
            void supabase.auth.signOut().then(() => (window.location.href = "/auth"));
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
