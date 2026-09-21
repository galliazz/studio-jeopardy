import type { Messages } from "../en/index";

export const avatar: Messages["avatar"] = {
  title: "اختر صورة رمزية",
  description: "اختر واحدة جاهزة أو ارفع صورتك.",
  yours: "صورتك الرمزية",
  presets: {
    star: "صورة رمزية 1: نجمة",
    rocket: "صورة رمزية 2: صاروخ",
    cat: "صورة رمزية 3: قطة",
    dog: "صورة رمزية 4: كلب",
    ghost: "صورة رمزية 5: شبح",
    crown: "صورة رمزية 6: تاج",
    sun: "صورة رمزية 7: شمس",
    bolt: "صورة رمزية 8: برق",
    trophy: "صورة رمزية 9: كأس",
    sparkles: "صورة رمزية 10: بريق",
  },
  upload: {
    title: "رفع صورة",
    yourPhoto: "صورتك المرفوعة",
    dropZone: "ارفع صورة",
    dropTitle: "أفلت صورة أو اضغط للتصفّح",
    dropHint: "JPG أو PNG أو WebP · حتى 5 ميغابايت",
  },
  crop: {
    preview: "معاينة القصّ",
    zoom: "تكبير",
    hint: "اسحب الصورة لتحريكها.",
    usePhoto: "استخدم الصورة",
  },
  select: "اختيار",
  errors: {
    unsupported: "استخدم صورة JPG أو PNG أو WebP",
    tooLarge: "حجم الصورة يتجاوز 5 ميغابايت",
    signInToUpload: "سجّل الدخول لرفع صورة",
    uploadFailed: "فشل الرفع",
    saveFailed: "تعذّر حفظ الصورة الرمزية",
  },
};
