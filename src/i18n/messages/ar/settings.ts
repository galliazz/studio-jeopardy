import type { Messages } from "../en/index";

export const settings: Messages["settings"] = {
  description: "تُطبَّق التغييرات فورًا.",
  account: {
    title: "الحساب",
    changeAvatar: "تغيير الصورة الرمزية",
    displayName: "الاسم الظاهر",
    email: "البريد الإلكتروني",
    notSignedIn: "غير مسجَّل الدخول",
    nameLength: "من 2 إلى 24 حرفًا",
    nameUpdated: "حُدِّث الاسم الظاهر",
    nameSaveFailed: "تعذّر حفظ الاسم",
  },
  appearance: {
    title: "المظهر",
    theme: "النمط",
    themeSystem: "النظام",
    themeDay: "نهار",
    themeNight: "ليل",
    reduceMotion: "تقليل الحركة",
    reduceMotionHint: "يوقف الحركات غير الضرورية",
  },
  audio: {
    title: "الصوت",
    masterVolume: "مستوى الصوت العام",
    soundEffects: "المؤثرات الصوتية",
    muteAll: "كتم الكل",
    testSound: "صوت تجريبي",
    play: "تشغيل",
  },
  performance: {
    title: "الأداء",
    graphicsQuality: "جودة الرسوم",
    graphicsQualityHint: "الضبابية والتدرّجات والحركات الثقيلة",
    qualityHigh: "عالية",
    qualityMedium: "متوسطة",
    qualityLow: "منخفضة",
    backgroundEffects: "مؤثرات الخلفية",
    backgroundEffectsHint: "بقع ملوّنة متحرّكة",
  },
  keyboard: {
    title: "اختصارات لوحة المفاتيح",
    customKeys: "مفاتيح مخصّصة",
    customKeysHint: "تُحفظ في ملفك الشخصي — المفاتيح نفسها على أي حاسوب",
    hide: "إخفاء",
    customise: "تخصيص",
  },
};
