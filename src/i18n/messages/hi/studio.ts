import type { Messages } from "../en/index";

export const studio: Messages["studio"] = {
  topBar: {
    title: "Studio",
  },
  defaultHostName: "होस्ट",
  header: {
    welcomeBack: "फिर से स्वागत है, {name}",
    welcomeBackGuest: "फिर से स्वागत है",
    loadingBoards: "बोर्ड लोड हो रहे हैं…",
    signInToLoad: "अपने बोर्ड देखने के लिए साइन इन करो",
    boardCount: { one: "{count} बोर्ड", other: "{count} बोर्ड" },
  },
  actions: {
    createGame: "नया गेम बनाओ",
    importJson: "JSON इम्पोर्ट करो",
    searchBoards: "बोर्ड खोजो",
    searchPlaceholder: "बोर्ड खोजो…",
  },
  create: {
    title: "बोर्ड का नाम रखो",
    placeholder: "जैसे: शुक्रवार की क्विज़ नाइट",
    submit: "बनाओ",
  },
  signedOut: {
    body: "बोर्ड देखने और बनाने के लिए साइन इन करना ज़रूरी है।",
    signIn: "साइन इन करो",
  },
  empty: "अभी कोई बोर्ड नहीं — अपना पहला बोर्ड बनाओ!",
  card: {
    openInEditor: "एडिटर में खोलो",
    options: "बोर्ड के विकल्प",
    joinCode: "जॉइन कोड",
    rename: "नाम बदलो",
    duplicate: "कॉपी बनाओ",
    exportJson: "JSON एक्सपोर्ट करो",
    exportExcel: "Excel एक्सपोर्ट करो",
    readyToPlay: "खेलने को तैयार",
    tilesReady: {
      one: "{count} में से {ready} टाइल तैयार",
      other: "{count} में से {ready} टाइलें तैयार",
    },
    play: "खेलो",
  },
  joinDialog: {
    title: "जॉइन कोड",
    description: "खिलाड़ी इस कोड से या QR स्कैन करके जुड़ सकते हैं।",
    linkCopied: "जॉइन लिंक कॉपी हो गया",
  },
  deleteDialog: {
    title: "“{title}” मिटाना है?",
    description:
      "इससे बोर्ड और उसके सारे सवाल मिट जाएँगे। मिटाने के तुरंत बाद इसे वापस लाया जा सकता है।",
    confirm: "बोर्ड मिटाओ",
  },
  toast: {
    created: "बोर्ड बन गया",
    createFailed: "बोर्ड नहीं बन पाया",
    duplicated: "बोर्ड की कॉपी बन गई",
    duplicateFailed: "कॉपी नहीं बन पाई",
    deleted: "“{title}” मिट गया",
    deleteFailed: "मिटाया नहीं जा सका",
    exportedJson: "JSON में एक्सपोर्ट हो गया",
    exportedExcel: "Excel में एक्सपोर्ट हो गया",
    exportFailed: "एक्सपोर्ट नहीं हो पाया",
    startFailed: "सेशन शुरू नहीं हो पाया",
    renamed: "बोर्ड का नाम बदल गया",
    renameFailed: "नाम नहीं बदला जा सका",
    imported: "बोर्ड इम्पोर्ट हो गया",
    importFailed: "इम्पोर्ट नहीं हो पाया — फ़ाइल सही नहीं है",
  },
  excel: {
    sheet: "बोर्ड",
    category: "श्रेणी",
    points: "अंक",
    clue: "सवाल",
    answer: "जवाब",
    hint: "संकेत",
  },
};
