import type { Messages } from "../en/index";

export const errors: Messages["errors"] = {
  session: {
    alreadyFinished: "Questa partita è già finita.",
    missingTileOrPlayer: "Non trovo la casella o il giocatore da giudicare.",
    noOpenTile: "Al momento non c'è nessuna casella aperta.",
    noFinalAnswer: "Questa squadra non ha una risposta finale da giudicare.",
  },
  soundboard: {
    full: "La soundboard è piena (massimo 20 clip).",
  },
  auth: {
    signedOut: "La sessione è scaduta o non hai effettuato l'accesso. Accedi di nuovo.",
  },
  data: {
    notFound: "Non l'ho trovato. Forse è stato eliminato.",
    notAllowed: "Non hai il permesso di farlo.",
  },
  upload: {
    tooLarge: "Questo file è troppo grande per essere caricato.",
  },
  network: {
    offline: "Impossibile raggiungere il server. Controlla la connessione e riprova.",
  },
  ai: {
    noKey: "La generazione con l'IA non è configurata su questo sito.",
    unreachable: "Non riesco a raggiungere l'IA. Controlla la connessione e riprova.",
    badKey: "La chiave dell'IA è stata rifiutata. Controllala nelle impostazioni del sito.",
    busy: "L'IA è occupata in questo momento. Riprova fra poco.",
    failed:
      "L'IA non è riuscita a scrivere il tabellone. Riprova, o cambia il modo di dire l'argomento.",
    empty: "L'IA non ha risposto niente. Riprova.",
    noJson: "La risposta dell'IA non si è potuta leggere. Riprova.",
    tooFew:
      "Sono tornati troppi pochi indizi per farne un tabellone. Prova con un argomento più ampio.",
  },
};
