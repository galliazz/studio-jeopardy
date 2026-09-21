/**
 * I pezzi di gioco condivisi da console, telefoni e overlay: board, domanda
 * aperta, coda dei buzzer, punteggi. Più le etichette che vivono nelle liste
 * di src/lib (famiglie e pesi del carattere).
 */
export const game = {
  clue: {
    // Banner, casella chiusa e buzzer aperti prima si leggevano in italiano:
    // in italiano restano «Daily Double · vale doppio», «Casella conclusa»,
    // «Buzzer aperti».
    dailyDoubleBanner: "Daily Double · worth double",
    fallbackCategory: "Question",
    dailyDoubleValue: "{points} ×2",
    mediaAlt: "Question media",
    tileClosed: "Tile closed",
    buzzersOpen: "Buzzers open",
  },
  queue: {
    title: "Buzzer queue",
    clear: "Clear queue",
    clearConfirm: "Clear the buzzer queue? Everyone waiting is removed.",
    position: "#{position}",
    firstIn: "first in",
    deltaMs: "+{ms}ms",
    deltaSeconds: "+{seconds}s",
  },
  score: {
    // Anche con 1 l'inglese dice "players", come l'app ha sempre fatto.
    teamPlayers: { one: "{count} players", other: "{count} players" },
    teamPlayersLabel: {
      one: "{count} players on this team",
      other: "{count} players on this team",
    },
    subtractFrom: "Subtract {step} from {name}",
    addTo: "Add {step} to {name}",
    customChangeFor: "Custom score change for {name}",
    customAmount: "Custom amount",
    subtract: "Subtract",
    teamScore: "{name} score",
    doubleClickToEdit: "Double-click to edit",
  },
  fontFamilies: {
    display: "Display",
    sans: "Sans",
    system: "System",
    grotesk: "Grotesk",
    rounded: "Rounded",
    serif: "Serif",
    oldStyle: "Old Style",
    slab: "Slab",
    mono: "Mono",
    condensed: "Condensed",
    handwriting: "Handwriting",
  },
  // Le chiavi sono il peso CSS, tra virgolette: senza, TypeScript le tratta
  // come numeri e le toglie dalle chiavi del dizionario.
  fontWeights: {
    "300": "Light",
    "400": "Book",
    "500": "Medium",
    "700": "Bold",
    "900": "Black",
  },
};
