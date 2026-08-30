grant select on public.categories to anon;

-- `drop` aggiunto a mano: senza, questa migrazione fallisce su un database
-- nuovo, perche' la 20260829220000 ha gia' creato la stessa policy.
drop policy if exists "categories_anon_select" on public.categories;
create policy "categories_anon_select" on public.categories for select to anon using (
  exists (
    select 1
    from public.games g
    join public.sessions s on s.game_id = g.id
    where g.id = categories.game_id and s.status in ('lobby', 'live', 'final')
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
    and s.status in ('lobby', 'live', 'final')
$$;

grant execute on function public.get_public_tile_points(text) to anon;