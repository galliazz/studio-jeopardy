import type { Messages } from "../en/index";

export const avatar: Messages["avatar"] = {
  title: "Escolher avatar",
  description: "Escolha um dos prontos ou envie a sua foto.",
  yours: "Seu avatar",
  presets: {
    star: "Opção de avatar 1: estrela",
    rocket: "Opção de avatar 2: foguete",
    cat: "Opção de avatar 3: gato",
    dog: "Opção de avatar 4: cachorro",
    ghost: "Opção de avatar 5: fantasma",
    crown: "Opção de avatar 6: coroa",
    sun: "Opção de avatar 7: sol",
    bolt: "Opção de avatar 8: raio",
    trophy: "Opção de avatar 9: troféu",
    sparkles: "Opção de avatar 10: brilhos",
  },
  upload: {
    title: "Enviar foto",
    yourPhoto: "A foto que você enviou",
    dropZone: "Enviar uma foto",
    dropTitle: "Solte uma imagem ou clique para escolher",
    dropHint: "JPG, PNG ou WebP · até 5MB",
  },
  crop: {
    preview: "Prévia do recorte",
    zoom: "Zoom",
    hint: "Arraste a foto para posicioná-la.",
    usePhoto: "Usar a foto",
  },
  select: "Selecionar",
  errors: {
    unsupported: "Use uma imagem JPG, PNG ou WebP",
    tooLarge: "Essa imagem passa de 5MB",
    signInToUpload: "Entre para enviar uma foto",
    uploadFailed: "O envio falhou",
    saveFailed: "Não foi possível salvar o avatar",
  },
};
