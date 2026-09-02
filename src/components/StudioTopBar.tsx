import { Zap } from "lucide-react";

import { AccountMenu } from "@/components/AccountMenu";

/**
 * Sticky Studio app bar: logo badge + page title on the left, a single
 * account avatar with a dropdown on the right.
 */
export function StudioTopBar({
  displayName,
  avatarUrl,
  onOpenSettings,
}: {
  displayName: string;
  avatarUrl?: string | null | undefined;
  onOpenSettings: () => void;
}) {
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

        <AccountMenu displayName={displayName} avatarUrl={avatarUrl} onOpenSettings={onOpenSettings} />
      </div>
    </header>
  );
}
