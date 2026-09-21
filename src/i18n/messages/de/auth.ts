import type { Messages } from "../en/index";

export const auth: Messages["auth"] = {
  backToHome: "Zurück zur Startseite",
  subtitle: "Zugang zur Host-Konsole",
  checkEmail: {
    title: "Schau in dein Postfach",
    body: "Wir haben einen Bestätigungslink an <b>{email}</b> geschickt. Klick darauf, um dein Host-Konto zu aktivieren, und melde dich dann an.",
    backToSignIn: "Zurück zur Anmeldung",
  },
  tabs: {
    signIn: "Anmelden",
    signUp: "Konto erstellen",
  },
  fields: {
    hostName: "Host-Name",
    email: "E-Mail",
    password: "Passwort (mind. 6 Zeichen)",
  },
  submit: {
    working: "Moment…",
    signIn: "Anmelden",
    signUp: "Host-Konto erstellen",
  },
  playersNoAccount: "Spieler brauchen nie ein Konto — sie treten mit einem Spielcode bei.",
  errors: {
    failed: "Authentifizierung fehlgeschlagen",
    invalidCredentials: "Ungültige Anmeldedaten",
    emailNotConfirmed: "E-Mail nicht bestätigt",
    userAlreadyRegistered: "Diese E-Mail ist bereits registriert",
    passwordTooShort: {
      one: "Das Passwort muss mindestens {count} Zeichen lang sein.",
      other: "Das Passwort muss mindestens {count} Zeichen lang sein.",
    },
    emailInvalid: "Die E-Mail-Adresse „{email}“ ist ungültig",
    emailInvalidFormat: "E-Mail-Adresse nicht prüfbar: ungültiges Format",
    emailRateLimit: "E-Mail-Limit überschritten",
    retryAfter: {
      one: "Aus Sicherheitsgründen kannst du das erst nach {count} Sekunde erneut anfordern.",
      other: "Aus Sicherheitsgründen kannst du das erst nach {count} Sekunden erneut anfordern.",
    },
    signupsDisabled: "Registrierung ist hier deaktiviert",
  },
};
