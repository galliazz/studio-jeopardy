import type { Messages } from "../en/index";

export const shell: Messages["shell"] = {
  notFound: {
    title: "Page introuvable",
    body: "La page que tu cherches n'existe pas ou a été déplacée.",
  },
  error: {
    title: "Cette page ne s'est pas chargée",
    body: "Un problème est survenu de notre côté. Essaie d'actualiser la page ou reviens à l'accueil.",
  },
  goHome: "Retour à l'accueil",
  toasts: {
    region: "Notifications",
    close: "Fermer la notification",
  },
};
