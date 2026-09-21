import type { Messages } from "../en/index";

export const auth: Messages["auth"] = {
  backToHome: "Volver al inicio",
  subtitle: "Acceso a la consola del presentador",
  checkEmail: {
    title: "Revisa tu correo",
    body: "Enviamos un enlace de confirmación a <b>{email}</b>. Ábrelo para activar tu cuenta de presentador y luego inicia sesión.",
    backToSignIn: "Volver a iniciar sesión",
  },
  tabs: {
    signIn: "Iniciar sesión",
    signUp: "Crear cuenta",
  },
  fields: {
    hostName: "Nombre de presentador",
    email: "Correo electrónico",
    password: "Contraseña (6+ caracteres)",
  },
  submit: {
    working: "Procesando…",
    signIn: "Iniciar sesión",
    signUp: "Crear cuenta de presentador",
  },
  playersNoAccount: "Los jugadores no necesitan cuenta: entran con un código de partida.",
  errors: {
    failed: "Falló la autenticación",
    invalidCredentials: "Correo o contraseña incorrectos",
    emailNotConfirmed: "Correo no confirmado",
    userAlreadyRegistered: "Este usuario ya está registrado",
    passwordTooShort: {
      one: "La contraseña debe tener al menos {count} carácter.",
      other: "La contraseña debe tener al menos {count} caracteres.",
    },
    emailInvalid: "La dirección “{email}” no es válida",
    emailInvalidFormat: "No se pudo validar el correo: formato no válido",
    emailRateLimit: "Se superó el límite de envío de correos",
    retryAfter: {
      one: "Por seguridad, solo puedes volver a pedirlo dentro de {count} segundo.",
      other: "Por seguridad, solo puedes volver a pedirlo dentro de {count} segundos.",
    },
    signupsDisabled: "El registro no está habilitado",
  },
};
