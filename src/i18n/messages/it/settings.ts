import type { Messages } from "../en/index";

export const settings: Messages["settings"] = {
  description: "Le modifiche hanno effetto subito.",
  account: {
    title: "Account",
    changeAvatar: "Cambia avatar",
    displayName: "Nome visualizzato",
    email: "Email",
    notSignedIn: "Accesso non effettuato",
    nameLength: "Da 2 a 24 caratteri",
    nameUpdated: "Nome aggiornato",
    nameSaveFailed: "Impossibile salvare il nome",
  },
  appearance: {
    title: "Aspetto",
    theme: "Tema",
    themeSystem: "Sistema",
    themeDay: "Giorno",
    themeNight: "Notte",
    reduceMotion: "Riduci animazioni",
    reduceMotionHint: "Disattiva le animazioni non essenziali",
  },
  audio: {
    title: "Audio",
    masterVolume: "Volume generale",
    soundEffects: "Effetti sonori",
    muteAll: "Silenzia tutto",
    testSound: "Prova audio",
    play: "Riproduci",
  },
  performance: {
    title: "Prestazioni",
    graphicsQuality: "Qualità grafica",
    graphicsQualityHint: "Sfocature, sfumature e animazioni pesanti",
    qualityHigh: "Alta",
    qualityMedium: "Media",
    qualityLow: "Bassa",
    backgroundEffects: "Effetti di sfondo",
    backgroundEffectsHint: "Aloni di colore sullo sfondo",
  },
  keyboard: {
    title: "Scorciatoie da tastiera",
    customKeys: "Tasti personalizzati",
    customKeysHint: "Salvati nel tuo profilo — stessi tasti su ogni computer",
    hide: "Nascondi",
    customise: "Personalizza",
  },
};
