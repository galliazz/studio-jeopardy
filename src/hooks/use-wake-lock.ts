import { useEffect } from "react";

/**
 * Tiene acceso lo schermo mentre serve.
 *
 * Il telefono di chi gioca sta fermo in mano fra una domanda e l'altra: dopo
 * mezzo minuto si spegne, e chi prenota per primo perde il turno mentre
 * risveglia il telefono. Lo stesso vale per la console: l'host guarda la
 * board e tocca lo schermo di rado.
 *
 * Il blocco cade da solo quando la pagina finisce in secondo piano, e il
 * sistema può toglierlo in qualunque momento (batteria quasi scarica, per
 * esempio): per questo si richiede di nuovo ogni volta che la pagina torna
 * visibile. Dove l'API non c'è — Safari sotto la 16.4, qualche browser
 * minore — non succede niente: è un di più, non un requisito.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        /* Il sistema può rifiutare: non è un errore da mostrare a nessuno. */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
