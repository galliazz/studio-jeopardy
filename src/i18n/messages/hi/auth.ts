import type { Messages } from "../en/index";

export const auth: Messages["auth"] = {
  backToHome: "होम पर वापस",
  subtitle: "होस्ट कंसोल में साइन इन",
  checkEmail: {
    title: "अपना इनबॉक्स देखो",
    body: "हमने <b>{email}</b> पर पुष्टि का लिंक भेजा है। होस्ट अकाउंट चालू करने के लिए उस पर क्लिक करो, फिर साइन इन करो।",
    backToSignIn: "साइन इन पर वापस",
  },
  tabs: {
    signIn: "साइन इन",
    signUp: "अकाउंट बनाओ",
  },
  fields: {
    hostName: "होस्ट का नाम",
    email: "ईमेल",
    password: "पासवर्ड (6+ अक्षर)",
  },
  submit: {
    working: "हो रहा है…",
    signIn: "साइन इन करो",
    signUp: "होस्ट अकाउंट बनाओ",
  },
  playersNoAccount: "खिलाड़ियों को अकाउंट की ज़रूरत नहीं — वे गेम कोड से जुड़ते हैं।",
  errors: {
    failed: "साइन इन नहीं हो पाया",
    invalidCredentials: "ईमेल या पासवर्ड गलत है",
    emailNotConfirmed: "ईमेल की पुष्टि नहीं हुई है",
    userAlreadyRegistered: "यह ईमेल पहले से रजिस्टर है",
    passwordTooShort: {
      one: "पासवर्ड कम से कम {count} अक्षर का होना चाहिए।",
      other: "पासवर्ड कम से कम {count} अक्षर का होना चाहिए।",
    },
    emailInvalid: "ईमेल पता “{email}” सही नहीं है",
    emailInvalidFormat: "ईमेल पता जाँचा नहीं जा सका: फ़ॉर्मेट गलत है",
    emailRateLimit: "बहुत सारे ईमेल भेजे जा चुके हैं — थोड़ी देर बाद कोशिश करो",
    retryAfter: {
      one: "सुरक्षा के कारण यह अनुरोध {count} सेकंड बाद ही किया जा सकता है।",
      other: "सुरक्षा के कारण यह अनुरोध {count} सेकंड बाद ही किया जा सकता है।",
    },
    signupsDisabled: "यहाँ नए अकाउंट बनाना बंद है",
  },
};
