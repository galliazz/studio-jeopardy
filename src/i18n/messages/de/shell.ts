import type { Messages } from "../en/index";

export const shell: Messages["shell"] = {
  notFound: {
    title: "Seite nicht gefunden",
    body: "Die Seite, die du suchst, gibt es nicht oder sie wurde verschoben.",
  },
  error: {
    title: "Die Seite konnte nicht geladen werden",
    body: "Bei uns ist etwas schiefgelaufen. Lade die Seite neu oder geh zurück zur Startseite.",
  },
  goHome: "Zur Startseite",
  toasts: {
    region: "Benachrichtigungen",
    close: "Benachrichtigung schließen",
  },
};
