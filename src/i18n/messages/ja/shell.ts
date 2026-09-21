import type { Messages } from "../en/index";

export const shell: Messages["shell"] = {
  notFound: {
    title: "ページが見つかりません",
    body: "お探しのページは存在しないか、移動した可能性があります。",
  },
  error: {
    title: "ページを読み込めませんでした",
    body: "サーバー側で問題が発生しました。再読み込みするか、ホームに戻ってください。",
  },
  goHome: "ホームへ",
  toasts: {
    region: "通知",
    close: "通知を閉じる",
  },
};
