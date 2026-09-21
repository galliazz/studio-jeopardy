import type { Messages } from "../en/index";

export const shell: Messages["shell"] = {
  notFound: {
    title: "Página no encontrada",
    body: "La página que buscas no existe o se movió.",
  },
  error: {
    title: "Esta página no cargó",
    body: "Algo falló de nuestro lado. Puedes recargar la página o volver al inicio.",
  },
  goHome: "Ir al inicio",
  toasts: {
    region: "Notificaciones",
    close: "Cerrar notificación",
  },
};
