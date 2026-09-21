import type { Messages } from "../en/index";

export const errors: Messages["errors"] = {
  session: {
    alreadyFinished: "انتهت هذه اللعبة بالفعل.",
    missingTileOrPlayer: "تعذّر العثور على الخانة أو اللاعب المطلوب.",
    noOpenTile: "لا توجد خانة مفتوحة الآن.",
    noFinalAnswer: "لا توجد إجابة نهائية لهذا الفريق.",
  },
  soundboard: {
    full: "لوحة الأصوات ممتلئة (20 مقطعًا كحد أقصى).",
  },
  auth: {
    signedOut: "خرجت من حسابك أو انتهت جلستك. سجّل الدخول من جديد.",
  },
  data: {
    notFound: "لم نجده. ربما تم حذفه.",
    notAllowed: "ليس لديك صلاحية لهذا الإجراء.",
  },
  upload: {
    tooLarge: "هذا الملف أكبر من أن يُرفع.",
  },
  network: {
    offline: "تعذّر الوصول إلى الخادم. تحقّق من اتصالك وأعد المحاولة.",
  },
};
