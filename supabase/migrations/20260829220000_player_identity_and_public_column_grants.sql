-- ============================================================================
-- Chiude quattro falle di priorità massima emerse dall'audit del 29/08/2026:
--
--  1. La risposta del Final Jeopardy (sessions.final_answer) e l'elenco delle
--     caselle Daily Double erano leggibili da chiunque avesse la chiave
--     pubblica: ora anon ha un permesso di lettura per COLONNE che li esclude.
--  2. buzz() e submitFinalAnswer() si fidavano del playerId inviato dal client,
--     permettendo di premere il buzzer al posto di un altro giocatore o di
--     riscrivere la risposta della squadra avversaria. Ogni giocatore riceve
--     ora un segreto alla creazione, mai leggibile da anon, richiesto per ogni
--     scrittura.
--  3. anon poteva scrivere DIRETTAMENTE su players, buzzer_queue e
--     final_answers via REST, scavalcando del tutto le funzioni server: i
--     permessi di scrittura diretta sono revocati e sostituiti da tre funzioni
--     SECURITY DEFINER che replicano esattamente i controlli delle vecchie
--     policy.
--  4. La colonna final_answers.judged era modificabile da anon, il che
--     permetteva di chiudere la partita prima del giudizio dell'host.
--
-- Nota: si usano funzioni SECURITY DEFINER (non il service role) perché è il
-- pattern già presente nello schema (on_buzz, get_public_tile_points) e non
-- dipende da variabili d'ambiente aggiuntive.
--
-- ⚠ QUANDO APPLICARLA: a partita ferma, non durante una serata dal vivo.
--   I giocatori già collegati hanno un'identità salvata sul telefono che non
--   contiene il segreto introdotto qui: al primo aggiornamento vengono
--   riportati al modulo d'ingresso e devono reiscriversi (l'app lo gestisce in
--   modo pulito, ma perdono il posto in coda). Verifica prima con:
--     select count(*) from public.sessions where status in ('lobby','live','final');
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Identità segreta per giocatore
-- ---------------------------------------------------------------------------

alter table public.players
  add column if not exists secret uuid not null default gen_random_uuid();

-- ---------------------------------------------------------------------------
-- 1b. Durata del timer per sessione
--
-- L'impostazione "Default timer duration" (10/15/30s) nel pannello Impostazioni
-- non aveva alcun effetto: la durata era fissata a 15 secondi sia nel codice
-- TypeScript sia dentro il trigger on_buzz. Ora vive sulla sessione.
-- ---------------------------------------------------------------------------

alter table public.sessions
  add column if not exists timer_seconds int not null default 15
  check (timer_seconds between 5 and 120);

create or replace function public.on_buzz()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activated boolean;
begin
  update public.sessions s
  set phase = 'answering',
      active_player_id = new.player_id,
      timer_ends_at = now() + make_interval(secs => s.timer_seconds),
      updated_at = now()
  where s.id = new.session_id
    and s.current_tile_id = new.tile_id
    and s.phase = 'question_open'
  returning true into v_activated;
  if v_activated then
    update public.buzzer_queue set status = 'active' where id = new.id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1c. Variazione di punteggio registrata al momento del giudizio
--
-- Il grafico Analytics ricalcolava i punti dal valore della casella, quindi
-- ignorava del tutto i Daily Double (dove vale la puntata) e il Final,
-- contraddicendo il tabellone. Ora il valore effettivo si salva sulla riga.
-- ---------------------------------------------------------------------------

alter table public.buzzer_queue add column if not exists delta int;

-- ---------------------------------------------------------------------------
-- 2. Permessi di lettura per colonna (anon)
-- ---------------------------------------------------------------------------

-- sessions: tutto tranne final_answer (la soluzione del Final) e
-- daily_double_tile_ids (quali caselle nascondono un Daily Double).
revoke select on public.sessions from anon;
grant select (
  id, game_id, host_id, status, phase, current_tile_id, active_player_id,
  timer_ends_at, timer_seconds, score_alpha, score_bravo, used_tile_ids,
  dd_wager, created_at, updated_at
) on public.sessions to anon;

