/**
 * La voce che legge la domanda ad alta voce.
 *
 * Usa la sintesi vocale già presente nel browser: nessun servizio esterno,
 * nessun file da scaricare, nessun dato che esce dal dispositivo. In cambio
 * la voce è quella di sistema, che cambia da telefono a computer — ma per
 * leggere una domanda a un tavolo va benissimo.
 */
import { stripHtml } from "@/lib/sanitize";

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * La voce migliore per una lingua: prima una esattamente di quella lingua e
 * regione, poi una qualsiasi della stessa lingua. Se non c'è niente, parla
 * quella predefinita, che è sempre meglio del silenzio.
 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  locale: string,
): SpeechSynthesisVoice | null {
  const lower = locale.toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase() === lower) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(`${lower}-`)) ??
    voices.find((v) => v.lang.toLowerCase().split("-")[0] === lower.split("-")[0]) ??
    null
  );
}

/** Legge un testo, interrompendo quello che stava dicendo prima. */
export function speak(text: string, locale: string): void {
  if (!speechSupported()) return;
  const clean = stripHtml(text).trim();
  if (!clean) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = locale;
  const voice = pickVoice(window.speechSynthesis.getVoices(), locale);
  if (voice) utterance.voice = voice;
  // Un filo più lenta del parlato normale: una domanda letta di corsa non si
  // capisce, e chi ascolta non può rileggerla.
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}
