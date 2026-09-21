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
};
