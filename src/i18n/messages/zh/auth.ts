import type { Messages } from "../en/index";

export const auth: Messages["auth"] = {
  backToHome: "返回首页",
  subtitle: "主持人控制台登录",
  checkEmail: {
    title: "查收邮件",
    body: "我们已向 <b>{email}</b> 发送确认链接。点击链接激活你的主持人账户，然后登录。",
    backToSignIn: "返回登录",
  },
  tabs: {
    signIn: "登录",
    signUp: "创建账户",
  },
  fields: {
    hostName: "主持人名称",
    email: "邮箱",
    password: "密码（至少 6 位）",
  },
  submit: {
    working: "处理中…",
    signIn: "登录",
    signUp: "创建主持人账户",
  },
  playersNoAccount: "玩家永远不需要账户，输入加入码就能进游戏。",
  errors: {
    failed: "身份验证失败",
    invalidCredentials: "邮箱或密码错误",
    emailNotConfirmed: "邮箱尚未确认",
    userAlreadyRegistered: "该用户已注册",
    passwordTooShort: { other: "密码至少需要 {count} 个字符。" },
    emailInvalid: "邮箱地址“{email}”无效",
    emailInvalidFormat: "无法验证邮箱地址：格式无效",
    emailRateLimit: "邮件发送次数超出限制",
    retryAfter: {
      other: "出于安全考虑，请在 {count} 秒后再试。",
    },
    signupsDisabled: "当前不开放注册",
  },
};
