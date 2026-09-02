import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "../integrations/supabase/client";
import { initThemeMode } from "../lib/theme-mode";
import { ThemeToggle } from "../components/ThemeToggle";
import { SettingsButton } from "../components/SettingsDialog";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "JEOPARDESTINY — Live Trivia Studio" },
      {
        name: "description",
        content:
          "Build Jeopardy-style trivia boards, host them live with synced mobile buzzers, Daily Doubles and Final Jeopardy.",
      },
      { name: "author", content: "JEOPARDESTINY" },
      { property: "og:title", content: "JEOPARDESTINY — Live Trivia Studio" },
      {
        property: "og:description",
        content:
          "Build Jeopardy-style trivia boards, host them live with synced mobile buzzers, Daily Doubles and Final Jeopardy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Roboto+Flex:opsz,wght@8..144,400..900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthListener() {
  const router = useRouter();
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  // OBS browser sources are pure graphics: no app chrome, no toasts.
  const overlay = location.pathname.startsWith("/overlay/") || location.pathname.startsWith("/obs/");

  useEffect(() => {
    initThemeMode();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener />
      {!overlay && <TopContextBar />}
      <Outlet />
      {!overlay && <Toaster position="top-center" richColors closeButton />}
    </QueryClientProvider>
  );
}

function TopContextBar() {
  const location = useLocation();
  const path = location.pathname;
  // OBS browser-source overlays render with no chrome at all.
  if (path.startsWith("/obs/") || path.startsWith("/overlay/")) return null;
  // Studio and the Host console render their own app bars instead of this pill.
  if (path === "/studio" || path.startsWith("/host/")) return null;


  const label = screenLabel(path);
  // Host console and the editor relocate the Day/Night switch into their own top bars.
  const showThemeToggleHere = !path.startsWith("/host/") && !path.startsWith("/edit/");

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[80] flex max-w-[calc(100vw-1.5rem)] justify-end sm:right-5 sm:top-5">
      <div className="pointer-events-auto flex min-w-0 items-center gap-3 rounded-full bg-card/90 p-1.5 pl-4 elev-2 backdrop-blur-md">
        <div className="min-w-0 text-right">
          <p className="truncate text-[10px] font-black uppercase tracking-wider text-muted-foreground sm:text-xs">
            {label.kicker}
          </p>
          <p className="hidden truncate text-xs font-bold text-foreground sm:block">{label.title}</p>
        </div>
        {/* Divider keeps the mode switch visually separate from the page label */}
        <span aria-hidden className="h-7 w-px shrink-0 rounded-full bg-foreground/10" />
        {showThemeToggleHere && <ThemeToggle />}
        <SettingsButton />
      </div>
    </div>
  );
}

function screenLabel(path: string): { kicker: string; title: string } {
  if (path.startsWith("/edit/")) return { kicker: "Edit Board", title: "Canvas editor" };
  if (path.startsWith("/host/")) return { kicker: "Play", title: "Host console · scoreboard" };
  if (path.startsWith("/play/")) return { kicker: "Player", title: "Buzzer · scoreboard" };
  if (path === "/studio") return { kicker: "Studio", title: "Boards and live games" };
  if (path === "/auth") return { kicker: "Account", title: "Host sign in" };
  return { kicker: "Home", title: "Join or host" };
}
