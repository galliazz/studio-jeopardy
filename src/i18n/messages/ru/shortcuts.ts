import type { Messages } from "../en/index";

export const shortcuts: Messages["shortcuts"] = {
  actions: {
    reveal: "Показать ответ",
    judgeCorrect: "Засчитать ответ",
    judgeWrong: "Не засчитать ответ",
    passToNext: "Передать следующему игроку",
    restartTimer: "Перезапустить таймер",
    closeTile: "Закрыть открытую клетку",
  },
  fixed: {
    soundboard: "Включить клип с саундборда",
    settings: "Открыть настройки",
  },
  keys: {
    space: "Пробел",
    esc: "Esc",
    arrowUp: "Вверх",
    arrowDown: "Вниз",
    arrowLeft: "Влево",
    arrowRight: "Вправо",
  },
  editor: {
    pressAKey: "нажми клавишу…",
    pausedHint: "Горячие клавиши не работают, пока фокус в поле, окне или меню.",
  },
};
