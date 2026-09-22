import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AppBar, GuestSettingsButton } from "@/components/AppBar";
import { APP_GUTTER, NAV_BUTTON } from "@/components/app-bar";
import { useT, useLocale } from "@/i18n";
import { CONTACT_EMAIL, HOLDER_NAME, legalUpdatedLabel } from "@/legal/holder";

/**
 * La cornice delle tre pagine legali: stessa barra in cima del resto
 * dell'app, un testo stretto da leggere e la data dell'ultima modifica.
 *
 * I testi esistono in italiano e in inglese soltanto. Le altre nove lingue
 * vedono l'inglese: una traduzione legale che nessuno rilegge è un rischio,
 * non un servizio, e la pagina lo dichiara invece di far finta di niente.
 */
export function LegalPage({ title, it, en }: { title: string; it: ReactNode; en: ReactNode }) {
  const t = useT();
  const locale = useLocale();
  const italian = locale === "it";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppBar
        left={
          <Link to="/" className={NAV_BUTTON}>
            ← {t("common.home")}
          </Link>
        }
        center={<span className="truncate font-display text-base font-black">{title}</span>}
        right={<GuestSettingsButton />}
      />
      <main className={`mx-auto w-full max-w-2xl flex-1 pb-24 pt-8 ${APP_GUTTER}`}>
        <h1 className="font-display text-3xl font-black text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("legal.updated", { date: legalUpdatedLabel(locale) })} · {HOLDER_NAME}
        </p>
        {!italian && (
          <p className="mt-4 rounded-[20px] bg-muted p-4 text-xs text-muted-foreground">
            {t("legal.languageNotice")}
          </p>
        )}
        {!CONTACT_EMAIL && (
          <p className="mt-4 rounded-[20px] border border-danger/40 p-4 text-xs text-muted-foreground">
            {t("legal.contactMissing")}
          </p>
        )}
        <div className="legal-prose mt-6 text-sm leading-relaxed text-foreground">
          {italian ? it : en}
        </div>
        <nav className="mt-10 flex flex-wrap gap-2">
          <Link to="/privacy" className={NAV_BUTTON}>
            {t("legal.privacy")}
          </Link>
          <Link to="/terms" className={NAV_BUTTON}>
            {t("legal.terms")}
          </Link>
          <Link to="/cookie" className={NAV_BUTTON}>
            {t("legal.cookie")}
          </Link>
        </nav>
      </main>
    </div>
  );
}
