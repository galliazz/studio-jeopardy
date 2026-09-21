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
};
