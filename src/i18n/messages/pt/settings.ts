import type { Messages } from "../en/index";

export const settings: Messages["settings"] = {
  description: "As mudanças valem na hora.",
  account: {
    title: "Conta",
    changeAvatar: "Trocar avatar",
    displayName: "Nome de exibição",
    email: "E-mail",
    notSignedIn: "Você não está conectado",
    nameLength: "Use de 2 a 24 caracteres",
    nameUpdated: "Nome de exibição atualizado",
    nameSaveFailed: "Não foi possível salvar o nome",
  },
  appearance: {
    title: "Aparência",
    theme: "Tema",
    themeSystem: "Sistema",
    themeDay: "Dia",
    themeNight: "Noite",
    reduceMotion: "Reduzir animações",
    reduceMotionHint: "Desliga as animações não essenciais",
  },
  audio: {
    title: "Áudio",
    masterVolume: "Volume geral",
    soundEffects: "Efeitos sonoros",
    muteAll: "Silenciar tudo",
    testSound: "Testar o som",
    play: "Tocar",
  },
  performance: {
    title: "Desempenho",
    graphicsQuality: "Qualidade gráfica",
    graphicsQualityHint: "Desfoque, gradientes e animações pesadas",
    qualityHigh: "Alta",
    qualityMedium: "Média",
    qualityLow: "Baixa",
    backgroundEffects: "Efeitos de fundo",
    backgroundEffectsHint: "Manchas coloridas no fundo",
  },
  keyboard: {
    title: "Atalhos de teclado",
    customKeys: "Teclas personalizadas",
    customKeysHint: "Salvas no seu perfil — as mesmas teclas em qualquer computador",
    hide: "Ocultar",
    customise: "Personalizar",
  },
};
