import { Zap } from "lucide-react";

import { AccountMenu } from "@/components/AccountMenu";
import { APP_BAR, APP_BAR_INNER } from "@/components/app-bar";

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
    <header className={`sticky top-0 ${APP_BAR}`}>
      <div className={`flex justify-between ${APP_BAR_INNER}`}>
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
