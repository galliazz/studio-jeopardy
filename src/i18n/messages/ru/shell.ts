import type { Messages } from "../en/index";

export const shell: Messages["shell"] = {
  notFound: {
    title: "Страница не найдена",
    body: "Такой страницы нет или её перенесли.",
  },
  error: {
    title: "Страница не загрузилась",
    body: "У нас что-то сломалось. Попробуй обновить страницу или вернись на главную.",
  },
  goHome: "На главную",
  toasts: {
    region: "Уведомления",
    close: "Закрыть уведомление",
  },
};
