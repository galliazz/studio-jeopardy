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
};
