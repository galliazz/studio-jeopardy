import type { Messages } from "../en/index";

export const errors: Messages["errors"] = {
  session: {
    alreadyFinished: "Dieses Spiel ist bereits beendet.",
    missingTileOrPlayer: "Feld oder Spieler zum Werten nicht gefunden.",
    noOpenTile: "Gerade ist kein Feld offen.",
    noFinalAnswer: "Dieses Team hat keine finale Antwort zum Werten.",
  },
  soundboard: {
    full: "Das Soundboard ist voll (max. 20 Clips).",
  },
  auth: {
    signedOut: "Du bist abgemeldet oder deine Sitzung ist abgelaufen. Melde dich erneut an.",
  },
  data: {
    notFound: "Nicht gefunden. Vielleicht wurde es gelöscht.",
    notAllowed: "Dazu hast du keine Berechtigung.",
  },
  upload: {
    tooLarge: "Diese Datei ist zu groß zum Hochladen.",
  },
  network: {
    offline: "Server nicht erreichbar. Prüf deine Verbindung und versuch es erneut.",
  },
};
