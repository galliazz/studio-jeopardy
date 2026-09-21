import type { Messages } from "../en/index";

export const studio: Messages["studio"] = {
  topBar: {
    title: "Studio",
  },
  defaultHostName: "Host",
  header: {
    welcomeBack: "Rieccoti, {name}",
    welcomeBackGuest: "Rieccoti",
    loadingBoards: "Carico i tabelloni…",
    signInToLoad: "Accedi per caricare i tuoi tabelloni",
    boardCount: { one: "{count} tabellone", other: "{count} tabelloni" },
  },
  actions: {
    createGame: "Crea un tabellone",
    importJson: "Importa JSON",
    searchBoards: "Cerca tabelloni",
    searchPlaceholder: "Cerca tabelloni…",
  },
  create: {
    title: "Dai un nome al tabellone",
    placeholder: "es. Quiz del venerdì sera",
    submit: "Crea",
  },
  signedOut: {
    body: "Devi accedere per caricare e creare tabelloni.",
    signIn: "Accedi",
  },
  empty: "Ancora nessun tabellone — crea il primo!",
  card: {
    openInEditor: "Apri nell'editor",
    options: "Opzioni tabellone",
    joinCode: "Codice partita",
    rename: "Rinomina",
    duplicate: "Duplica",
    exportJson: "Esporta JSON",
    exportExcel: "Esporta Excel",
    readyToPlay: "Pronto per giocare",
    tilesReady: {
      one: "{ready} su {count} casella pronta",
      other: "{ready} su {count} caselle pronte",
    },
    play: "Gioca",
  },
  joinDialog: {
    title: "Codice partita",
    description: "I giocatori entrano con questo codice o inquadrando il QR.",
    linkCopied: "Link di accesso copiato",
  },
  deleteDialog: {
    title: "Eliminare “{title}”?",
    description:
      "Il tabellone e tutte le sue domande verranno rimossi. Puoi annullare subito dopo.",
    confirm: "Elimina tabellone",
  },
  toast: {
    created: "Tabellone creato",
    createFailed: "Impossibile creare il tabellone",
    duplicated: "Tabellone duplicato",
    duplicateFailed: "Duplicazione non riuscita",
    deleted: "“{title}” eliminato",
    deleteFailed: "Eliminazione non riuscita",
    exportedJson: "Esportato in JSON",
    exportedExcel: "Esportato in Excel",
    exportFailed: "Esportazione non riuscita",
    startFailed: "Impossibile avviare la sessione",
    renamed: "Tabellone rinominato",
    renameFailed: "Impossibile rinominare",
    imported: "Tabellone importato",
    importFailed: "Importazione non riuscita — file non valido",
  },
  excel: {
    sheet: "Tabellone",
    category: "Categoria",
    points: "Punti",
    clue: "Domanda",
    answer: "Risposta",
    hint: "Suggerimento",
  },
};
