import { Link } from "@tanstack/react-router";

import { useT } from "@/i18n";
import { HOLDER_NAME } from "@/legal/holder";

/**
 * Il piè di pagina con i link obbligatori. Sta sulle pagine pubbliche — home,
 * accesso, telefono del giocatore — e non negli overlay di OBS, che sono
 * grafica per la diretta e non una pagina da leggere.
 */
export function LegalFooter({ className = "" }: { className?: string }) {
  const t = useT();
  const link = "underline underline-offset-2 transition-colors hover:text-foreground";

  return (
    <footer
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 pb-6 pt-8 text-center text-xs text-muted-foreground ${className}`}
    >
      <span>{t("legal.footerBy", { name: HOLDER_NAME })}</span>
      <Link to="/privacy" className={link}>
        {t("legal.privacy")}
      </Link>
      <Link to="/terms" className={link}>
        {t("legal.terms")}
      </Link>
      <Link to="/cookie" className={link}>
        {t("legal.cookie")}
      </Link>
    </footer>
  );
}
