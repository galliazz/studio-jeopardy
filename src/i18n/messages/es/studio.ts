import type { Messages } from "../en/index";

export const studio: Messages["studio"] = {
  topBar: {
    title: "Studio",
  },
  defaultHostName: "Presentador",
  header: {
    welcomeBack: "Hola de nuevo, {name}",
    welcomeBackGuest: "Hola de nuevo",
    loadingBoards: "Cargando tableros…",
    signInToLoad: "Inicia sesión para cargar tus tableros",
    boardCount: { one: "{count} tablero", other: "{count} tableros" },
  },
  actions: {
    createGame: "Crear un juego nuevo",
    importJson: "Importar JSON",
    searchBoards: "Buscar tableros",
    searchPlaceholder: "Buscar tableros…",
  },
  create: {
    title: "Ponle nombre a tu tablero",
    placeholder: "p. ej. Trivia del viernes",
    submit: "Crear",
  },
  signedOut: {
    body: "Necesitas iniciar sesión para cargar y crear tableros.",
    signIn: "Iniciar sesión",
  },
  empty: "Aún no hay tableros — ¡crea el primero!",
  card: {
    openInEditor: "Abrir en el editor",
    options: "Opciones del tablero",
    joinCode: "Código para unirse",
    rename: "Renombrar",
    duplicate: "Duplicar",
    exportJson: "Exportar JSON",
    exportExcel: "Exportar Excel",
    readyToPlay: "Listo para jugar",
    tilesReady: {
      one: "{ready} de {count} casilla lista",
      other: "{ready} de {count} casillas listas",
    },
    play: "Jugar",
  },
  joinDialog: {
    title: "Código para unirse",
    description: "Los jugadores pueden entrar con este código o escaneando el QR.",
    linkCopied: "Enlace para unirse copiado",
  },
  deleteDialog: {
    title: "¿Eliminar “{title}”?",
    description:
      "Se eliminan el tablero y todas sus preguntas. Puedes deshacerlo justo después de eliminarlo.",
    confirm: "Eliminar tablero",
  },
  toast: {
    created: "Tablero creado",
    createFailed: "No se pudo crear el tablero",
    duplicated: "Tablero duplicado",
    duplicateFailed: "No se pudo duplicar",
    deleted: "“{title}” eliminado",
    deleteFailed: "No se pudo eliminar",
    exportedJson: "Exportado como JSON",
    exportedExcel: "Exportado como Excel",
    exportFailed: "No se pudo exportar",
    startFailed: "No se pudo iniciar la partida",
    renamed: "Tablero renombrado",
    renameFailed: "No se pudo renombrar",
    imported: "Tablero importado",
    importFailed: "No se pudo importar — archivo no válido",
  },
  excel: {
    sheet: "Tablero",
    category: "Categoría",
    points: "Puntos",
    clue: "Pregunta",
    answer: "Respuesta",
    hint: "Pista",
  },
};
