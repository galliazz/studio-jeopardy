/**
 * Gli errori che arrivano dal server, detti per chi usa l'app. Il testo
 * esatto che il server lancia, e quale di queste frasi gli corrisponde, sta in
 * src/i18n/server-errors.ts.
 */
export const errors = {
  session: {
    alreadyFinished: "This game has already finished.",
    missingTileOrPlayer: "Couldn't find the tile or the player being judged.",
    noOpenTile: "There's no open tile right now.",
    noFinalAnswer: "This team has no final answer to judge.",
  },
  soundboard: {
    full: "The soundboard is full (20 clips max).",
  },
  auth: {
    signedOut: "You're signed out or your session has expired. Sign in again.",
  },
  data: {
    notFound: "Couldn't find it. It may have been deleted.",
    notAllowed: "You don't have permission to do that.",
  },
  upload: {
    tooLarge: "This file is too large to upload.",
  },
  network: {
    offline: "Couldn't reach the server. Check your connection and try again.",
  },
};
