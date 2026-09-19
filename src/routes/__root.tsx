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
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "../integrations/supabase/client";
import { initThemeMode } from "../lib/theme-mode";
import { useSettings } from "../lib/settings";
import { startLocaleSync, useT } from "../i18n";

function NotFoundComponent() {
  const t = useT();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("shell.notFound.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("shell.notFound.body")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("shell.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("shell.error.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("shell.error.body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.retry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("shell.goHome")}
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
    /* `lang` e `dir` li riscrive il client quando la lingua scelta non è
       l'inglese (src/i18n/runtime.ts): il server non la conosce. */
    <html lang="en" dir="ltr" suppressHydrationWarning>
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
  const { reduceMotion } = useSettings();
  // OBS browser sources are pure graphics: no app chrome, no toasts.
  const overlay = location.pathname.startsWith("/overlay/");

  useEffect(() => {
    initThemeMode();
    startLocaleSync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/*
        Il CSS di `html.reduce-motion` azzera le durate delle transizioni CSS, ma
        framer-motion anima in JavaScript con stili inline: quel CSS non lo sfiora.
        MotionConfig è l'unico interruttore che le raggiunge tutte — spegne
        trasformazioni e spostamenti (comprese le pulsazioni a ripetizione
        infinita) e lascia in piedi solo l'opacità, che resta leggibile.
      */}
      <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
        <AuthListener />
        {/* Nessuna pillola globale in cima: ogni pagina ha la barra condivisa
            (AppBar), con il profilo sempre nello stesso punto. */}
        <Outlet />
        {!overlay && <Toaster position="top-center" richColors closeButton />}
      </MotionConfig>
    </QueryClientProvider>
  );
}
