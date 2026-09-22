import type { Messages } from "../en/index";

export const play: Messages["play"] = {
  lookup: {
    finding: "Buscando tu partida…",
    serverErrorTitle: "Error del servidor",
    serverErrorBody:
      "El tablero está listo, pero el servidor rechazó la solicitud. No es algo que puedas arreglar desde aquí: avísale al presentador.",
    notStartedTitle: "La partida aún no empezó",
    notStartedBody:
      "El presentador todavía no puso este tablero en vivo. Espera un momento y recarga.",
    notFoundTitle: "Partida no encontrada",
    notFoundBody:
      "Ninguna partida en vivo coincide con el código “{code}”. Revisa el código e inténtalo de nuevo.",
  },
  join: {
    intro: "No necesitas cuenta: elige un nombre, un avatar y un equipo.",
    nameLabel: "Tu nombre",
    nameLength: "Usa de {min} a {max} caracteres",
    avatarLabel: "Tu avatar",
    avatarOption: "Avatar {avatar}",
    teamLabel: "Tu equipo",
    notAccepting: "Esta partida no admite jugadores en este momento.",
    gameGone: "Esa partida terminó o ya no existe.",
    fullOrClosed: "La partida está llena o cerrada — pregúntale al presentador.",
    failed: "No se pudo entrar — inténtalo de nuevo.",
    joining: "Entrando…",
    joinGame: "Entrar a la partida",
  },
  lobby: {
    title: "¡Ya estás dentro!",
    waiting: "Esperando a que el presentador abra el tablero…",
    changeIdentity: "Cambiar nombre, avatar o equipo",
  },
  idle: {
    title: "Prepárate",
    body: "Esperando la siguiente pregunta.",
  },
  buzzer: {
    youreUp: "¡TE TOCA!",
    secondsLeft: "{seconds}s",
    answerOutLoud: "Responde en voz alta — ¡el presentador te escucha!",
    lockedOutTitle: "Bloqueado",
    lockedOutBody: "Incorrecto — espera la siguiente pregunta.",
    inLine: "EN COLA",
    position: "#{position}",
    lockedIn: "¡Tu pulsación quedó registrada!",
    buzz: "PULSA",
    closed: "Los pulsadores están cerrados",
    rejected: "Pulsación rechazada",
    failed: "La pulsación falló — inténtalo de nuevo",
  },
  reveal: {
    title: "Respuesta revelada",
    body: "Mira el tablero — ya viene la siguiente casilla.",
  },
  finished: {
    tie: "¡Empate!",
    wins: "¡Gana {team}!",
    yourTeamScored: "Tu equipo sumó <b>{score}</b> puntos",
  },
  final: {
    title: "Final Jeopardy",
    rules: "Una respuesta por equipo — {team} · apuesta máx. {max}",
    answerRules: "Una respuesta por equipo — {team} · apuesta ya fijada",
    wager: "Apuesta",
    answerPlaceholder: "La respuesta de tu equipo…",
    lockInWager: "Confirmar apuesta",
    submitAnswer: "Enviar respuesta final",
    rejected: "Envío rechazado",
    sentTitle: "Respuesta enviada",
    sentBody: "La respuesta final de tu equipo ya está registrada. Esperando al presentador…",
  },
};
