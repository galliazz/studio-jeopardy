import type { Messages } from "../en/index";

export const studio: Messages["studio"] = {
  topBar: {
    title: "Studio",
  },
  defaultHostName: "Animateur",
  header: {
    welcomeBack: "Te revoilà, {name}",
    welcomeBackGuest: "Te revoilà !",
    loadingBoards: "Chargement des plateaux…",
    signInToLoad: "Connecte-toi pour charger tes plateaux",
    boardCount: {
      one: "{count} plateau",
      many: "{count} de plateaux",
      other: "{count} plateaux",
    },
  },
  actions: {
    createGame: "Créer un nouveau jeu",
    importJson: "Importer un JSON",
    searchBoards: "Rechercher des plateaux",
    searchPlaceholder: "Rechercher un plateau…",
    importFile: "Importer un fichier",
    importSheet: "Depuis Google Sheets",
    importFileHint: "JSON, CSV ou Excel",
    generateAi: "Générer avec l'IA",
  },
  create: {
    title: "Nomme ton plateau",
    placeholder: "ex. Quiz du vendredi soir",
    submit: "Créer",
  },
  signedOut: {
    body: "Connecte-toi pour charger et créer des plateaux.",
    signIn: "Se connecter",
  },
  empty: "Pas encore de plateau — crée le premier !",
  card: {
    openInEditor: "Ouvrir dans l'éditeur",
    options: "Options du plateau",
    joinCode: "Code de la partie",
    rename: "Renommer",
    duplicate: "Dupliquer",
    exportJson: "Exporter en JSON",
    exportExcel: "Exporter en Excel",
    readyToPlay: "Prêt à jouer",
    tilesReady: {
      one: "{ready} sur {count} case prête",
      many: "{ready} sur {count} de cases prêtes",
      other: "{ready} sur {count} cases prêtes",
    },
    play: "Jouer",
  },
  joinDialog: {
    title: "Code de la partie",
    description: "Les joueurs rejoignent avec ce code ou en scannant le QR code.",
    linkCopied: "Lien d'invitation copié",
  },
  deleteDialog: {
    title: "Supprimer « {title} » ?",
    description:
      "Le plateau et toutes ses questions seront supprimés. Tu pourras annuler juste après.",
    confirm: "Supprimer le plateau",
  },
  toast: {
    created: "Plateau créé",
    createFailed: "Impossible de créer le plateau",
    duplicated: "Plateau dupliqué",
    duplicateFailed: "Échec de la duplication",
    deleted: "« {title} » supprimé",
    deleteFailed: "Échec de la suppression",
    exportedJson: "Exporté en JSON",
    exportedExcel: "Exporté en Excel",
    exportFailed: "Échec de l'export",
    startFailed: "Impossible de lancer la partie",
    renamed: "Plateau renommé",
    renameFailed: "Échec du renommage",
    imported: "Plateau importé",
    importFailed: "Échec de l'import — fichier invalide",
  },
  excel: {
    // Excel rifiuta i nomi di foglio oltre 31 caratteri o con : \ / ? * [ ]
    sheet: "Plateau",
    category: "Catégorie",
    points: "Points",
    clue: "Question",
    answer: "Réponse",
    hint: "Indice",
  },
  import: {
    sheetTitle: "Importer depuis Google Sheets",
    sheetHelp:
      "Publie la feuille sur le web (Fichier → Partager → Publier sur le web) et colle le lien ici. Une ligne par case : catégorie, points, question, réponse, indice. Rien n'est demandé à ton compte Google.",
    importNow: "Importer",
    importing: "Importation…",
    notASheet: "Ça ne ressemble pas à un lien Google Sheets",
    sheetUnreachable: "Impossible de lire cette feuille. Est-elle publiée sur le web ?",
    nothingUsable: "Aucune case utilisable dans ce fichier",
    skipped: "{count} lignes laissées de côté",
    fromSheet: "Feuille importée",
  },
  /** Il pannello che chiede argomento e difficoltà all'IA. */
  ai: {
    title: "Laisse l'IA écrire le plateau",
    help: "Dis de quoi parle la partie : l'IA écrit 25 indices avec leurs réponses, et tu les corriges dans l'éditeur. Rien n'est publié, et rien n'est définitif.",
    placeholder: "ex. histoire du rock, anatomie humaine, Naples",
    difficulty: {
      label: "Difficulté",
      easy: "Facile",
      mixed: "Mixte",
      hard: "Difficile",
      help: "Mixte monte d'une première ligne facile à une dernière pour experts.",
    },
    generate: "Générer",
    generating: "Écriture des indices…",
    cancel: "Annuler",
    done: "{count} indices écrits — relis-les avant de jouer.",
    review: "Écrit par l'IA : vérifie les faits avant la partie.",
  },
  /** La scheda che si vede solo la prima volta. */
  firstRun: {
    title: "Ta première partie, en trois gestes",
    intro: "Un plateau de démonstration est déjà dans ta bibliothèque : ouvre-le, le reste suit.",
    steps: {
      one: "Ouvre le plateau de démonstration et change un indice ou deux, juste pour voir l'éditeur.",
      two: "Appuie sur Jouer : le plateau passe en plein écran et un code d'entrée apparaît.",
      three:
        "Les joueurs ouvrent le site sur leur téléphone et tapent ce code. Pas d'appli, pas de compte.",
    },
    dismiss: "Masquer",
  },
};
