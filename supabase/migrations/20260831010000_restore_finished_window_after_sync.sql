-- ============================================================================
-- Ripristino dopo la sincronizzazione con Lovable.
--
-- La migrazione 20260830125419 (generata da Lovable in parallelo a questo
-- lavoro) ridefinisce `categories_anon_select` e `get_public_tile_points`
-- limitandoli a ('lobby','live','final'). Essendo più recente della
-- 20260829220000, girerebbe per ultima e annullerebbe l'apertura allo stato
-- 'finished' — quella che permette ai giocatori di vedere il podio e agli
-- overlay OBS di non svuotarsi appena la partita si chiude.
--
-- Qui si riporta lo stato finale a quello voluto. Le due definizioni sono
-- identiche a quelle della 20260829220000: stessa finestra di due ore, così
-- titoli, codici d'accesso e domande finali non restano leggibili in eterno.
-- ============================================================================

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

revoke execute on function public.get_public_tile_points(text) from public;
grant execute on function public.get_public_tile_points(text) to anon, authenticated;
