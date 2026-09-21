import type { Messages } from "../en/index";

export const settings: Messages["settings"] = {
  description: "Los cambios se aplican al instante.",
  account: {
    title: "Cuenta",
    changeAvatar: "Cambiar avatar",
    displayName: "Nombre visible",
    email: "Correo electrónico",
    notSignedIn: "Sin sesión iniciada",
    nameLength: "Usa de 2 a 24 caracteres",
    nameUpdated: "Nombre actualizado",
    nameSaveFailed: "No se pudo guardar el nombre",
  },
  appearance: {
    title: "Apariencia",
    theme: "Tema",
    themeSystem: "Sistema",
    themeDay: "Día",
    themeNight: "Noche",
    reduceMotion: "Reducir movimiento",
    reduceMotionHint: "Desactiva las animaciones no esenciales",
  },
  audio: {
    title: "Audio",
    masterVolume: "Volumen general",
    soundEffects: "Efectos de sonido",
    muteAll: "Silenciar todo",
    testSound: "Probar sonido",
    play: "Reproducir",
  },
  performance: {
    title: "Rendimiento",
    graphicsQuality: "Calidad gráfica",
    graphicsQualityHint: "Desenfoques, degradados y animaciones pesadas",
    qualityHigh: "Alta",
    qualityMedium: "Media",
    qualityLow: "Baja",
    backgroundEffects: "Efectos de fondo",
    backgroundEffectsHint: "Manchas de color en el fondo",
  },
  keyboard: {
    title: "Atajos de teclado",
    customKeys: "Teclas personalizadas",
    customKeysHint: "Se guardan en tu perfil — las mismas teclas en cualquier computadora",
    hide: "Ocultar",
    customise: "Personalizar",
  },
};
