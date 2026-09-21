import type { Messages } from "../en/index";

export const errors: Messages["errors"] = {
  session: {
    alreadyFinished: "Эта игра уже закончилась.",
    missingTileOrPlayer: "Не нашли клетку или игрока, чей ответ оценивают.",
    noOpenTile: "Сейчас нет ни одной открытой клетки.",
    noFinalAnswer: "У этой команды нет финального ответа для оценки.",
  },
  soundboard: {
    full: "Саундборд заполнен (максимум 20 клипов).",
  },
  auth: {
    signedOut: "Вход не выполнен или сессия истекла. Войди снова.",
  },
  data: {
    notFound: "Не нашли. Возможно, это удалили.",
    notAllowed: "У тебя нет прав на это действие.",
  },
  upload: {
    tooLarge: "Этот файл слишком большой для загрузки.",
  },
  network: {
    offline: "Не удалось связаться с сервером. Проверь соединение и попробуй снова.",
  },
};
