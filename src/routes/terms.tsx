import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/legal/LegalPage";
import { CONTACT_EMAIL, HOLDER_NAME, MIN_AGE } from "@/legal/holder";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Termini — JEOPARDESTINY" },
      { name: "description", content: "Le condizioni d'uso di JEOPARDESTINY." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: TermsRoute,
});

const contatto = CONTACT_EMAIL || "— (indirizzo non ancora pubblicato)";

function TermsRoute() {
  return (
    <LegalPage
      title="Termini"
      it={
        <>
          <h2>Che cos'è</h2>
          <p>
            JEOPARDESTINY è un progetto personale e gratuito di {HOLDER_NAME}: permette di costruire
            tabelloni di domande e di condurre una partita dal vivo, con i telefoni dei partecipanti
            usati come pulsanti. Usandolo accetti queste condizioni.
          </p>

          <h2>Non è affiliato a nessuno</h2>
          <p>
            Il servizio non è associato, sponsorizzato o approvato da Sony Pictures Television né
            dai titolari del programma televisivo <em>Jeopardy!</em> o di altri quiz. I marchi
            citati appartengono ai rispettivi titolari.
          </p>

          <h2>Account ed età</h2>
          <p>
            Per creare un account bisogna avere almeno {MIN_AGE} anni. Le credenziali sono tue:
            tienile per te e avvisa se pensi che qualcuno le stia usando. Per giocare non serve
            nessun account: basta il codice della partita.
          </p>

          <h2>Quello che carichi</h2>
          <p>
            Domande, risposte, immagini e audio restano tuoi. Caricandoli concedi soltanto quello
            che serve a far funzionare il servizio: conservarli, mostrarli ai partecipanti della tua
            partita e agli overlay che colleghi alla diretta.
          </p>
          <p>
            Carichi solo materiale su cui hai i diritti, o che sei autorizzato a usare. Niente
            contenuti illegali, offensivi, discriminatori o che violino la privacy di qualcuno. Le
            immagini prese da internet non sono libere per definizione: se non sai da dove viene
            un'immagine, non caricarla.
          </p>
          <p>
            Se qualcosa viene segnalato come illecito, possiamo rimuoverlo o sospendere l'account.
          </p>

          <h2>Come ci si comporta in partita</h2>
          <p>
            Il nome che scrivi per entrare lo vedono tutti i partecipanti e, se l'host trasmette,
            anche il pubblico: scegline uno adatto. Chi conduce può rimuovere un giocatore.
          </p>

          <h2>Gratuito, quindi senza pagamenti né rimborsi</h2>
          <p>
            Il servizio è gratuito: non ci sono acquisti, abbonamenti o pagamenti di alcun tipo, e
            di conseguenza non esistono rimborsi. Se un giorno cambierà, le condizioni economiche
            saranno scritte qui prima che tu possa pagare qualcosa.
          </p>

          <h2>Nessuna garanzia, e quanto si risponde</h2>
          <p>
            Il servizio viene offerto «così com'è»: è un progetto personale, può avere guasti,
            interruzioni o perdite di dati, e non c'è nessuna assistenza garantita. Tieni una copia
            dei giochi a cui tieni (dalla pagina Studio puoi esportarli).
          </p>
          <p>
            Nei limiti consentiti dalla legge, il titolare non risponde dei danni indiretti né di
            perdite di dati o di guadagno. Restano fermi i diritti che la legge riconosce ai
            consumatori e la responsabilità per dolo o colpa grave, che non si possono escludere.
          </p>

          <h2>Sospensione e chiusura</h2>
          <p>
            Puoi smettere quando vuoi e chiedere la cancellazione dell'account. Il servizio può
            essere modificato, sospeso o chiuso: se dovesse chiudere del tutto, ti avvisiamo con
            ragionevole anticipo, così puoi esportare i tuoi giochi.
          </p>

          <h2>Legge e foro</h2>
          <p>
            Si applica la legge italiana. Se usi il servizio come consumatore, resta competente il
            giudice del luogo in cui risiedi o hai il domicilio, come prevede il Codice del consumo.
          </p>

          <h2>Contatti</h2>
          <p>Per qualunque cosa: {contatto}.</p>
        </>
      }
      en={
        <>
          <h2>What this is</h2>
          <p>
            JEOPARDESTINY is a personal, free project by {HOLDER_NAME}: it lets you build trivia
            boards and host a live game, with the players' phones used as buzzers. By using it you
            accept these terms.
          </p>

          <h2>Not affiliated with anyone</h2>
          <p>
            The service is not associated with, sponsored by or endorsed by Sony Pictures Television
            or the owners of the <em>Jeopardy!</em> television programme or any other quiz show.
            Trademarks mentioned belong to their respective owners.
          </p>

          <h2>Accounts and age</h2>
          <p>
            You must be at least {MIN_AGE} to create an account. Your credentials are yours: keep
            them to yourself and get in touch if you think someone else is using them. Playing needs
            no account at all: the game code is enough.
          </p>

          <h2>What you upload</h2>
          <p>
            Clues, answers, images and audio stay yours. By uploading them you grant only what it
            takes to run the service: storing them, showing them to the players in your game and to
            the overlays you connect to your stream.
          </p>
          <p>
            Only upload material you hold the rights to, or are allowed to use. Nothing illegal,
            abusive, discriminatory or invading someone's privacy. Images found online are not free
            by default: if you don't know where an image comes from, don't upload it.
          </p>
          <p>If something is reported as unlawful, we may remove it or suspend the account.</p>

          <h2>How to behave in a game</h2>
          <p>
            The name you type to join is visible to everyone in the game and, if the host is
            streaming, to the audience too: pick a suitable one. The host can remove a player.
          </p>

          <h2>Free, so no payments and no refunds</h2>
          <p>
            The service is free: there are no purchases, subscriptions or payments of any kind, and
            therefore no refunds. If that ever changes, the commercial terms will be written here
            before you can pay for anything.
          </p>

          <h2>No warranty, and how far liability goes</h2>
          <p>
            The service is provided "as is": it is a personal project, it can break, go down or lose
            data, and no support is guaranteed. Keep a copy of the games you care about (you can
            export them from the Studio page).
          </p>
          <p>
            To the extent allowed by law, the controller is not liable for indirect damages or for
            loss of data or profit. Consumer rights granted by law, and liability for wilful
            misconduct or gross negligence, cannot be excluded and remain unaffected.
          </p>

          <h2>Suspension and closure</h2>
          <p>
            You can stop whenever you like and ask for your account to be deleted. The service may
            be changed, suspended or shut down: if it closes for good, you will be told in
            reasonable time so you can export your games.
          </p>

          <h2>Law and jurisdiction</h2>
          <p>
            Italian law applies. If you use the service as a consumer, the courts of your place of
            residence or domicile remain competent, as the Italian Consumer Code provides.
          </p>

          <h2>Contact</h2>
          <p>For anything at all: {contatto}.</p>
        </>
      }
    />
  );
}
