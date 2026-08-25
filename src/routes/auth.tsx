import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — JEOPARDESTINY" },
      { name: "description", content: "Sign in or create a host account to build and run live trivia games." },
      { property: "og:title", content: "Sign in — JEOPARDESTINY" },
      { property: "og:description", content: "Sign in or create a host account to build and run live trivia games." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void navigate({ to: "/studio" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username || email.split("@")[0] },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setCheckEmail(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <ThemeToggle className="absolute right-5 top-5 z-20" />
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-lilac opacity-70 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-32 h-[520px] w-[520px] rounded-full bg-sky opacity-70 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
        className="relative z-10 w-full max-w-md rounded-[36px] bg-card p-8 elev-2"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center bg-butter scallop">
            <Zap className="h-7 w-7 text-ink-gold" />
          </div>
          <div>
            <h1 className="font-display text-xl font-black tracking-tight">JEOPARDESTINY</h1>
            <p className="text-sm text-muted-foreground">Host console access</p>
          </div>
        </div>

        {checkEmail ? (
          <div className="flex flex-col items-center py-6 text-center">
            <MailCheck className="mb-3 h-12 w-12 text-ink-accent" />
            <h2 className="font-display text-lg font-bold">Check your inbox</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to <span className="font-semibold text-foreground">{email}</span>. Click it to
              activate your host account, then sign in.
            </p>
            <button
              onClick={() => {
                setCheckEmail(false);
                setMode("signin");
              }}
              className="mt-6 rounded-full bg-lilac px-6 py-3 text-sm font-bold text-foreground elev-1"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-full py-2.5 text-sm font-semibold transition-all ${
                    mode === m ? "bg-coral text-foreground elev-1" : "text-muted-foreground"
                  }`}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {mode === "signup" && (
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Host name"
                  maxLength={24}
                  className="h-12 w-full rounded-full bg-muted px-5 text-sm outline-none ring-2 ring-transparent transition-all focus:ring-ink-accent"
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-12 w-full rounded-full bg-muted px-5 text-sm outline-none ring-2 ring-transparent transition-all focus:ring-ink-accent"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
                placeholder="Password (6+ characters)"
                className="h-12 w-full rounded-full bg-muted px-5 text-sm outline-none ring-2 ring-transparent transition-all focus:ring-ink-accent"
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={busy || !email || password.length < 6}
                onClick={() => void submit()}
                className="h-12 w-full rounded-full bg-coral font-display font-black text-foreground elev-2 transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create host account"}
              </motion.button>
            </div>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              Players never need an account — they join with a game code.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
