import { motion } from "framer-motion";
import { X } from "lucide-react";

import { useT } from "@/i18n";
import { SPRING_UI } from "@/lib/motion";

/**
 * Le tre cose da sapere la prima volta.
 *
 * Non è un giro guidato con le frecce che inseguono i bottoni: quelli vanno
 * fatti ogni volta che l'interfaccia cambia, e chi li salta resta senza niente.
 * Qui c'è una scheda ferma, leggibile tutta in due secondi, accanto al
 * tabellone demo di cui parla. Si chiude e non torna più.
 */
export function FirstRunCard({ onDismiss }: { onDismiss: () => void }) {
  const t = useT();
  const steps = ["one", "two", "three"] as const;

  return (
    <motion.section
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING_UI}
      aria-labelledby="first-run-title"
      className="relative mb-6 overflow-hidden rounded-[32px] bg-lilac p-6 elev-1"
    >
      <h2 id="first-run-title" className="font-display text-lg font-black text-foreground">
        {t("studio.firstRun.title")}
      </h2>
      <p className="mt-1 text-sm text-foreground/70">{t("studio.firstRun.intro")}</p>

      <ol className="mt-4 grid gap-3 min-[720px]:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3 rounded-[24px] bg-card/70 p-4">
            {/* Il numero è nel pallino, non nella frase: le tre schede si
                leggono anche in disordine, come le si guarda davvero. */}
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 font-display text-sm font-black"
            >
              {i + 1}
            </span>
            <p className="text-sm leading-snug text-foreground">
              {t(`studio.firstRun.steps.${step}`)}
            </p>
          </li>
        ))}
      </ol>

      <button
        onClick={onDismiss}
        aria-label={t("studio.firstRun.dismiss")}
        title={t("studio.firstRun.dismiss")}
        /* 60% di opacità dava 4.2:1, sotto la soglia di leggibilità: a 70
            arriva a 5.1 nei due temi e resta comunque più quieto del titolo. */
        className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.section>
  );
}
