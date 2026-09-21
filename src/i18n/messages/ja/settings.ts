import type { Messages } from "../en/index";

export const settings: Messages["settings"] = {
  description: "変更はすぐに反映されます。",
  account: {
    title: "アカウント",
    changeAvatar: "アバターを変更",
    displayName: "表示名",
    email: "メールアドレス",
    notSignedIn: "ログインしていません",
    nameLength: "2〜24文字で入力してください",
    nameUpdated: "表示名を更新しました",
    nameSaveFailed: "名前を保存できませんでした",
  },
  appearance: {
    title: "外観",
    theme: "テーマ",
    themeSystem: "システム",
    themeDay: "昼",
    themeNight: "夜",
    reduceMotion: "動きを減らす",
    reduceMotionHint: "必須でないアニメーションをオフにします",
  },
  audio: {
    title: "オーディオ",
    masterVolume: "マスター音量",
    soundEffects: "効果音",
    muteAll: "すべてミュート",
    testSound: "音のテスト",
    play: "再生",
  },
  performance: {
    title: "パフォーマンス",
    graphicsQuality: "グラフィック品質",
    graphicsQualityHint: "ぼかし、グラデーション、重いアニメーション",
    qualityHigh: "高",
    qualityMedium: "中",
    qualityLow: "低",
    backgroundEffects: "背景エフェクト",
    backgroundEffectsHint: "背景に漂うカラフルな模様",
  },
  keyboard: {
    title: "キーボードショートカット",
    customKeys: "カスタムキー",
    customKeysHint: "プロフィールに保存され、どのパソコンでも同じキーが使えます",
    hide: "閉じる",
    customise: "カスタマイズ",
  },
};
