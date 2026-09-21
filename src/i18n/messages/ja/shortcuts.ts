import type { Messages } from "../en/index";

export const shortcuts: Messages["shortcuts"] = {
  actions: {
    reveal: "答えを表示",
    judgeCorrect: "正解と判定",
    judgeWrong: "不正解と判定",
    passToNext: "次のプレイヤーに回す",
    restartTimer: "タイマーを再スタート",
    closeTile: "開いているマスを閉じる",
  },
  fixed: {
    soundboard: "サウンドボードのクリップを再生",
    settings: "設定を開く",
  },
  keys: {
    space: "スペース",
    esc: "Esc",
    arrowUp: "上",
    arrowDown: "下",
    arrowLeft: "左",
    arrowRight: "右",
  },
  editor: {
    pressAKey: "キーを押してください…",
    pausedHint: "入力欄・ダイアログ・メニューの操作中は、ショートカットが一時停止します。",
  },
};
