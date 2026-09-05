/*
 * Il tempo reale non arrivava più né ai giocatori né agli overlay.
 *
 * La migrazione del 2 settembre ha ristretto `anon` a un sottoinsieme di
 * COLONNE su `sessions` e `players`, e ha revocato del tutto `final_answers`.
 * Supabase Realtime non regge i permessi parziali di colonna: una
 * sottoscrizione `postgres_changes` su una tabella dove il ruolo non può
 * leggere tutte le colonne non riceve niente, e una tabella negata del tutto
 * fa fallire l'intero canale — e il client ne apre uno solo per quattro
 * tabelle.
 *
 * Risultato: telefoni e overlay vedevano lo stato soltanto al caricamento
 * della pagina. Timer fermi a zero, buzzer che non si disarmavano, "aggiorna
 * la pagina per andare avanti".
 *
 * Qui i segreti escono da `sessions` e da `players`, così quelle due tabelle
 * tornano leggibili per intero e il canale riparte. `final_answers` resta
 * negata agli ospiti, e il client smette di sottoscriverla: quello che ai
 * giocatori serve davvero — punteggi e fase — passa comunque da `sessions`.
 */

-- 1. Domanda e risposta della Final Jeopardy escono da `sessions`.
create table if not exists public.session_secrets (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  final_question text,
  final_answer text
);
alter table public.session_secrets enable row level security;
revoke all on public.session_secrets from anon;
grant all on public.session_secrets to service_role;
grant select, insert, update, delete on public.session_secrets to authenticated;

-- Solo l'host della sessione, e solo della propria.
drop policy if exists "session_secrets_host" on public.session_secrets;
create policy "session_secrets_host" on public.session_secrets for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and s.host_id = auth.uid()))
  with check (exists (select 1 from public.sessions s where s.id = session_id and s.host_id = auth.uid()));

insert into public.session_secrets (session_id, final_question, final_answer)
select id, final_question, final_answer from public.sessions
on conflict (session_id) do nothing;

alter table public.sessions drop column if exists final_question;
alter table public.sessions drop column if exists final_answer;

-- 2. Il token privato del giocatore esce da `players`.
create table if not exists public.player_secrets (
  player_id uuid primary key references public.players(id) on delete cascade,
  player_token uuid not null default gen_random_uuid()
);
alter table public.player_secrets enable row level security;
-- Nessuna policy: ci arriva solo il server con la chiave di servizio.
revoke all on public.player_secrets from anon, authenticated;
grant all on public.player_secrets to service_role;

insert into public.player_secrets (player_id, player_token)
select id, player_token from public.players
on conflict (player_id) do nothing;

alter table public.players drop column if exists player_token;

-- Ogni nuovo giocatore riceve il suo token senza che il client debba chiederlo.
create or replace function public.issue_player_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.player_secrets (player_id) values (new.id)
  on conflict (player_id) do nothing;
  return new;
end;
$$;
revoke all on function public.issue_player_token() from public, anon, authenticated;

drop trigger if exists players_issue_token on public.players;
create trigger players_issue_token after insert on public.players
  for each row execute function public.issue_player_token();

/*
 * 3. Basta permessi parziali: è da qui che dipende il tempo reale.
 *
 * `daily_double_tile_ids` resta su `sessions` e ora è leggibile dagli ospiti.
 * Non è più un segreto: le caselle le sceglie l'host, e una Daily Double viene
 * annunciata a schermo nel momento in cui si apre.
 */
grant select on public.sessions to anon;
grant select on public.players to anon;
grant select on public.buzzer_queue to anon;
