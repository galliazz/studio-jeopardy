import type { Messages } from "../en/index";

export const studio: Messages["studio"] = {
  topBar: {
    title: "Studio",
  },
  defaultHostName: "Animateur",
  header: {
    welcomeBack: "Te revoilà, {name}",
    welcomeBackGuest: "Te revoilà !",
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
  empty: "Pas encore de plateau — crée le premier !",
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
    title: "Supprimer « {title} » ?",
    description:
      "Le plateau et toutes ses questions seront supprimés. Tu pourras annuler juste après.",
    confirm: "Supprimer le plateau",
  },
  toast: {
    created: "Plateau créé",
    createFailed: "Impossible de créer le plateau",
    duplicated: "Plateau dupliqué",
    duplicateFailed: "Échec de la duplication",
    deleted: "« {title} » supprimé",
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
};
