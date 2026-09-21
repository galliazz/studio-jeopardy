import type { Messages } from "../en/index";

export const studio: Messages["studio"] = {
  topBar: {
    title: "Studio",
  },
  defaultHostName: "Ведущий",
  header: {
    welcomeBack: "С возвращением, {name}",
    welcomeBackGuest: "С возвращением!",
    loadingBoards: "Загружаем табло…",
    signInToLoad: "Войди, чтобы загрузить свои табло",
    boardCount: {
      one: "{count} табло",
      few: "{count} табло",
      many: "{count} табло",
      other: "{count} табло",
    },
  },
  actions: {
    createGame: "Создать игру",
    importJson: "Импорт JSON",
    searchBoards: "Поиск табло",
    searchPlaceholder: "Искать табло…",
  },
  create: {
    title: "Назови табло",
    placeholder: "Например, Пятничная викторина",
    submit: "Создать",
  },
  signedOut: {
    body: "Войди, чтобы загружать и создавать табло.",
    signIn: "Войти",
  },
  empty: "Табло пока нет — создай первое!",
  card: {
    openInEditor: "Открыть в редакторе",
    options: "Действия с табло",
    joinCode: "Код входа",
    rename: "Переименовать",
    duplicate: "Дублировать",
    exportJson: "Экспорт JSON",
    exportExcel: "Экспорт Excel",
    readyToPlay: "Готово к игре",
    // «клетки» si accorda con {count}, il numero che sceglie la forma.
    tilesReady: {
      one: "Готово {ready} из {count} клетки",
      few: "Готово {ready} из {count} клеток",
      many: "Готово {ready} из {count} клеток",
      other: "Готово {ready} из {count} клетки",
    },
    play: "Играть",
  },
  joinDialog: {
    title: "Код входа",
    description: "Игроки могут войти по этому коду или отсканировать QR-код.",
    linkCopied: "Ссылка для входа скопирована",
  },
  deleteDialog: {
    title: "Удалить «{title}»?",
    description: "Табло и все его вопросы будут удалены. Сразу после удаления это можно отменить.",
    confirm: "Удалить табло",
  },
  toast: {
    created: "Табло создано",
    createFailed: "Не удалось создать табло",
    duplicated: "Копия табло создана",
    duplicateFailed: "Не удалось создать копию",
    deleted: "Табло «{title}» удалено",
    deleteFailed: "Не удалось удалить",
    exportedJson: "Экспортировано в JSON",
    exportedExcel: "Экспортировано в Excel",
    exportFailed: "Не удалось экспортировать",
    startFailed: "Не удалось запустить игру",
    renamed: "Табло переименовано",
    renameFailed: "Не удалось переименовать",
    imported: "Табло импортировано",
    importFailed: "Не удалось импортировать — неверный файл",
  },
  excel: {
    sheet: "Табло",
    category: "Категория",
    points: "Очки",
    clue: "Вопрос",
    answer: "Ответ",
    hint: "Подсказка",
  },
};
