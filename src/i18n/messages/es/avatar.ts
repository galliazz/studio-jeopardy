import type { Messages } from "../en/index";

export const avatar: Messages["avatar"] = {
  title: "Elige un avatar",
  description: "Usa uno prediseñado o sube tu propia foto.",
  yours: "Tu avatar",
  presets: {
    star: "Opción de avatar 1: estrella",
    rocket: "Opción de avatar 2: cohete",
    cat: "Opción de avatar 3: gato",
    dog: "Opción de avatar 4: perro",
    ghost: "Opción de avatar 5: fantasma",
    crown: "Opción de avatar 6: corona",
    sun: "Opción de avatar 7: sol",
    bolt: "Opción de avatar 8: rayo",
    trophy: "Opción de avatar 9: trofeo",
    sparkles: "Opción de avatar 10: destellos",
  },
  upload: {
    title: "Subir foto",
    yourPhoto: "La foto que subiste",
    dropZone: "Sube una foto",
    dropTitle: "Suelta una imagen o haz clic para buscar",
    dropHint: "JPG, PNG o WebP · hasta 5 MB",
  },
  crop: {
    preview: "Vista previa del recorte",
    zoom: "Zoom",
    hint: "Arrastra la foto para acomodarla.",
    usePhoto: "Usar foto",
  },
  select: "Seleccionar",
  errors: {
    unsupported: "Usa una imagen JPG, PNG o WebP",
    tooLarge: "La imagen pesa más de 5 MB",
    signInToUpload: "Inicia sesión para subir una foto",
    uploadFailed: "No se pudo subir",
    saveFailed: "No se pudo guardar el avatar",
  },
};
