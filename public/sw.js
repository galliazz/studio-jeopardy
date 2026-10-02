/*
 * Il minimo che serve perché il telefono consideri il sito installabile: un
 * service worker con un gestore di `fetch`.
 *
 * Non mette niente in cache di proposito. Una partita è tutta in tempo reale:
 * servire una board vecchia, o un punteggio di dieci minuti fa, sarebbe peggio
 * di una pagina che non si apre. L'unica cosa che intercetta è la navigazione
 * senza rete, per mostrare una riga invece dell'errore del browser.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const OFFLINE_PAGE = `<!doctype html>
<html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>JEOPARDESTINY</title>
<style>
  :root { color-scheme: dark }
  body { margin:0; min-height:100dvh; display:grid; place-items:center;
         background:#140c17; color:#f1e7f4; font:16px/1.5 system-ui, sans-serif; text-align:center }
  p { max-width:22rem; padding:0 1.5rem }
</style>
<p>No connection. The game keeps going without you — reopen this page when you are back online.</p>`;

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
});
