import type { Messages } from "../en/index";

export const avatar: Messages["avatar"] = {
  title: "Choisis ton avatar",
  description: "Prends un avatar tout prêt ou envoie ta propre photo.",
  yours: "Ton avatar",
  presets: {
    star: "Avatar 1 : étoile",
    rocket: "Avatar 2 : fusée",
    cat: "Avatar 3 : chat",
    dog: "Avatar 4 : chien",
    ghost: "Avatar 5 : fantôme",
    crown: "Avatar 6 : couronne",
    sun: "Avatar 7 : soleil",
    bolt: "Avatar 8 : éclair",
    trophy: "Avatar 9 : trophée",
    sparkles: "Avatar 10 : étincelles",
  },
  upload: {
    title: "Envoyer une photo",
    yourPhoto: "Ta photo",
    dropZone: "Envoyer une photo",
    dropTitle: "Dépose une image ou clique pour parcourir",
    dropHint: "JPG, PNG ou WebP · 5 Mo max",
  },
  crop: {
    preview: "Aperçu du recadrage",
    zoom: "Zoom",
    hint: "Fais glisser la photo pour la repositionner.",
    usePhoto: "Utiliser la photo",
  },
  select: "Choisir",
  errors: {
    unsupported: "Utilise une image JPG, PNG ou WebP",
    tooLarge: "Cette image dépasse 5 Mo",
    signInToUpload: "Connecte-toi pour envoyer une photo",
    uploadFailed: "Échec de l'envoi",
    saveFailed: "Impossible d'enregistrer l'avatar",
  },
};
