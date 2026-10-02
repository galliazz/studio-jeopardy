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
    notFound: "Introuvable. L'élément a peut-être été supprimé.",
    notAllowed: "Tu n'as pas la permission de faire ça.",
  },
  upload: {
    tooLarge: "Ce fichier est trop lourd pour être envoyé.",
  },
  network: {
    offline: "Impossible de joindre le serveur. Vérifie ta connexion et réessaie.",
  },
  ai: {
    noKey: "La génération par IA n'est pas configurée sur ce site.",
    unreachable: "Impossible de joindre l'IA. Vérifie ta connexion et réessaie.",
    badKey: "La clé de l'IA a été refusée. Vérifie-la dans les réglages du site.",
    busy: "L'IA est occupée pour le moment. Réessaie dans un instant.",
    failed: "L'IA n'a pas réussi à écrire le plateau. Réessaie, ou reformule le sujet.",
    empty: "L'IA n'a rien répondu. Réessaie.",
    noJson: "La réponse de l'IA était illisible. Réessaie.",
    tooFew: "Trop peu d'indices sont revenus pour faire un plateau. Essaie un sujet plus large.",
  },
};
