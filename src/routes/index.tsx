import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Zap, Gamepad2, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewSurface } from "@/lib/preview";
import { AppBar, GuestSettingsButton } from "@/components/AppBar";
import { AccountMenu } from "@/components/AccountMenu";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useT } from "@/i18n";
import { SPRING_PLAYFUL, SPRING_UI } from "@/lib/motion";
import { LegalFooter } from "@/components/LegalFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JEOPARDESTINY — Live Trivia Studio" },
      {
        name: "description",
        content:
          "Build Jeopardy-style trivia boards, host them live with synced mobile buzzers, Daily Doubles and Final Jeopardy.",
      },
      { property: "og:title", content: "JEOPARDESTINY — Live Trivia Studio" },
      {
        property: "og:description",
        content:
          "Build Jeopardy-style trivia boards and host them live with synced mobile buzzers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const t = useT();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null } | null>(
    null,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data }) => {
      setSignedIn(!!data.session || isPreviewSurface());
      const uid = data.session?.user.id;
      if (!uid) return;
      // Serve all'avatar in alto a destra: lo stesso che si vede in Studio.
      const { data: p } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", uid)
        .maybeSingle();
      if (p) setProfile(p);
    });
  }, []);

  const join = () => {
    const clean = code.trim().toUpperCase();
    if (clean.length >= 4) void navigate({ to: "/play/$code", params: { code: clean } });
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/*
       * La barra c'è anche qui. Prima la home aveva una pillola galleggiante in
       * alto a destra — "HOME · NIGHT · ⚙" — che non somigliava a nessun'altra
       * pagina, e il profilo non stava dove sta in Studio. Il giorno/notte è
       * nelle impostazioni, come ovunque.
       */}
      <AppBar
        left={
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-butter scallop">
            <Zap className="h-5 w-5 text-ink-gold" />
          </span>
        }
        right={
          signedIn && profile ? (
            <AccountMenu
              displayName={profile.username}
              avatarUrl={profile.avatar_url}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          ) : (
            <GuestSettingsButton variant={signedIn ? "full" : "guest"} />
          )
        }
      />
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10">
        {/* Expressive blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -start-40 -top-40 h-[480px] w-[480px] rounded-full bg-lilac opacity-70 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -end-32 h-[520px] w-[520px] rounded-full bg-sky opacity-70 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rotate-12 rounded-[64px] bg-magenta/30 blur-2xl"
        />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={SPRING_UI}
          className="relative z-10 flex w-full max-w-xl flex-col items-center text-center"
        >
          <motion.div
            initial={{ rotate: -8, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ ...SPRING_PLAYFUL, delay: 0.1 }}
            className="mb-6 flex h-24 w-24 items-center justify-center bg-butter elev-2 scallop"
          >
            <Zap className="h-11 w-11 text-ink-gold" />
          </motion.div>

          <h1 className="font-display text-5xl font-black tracking-tight text-foreground sm:text-6xl">
            JEOPARD<span className="text-ink-accent">E</span>STINY
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">{t("home.tagline")}</p>

          <div className="mt-10 w-full rounded-[36px] bg-card p-6 elev-2 sm:p-8">
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Gamepad2 className="h-4 w-4 text-ink-accent" />
              {t("home.join.label")}
            </label>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && join()}
                placeholder={t("home.join.placeholder")}
                maxLength={8}
                className="h-14 flex-1 rounded-full bg-muted px-6 text-center font-display text-xl font-bold tracking-[0.3em] text-foreground outline-none ring-2 ring-transparent transition-all placeholder:text-muted-foreground focus:ring-ink-accent"
              />
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={join}
                className="h-14 rounded-full bg-coral px-8 font-display font-black text-foreground elev-2 transition-transform hover:scale-105"
              >
                {t("home.join.submit")}
              </motion.button>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => void navigate({ to: signedIn ? "/studio" : "/auth" })}
            className="mt-6 flex items-center gap-2 rounded-full bg-lilac px-8 py-4 font-display text-base font-black text-foreground elev-2 transition-transform hover:scale-[1.03]"
          >
            <Radio className="h-5 w-5 text-ink-gold" />
            {signedIn ? t("home.openStudio") : t("home.hostYourOwn")}
          </motion.button>
        </motion.div>
      </div>
      <LegalFooter className="relative z-10" />
    </div>
  );
}
