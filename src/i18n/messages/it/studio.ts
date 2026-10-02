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
    importFile: "Importa file",
    importSheet: "Da Google Sheets",
    importFileHint: "JSON, CSV o Excel",
    generateAi: "Genera con l'IA",
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
    linkCopied: "Link della partita copiato",
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
    deleted: "Tabellone “{title}” eliminato",
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
  import: {
    sheetTitle: "Importa da Google Sheets",
    sheetHelp:
      "Pubblica il foglio sul web (File → Condividi → Pubblica sul web) e incolla qui il link. Una riga per casella: categoria, punti, domanda, risposta, suggerimento. Al tuo account Google non viene chiesto niente.",
    importNow: "Importa",
    importing: "Importo…",
    notASheet: "Questo non sembra un link di Google Sheets",
    sheetUnreachable: "Non riesco a leggere quel foglio. È pubblicato sul web?",
    nothingUsable: "In quel file non c'era nessuna casella utilizzabile",
    skipped: "{count} righe lasciate fuori",
    fromSheet: "Foglio importato",
  },
  /** Il pannello che chiede argomento e difficoltà all'IA. */
  ai: {
    title: "Fatti scrivere il tabellone dall'IA",
    help: "Dì di cosa parla la partita: l'IA scrive 25 indizi con le loro risposte, e tu li correggi nell'editor. Non si pubblica niente, e niente è definitivo.",
    placeholder: "es. storia del rock, anatomia umana, Napoli",
    difficulty: {
      easy: "Facile",
      mixed: "Misto",
      hard: "Difficile",
      help: "Misto sale dalla prima riga facile all'ultima da esperti.",
    },
    generate: "Genera",
    generating: "Sto scrivendo gli indizi…",
    cancel: "Annulla",
    done: "{count} indizi scritti — rileggili prima di giocare.",
    review: "Scritto dall'IA: controlla i fatti prima della partita.",
  },
  /** La scheda che si vede solo la prima volta. */
  firstRun: {
    title: "La tua prima partita, in tre mosse",
    intro: "Nella libreria c'è già un tabellone demo: aprilo, e il resto viene da sé.",
    steps: {
      one: "Apri il tabellone demo e cambia un indizio o due, giusto per vedere come funziona l'editor.",
      two: "Premi Gioca: il tabellone va a schermo intero e compare un codice d'ingresso.",
      three:
        "Chi gioca apre il sito dal telefono e scrive quel codice. Niente app, niente account.",
    },
    dismiss: "Nascondi",
  },
};
