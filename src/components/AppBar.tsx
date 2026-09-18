import { useState, type ReactNode } from "react";
import { Settings as SettingsIcon } from "lucide-react";

import { APP_BAR, APP_BAR_INNER } from "@/components/app-bar";
import { SettingsDialog } from "@/components/SettingsDialog";
import { sfx } from "@/lib/sfx";

/**
 * La barra in cima a ogni schermata dell'app.
 *
 * Tre colonne, sempre: le due laterali hanno lo stesso peso, quindi quello che
 * sta in mezzo cade sulla mezzeria della finestra, e quello che sta a destra
 * finisce sempre contro lo stesso margine. Prima ogni pagina se la costruiva:
 * la home e la pagina di accesso avevano una pillola galleggiante, il telefono
 * del giocatore un ingranaggio a 12 pixel dal bordo, Studio una fila con
 * `justify-between`. Il profilo in alto a destra cambiava posto a ogni pagina.
 *
 * L'elemento più a destra è sempre un bersaglio tondo da 48 pixel con dentro
 * un cerchio da 40: l'avatar per chi ha un account, l'ingranaggio per chi non
 * ce l'ha. Stesso posto, stessa misura, e la mano lo trova senza guardare.
 */
export function AppBar({
  left,
  center,
  right,
  sticky = false,
}: {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  sticky?: boolean;
}) {
  return (
    <header className={`${sticky ? "sticky top-0" : ""} ${APP_BAR}`}>
      <div className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] ${APP_BAR_INNER}`}>
        <div className="flex min-w-0 items-center gap-3">{left}</div>
        {/* Tetto al centro: un titolo lungo, sul telefono, spingerebbe le due
            colonne laterali sotto i 48 pixel del bersaglio a destra. */}
        <div className="flex min-w-0 max-w-[50vw] items-center justify-center">{center}</div>
        <div className="flex min-w-0 items-center justify-end gap-2">{right}</div>
      </div>
    </header>
  );
}

/**
 * L'ingranaggio per chi non ha un account — il giocatore al telefono, chi è
 * sulla pagina di accesso. Ha la stessa sagoma dell'avatar di AccountMenu:
 * bersaglio da 48, cerchio visibile da 40. Così sulla home, sul telefono e in
 * Studio il cerchio in alto a destra cade esattamente nello stesso punto.
 */
export function GuestSettingsButton({ variant = "guest" }: { variant?: "full" | "guest" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          sfx.pop();
          setOpen(true);
        }}
        aria-label="Settings"
        title="Settings"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ink-accent"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lilac text-foreground">
          <SettingsIcon className="h-5 w-5" />
        </span>
      </button>
      {open && <SettingsDialog variant={variant} onClose={() => setOpen(false)} />}
    </>
  );
}
