import type { Messages } from "../en/index";

export const auth: Messages["auth"] = {
  backToHome: "ホームに戻る",
  subtitle: "司会者用コンソール",
  checkEmail: {
    title: "メールを確認してください",
    body: "<b>{email}</b> に確認リンクを送信しました。リンクをクリックして司会者アカウントを有効にしてから、ログインしてください。",
    backToSignIn: "ログインに戻る",
  },
  tabs: {
    signIn: "ログイン",
    signUp: "アカウント作成",
  },
  fields: {
    hostName: "司会者名",
    email: "メールアドレス",
    password: "パスワード（6文字以上）",
  },
  submit: {
    working: "処理中…",
    signIn: "ログイン",
    signUp: "司会者アカウントを作成",
  },
  playersNoAccount: "プレイヤーはアカウント不要です。ゲームコードで参加できます。",
  errors: {
    failed: "認証に失敗しました",
    invalidCredentials: "メールアドレスまたはパスワードが正しくありません",
    emailNotConfirmed: "メールアドレスがまだ確認されていません",
    userAlreadyRegistered: "このユーザーはすでに登録されています",
    passwordTooShort: { other: "パスワードは{count}文字以上にしてください。" },
    emailInvalid: "メールアドレス「{email}」は無効です",
    emailInvalidFormat: "メールアドレスを確認できません：形式が正しくありません",
    emailRateLimit: "メールの送信回数が上限を超えました",
    retryAfter: {
      other: "セキュリティのため、{count}秒後に再度お試しください。",
    },
    signupsDisabled: "現在、新規登録は受け付けていません",
  },
};
