import type { Messages } from "../en/index";

export const avatar: Messages["avatar"] = {
  title: "Scegli l'avatar",
  description: "Scegli un disegno pronto o carica una tua foto.",
  yours: "Il tuo avatar",
  presets: {
    star: "Avatar 1: stella",
    rocket: "Avatar 2: razzo",
    cat: "Avatar 3: gatto",
    dog: "Avatar 4: cane",
    ghost: "Avatar 5: fantasma",
    crown: "Avatar 6: corona",
    sun: "Avatar 7: sole",
    bolt: "Avatar 8: fulmine",
    trophy: "Avatar 9: trofeo",
    sparkles: "Avatar 10: scintille",
  },
  upload: {
    title: "Carica foto",
    yourPhoto: "La tua foto caricata",
    dropZone: "Carica una foto",
    dropTitle: "Trascina un'immagine o clicca per sfogliare",
    dropHint: "JPG, PNG o WebP · fino a 5MB",
  },
  crop: {
    preview: "Anteprima del ritaglio",
    zoom: "Zoom",
    hint: "Trascina la foto per riposizionarla.",
    usePhoto: "Usa foto",
  },
  select: "Seleziona",
  errors: {
    unsupported: "Usa un'immagine JPG, PNG o WebP",
    tooLarge: "L'immagine supera i 5MB",
    signInToUpload: "Accedi per caricare una foto",
    uploadFailed: "Caricamento non riuscito",
    saveFailed: "Impossibile salvare l'avatar",
  },
};
