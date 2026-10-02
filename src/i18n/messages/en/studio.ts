/** Lo Studio: la libreria dei giochi di chi conduce. */
export const studio = {
  topBar: {
    title: "Studio",
  },
  /** Il nome nel menu dell'account quando il profilo non è ancora arrivato. */
  defaultHostName: "Host",
  header: {
    welcomeBack: "Welcome back, {name}",
    welcomeBackGuest: "Welcome back, there",
    loadingBoards: "Loading boards…",
    signInToLoad: "Sign in to load your boards",
    boardCount: { one: "{count} board", other: "{count} boards" },
  },
  actions: {
    createGame: "Create a new game",
    importJson: "Import JSON",
    searchBoards: "Search boards",
    searchPlaceholder: "Search boards…",
    importFile: "Import file",
    importSheet: "From Google Sheets",
    importFileHint: "JSON, CSV or Excel",
    generateAi: "Generate with AI",
  },
  create: {
    title: "Name your board",
    placeholder: "e.g. Friday Night Trivia",
    submit: "Create",
  },
  signedOut: {
    body: "You need to be signed in to load and create boards.",
    signIn: "Sign in",
  },
  empty: "No boards yet — create your first one!",
  card: {
    openInEditor: "Open in editor",
    options: "Board options",
    joinCode: "Join code",
    rename: "Rename",
    duplicate: "Duplicate",
    exportJson: "Export JSON",
    exportExcel: "Export Excel",
    readyToPlay: "Ready to play",
    // Solo `other`: in inglese è sempre "tiles". Le altre lingue aggiungono le forme che servono.
    tilesReady: { other: "{ready} of {count} tiles ready" },
    play: "Play",
  },
  joinDialog: {
    title: "Join code",
    description: "Players can join with this code or by scanning the QR.",
    linkCopied: "Join link copied",
  },
  deleteDialog: {
    title: "Delete “{title}”?",
    description: "This removes the board and all of its clues. You can undo right after deleting.",
    confirm: "Delete board",
  },
  toast: {
    created: "Board created",
    createFailed: "Could not create board",
    duplicated: "Board duplicated",
    duplicateFailed: "Duplicate failed",
    deleted: "“{title}” deleted",
    deleteFailed: "Delete failed",
    exportedJson: "Exported as JSON",
    exportedExcel: "Exported as Excel",
    exportFailed: "Export failed",
    startFailed: "Could not start session",
    renamed: "Board renamed",
    renameFailed: "Rename failed",
    imported: "Board imported",
    importFailed: "Import failed — invalid file",
  },
  /** Il foglio Excel esportato: nome del foglio e intestazioni delle colonne. */
  excel: {
    // Excel rifiuta i nomi di foglio oltre 31 caratteri o con : \ / ? * [ ]
    sheet: "Board",
    category: "Category",
    points: "Points",
    clue: "Clue",
    answer: "Answer",
    hint: "Hint",
  },
  import: {
    sheetTitle: "Import from Google Sheets",
    sheetHelp:
      "Publish the sheet to the web (File → Share → Publish to web) and paste the link here. One row per clue: category, points, clue, answer, hint. Nothing is asked of your Google account.",
    importNow: "Import",
    importing: "Importing…",
    notASheet: "That doesn't look like a Google Sheets link",
    sheetUnreachable: "Could not read that sheet. Is it published to the web?",
    nothingUsable: "No clue in that file could be used",
    skipped: "{count} rows left out",
    fromSheet: "Imported sheet",
  },
  /** Il pannello che chiede argomento e difficoltà all'IA. */
  ai: {
    title: "Let AI draft the board",
    help: "Say what the game is about: AI writes 25 clues with their answers, and you fix them in the editor. Nothing is published, and nothing is final.",
    placeholder: "e.g. history of rock, human anatomy, Naples",
    difficulty: {
      easy: "Easy",
      mixed: "Mixed",
      hard: "Hard",
      help: "Mixed climbs from an easy first row to an expert last one.",
    },
    generate: "Generate",
    generating: "Writing the clues…",
    cancel: "Cancel",
    done: "{count} clues written — read them through before you play.",
    review: "Written by AI: check the facts before the game.",
  },
  /** La scheda che si vede solo la prima volta. */
  firstRun: {
    title: "Your first game, in three moves",
    intro: "There's already a demo board in your library — open it and the rest follows.",
    steps: {
      one: "Open the demo board and change a clue or two, just to see how the editor works.",
      two: "Press Play: the board goes full screen and a join code appears.",
      three: "Your players open the site on their phones and type that code. No app, no account.",
    },
    dismiss: "Hide this",
  },
};
