import type { Messages } from "../en/index";

export const settings: Messages["settings"] = {
  description: "更改立即生效。",
  account: {
    title: "账户",
    changeAvatar: "更换头像",
    displayName: "显示名称",
    email: "邮箱",
    notSignedIn: "未登录",
    nameLength: "请使用 2 到 24 个字符",
    nameUpdated: "显示名称已更新",
    nameSaveFailed: "无法保存名称",
  },
  appearance: {
    title: "外观",
    theme: "主题",
    themeSystem: "跟随系统",
    themeDay: "日间",
    themeNight: "夜间",
    reduceMotion: "减少动态效果",
    reduceMotionHint: "关闭非必要的动画",
  },
  audio: {
    title: "音频",
    masterVolume: "主音量",
    soundEffects: "音效",
    muteAll: "全部静音",
    testSound: "测试声音",
    play: "播放",
  },
  performance: {
    title: "性能",
    graphicsQuality: "画质",
    graphicsQualityHint: "模糊、渐变和复杂动画",
    qualityHigh: "高",
    qualityMedium: "中",
    qualityLow: "低",
    backgroundEffects: "背景效果",
    backgroundEffectsHint: "彩色环境光斑",
  },
  keyboard: {
    title: "键盘快捷键",
    customKeys: "自定义按键",
    customKeysHint: "保存在你的个人资料中，换台电脑也是同样的按键",
    hide: "隐藏",
    customise: "自定义",
  },
};
