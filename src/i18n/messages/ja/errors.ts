import type { Messages } from "../en/index";

export const errors: Messages["errors"] = {
  session: {
    alreadyFinished: "このゲームはすでに終了しています。",
    missingTileOrPlayer: "判定するマスまたはプレイヤーが見つかりません。",
    noOpenTile: "今は開いているマスがありません。",
    noFinalAnswer: "このチームには判定する最終解答がありません。",
  },
  soundboard: {
    full: "サウンドボードがいっぱいです（最大20クリップ）。",
  },
  auth: {
    signedOut:
      "ログアウトしているか、セッションの期限が切れています。もう一度ログインしてください。",
  },
  data: {
    notFound: "見つかりませんでした。削除された可能性があります。",
    notAllowed: "この操作を行う権限がありません。",
  },
  upload: {
    tooLarge: "ファイルが大きすぎてアップロードできません。",
  },
  network: {
    offline: "サーバーに接続できませんでした。接続を確認して、もう一度お試しください。",
  },
  ai: {
    noKey: "このサイトでは AI 生成が設定されていません。",
    unreachable: "AI に接続できません。通信を確認してもう一度お試しください。",
    badKey: "AI のキーが拒否されました。サイトの設定で確認してください。",
    busy: "AI が混み合っています。少し待ってからお試しください。",
    failed: "AI は問題を書けませんでした。もう一度試すか、テーマの言い方を変えてください。",
    empty: "AI から返事がありませんでした。もう一度お試しください。",
    noJson: "AI の返事を読み取れませんでした。もう一度お試しください。",
    tooFew: "問題が少なすぎて board になりません。もっと広いテーマをお試しください。",
  },
};
