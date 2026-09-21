import type { Messages } from "../en/index";

export const shortcuts: Messages["shortcuts"] = {
  actions: {
    reveal: "揭晓答案",
    judgeCorrect: "判为正确",
    judgeWrong: "判为错误",
    passToNext: "交给下一位玩家",
    restartTimer: "重启计时器",
    closeTile: "关闭当前题格",
  },
  fixed: {
    soundboard: "播放音效板片段",
    settings: "打开设置",
  },
  keys: {
    space: "空格",
    esc: "Esc",
    arrowUp: "上",
    arrowDown: "下",
    arrowLeft: "左",
    arrowRight: "右",
  },
  editor: {
    pressAKey: "按下一个键…",
    pausedHint: "输入框、对话框或菜单获得焦点时，快捷键暂停。",
  },
};
