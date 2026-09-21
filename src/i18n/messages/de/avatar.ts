import type { Messages } from "../en/index";

export const avatar: Messages["avatar"] = {
  title: "Avatar wählen",
  description: "Nimm eine Vorlage oder lade dein eigenes Foto hoch.",
  yours: "Dein Avatar",
  presets: {
    star: "Avatar-Option 1: Stern",
    rocket: "Avatar-Option 2: Rakete",
    cat: "Avatar-Option 3: Katze",
    dog: "Avatar-Option 4: Hund",
    ghost: "Avatar-Option 5: Geist",
    crown: "Avatar-Option 6: Krone",
    sun: "Avatar-Option 7: Sonne",
    bolt: "Avatar-Option 8: Blitz",
    trophy: "Avatar-Option 9: Pokal",
    sparkles: "Avatar-Option 10: Glitzer",
  },
  upload: {
    title: "Foto hochladen",
    yourPhoto: "Dein hochgeladenes Foto",
    dropZone: "Foto hochladen",
    dropTitle: "Bild hier ablegen oder klicken zum Auswählen",
    dropHint: "JPG, PNG oder WebP · bis 5 MB",
  },
  crop: {
    preview: "Zuschnitt-Vorschau",
    zoom: "Zoom",
    hint: "Zieh das Foto, um es zu verschieben.",
    usePhoto: "Foto verwenden",
  },
  select: "Auswählen",
  errors: {
    unsupported: "Nimm ein JPG-, PNG- oder WebP-Bild",
    tooLarge: "Das Bild ist größer als 5 MB",
    signInToUpload: "Melde dich an, um ein Foto hochzuladen",
    uploadFailed: "Hochladen fehlgeschlagen",
    saveFailed: "Avatar konnte nicht gespeichert werden",
  },
};
