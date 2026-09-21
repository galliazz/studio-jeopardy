import type { Messages } from "../en/index";

export const settings: Messages["settings"] = {
  description: "Изменения применяются сразу.",
  account: {
    title: "Аккаунт",
    changeAvatar: "Сменить аватар",
    displayName: "Отображаемое имя",
    email: "Почта",
    notSignedIn: "Вход не выполнен",
    nameLength: "От 2 до 24 символов",
    nameUpdated: "Имя обновлено",
    nameSaveFailed: "Не удалось сохранить имя",
  },
  appearance: {
    title: "Оформление",
    theme: "Тема",
    themeSystem: "Системная",
    themeDay: "День",
    themeNight: "Ночь",
    reduceMotion: "Меньше анимаций",
    reduceMotionHint: "Отключает необязательные анимации",
  },
  audio: {
    title: "Звук",
    masterVolume: "Общая громкость",
    soundEffects: "Звуковые эффекты",
    muteAll: "Выключить весь звук",
    testSound: "Проверить звук",
    play: "Включить",
  },
  performance: {
    title: "Производительность",
    graphicsQuality: "Качество графики",
    graphicsQualityHint: "Размытие, градиенты и тяжёлые анимации",
    qualityHigh: "Высокое",
    qualityMedium: "Среднее",
    qualityLow: "Низкое",
    backgroundEffects: "Фоновые эффекты",
    backgroundEffectsHint: "Цветные пятна на фоне",
  },
  keyboard: {
    title: "Горячие клавиши",
    customKeys: "Свои клавиши",
    customKeysHint: "Сохраняются в профиле — одни и те же на любом компьютере",
    hide: "Скрыть",
    customise: "Настроить",
  },
};
