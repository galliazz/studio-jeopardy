import type { Messages } from "../en/index";

export const auth: Messages["auth"] = {
  backToHome: "Voltar ao início",
  subtitle: "Acesso ao console do apresentador",
  checkEmail: {
    title: "Confira sua caixa de entrada",
    body: "Enviamos um link de confirmação para <b>{email}</b>. Clique nele para ativar sua conta de apresentador e depois entre.",
    backToSignIn: "Voltar para o login",
  },
  tabs: {
    signIn: "Entrar",
    signUp: "Criar conta",
  },
  fields: {
    hostName: "Nome do apresentador",
    email: "E-mail",
    password: "Senha (6+ caracteres)",
  },
  submit: {
    working: "Aguarde…",
    signIn: "Entrar",
    signUp: "Criar conta de apresentador",
  },
  playersNoAccount: "Os jogadores nunca precisam de conta — entram com o código do jogo.",
  errors: {
    failed: "Não foi possível entrar",
    invalidCredentials: "E-mail ou senha incorretos",
    emailNotConfirmed: "E-mail ainda não confirmado",
    userAlreadyRegistered: "Este usuário já está cadastrado",
    passwordTooShort: {
      one: "A senha precisa ter pelo menos {count} caractere.",
      other: "A senha precisa ter pelo menos {count} caracteres.",
    },
    emailInvalid: "O e-mail “{email}” não é válido",
    emailInvalidFormat: "Não foi possível validar o e-mail: formato inválido",
    emailRateLimit: "Limite de e-mails excedido — tente mais tarde",
    retryAfter: {
      one: "Por segurança, você só pode pedir de novo em {count} segundo.",
      other: "Por segurança, você só pode pedir de novo em {count} segundos.",
    },
    signupsDisabled: "Os cadastros não estão liberados",
  },
};
