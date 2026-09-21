import type { Messages } from "../en/index";

export const avatar: Messages["avatar"] = {
  title: "选择头像",
  description: "选一个预设，或上传你自己的照片。",
  yours: "你的头像",
  presets: {
    star: "头像选项 1：星星",
    rocket: "头像选项 2：火箭",
    cat: "头像选项 3：猫",
    dog: "头像选项 4：狗",
    ghost: "头像选项 5：幽灵",
    crown: "头像选项 6：皇冠",
    sun: "头像选项 7：太阳",
    bolt: "头像选项 8：闪电",
    trophy: "头像选项 9：奖杯",
    sparkles: "头像选项 10：闪光",
  },
  upload: {
    title: "上传照片",
    yourPhoto: "你上传的照片",
    dropZone: "上传照片",
    dropTitle: "拖入图片或点击浏览",
    dropHint: "JPG、PNG 或 WebP · 最大 5MB",
  },
  crop: {
    preview: "裁剪预览",
    zoom: "缩放",
    hint: "拖动照片调整位置。",
    usePhoto: "使用照片",
  },
  select: "选择",
  errors: {
    unsupported: "请使用 JPG、PNG 或 WebP 图片",
    tooLarge: "图片超过了 5MB",
    signInToUpload: "登录后才能上传照片",
    uploadFailed: "上传失败",
    saveFailed: "无法保存头像",
  },
};
