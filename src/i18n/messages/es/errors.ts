import type { Messages } from "../en/index";

export const errors: Messages["errors"] = {
  session: {
    alreadyFinished: "Esta partida ya terminó.",
    missingTileOrPlayer: "No se encontró la casilla o el jugador que se está evaluando.",
    noOpenTile: "No hay ninguna casilla abierta ahora.",
    noFinalAnswer: "Este equipo no tiene una respuesta final que evaluar.",
  },
  soundboard: {
    full: "El panel de sonidos está lleno (máx. 20 clips).",
  },
  auth: {
    signedOut: "Tu sesión se cerró o expiró. Vuelve a iniciar sesión.",
  },
  data: {
    notFound: "No se encontró. Puede que se haya eliminado.",
    notAllowed: "No tienes permiso para hacer eso.",
  },
  upload: {
    tooLarge: "Este archivo es demasiado grande para subirlo.",
  },
  network: {
    offline: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  },
};
