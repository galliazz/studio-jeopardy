import type { Messages } from "../en/index";

export const game: Messages["game"] = {
  clue: {
    dailyDoubleBanner: "Daily Double · بضعف النقاط",
    fallbackCategory: "سؤال",
    dailyDoubleValue: "{points} ×2",
    mediaAlt: "وسائط السؤال",
    tileClosed: "أُغلقت الخانة",
    buzzersOpen: "الأجراس مفتوحة",
  },
  queue: {
    title: "طابور الأجراس",
    clear: "إفراغ الطابور",
    clearConfirm: "إفراغ طابور الأجراس؟ سيخرج منه كل من ينتظر.",
    position: "#{position}",
    firstIn: "الأول",
    // Nelle pillole piccole l'unità resta latina: mescolarla all'arabo
    // scombina l'ordine dei caratteri accanto al numero.
    deltaMs: "+{ms}ms",
    deltaSeconds: "+{seconds}s",
  },
  score: {
    teamPlayers: {
      zero: "لا لاعبين",
      one: "لاعب واحد",
      two: "لاعبان",
      few: "{count} لاعبين",
      many: "{count} لاعبًا",
      other: "{count} لاعب",
    },
    teamPlayersLabel: {
      zero: "لا لاعبين في هذا الفريق",
      one: "لاعب واحد في هذا الفريق",
      two: "لاعبان في هذا الفريق",
      few: "{count} لاعبين في هذا الفريق",
      many: "{count} لاعبًا في هذا الفريق",
      other: "{count} لاعب في هذا الفريق",
    },
    subtractFrom: "اطرح {step} من {name}",
    addTo: "أضف {step} إلى {name}",
    customChangeFor: "تعديل مخصّص لنقاط {name}",
    customAmount: "قيمة مخصّصة",
    subtract: "طرح",
    teamScore: "نقاط {name}",
    doubleClickToEdit: "اضغط مرتين للتعديل",
  },
  fontFamilies: {
    display: "عناوين",
    sans: "بلا زوائد",
    system: "النظام",
    grotesk: "غروتيسك",
    rounded: "مستدير",
    serif: "بزوائد",
    oldStyle: "طراز قديم",
    slab: "زوائد عريضة",
    mono: "ثابت العرض",
    condensed: "مضغوط",
    handwriting: "خط اليد",
  },
  fontWeights: {
    "300": "خفيف",
    "400": "عادي",
    "500": "متوسط",
    "700": "عريض",
    "900": "أسود",
  },
};
