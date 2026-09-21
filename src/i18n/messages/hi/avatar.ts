import type { Messages } from "../en/index";

export const avatar: Messages["avatar"] = {
  title: "अवतार चुनो",
  description: "कोई तैयार अवतार चुनो या अपनी फ़ोटो अपलोड करो।",
  yours: "तुम्हारा अवतार",
  presets: {
    star: "अवतार विकल्प 1: तारा",
    rocket: "अवतार विकल्प 2: रॉकेट",
    cat: "अवतार विकल्प 3: बिल्ली",
    dog: "अवतार विकल्प 4: कुत्ता",
    ghost: "अवतार विकल्प 5: भूत",
    crown: "अवतार विकल्प 6: ताज",
    sun: "अवतार विकल्प 7: सूरज",
    bolt: "अवतार विकल्प 8: बिजली",
    trophy: "अवतार विकल्प 9: ट्रॉफ़ी",
    sparkles: "अवतार विकल्प 10: चमक",
  },
  upload: {
    title: "फ़ोटो अपलोड करो",
    yourPhoto: "तुम्हारी अपलोड की हुई फ़ोटो",
    dropZone: "फ़ोटो अपलोड करो",
    dropTitle: "इमेज यहाँ छोड़ो या क्लिक करके चुनो",
    dropHint: "JPG, PNG या WebP · 5MB तक",
  },
  crop: {
    preview: "क्रॉप की झलक",
    zoom: "ज़ूम",
    hint: "फ़ोटो को खींचकर सही जगह पर लाओ।",
    usePhoto: "यह फ़ोटो लगाओ",
  },
  select: "चुनो",
  errors: {
    unsupported: "JPG, PNG या WebP इमेज चुनो",
    tooLarge: "यह इमेज 5MB से बड़ी है",
    signInToUpload: "फ़ोटो अपलोड करने के लिए साइन इन करो",
    uploadFailed: "अपलोड नहीं हो पाया",
    saveFailed: "अवतार सेव नहीं हो पाया",
  },
};
