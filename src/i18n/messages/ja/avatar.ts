import type { Messages } from "../en/index";

export const avatar: Messages["avatar"] = {
  title: "アバターを選択",
  description: "プリセットを選ぶか、自分の写真をアップロードしてください。",
  yours: "あなたのアバター",
  presets: {
    star: "アバター1：星",
    rocket: "アバター2：ロケット",
    cat: "アバター3：ネコ",
    dog: "アバター4：イヌ",
    ghost: "アバター5：おばけ",
    crown: "アバター6：王冠",
    sun: "アバター7：太陽",
    bolt: "アバター8：稲妻",
    trophy: "アバター9：トロフィー",
    sparkles: "アバター10：キラキラ",
  },
  upload: {
    title: "写真をアップロード",
    yourPhoto: "アップロードした写真",
    dropZone: "写真をアップロード",
    dropTitle: "画像をドロップするか、クリックして選択",
    dropHint: "JPG・PNG・WebP · 5MBまで",
  },
  crop: {
    preview: "切り抜きのプレビュー",
    zoom: "ズーム",
    hint: "写真をドラッグして位置を調整してください。",
    usePhoto: "この写真を使う",
  },
  select: "選択",
  errors: {
    unsupported: "JPG・PNG・WebP の画像を使ってください",
    tooLarge: "画像が5MBを超えています",
    signInToUpload: "写真をアップロードするにはログインしてください",
    uploadFailed: "アップロードに失敗しました",
    saveFailed: "アバターを保存できませんでした",
  },
};
