import type { Messages } from "../en/index";

export const auth: Messages["auth"] = {
  backToHome: "Retour à l'accueil",
  subtitle: "Accès à la console d'animation",
  checkEmail: {
    title: "Vérifie ta boîte mail",
    body: "On a envoyé un lien de confirmation à <b>{email}</b>. Clique dessus pour activer ton compte animateur, puis connecte-toi.",
    backToSignIn: "Retour à la connexion",
  },
  tabs: {
    signIn: "Connexion",
    signUp: "Créer un compte",
  },
  fields: {
    hostName: "Nom d'animateur",
    email: "E-mail",
    password: "Mot de passe (6 caractères min.)",
  },
  submit: {
    working: "Un instant…",
    signIn: "Se connecter",
    signUp: "Créer un compte animateur",
  },
  playersNoAccount:
    "Les joueurs n'ont jamais besoin de compte — ils rejoignent avec un code de partie.",
  errors: {
    failed: "Échec de l'authentification",
    invalidCredentials: "E-mail ou mot de passe incorrect",
    emailNotConfirmed: "E-mail non confirmé",
    userAlreadyRegistered: "Un compte existe déjà avec cet e-mail",
    passwordTooShort: {
      one: "Le mot de passe doit contenir au moins {count} caractère.",
      many: "Le mot de passe doit contenir au moins {count} de caractères.",
      other: "Le mot de passe doit contenir au moins {count} caractères.",
    },
    emailInvalid: "L'adresse e-mail « {email} » n'est pas valide",
    emailInvalidFormat: "Impossible de valider l'adresse e-mail : format invalide",
    emailRateLimit: "Trop d'e-mails envoyés, réessaie plus tard",
    retryAfter: {
      one: "Par sécurité, tu ne peux refaire cette demande qu'après {count} seconde.",
      many: "Par sécurité, tu ne peux refaire cette demande qu'après {count} de secondes.",
      other: "Par sécurité, tu ne peux refaire cette demande qu'après {count} secondes.",
    },
    signupsDisabled: "Les inscriptions sont désactivées ici",
  },
};
