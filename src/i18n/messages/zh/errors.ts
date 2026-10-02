import type { Messages } from "../en/index";

export const errors: Messages["errors"] = {
  session: {
    alreadyFinished: "这局游戏已经结束了。",
    missingTileOrPlayer: "找不到要判定的题格或玩家。",
    noOpenTile: "当前没有打开的题格。",
    noFinalAnswer: "这支队伍没有可判定的最终答案。",
  },
  soundboard: {
    full: "音效板已满（最多 20 个片段）。",
  },
  auth: {
    signedOut: "你已退出登录或会话已过期，请重新登录。",
  },
  data: {
    notFound: "找不到内容，可能已被删除。",
    notAllowed: "你没有权限执行此操作。",
  },
  upload: {
    tooLarge: "文件太大，无法上传。",
  },
  network: {
    offline: "无法连接服务器。请检查网络后重试。",
  },
  ai: {
    noKey: "本站未配置 AI 生成。",
    unreachable: "无法连接 AI。请检查网络后重试。",
    badKey: "AI 密钥被拒绝。请在站点设置中检查。",
    busy: "AI 现在很忙，请稍后再试。",
    failed: "AI 没能写出题板。请重试，或换一种说法描述主题。",
    empty: "AI 什么也没回复。请重试。",
    noJson: "AI 的回复无法读取。请重试。",
    tooFew: "返回的线索太少，凑不成题板。试试更宽的主题。",
  },
};
