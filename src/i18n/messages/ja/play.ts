import type { Messages } from "../en/index";

export const play: Messages["play"] = {
  lookup: {
    finding: "ゲームを探しています…",
    serverErrorTitle: "サーバーエラー",
    serverErrorBody:
      "ボードは公開されていますが、サーバーがリクエストを拒否しました。こちらでは解決できないので、司会者に伝えてください。",
    notStartedTitle: "ゲームはまだ始まっていません",
    notStartedBody:
      "司会者がまだこのボードを開始していません。少し待ってから再読み込みしてください。",
    notFoundTitle: "ゲームが見つかりません",
    notFoundBody:
      "コード「{code}」のライブゲームはありません。コードを確認して、もう一度お試しください。",
  },
  join: {
    intro: "アカウント不要です。名前・アバター・チームを選んでください。",
    nameLabel: "名前",
    nameLength: "{min}〜{max}文字で入力してください",
    avatarLabel: "アバター",
    avatarOption: "アバター {avatar}",
    teamLabel: "チーム",
    notAccepting: "このゲームは現在プレイヤーを受け付けていません。",
    gameGone: "このゲームは終了したか、もう存在しません。",
    fullOrClosed: "ゲームが満員か締め切られています。司会者に確認してください。",
    failed: "参加できませんでした。もう一度お試しください。",
    joining: "参加中…",
    joinGame: "ゲームに参加",
  },
  lobby: {
    title: "参加しました",
    waiting: "司会者がボードを開くのを待っています…",
    changeIdentity: "名前・アバター・チームを変更",
  },
  idle: {
    title: "スタンバイ",
    body: "次の問題を待っています。",
  },
  buzzer: {
    youreUp: "あなたの番！",
    secondsLeft: "{seconds}秒",
    answerOutLoud: "声に出して答えてください。司会者が聞いています！",
    lockedOutTitle: "回答権なし",
    lockedOutBody: "不正解です。次の問題を待ってください。",
    inLine: "順番待ち",
    position: "{position}番",
    lockedIn: "早押しを受け付けました！",
    buzz: "早押し！",
    closed: "早押しは締め切られています",
    rejected: "早押しを受け付けませんでした",
    failed: "早押しに失敗しました。もう一度お試しください",
  },
  reveal: {
    title: "正解発表",
    body: "ボードを見てください。次のマスに進みます。",
  },
  finished: {
    tie: "引き分け！",
    wins: "{team}の勝利！",
    yourTeamScored: "あなたのチームの得点：<b>{score}</b>",
  },
  final: {
    title: "Final Jeopardy",
    rules: "提出は各チーム1回のみ — {team} · 最大ベット {max}",
    wager: "ベット",
    answerPlaceholder: "チームの解答…",
    lockInWager: "ベットを確定",
    submitAnswer: "最終解答を提出",
    rejected: "提出を受け付けませんでした",
    sentTitle: "確定しました",
    sentBody: "チームの最終解答を送信しました。司会者の判定をお待ちください…",
  },
};
