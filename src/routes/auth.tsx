import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, MailCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SPRING_UI } from "@/lib/motion";
import { AppBar, GuestSettingsButton } from "@/components/AppBar";
import { NAV_BUTTON } from "@/components/app-bar";
import { localizeError, useT, type TFunction } from "@/i18n";
import { LegalFooter } from "@/components/LegalFooter";
import { MIN_AGE } from "@/legal/holder";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — JEOPARDESTINY" },
      {
        name: "description",
        content: "Sign in or create a host account to build and run live trivia games.",
      },
      { property: "og:title", content: "Sign in — JEOPARDESTINY" },
      {
        property: "og:description",
        content: "Sign in or create a host account to build and run live trivia games.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AuthPage,
});

/**
 * Gli errori di accesso arrivano dal server di Supabase, non dal nostro:
 * traduciamo quelli che su questa pagina capitano davvero, col testo esatto
 * che manda Supabase. Gli altri passano da localizeError.
 */
const AUTH_ERRORS: [RegExp, (t: TFunction, m: RegExpExecArray) => string][] = [
  [/^Invalid login credentials$/, (t) => t("auth.errors.invalidCredentials")],
  [/^Email not confirmed$/, (t) => t("auth.errors.emailNotConfirmed")],
  [/^User already registered$/, (t) => t("auth.errors.userAlreadyRegistered")],
  [
    /^Password should be at least (\d+) characters\.$/,
    (t, m) => t("auth.errors.passwordTooShort", { count: Number(m[1]) }),
  ],
  [
    /^Email address "(.+)" is invalid$/,
    (t, m) => t("auth.errors.emailInvalid", { email: m[1] ?? "" }),
  ],
  [
    /^Unable to validate email address: invalid format$/,
    (t) => t("auth.errors.emailInvalidFormat"),
  ],
  [/^email rate limit exceeded$/i, (t) => t("auth.errors.emailRateLimit")],
  [
    /^For security purposes, you can only request this after (\d+) seconds\.$/,
    (t, m) => t("auth.errors.retryAfter", { count: Number(m[1]) }),
  ],
  [/^Signups not allowed for this instance$/, (t) => t("auth.errors.signupsDisabled")],
];

function authErrorMessage(err: unknown, t: TFunction): string {
  const message = err instanceof Error ? err.message.trim() : "";
  for (const [re, render] of AUTH_ERRORS) {
    const m = re.exec(message);
    if (m) return render(t, m);
  }
  return localizeError(err, "auth.errors.failed");
}

function AuthPage() {
  const t = useT();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  /* L'accettazione dei termini vale solo per chi crea l'account: chi ha già
     un account li ha accettati quando l'ha creato. */
  const [accepted, setAccepted] = useState(false);
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
      toast.error(authErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -end-40 -top-40 h-[480px] w-[480px] rounded-full bg-lilac opacity-70 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -start-32 h-[520px] w-[520px] rounded-full bg-sky opacity-70 blur-3xl"
      />

      {/* La barra condivisa: "← Home" a sinistra come "← Studio" nell'editor,
          le impostazioni nello stesso punto dell'avatar. */}
      <AppBar
        left={
          <Link to="/" className={NAV_BUTTON} aria-label={t("auth.backToHome")}>
            <ArrowLeft className="h-5 w-5 rtl:-scale-x-100" />
            <span className="hidden sm:inline">{t("common.home")}</span>
          </Link>
        }
        right={<GuestSettingsButton />}
      />

      <div className="relative flex flex-1 items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={SPRING_UI}
          className="relative z-10 w-full max-w-md rounded-[36px] bg-card p-8 elev-2"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center bg-butter scallop">
              <Zap className="h-7 w-7 text-ink-gold" />
            </div>
            <div>
              <h1 className="font-display text-xl font-black tracking-tight">JEOPARDESTINY</h1>
              <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
            </div>
          </div>

          {checkEmail ? (
            <div className="flex flex-col items-center py-6 text-center">
              <MailCheck className="mb-3 h-12 w-12 text-ink-accent" />
              <h2 className="font-display text-lg font-bold">{t("auth.checkEmail.title")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t.rich(
                  "auth.checkEmail.body",
                  { email },
                  { b: (chunk) => <span className="font-semibold text-foreground">{chunk}</span> },
                )}
              </p>
              <button
                onClick={() => {
                  setCheckEmail(false);
                  setMode("signin");
                }}
                className="mt-6 rounded-full bg-lilac px-6 py-3 text-sm font-bold text-foreground elev-1"
              >
                {t("auth.checkEmail.backToSignIn")}
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
                    {m === "signin" ? t("auth.tabs.signIn") : t("auth.tabs.signUp")}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {mode === "signup" && (
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("auth.fields.hostName")}
                    maxLength={24}
                    className="h-12 w-full rounded-full bg-muted px-5 text-sm outline-none ring-2 ring-transparent transition-all focus:ring-ink-accent"
                  />
                )}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.fields.email")}
                  className="h-12 w-full rounded-full bg-muted px-5 text-sm outline-none ring-2 ring-transparent transition-all focus:ring-ink-accent"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void submit()}
                  placeholder={t("auth.fields.password")}
                  className="h-12 w-full rounded-full bg-muted px-5 text-sm outline-none ring-2 ring-transparent transition-all focus:ring-ink-accent"
                />
                {mode === "signup" && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-[22px] bg-muted/60 p-3 text-start text-xs leading-snug text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--ink-accent)]"
                    />
                    <span>
                      {t.rich("legal.consentSignup", undefined, {
                        terms: (chunk) => (
                          <Link to="/terms" className="underline underline-offset-2">
                            {chunk}
                          </Link>
                        ),
                        privacy: (chunk) => (
                          <Link to="/privacy" className="underline underline-offset-2">
                            {chunk}
                          </Link>
                        ),
                      })}{" "}
                      {t("legal.minAge", { age: MIN_AGE })}
                    </span>
                  </label>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={
                    busy || !email || password.length < 6 || (mode === "signup" && !accepted)
                  }
                  onClick={() => void submit()}
                  className="h-12 w-full rounded-full bg-coral font-display font-black text-foreground elev-2 transition-transform hover:scale-[1.02] disabled:opacity-50"
                >
                  {busy
                    ? t("auth.submit.working")
                    : mode === "signin"
                      ? t("auth.submit.signIn")
                      : t("auth.submit.signUp")}
                </motion.button>
              </div>

              <p className="mt-5 text-center text-xs text-muted-foreground">
                {t("auth.playersNoAccount")}
              </p>
            </>
          )}
        </motion.div>
      </div>
      <LegalFooter className="relative z-10" />
    </div>
  );
}
