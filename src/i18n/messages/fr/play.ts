import type { Messages } from "../en/index";

export const play: Messages["play"] = {
  lookup: {
    finding: "Recherche de ta partie…",
    serverErrorTitle: "Erreur du serveur",
    serverErrorBody:
      "Le plateau est en ligne mais le serveur a refusé la demande. Tu ne peux rien y faire d'ici — préviens l'animateur.",
    notStartedTitle: "Partie pas encore lancée",
    notStartedBody:
      "L'animateur n'a pas encore mis ce plateau en direct. Patiente un instant et actualise.",
    notFoundTitle: "Partie introuvable",
    notFoundBody:
      "Aucune partie en direct ne correspond au code « {code} ». Vérifie le code et réessaie.",
  },
  join: {
    intro: "Pas besoin de compte — choisis un nom, un avatar et une équipe.",
    nameLabel: "Ton nom",
    nameLength: "Entre {min} et {max} caractères",
    avatarLabel: "Ton avatar",
    avatarOption: "Avatar {avatar}",
    teamLabel: "Ton équipe",
    notAccepting: "Cette partie n'accepte pas de joueurs pour l'instant.",
    gameGone: "Cette partie est terminée ou n'existe plus.",
    fullOrClosed: "La partie est pleine ou fermée — demande à l'animateur.",
    failed: "Impossible de rejoindre — réessaie.",
    joining: "Connexion…",
    joinGame: "Rejoindre la partie",
  },
  lobby: {
    title: "Tu es dans la partie",
    waiting: "En attente que l'animateur ouvre le plateau…",
    changeIdentity: "Changer de nom, d'avatar ou d'équipe",
  },
  idle: {
    title: "Prépare-toi",
    body: "En attente de la prochaine question.",
  },
  buzzer: {
    youreUp: "À TOI !",
    secondsLeft: "{seconds} s",
    answerOutLoud: "Réponds à voix haute — l'animateur t'écoute !",
    lockedOutTitle: "Bloqué",
    lockedOutBody: "Raté — attends la prochaine question.",
    inLine: "DANS LA FILE",
    position: "#{position}",
    lockedIn: "Ton buzz est enregistré !",
    buzz: "BUZZ",
    closed: "Les buzzers sont fermés",
    rejected: "Buzz refusé",
    failed: "Échec du buzz — réessaie",
  },
  reveal: {
    title: "Réponse révélée",
    body: "Regarde le plateau — case suivante en approche.",
  },
  finished: {
    tie: "Égalité !",
    wins: "{team} gagne !",
    yourTeamScored: "Ton équipe marque <b>{score}</b>",
  },
  final: {
    title: "Final Jeopardy",
    rules: "Une seule réponse par équipe — {team} · mise max {max}",
    wager: "Mise",
    answerPlaceholder: "La réponse de ton équipe…",
    lockInWager: "Valider la mise",
    submitAnswer: "Envoyer la réponse finale",
    rejected: "Envoi refusé",
    sentTitle: "C'est validé",
    sentBody: "La réponse finale de ton équipe est enregistrée. En attente de l'animateur…",
  },
};
