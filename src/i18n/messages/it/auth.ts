import type { Messages } from "../en/index";

export const auth: Messages["auth"] = {
  backToHome: "Torna alla home",
  subtitle: "Accesso alla console dell'host",
  checkEmail: {
    title: "Controlla la posta",
    body: "Abbiamo mandato un link di conferma a <b>{email}</b>. Aprilo per attivare il tuo account host, poi accedi.",
    backToSignIn: "Torna all'accesso",
  },
  tabs: {
    signIn: "Accedi",
    signUp: "Crea account",
  },
  fields: {
    hostName: "Nome host",
    email: "Email",
    password: "Password (almeno 6 caratteri)",
  },
  submit: {
    working: "Un attimo…",
    signIn: "Accedi",
    signUp: "Crea account host",
  },
  playersNoAccount: "Ai giocatori non serve un account — entrano con il codice partita.",
  errors: {
    failed: "Autenticazione non riuscita",
    invalidCredentials: "Email o password non corrette",
    emailNotConfirmed: "Email non ancora confermata",
    userAlreadyRegistered: "Utente già registrato",
    passwordTooShort: {
      one: "La password deve avere almeno {count} carattere.",
      other: "La password deve avere almeno {count} caratteri.",
    },
    emailInvalid: "L'indirizzo email “{email}” non è valido",
    emailInvalidFormat: "Indirizzo email non valido: formato errato",
    emailRateLimit: "Troppe email inviate, riprova più tardi",
    retryAfter: {
      one: "Per sicurezza, puoi richiederlo di nuovo tra {count} secondo.",
      other: "Per sicurezza, puoi richiederlo di nuovo tra {count} secondi.",
    },
    signupsDisabled: "Le registrazioni non sono consentite",
  },
};
