import type { Messages } from "../en/index";

export const errors: Messages["errors"] = {
  session: {
    alreadyFinished: "यह गेम खत्म हो चुका है।",
    missingTileOrPlayer: "जिस टाइल या खिलाड़ी पर फ़ैसला होना था, वह नहीं मिला।",
    noOpenTile: "अभी कोई टाइल खुली नहीं है।",
    noFinalAnswer: "इस टीम का कोई आखिरी जवाब नहीं है जिस पर फ़ैसला हो सके।",
  },
  soundboard: {
    full: "साउंडबोर्ड भर गया है (ज़्यादा से ज़्यादा 20 क्लिप)।",
  },
  auth: {
    signedOut: "तुम साइन आउट हो या सेशन खत्म हो गया है। फिर से साइन इन करो।",
  },
  data: {
    notFound: "यह नहीं मिला। शायद मिटा दिया गया हो।",
    notAllowed: "तुम्हें यह करने की अनुमति नहीं है।",
  },
  upload: {
    tooLarge: "यह फ़ाइल अपलोड करने के लिए बहुत बड़ी है।",
  },
  network: {
    offline: "सर्वर तक नहीं पहुँच पाए। कनेक्शन जाँचकर फिर से कोशिश करो।",
  },
};
