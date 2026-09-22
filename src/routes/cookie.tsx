import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/legal/LegalPage";
import { CONTACT_EMAIL } from "@/legal/holder";

export const Route = createFileRoute("/cookie")({
  head: () => ({
    meta: [
      { title: "Cookie — JEOPARDESTINY" },
      {
        name: "description",
        content: "Cosa salva JEOPARDESTINY sul tuo dispositivo, e perché non c'è un banner.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: CookieRoute,
});

const contatto = CONTACT_EMAIL || "— (indirizzo non ancora pubblicato)";

function CookieRoute() {
  return (
    <LegalPage
      title="Cookie"
      it={
        <>
          <h2>Non usiamo cookie</h2>
          <p>
            Questo sito non installa cookie propri e non ne usa per pubblicità o profilazione. Salva
            però alcune informazioni nella memoria locale del browser, che è la stessa cosa dal
            punto di vista della legge: eccole tutte.
          </p>

          <h2>Cosa viene salvato sul tuo dispositivo</h2>
          <ul>
            <li>
              <strong>La sessione di accesso</strong> (solo se hai un account): serve a restare
              collegato fra una pagina e l'altra. Senza, dovresti rifare l'accesso a ogni clic.
            </li>
            <li>
              <strong>Le tue preferenze</strong>: lingua, tema chiaro o scuro, volumi, riduzione
              delle animazioni, qualità grafica, scorciatoie da tastiera.
            </li>
            <li>
              <strong>Chi sei in partita</strong> (sul telefono del giocatore): un identificativo e
              un codice segreto della partita, che servono a non farti rientrare da capo se
              ricarichi la pagina. Spariscono quando esci dalla partita.
            </li>
          </ul>
          <p>
            Sono tutte cose tecnicamente necessarie o preferenze che hai scelto tu. Per questo non
            c'è un banner da accettare: la legge lo richiede per ciò che non è necessario, e qui non
            c'è niente del genere.
          </p>

          <h2>Statistiche di visita</h2>
          <p>
            La piattaforma che ospita il sito (Lovable) fornisce statistiche aggregate: quante
            visite, quali pagine, da quale paese, con che tipo di dispositivo. Servono a capire se
            il sito viene usato, non a seguire le persone: secondo la documentazione della
            piattaforma non vengono creati profili né si segue qualcuno fra una visita e l'altra.
          </p>

          <h2>Come cancellare tutto</h2>
          <p>
            Dalle impostazioni del browser puoi cancellare i dati dei siti, e con essi tutto quello
            che è elencato qui sopra. Perderai le preferenze e l'accesso, e il sito ripartirà come
            la prima volta. Nell'applicazione, il tasto per ripristinare le impostazioni fa la
            stessa cosa per le preferenze.
          </p>

          <h2>Domande</h2>
          <p>Scrivi a {contatto}.</p>
        </>
      }
      en={
        <>
          <h2>We don't use cookies</h2>
          <p>
            This site sets no cookies of its own and uses none for advertising or profiling. It does
            store a few things in the browser's local storage, which the law treats the same way:
            here they all are.
          </p>

          <h2>What gets stored on your device</h2>
          <ul>
            <li>
              <strong>Your sign-in session</strong> (only if you have an account): it keeps you
              logged in from page to page. Without it you would sign in again on every click.
            </li>
            <li>
              <strong>Your preferences</strong>: language, light or dark theme, volumes, reduced
              motion, graphics quality, keyboard shortcuts.
            </li>
            <li>
              <strong>Who you are in a game</strong> (on the player's phone): an identifier and a
              private token for that game, so reloading the page doesn't throw you out. They
              disappear when you leave the game.
            </li>
          </ul>
          <p>
            All of it is either strictly necessary or a preference you chose yourself. That is why
            there is no banner to accept: the law requires one for things that aren't necessary, and
            there is nothing of that kind here.
          </p>

          <h2>Visit statistics</h2>
          <p>
            The platform hosting the site (Lovable) provides aggregate statistics: how many visits,
            which pages, from which country, on what kind of device. They exist to show whether the
            site is being used, not to follow people: according to the platform's documentation no
            profiles are built and nobody is tracked across separate visits.
          </p>

          <h2>How to delete everything</h2>
          <p>
            Your browser settings let you clear site data, and with it everything listed above. You
            will lose your preferences and your session, and the site will start over as if it were
            the first time. Inside the app, the reset button in Settings does the same for your
            preferences.
          </p>

          <h2>Questions</h2>
          <p>Write to {contatto}.</p>
        </>
      }
    />
  );
}
