import type { Messages } from "../en/index";

export const shell: Messages["shell"] = {
  notFound: {
    title: "पेज नहीं मिला",
    body: "यह पेज मौजूद नहीं है या कहीं और ले जाया गया है।",
  },
  error: {
    title: "यह पेज लोड नहीं हुआ",
    body: "हमारी तरफ़ से कुछ गड़बड़ हो गई। पेज रीफ़्रेश करके देखो या होम पर लौट जाओ।",
  },
  goHome: "होम पर जाओ",
  toasts: {
    region: "सूचनाएँ",
    close: "सूचना बंद करो",
  },
};
