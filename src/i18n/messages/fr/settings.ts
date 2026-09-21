import type { Messages } from "../en/index";

export const settings: Messages["settings"] = {
  description: "Les changements s'appliquent tout de suite.",
  account: {
    title: "Compte",
    changeAvatar: "Changer d'avatar",
    displayName: "Nom affiché",
    email: "E-mail",
    notSignedIn: "Non connecté",
    nameLength: "Entre 2 et 24 caractères",
    nameUpdated: "Nom affiché mis à jour",
    nameSaveFailed: "Impossible d'enregistrer le nom",
  },
  appearance: {
    title: "Apparence",
    theme: "Thème",
    themeSystem: "Système",
    themeDay: "Jour",
    themeNight: "Nuit",
    reduceMotion: "Réduire les animations",
    reduceMotionHint: "Désactive les animations non essentielles",
  },
  audio: {
    title: "Audio",
    masterVolume: "Volume général",
    soundEffects: "Effets sonores",
    muteAll: "Tout couper",
    testSound: "Tester le son",
    play: "Lire",
  },
  performance: {
    title: "Performances",
    graphicsQuality: "Qualité graphique",
    graphicsQualityHint: "Flou, dégradés et animations lourdes",
    qualityHigh: "Élevée",
    qualityMedium: "Moyenne",
    qualityLow: "Basse",
    backgroundEffects: "Effets d'arrière-plan",
    backgroundEffectsHint: "Halos de couleur en fond",
  },
  keyboard: {
    title: "Raccourcis clavier",
    customKeys: "Touches perso",
    customKeysHint:
      "Enregistrées dans ton profil — les mêmes touches sur n'importe quel ordinateur",
    hide: "Masquer",
    customise: "Personnaliser",
  },
};
