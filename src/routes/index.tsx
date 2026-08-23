import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Zap, Gamepad2, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
        content: "Build Jeopardy-style trivia boards and host them live with synced mobile buzzers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const join = () => {
    const clean = code.trim().toUpperCase();
    if (clean.length >= 4) void navigate({ to: "/play/$code", params: { code: clean } });
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      {/* Expressive blobs */}
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-lavender opacity-70 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -right-32 h-[520px] w-[520px] rounded-full bg-pastel-blue opacity-70 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rotate-12 rounded-[64px] bg-magenta/10 blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="relative z-10 flex w-full max-w-xl flex-col items-center text-center"
      >
        <motion.div
          initial={{ rotate: -8, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-deep-purple shadow-xl"
        >
          <Zap className="h-10 w-10 text-gold" />
        </motion.div>

        <h1 className="font-display text-5xl font-black tracking-tight text-foreground sm:text-6xl">
          JEOPARD<span className="text-electric-blue">E</span>STINY
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          Build a board. Share a code. Phones become buzzers. You become the host.
        </p>

        <div className="mt-10 w-full rounded-[32px] bg-card p-6 shadow-xl shadow-deep-purple/10 sm:p-8">
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Gamepad2 className="h-4 w-4 text-electric-blue" />
            Join a live game
          </label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && join()}
              placeholder="GAME CODE"
              maxLength={8}
              className="h-14 flex-1 rounded-full border-2 border-input bg-background px-6 text-center font-display text-xl font-bold tracking-[0.3em] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-electric-blue"
            />
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={join}
              className="h-14 rounded-full bg-primary px-7 font-semibold text-primary-foreground shadow-lg shadow-electric-blue/30 transition-colors hover:bg-primary/90"
            >
              Join
            </motion.button>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => void navigate({ to: signedIn ? "/studio" : "/auth" })}
          className="mt-6 flex items-center gap-2 rounded-full bg-deep-purple px-8 py-4 font-display text-base font-bold text-lavender shadow-lg shadow-deep-purple/30 transition-transform hover:scale-[1.03]"
        >
          <Radio className="h-5 w-5 text-gold" />
          {signedIn ? "Open your Studio" : "Host your own board"}
        </motion.button>
      </motion.div>
    </div>
  );
}
