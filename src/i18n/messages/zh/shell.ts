import type { Messages } from "../en/index";

export const shell: Messages["shell"] = {
  notFound: {
    title: "页面不存在",
    body: "你要找的页面不存在或已被移走。",
  },
  error: {
    title: "页面没能加载",
    body: "我们这边出了点问题。你可以刷新试试，或者返回首页。",
  },
  goHome: "返回首页",
  toasts: {
    region: "通知",
    close: "关闭通知",
  },
};
