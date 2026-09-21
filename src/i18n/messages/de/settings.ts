import type { Messages } from "../en/index";

export const settings: Messages["settings"] = {
  description: "Änderungen gelten sofort.",
  account: {
    title: "Konto",
    changeAvatar: "Avatar ändern",
    displayName: "Anzeigename",
    email: "E-Mail",
    notSignedIn: "Nicht angemeldet",
    nameLength: "2 bis 24 Zeichen",
    nameUpdated: "Anzeigename aktualisiert",
    nameSaveFailed: "Name konnte nicht gespeichert werden",
  },
  appearance: {
    title: "Darstellung",
    theme: "Design",
    themeSystem: "System",
    themeDay: "Tag",
    themeNight: "Nacht",
    reduceMotion: "Weniger Bewegung",
    reduceMotionHint: "Schaltet unnötige Animationen ab",
  },
  audio: {
    title: "Audio",
    masterVolume: "Gesamtlautstärke",
    soundEffects: "Soundeffekte",
    muteAll: "Alles stumm",
    testSound: "Testton",
    play: "Abspielen",
  },
  performance: {
    title: "Leistung",
    graphicsQuality: "Grafikqualität",
    graphicsQualityHint: "Unschärfe, Verläufe und aufwendige Animationen",
    qualityHigh: "Hoch",
    qualityMedium: "Mittel",
    qualityLow: "Niedrig",
    backgroundEffects: "Hintergrundeffekte",
    backgroundEffectsHint: "Bunte Farbwolken im Hintergrund",
  },
  keyboard: {
    title: "Tastenkürzel",
    customKeys: "Eigene Tasten",
    customKeysHint: "Im Profil gespeichert — gleiche Tasten auf jedem Computer",
    hide: "Ausblenden",
    customise: "Anpassen",
  },
};
