import type { Messages } from "../en/index";

export const shortcuts: Messages["shortcuts"] = {
  actions: {
    reveal: "Revelar la respuesta",
    judgeCorrect: "Marcar correcta",
    judgeWrong: "Marcar incorrecta",
    passToNext: "Pasar al siguiente jugador",
    restartTimer: "Reiniciar el temporizador",
    closeTile: "Cerrar la casilla abierta",
  },
  fixed: {
    soundboard: "Reproducir un clip del panel",
    settings: "Abrir ajustes",
  },
  keys: {
    space: "Espacio",
    esc: "Esc",
    arrowUp: "Arriba",
    arrowDown: "Abajo",
    arrowLeft: "Izquierda",
    arrowRight: "Derecha",
  },
  editor: {
    pressAKey: "presiona una tecla…",
    pausedHint: "Los atajos se pausan cuando un campo, diálogo o menú está activo.",
  },
};
