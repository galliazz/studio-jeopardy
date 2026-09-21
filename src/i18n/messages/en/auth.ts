/** Accesso e registrazione di chi conduce. */
export const auth = {
  backToHome: "Back to home",
  subtitle: "Host console access",
  checkEmail: {
    title: "Check your inbox",
    body: "We sent a confirmation link to <b>{email}</b>. Click it to activate your host account, then sign in.",
    backToSignIn: "Back to sign in",
  },
  tabs: {
    signIn: "Sign in",
    signUp: "Create account",
  },
  fields: {
    hostName: "Host name",
    email: "Email",
    password: "Password (6+ characters)",
  },
  submit: {
    working: "Working…",
    signIn: "Sign in",
    signUp: "Create host account",
  },
  playersNoAccount: "Players never need an account — they join with a game code.",
  /**
   * Gli errori che manda il server di Supabase Auth, col testo inglese
   * identico al suo. Quelli con `other` soltanto: Supabase dice sempre
   * "characters" e "seconds", anche con 1.
   */
  errors: {
    failed: "Authentication failed",
    invalidCredentials: "Invalid login credentials",
    emailNotConfirmed: "Email not confirmed",
    userAlreadyRegistered: "User already registered",
    passwordTooShort: { other: "Password should be at least {count} characters." },
    emailInvalid: 'Email address "{email}" is invalid',
    emailInvalidFormat: "Unable to validate email address: invalid format",
    emailRateLimit: "email rate limit exceeded",
    retryAfter: {
      other: "For security purposes, you can only request this after {count} seconds.",
    },
    signupsDisabled: "Signups not allowed for this instance",
  },
};
