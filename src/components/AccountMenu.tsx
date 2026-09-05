import { useEffect, useState, type ReactNode } from "react";
import { Settings as SettingsIcon, LogOut, type LucideIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AccountAvatar, useAvatarValue } from "@/lib/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AccountMenuItem {
  icon: LucideIcon;
  label: string;
  onSelect: () => void;
  /** Extra classes, e.g. responsive visibility. */
  className?: string;
}

/**
 * Shared account avatar + dropdown used by every app bar (Studio, Host).
 * Emphasis: text-only menu items, no filled surfaces. Pages may inject their
 * own rows above Settings, richer blocks through `sections`, and destructive
 * rows at the very bottom.
 *
 * The Host Console keeps everything that is not the board in here — join code,
 * overlay links, tools — so `sections` carries real content, not only rows, and
 * the panel scrolls once it outgrows the window.
 */
export function AccountMenu({
  displayName,
  avatarUrl,
  onOpenSettings,
  items,
  sections,
  dangerItems,
  wide = false,
}: {
  displayName: string;
  avatarUrl?: string | null | undefined;
  onOpenSettings: () => void;
  items?: AccountMenuItem[];
  /** Free-form blocks (already grouped and separated) shown above `items`. */
  sections?: ReactNode;
  dangerItems?: AccountMenuItem[] | undefined;
  /** Widen the panel for content that needs more than a row of text. */
  wide?: boolean;
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
  const rowClass = "rounded-full px-3 py-2.5 text-sm font-semibold";

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
      <DropdownMenuContent
        align="end"
        /* Inline, because the shadcn base class sets `overflow: hidden` and the
           panel has to scroll once the host folds its whole toolbox in here. */
        style={{ overflowY: "auto", overflowX: "hidden" }}
        className={`max-h-[min(80vh,44rem)] rounded-[24px] p-2 ${
          wide ? "w-[min(22rem,calc(100vw_-_1.5rem))]" : "w-64"
        }`}
      >
        <div className="px-3 py-2">
          <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{email || "Signed in"}</p>
        </div>
        <DropdownMenuSeparator />
        {sections}
        {items && items.length > 0 && (
          <>
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <DropdownMenuItem
                  key={it.label}
                  className={`${rowClass} ${it.className ?? ""}`}
                  onSelect={it.onSelect}
                >
                  <Icon className="mr-2 h-4 w-4" /> {it.label}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem className={rowClass} onSelect={onOpenSettings}>
          <SettingsIcon className="mr-2 h-4 w-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          className={rowClass}
          onSelect={() => {
            void supabase.auth.signOut().then(() => (window.location.href = "/auth"));
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
        {dangerItems && dangerItems.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {dangerItems.map((it) => {
              const Icon = it.icon;
              return (
                <DropdownMenuItem
                  key={it.label}
                  className={`${rowClass} text-danger-ink focus:text-danger-ink ${it.className ?? ""}`}
                  onSelect={it.onSelect}
                >
                  <Icon className="mr-2 h-4 w-4" /> {it.label}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

