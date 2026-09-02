import { useEffect, useState } from "react";
import { Zap, Settings as SettingsIcon, LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Sticky Studio app bar: logo badge + page title on the left, a single
 * account avatar with a dropdown on the right.
 */
export function StudioTopBar({
  displayName,
  onOpenSettings,
}: {
  displayName: string;
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

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-butter scallop">
            <Zap className="h-5 w-5 text-ink-gold" />
          </span>
          <h1 className="truncate font-display text-[22px] font-semibold leading-7 tracking-tight text-foreground">
            Studio
          </h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Account menu"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ink-accent"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lilac font-display text-base font-bold text-foreground">
                {initial}
              </span>
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
      </div>
    </header>
  );
}
