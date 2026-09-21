import type { Messages } from "../en/index";

export const errors: Messages["errors"] = {
  session: {
    alreadyFinished: "Este jogo já terminou.",
    missingTileOrPlayer: "Não achamos a casa ou o jogador que está sendo julgado.",
    noOpenTile: "Não há nenhuma casa aberta agora.",
    noFinalAnswer: "Este time não enviou resposta final para julgar.",
  },
  soundboard: {
    full: "A soundboard está cheia (no máximo 20 clipes).",
  },
  auth: {
    signedOut: "Você saiu ou sua sessão expirou. Entre de novo.",
  },
  data: {
    notFound: "Não encontramos. Pode ter sido excluído.",
    notAllowed: "Você não tem permissão para fazer isso.",
  },
  upload: {
    tooLarge: "Este arquivo é grande demais para enviar.",
  },
  network: {
    offline: "Não conseguimos falar com o servidor. Confira sua conexão e tente de novo.",
  },
};
