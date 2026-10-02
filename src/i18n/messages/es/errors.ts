import type { Messages } from "../en/index";

export const errors: Messages["errors"] = {
  session: {
    alreadyFinished: "Esta partida ya terminó.",
    missingTileOrPlayer: "No se encontró la casilla o el jugador que se está evaluando.",
    noOpenTile: "En este momento no hay ninguna casilla abierta.",
    noFinalAnswer: "Este equipo no tiene una respuesta final que evaluar.",
  },
  soundboard: {
    full: "El panel de sonidos está lleno (máx. 20 clips).",
  },
  auth: {
    signedOut: "Tu sesión se cerró o expiró. Vuelve a iniciar sesión.",
  },
  data: {
    notFound: "No lo encontramos. Puede que se haya eliminado.",
    notAllowed: "No tienes permiso para hacer eso.",
  },
  upload: {
    tooLarge: "Este archivo es demasiado grande para subirlo.",
  },
  network: {
    offline: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  },
  ai: {
    noKey: "La generación con IA no está configurada en este sitio.",
    unreachable: "No consigo alcanzar la IA. Comprueba la conexión e inténtalo de nuevo.",
    badKey: "La clave de la IA fue rechazada. Compruébala en los ajustes del sitio.",
    busy: "La IA está ocupada ahora mismo. Inténtalo en un momento.",
    failed: "La IA no pudo escribir el tablero. Inténtalo otra vez o cambia cómo planteas el tema.",
    empty: "La IA no respondió nada. Inténtalo de nuevo.",
    noJson: "No se pudo leer la respuesta de la IA. Inténtalo de nuevo.",
    tooFew: "Volvieron muy pocas pistas para hacer un tablero. Prueba con un tema más amplio.",
  },
};
