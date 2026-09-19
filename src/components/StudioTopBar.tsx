import { Zap } from "lucide-react";

import { AccountMenu } from "@/components/AccountMenu";
import { AppBar } from "@/components/AppBar";

/**
 * Studio app bar: logo badge + page title on the left, a single account avatar
 * with a dropdown on the right. La barra è quella condivisa da tutta l'app:
 * vedi AppBar.
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
    <AppBar
      sticky
      left={
        <>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-butter scallop">
            <Zap className="h-5 w-5 text-ink-gold" />
          </span>
          <h1 className="truncate font-display text-[22px] font-semibold leading-7 tracking-tight text-foreground">
            Studio
          </h1>
        </>
      }
      right={
        <AccountMenu
          displayName={displayName}
          avatarUrl={avatarUrl}
          onOpenSettings={onOpenSettings}
        />
      }
    />
  );
}
