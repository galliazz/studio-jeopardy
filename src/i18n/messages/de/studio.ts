import type { Messages } from "../en/index";

export const studio: Messages["studio"] = {
  topBar: {
    title: "Studio",
  },
  defaultHostName: "Host",
  header: {
    welcomeBack: "Willkommen zurück, {name}",
    welcomeBackGuest: "Willkommen zurück",
    loadingBoards: "Spielfelder werden geladen…",
    signInToLoad: "Melde dich an, um deine Spielfelder zu laden",
    boardCount: { one: "{count} Spielfeld", other: "{count} Spielfelder" },
  },
  actions: {
    createGame: "Neues Spiel erstellen",
    importJson: "JSON importieren",
    searchBoards: "Spielfelder durchsuchen",
    searchPlaceholder: "Spielfelder suchen…",
  },
  create: {
    title: "Spielfeld benennen",
    placeholder: "z. B. Quiznacht am Freitag",
    submit: "Erstellen",
  },
  signedOut: {
    body: "Du musst angemeldet sein, um Spielfelder zu laden und zu erstellen.",
    signIn: "Anmelden",
  },
  empty: "Noch keine Spielfelder — leg dein erstes an!",
  card: {
    openInEditor: "Im Editor öffnen",
    options: "Spielfeld-Optionen",
    joinCode: "Spielcode",
    rename: "Umbenennen",
    duplicate: "Duplizieren",
    exportJson: "JSON exportieren",
    exportExcel: "Excel exportieren",
    readyToPlay: "Spielbereit",
    tilesReady: {
      one: "{ready} von {count} Feld fertig",
      other: "{ready} von {count} Feldern fertig",
    },
    play: "Spielen",
  },
  joinDialog: {
    title: "Spielcode",
    description: "Spieler treten mit diesem Code bei oder scannen den QR-Code.",
    linkCopied: "Beitrittslink kopiert",
  },
  deleteDialog: {
    title: "„{title}“ löschen?",
    description:
      "Das entfernt das Spielfeld und alle seine Fragen. Direkt danach kannst du es rückgängig machen.",
    confirm: "Spielfeld löschen",
  },
  toast: {
    created: "Spielfeld erstellt",
    createFailed: "Spielfeld konnte nicht erstellt werden",
    duplicated: "Spielfeld dupliziert",
    duplicateFailed: "Duplizieren fehlgeschlagen",
    deleted: "„{title}“ gelöscht",
    deleteFailed: "Löschen fehlgeschlagen",
    exportedJson: "Als JSON exportiert",
    exportedExcel: "Als Excel exportiert",
    exportFailed: "Export fehlgeschlagen",
    startFailed: "Sitzung konnte nicht gestartet werden",
    renamed: "Spielfeld umbenannt",
    renameFailed: "Umbenennen fehlgeschlagen",
    imported: "Spielfeld importiert",
    importFailed: "Import fehlgeschlagen — ungültige Datei",
  },
  excel: {
    sheet: "Spielfeld",
    category: "Kategorie",
    points: "Punkte",
    clue: "Frage",
    answer: "Antwort",
    hint: "Hinweis",
  },
};
