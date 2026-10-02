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
  ai: {
    noKey: "A geração com IA não está configurada neste site.",
    unreachable: "Não consigo alcançar a IA. Verifica a ligação e tenta outra vez.",
    badKey: "A chave da IA foi recusada. Verifica-a nas definições do site.",
    busy: "A IA está ocupada neste momento. Tenta dentro de pouco.",
    failed:
      "A IA não conseguiu escrever o tabuleiro. Tenta outra vez, ou muda a forma de dizer o tema.",
    empty: "A IA não respondeu nada. Tenta outra vez.",
    noJson: "Não foi possível ler a resposta da IA. Tenta outra vez.",
    tooFew: "Voltaram pistas insuficientes para fazer um tabuleiro. Tenta um tema mais amplo.",
  },
};