-- `final_question` NON e' fra le colonne concesse: era leggibile dai telefoni
-- gia' durante la fase di puntata, quindi si poteva decidere quanto scommettere
-- conoscendo in anticipo la domanda. Viene esposta solo a rivelazione avvenuta,
-- dalla funzione qui sotto.
create or replace function public.get_final_question(p_session_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select s.final_question
  from public.sessions s
  where s.id = p_session_id
    and s.status = 'final'
    and s.phase = 'final_answer'
$$;

-- players: tutto tranne il segreto.
revoke select, insert on public.players from anon;
grant select (
  id, session_id, name, avatar, team, locked_out, created_at
) on public.players to anon;

-- L'host non ha bisogno dei segreti dei giocatori: niente lettura per authenticated.
revoke select on public.players from authenticated;
grant select (
  id, session_id, name, avatar, team, locked_out, created_at
) on public.players to authenticated;
grant insert, update, delete on public.players to authenticated;

-- buzzer_queue: lettura sì (serve alla coda e agli overlay), scrittura no.
revoke insert on public.buzzer_queue from anon;

-- final_answers: nessun accesso diretto per anon. La lettura esponeva puntata e
-- risposta degli avversari; la scrittura permetteva sabotaggio e chiusura
-- anticipata della partita.
revoke select, insert, update on public.final_answers from anon;

drop policy if exists "final_anon_select" on public.final_answers;
drop policy if exists "final_anon_insert" on public.final_answers;
drop policy if exists "final_anon_update" on public.final_answers;
drop policy if exists "players_anon_insert" on public.players;
drop policy if exists "queue_anon_insert" on public.buzzer_queue;

-- ---------------------------------------------------------------------------
-- 2b. Le partite concluse restano visibili ai giocatori
--
-- Le vecchie policy si fermavano a 'final': appena l'host premeva "End game &
-- podium" la sessione spariva dai telefoni, che tornavano alla schermata di
-- attesa invece di mostrare il vincitore. La schermata del podio lato giocatore
-- era di fatto codice morto.
-- ---------------------------------------------------------------------------

/*
 * Le partite concluse restano visibili solo per due ore: il podio va mostrato
 * a fine serata, non lasciare in eterno titoli, codici d'accesso e domande
 * finali di ogni partita mai giocata leggibili da chiunque.
 */
drop policy if exists "sessions_anon_live" on public.sessions;
create policy "sessions_anon_live" on public.sessions for select to anon using (
  status in ('lobby', 'live', 'final')
  or (status = 'finished' and updated_at > now() - interval '2 hours')
);

-- La risoluzione del codice d'accesso parte da `games`: senza estendere anche
-- questa policy, a partita conclusa il giocatore vedeva "Game not found" e il
-- podio restava irraggiungibile — cioè l'esatto contrario dell'intento.
drop policy if exists "games_anon_live" on public.games;
create policy "games_anon_live" on public.games for select to anon using (
  exists (
    select 1 from public.sessions s
    where s.game_id = games.id
      and (
        s.status in ('lobby', 'live', 'final')
        or (s.status = 'finished' and s.updated_at > now() - interval '2 hours')
      )
  )
);

-- Categorie e valori delle caselle: stessi stati, altrimenti l'overlay OBS
-- si svuota proprio quando deve mostrare il risultato finale.
drop policy if exists "categories_anon_select" on public.categories;
create policy "categories_anon_select" on public.categories for select to anon using (
  exists (
    select 1
    from public.games g
    join public.sessions s on s.game_id = g.id
    where g.id = categories.game_id
      and (
        s.status in ('lobby', 'live', 'final')
        or (s.status = 'finished' and s.updated_at > now() - interval '2 hours')
      )
  )
);

create or replace function public.get_public_tile_points(p_join_code text)
returns table (id uuid, category_id uuid, row_index int, points int)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.category_id, t.row_index, t.points
  from public.tiles t
  join public.categories c on c.id = t.category_id
  join public.games g on g.id = c.game_id
  join public.sessions s on s.game_id = g.id
  where g.join_code = upper(p_join_code)
    and (
      s.status in ('lobby', 'live', 'final')
      or (s.status = 'finished' and s.updated_at > now() - interval '2 hours')
    )
$$;

drop policy if exists "players_anon_select" on public.players;
create policy "players_anon_select" on public.players for select to anon using (
  exists (
    select 1 from public.sessions s
    where s.id = players.session_id
      and (
        s.status in ('lobby', 'live', 'final')
        or (s.status = 'finished' and s.updated_at > now() - interval '2 hours')
      )
  )
);

drop policy if exists "queue_anon_select" on public.buzzer_queue;
create policy "queue_anon_select" on public.buzzer_queue for select to anon using (
  exists (
    select 1 from public.sessions s
    where s.id = buzzer_queue.session_id
      and (
        s.status in ('lobby', 'live', 'final')
        or (s.status = 'finished' and s.updated_at > now() - interval '2 hours')
      )
  )
);

-- ---------------------------------------------------------------------------
-- 3. Ingresso in partita: crea il giocatore e restituisce il suo segreto
-- ---------------------------------------------------------------------------

create or replace function public.join_session(
  p_code text,
  p_name text,
  p_avatar text,
  p_team text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_id uuid;
  v_game_title text;
  v_session_id uuid;
  v_player public.players;
begin
  if p_team not in ('alpha', 'bravo') then
    return jsonb_build_object('ok', false, 'reason', 'bad_team');
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    return jsonb_build_object('ok', false, 'reason', 'bad_name');
  end if;

  select g.id, g.title into v_game_id, v_game_title
  from public.games g
  where g.join_code = upper(btrim(p_code));

  if v_game_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Stessa finestra della vecchia policy players_anon_insert: lobby o live.
  select s.id into v_session_id
  from public.sessions s
  where s.game_id = v_game_id
    and s.status in ('lobby', 'live')
  order by s.created_at desc
  limit 1;

  if v_session_id is null then
    /*
     * Distingue "non ancora iniziata" da "iscrizioni chiuse": il modulo di
     * ingresso compariva comunque e ogni tentativo restituiva un generico
     * "Could not join", senza spiegare che la partita era già al Final.
     */
    if exists (
      select 1 from public.sessions s
      where s.game_id = v_game_id and s.status in ('final', 'finished')
    ) then
      return jsonb_build_object('ok', false, 'reason', 'closed');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'not_started');
  end if;

  -- Tetto generoso ma finito: senza, si poteva riempire la lista giocatori di
  -- nomi finti finché diventava inutilizzabile, e l'host non ha modo di
  -- espellere nessuno.
  if (select count(*) from public.players where session_id = v_session_id) >= 60 then
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  insert into public.players (session_id, name, avatar, team)
  values (v_session_id, left(btrim(p_name), 20), left(coalesce(p_avatar, '🎩'), 8), p_team)
  returning * into v_player;

  return jsonb_build_object(
    'ok', true,
    'player_id', v_player.id,
    'secret', v_player.secret,
    'session_id', v_session_id,
    'game_title', v_game_title,
    'name', v_player.name,
    'avatar', v_player.avatar,
    'team', v_player.team
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Buzzer: richiede il segreto del giocatore
-- ---------------------------------------------------------------------------

create or replace function public.buzz_in(
  p_player_id uuid,
  p_secret uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
  v_session public.sessions;
  v_tile uuid;
  v_position int;
begin
  select * into v_player
  from public.players
  where id = p_player_id and secret = p_secret;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_player');
  end if;

  select * into v_session from public.sessions where id = v_player.session_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_session');
  end if;

  -- Stessi controlli della vecchia policy queue_anon_insert, più il Daily
  -- Double: è riservato al concorrente designato, ma i buzzer degli altri
  -- restavano armati e finivano nella coda dell'host e nell'overlay OBS.
  if v_session.status <> 'live'
     or v_session.current_tile_id is null
     or v_session.phase not in ('question_open', 'answering')
     or v_session.dd_wager is not null then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  if v_player.locked_out then
    return jsonb_build_object('ok', false, 'reason', 'locked_out');
  end if;

  v_tile := v_session.current_tile_id;

  begin
    insert into public.buzzer_queue (session_id, tile_id, player_id)
    values (v_session.id, v_tile, v_player.id);
  exception when unique_violation then
    -- Il giocatore ha già premuto su questa casella (o la coda è stata
    -- azzerata dall'host). Non è un successo: il client deve ricaricare.
    return jsonb_build_object('ok', false, 'reason', 'already_buzzed');
  end;

  -- Il trigger on_buzz può aver promosso questo giocatore ad "active".
  select count(*) into v_position
  from public.buzzer_queue q
  where q.session_id = v_session.id
    and q.tile_id = v_tile
    and q.status in ('queued', 'active')
    and q.created_at <= (
      select q2.created_at from public.buzzer_queue q2
      where q2.session_id = v_session.id and q2.tile_id = v_tile and q2.player_id = v_player.id
    );

  return jsonb_build_object(
    'ok', true,
    'position', v_position,
    'active', exists (
      select 1 from public.sessions s
      where s.id = v_session.id and s.active_player_id = v_player.id
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Final Jeopardy: la squadra è dedotta dal giocatore autenticato dal segreto
-- ---------------------------------------------------------------------------

create or replace function public.submit_final(
  p_player_id uuid,
  p_secret uuid,
  p_wager int,
  p_answer text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
  v_session public.sessions;
  v_team_score int;
  v_wager int;
  v_existing_wager int;
begin
  select * into v_player
  from public.players
  where id = p_player_id and secret = p_secret;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_player');
  end if;

  select * into v_session from public.sessions where id = v_player.session_id;
  if not found or v_session.status <> 'final'
     or v_session.phase not in ('final_wager', 'final_answer') then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  -- Una riga già giudicata dall'host non si tocca più.
  if exists (
    select 1 from public.final_answers f
    where f.session_id = v_session.id and f.team = v_player.team and f.judged is not null
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_judged');
  end if;

  /*
   * La puntata non può superare il punteggio della squadra: il limite esisteva
   * solo nel browser, quindi una richiesta costruita a mano poteva scommettere
   * 100.000 partendo da 200 punti.
   */
  v_team_score := case when v_player.team = 'alpha'
                       then v_session.score_alpha
                       else v_session.score_bravo end;
  v_wager := least(greatest(0, coalesce(p_wager, 0)), greatest(0, v_team_score));

  /*
   * A domanda già rivelata la puntata è congelata: altrimenti si poteva
   * decidere quanto scommettere sapendo già se si conosceva la risposta.
   */
  if v_session.phase = 'final_answer' then
    select f.wager into v_existing_wager
    from public.final_answers f
    where f.session_id = v_session.id and f.team = v_player.team;
    if found then
      v_wager := v_existing_wager;
    else
      -- Nessuna puntata inviata entro la finestra: vale zero. Altrimenti una
      -- squadra poteva sceglierla dopo aver letto la domanda.
      v_wager := 0;
    end if;
  end if;

  insert into public.final_answers (session_id, team, wager, answer)
  values (v_session.id, v_player.team, v_wager, left(coalesce(p_answer, ''), 2000))
  on conflict (session_id, team) do update
    set wager = excluded.wager,
        answer = excluded.answer,
        submitted_at = now()
    -- Condizione nell'upsert: se nel frattempo l'host ha giudicato, la riga
    -- non si tocca. Il controllo separato qui sopra non era atomico.
    where final_answers.judged is null;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'already_judged');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Permessi di esecuzione
-- ---------------------------------------------------------------------------

-- `create function` concede EXECUTE a PUBLIC per impostazione predefinita:
-- si revoca e si concede esplicitamente solo ai ruoli che servono.
revoke execute on function public.join_session(text, text, text, text) from public;
revoke execute on function public.buzz_in(uuid, uuid) from public;
revoke execute on function public.submit_final(uuid, uuid, int, text) from public;
revoke execute on function public.get_final_question(uuid) from public;

grant execute on function public.join_session(text, text, text, text) to anon, authenticated;
grant execute on function public.buzz_in(uuid, uuid) to anon, authenticated;
grant execute on function public.submit_final(uuid, uuid, int, text) to anon, authenticated;
grant execute on function public.get_final_question(uuid) to anon, authenticated;
