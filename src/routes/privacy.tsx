import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/legal/LegalPage";
import { CONTACT_EMAIL, HOLDER_NAME, MIN_AGE } from "@/legal/holder";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — JEOPARDESTINY" },
      { name: "description", content: "Come JEOPARDESTINY tratta i dati personali." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: PrivacyRoute,
});

const contatto = CONTACT_EMAIL || "— (indirizzo non ancora pubblicato)";

function PrivacyRoute() {
  return (
    <LegalPage
      title="Privacy"
      it={
        <>
          <h2>Chi tratta i dati</h2>
          <p>
            Il titolare del trattamento è {HOLDER_NAME}, che gestisce JEOPARDESTINY come progetto
            personale e gratuito. Per qualunque richiesta sui dati personali: {contatto}.
          </p>

          <h2>Che dati raccogliamo</h2>
          <p>
            <strong>Se crei un account da conduttore:</strong> indirizzo email e password (la
            password la custodisce Supabase in forma cifrata, noi non la vediamo mai), il nome
            visualizzato e la foto del profilo se li aggiungi, e le preferenze dell'applicazione
            (lingua, volumi, scorciatoie, effetti grafici).
          </p>
          <p>
            <strong>Quello che crei:</strong> titoli dei giochi, categorie, domande, risposte,
            suggerimenti, immagini e audio che carichi, colori e caratteri del tabellone, nomi delle
            squadre.
          </p>
          <p>
            <strong>Se entri in partita come giocatore:</strong> il nome che scrivi (può essere di
            fantasia), l'emoji scelta, la squadra, il momento esatto in cui premi il buzzer, le
            risposte della finale e il punteggio. Nessun account, nessuna email, nessun numero di
            telefono.
          </p>
          <p>
            <strong>Dati tecnici:</strong> i registri del server e dell'hosting, le segnalazioni
            automatiche di errore (quando qualcosa si rompe, l'applicazione manda il messaggio
            d'errore a Lovable, che ospita il sito) e statistiche di visita aggregate fornite dalla
            stessa piattaforma.
          </p>

          <h2>Perché, e con quale base giuridica</h2>
          <ul>
            <li>
              <strong>Per far funzionare il servizio che hai chiesto</strong> — creare un account,
              salvare i tuoi giochi, far entrare i giocatori, tenere i punteggi: è l'esecuzione del
              servizio (art. 6.1.b GDPR).
            </li>
            <li>
              <strong>Per la sicurezza e per riparare i guasti</strong> — registri, segnalazioni di
              errore, protezione da abusi: legittimo interesse (art. 6.1.f GDPR).
            </li>
            <li>
              <strong>Per capire quante persone usano il sito</strong> — statistiche aggregate, non
              profilazione pubblicitaria: legittimo interesse (art. 6.1.f GDPR).
            </li>
          </ul>
          <p>
            Non vendiamo dati, non li cediamo a inserzionisti, non costruiamo profili pubblicitari e
            non prendiamo decisioni automatizzate sulle persone.
          </p>

          <h2>Chi altro li vede</h2>
          <ul>
            <li>
              <strong>Supabase</strong> — database, accessi e file caricati. I dati stanno in un
              centro dati nell'Unione Europea (Irlanda).
            </li>
            <li>
              <strong>Lovable</strong> — ospita il sito, raccoglie le statistiche di visita e riceve
              le segnalazioni di errore.
            </li>
          </ul>
          <p>
            Sono fornitori che trattano i dati per conto del titolare. L'hosting può comportare un
            trasferimento fuori dall'Unione Europea, coperto dalle clausole contrattuali standard
            della Commissione europea.
          </p>

          <h2>Quanto restano</h2>
          <p>
            L'account e i giochi restano finché li tieni: puoi cancellare un gioco quando vuoi, e
            chiedere la cancellazione dell'account scrivendo al recapito qui sopra. I dati delle
            partite (giocatori, prenotazioni al buzzer, punteggi) restano legati al gioco e
            spariscono insieme a lui. I registri tecnici e le segnalazioni di errore li conservano i
            fornitori per i tempi indicati nelle loro informative.
          </p>

          <h2>I tuoi diritti</h2>
          <p>
            Puoi chiedere di accedere ai tuoi dati, correggerli, cancellarli, limitarne l'uso,
            opporti al trattamento fondato sul legittimo interesse e ricevere i tuoi dati in un
            formato leggibile da una macchina. Scrivi al recapito qui sopra. Se pensi che qualcosa
            non vada, puoi rivolgerti al Garante per la protezione dei dati personali
            (www.garanteprivacy.it).
          </p>

          <h2>Ragazzi e ragazze</h2>
          <p>
            Per usare il servizio da soli bisogna avere almeno {MIN_AGE} anni, come prevede la legge
            italiana. Chi è più piccolo può giocare, ma con un adulto che se ne occupa: basta il
            nome di fantasia che si scrive per entrare.
          </p>

          <h2>Modifiche</h2>
          <p>
            Se questa informativa cambia, la data in cima cambia con lei. Le modifiche importanti le
            segnaliamo nell'applicazione.
          </p>
        </>
      }
      en={
        <>
          <h2>Who handles your data</h2>
          <p>
            The data controller is {HOLDER_NAME}, who runs JEOPARDESTINY as a personal, free
            project. For anything about personal data: {contatto}.
          </p>

          <h2>What we collect</h2>
          <p>
            <strong>If you create a host account:</strong> your email address and password (the
            password is stored encrypted by Supabase and never seen by us), your display name and
            profile picture if you add them, and your app preferences (language, volumes, keyboard
            shortcuts, graphics).
          </p>
          <p>
            <strong>What you create:</strong> game titles, categories, clues, answers, hints, images
            and audio you upload, board colours and fonts, team names.
          </p>
          <p>
            <strong>If you join a game as a player:</strong> the name you type (a nickname is fine),
            the emoji you pick, your team, the exact moment you hit the buzzer, your Final Jeopardy
            answers and your score. No account, no email address, no phone number.
          </p>
          <p>
            <strong>Technical data:</strong> server and hosting logs, automatic error reports (when
            something breaks, the app sends the error message to Lovable, which hosts the site) and
            aggregate visit statistics provided by that same platform.
          </p>

          <h2>Why, and on what legal basis</h2>
          <ul>
            <li>
              <strong>To run the service you asked for</strong> — creating an account, storing your
              games, letting players in, keeping scores: performance of the service (GDPR art.
              6.1.b).
            </li>
            <li>
              <strong>Security and fixing breakage</strong> — logs, error reports, abuse protection:
              legitimate interest (GDPR art. 6.1.f).
            </li>
            <li>
              <strong>Understanding how many people use the site</strong> — aggregate statistics,
              not advertising profiles: legitimate interest (GDPR art. 6.1.f).
            </li>
          </ul>
          <p>
            We do not sell data, do not share it with advertisers, do not build advertising profiles
            and do not make automated decisions about people.
          </p>

          <h2>Who else sees it</h2>
          <ul>
            <li>
              <strong>Supabase</strong> — database, sign-in and uploaded files. The data sits in a
              data centre in the European Union (Ireland).
            </li>
            <li>
              <strong>Lovable</strong> — hosts the site, collects the visit statistics and receives
              the error reports.
            </li>
          </ul>
          <p>
            They are processors acting on the controller's behalf. Hosting may involve a transfer
            outside the European Union, covered by the European Commission's standard contractual
            clauses.
          </p>

          <h2>How long we keep it</h2>
          <p>
            Your account and games stay for as long as you keep them: you can delete a game whenever
            you like, and ask for your account to be deleted by writing to the address above. Game
            data (players, buzzes, scores) belongs to the game and disappears with it. Technical
            logs and error reports are kept by the providers for the periods stated in their own
            policies.
          </p>

          <h2>Your rights</h2>
          <p>
            You can ask to access your data, correct it, delete it, restrict its use, object to
            processing based on legitimate interest, and receive your data in a machine-readable
            format. Write to the address above. If you believe something is wrong you can complain
            to the Italian data protection authority, the Garante (www.garanteprivacy.it).
          </p>

          <h2>Young players</h2>
          <p>
            You must be at least {MIN_AGE} to use the service on your own, as Italian law requires.
            Younger players can still play with an adult looking after them: all it takes is the
            nickname typed to join.
          </p>

          <h2>Changes</h2>
          <p>
            If this notice changes, the date at the top changes with it. Important changes are
            flagged in the app.
          </p>
        </>
      }
    />
  );
}
