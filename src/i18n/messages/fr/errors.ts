import type { Messages } from "../en/index";

export const errors: Messages["errors"] = {
  session: {
    alreadyFinished: "Cette partie est déjà terminée.",
    missingTileOrPlayer: "Impossible de trouver la case ou le joueur à juger.",
    noOpenTile: "Aucune case n'est ouverte pour l'instant.",
    noFinalAnswer: "Cette équipe n'a pas de réponse finale à juger.",
  },
  soundboard: {
    full: "La boîte à sons est pleine (20 sons max).",
  },
  auth: {
    signedOut: "Ta session est fermée ou a expiré. Reconnecte-toi.",
  },
  data: {
    notFound: "Introuvable. Ça a peut-être été supprimé.",
    notAllowed: "Tu n'as pas la permission de faire ça.",
  },
  upload: {
    tooLarge: "Ce fichier est trop lourd pour être envoyé.",
  },
  network: {
    offline: "Impossible de joindre le serveur. Vérifie ta connexion et réessaie.",
  },
};
