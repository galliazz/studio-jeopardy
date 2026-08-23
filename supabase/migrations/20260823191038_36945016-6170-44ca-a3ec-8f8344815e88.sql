create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled Quiz',
  join_code text not null unique,
  theme jsonb not null default '{"bg":"#070714","card":"#141433","accent":"#f7b731","radius":24,"rowPoints":[200,400,600,800,1000]}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  title text not null default 'Category',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.tiles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  row_index int not null default 0,
  points int not null default 200,
  question text not null default '',
  answer text not null default '',
  hint text,
  image_url text,
  audio_url text,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby','live','final','finished')),
  phase text not null default 'idle' check (phase in ('idle','question_open','answering','reveal','daily_double_wager','final_wager','final_answer')),
  current_tile_id uuid references public.tiles(id) on delete set null,
  active_player_id uuid,
  timer_ends_at timestamptz,
  score_alpha int not null default 0,
  score_bravo int not null default 0,
  used_tile_ids uuid[] not null default '{}',
  daily_double_tile_ids uuid[] not null default '{}',
  dd_wager int,
  final_question text,
  final_answer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  avatar text not null default '🎩',
  team text not null default 'alpha' check (team in ('alpha','bravo')),
  locked_out boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.buzzer_queue (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  tile_id uuid not null references public.tiles(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','active','correct','wrong','cleared')),
  created_at timestamptz not null default now(),
  judged_at timestamptz,
  unique (session_id, tile_id, player_id)
);

create table public.final_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  team text not null check (team in ('alpha','bravo')),
  wager int not null default 0,
  answer text not null default '',
  judged boolean,
  submitted_at timestamptz not null default now(),
  unique (session_id, team)
);

create index categories_game_idx on public.categories(game_id);
create index tiles_category_idx on public.tiles(category_id);
create index sessions_game_idx on public.sessions(game_id);
create index players_session_idx on public.players(session_id);
create index queue_session_tile_idx on public.buzzer_queue(session_id, tile_id, created_at);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select, insert, update, delete on public.games to authenticated;
grant select on public.games to anon;
grant all on public.games to service_role;
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
grant select, insert, update, delete on public.tiles to authenticated;
grant all on public.tiles to service_role;
grant select, insert, update, delete on public.sessions to authenticated;
grant select on public.sessions to anon;
grant all on public.sessions to service_role;
grant select, insert, update, delete on public.players to authenticated;
grant select, insert on public.players to anon;
grant all on public.players to service_role;
grant select, insert, update, delete on public.buzzer_queue to authenticated;
grant select, insert on public.buzzer_queue to anon;
grant all on public.buzzer_queue to service_role;
grant select, insert, update, delete on public.final_answers to authenticated;
grant select, insert, update on public.final_answers to anon;
grant all on public.final_answers to service_role;

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

alter table public.games enable row level security;
create policy "games_host_all" on public.games for all to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "games_anon_live" on public.games for select to anon using (
  exists (select 1 from public.sessions s where s.game_id = games.id and s.status in ('lobby','live','final'))
);

alter table public.categories enable row level security;
create policy "categories_host_all" on public.categories for all to authenticated using (
  exists (select 1 from public.games g where g.id = categories.game_id and g.host_id = auth.uid())
) with check (
  exists (select 1 from public.games g where g.id = categories.game_id and g.host_id = auth.uid())
);

alter table public.tiles enable row level security;
create policy "tiles_host_all" on public.tiles for all to authenticated using (
  exists (select 1 from public.categories c join public.games g on g.id = c.game_id where c.id = tiles.category_id and g.host_id = auth.uid())
) with check (
  exists (select 1 from public.categories c join public.games g on g.id = c.game_id where c.id = tiles.category_id and g.host_id = auth.uid())
);

alter table public.sessions enable row level security;
create policy "sessions_host_all" on public.sessions for all to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "sessions_anon_live" on public.sessions for select to anon using (status in ('lobby','live','final'));

alter table public.players enable row level security;
create policy "players_host_all" on public.players for all to authenticated using (
  exists (select 1 from public.sessions s where s.id = players.session_id and s.host_id = auth.uid())
) with check (
  exists (select 1 from public.sessions s where s.id = players.session_id and s.host_id = auth.uid())
);
create policy "players_anon_select" on public.players for select to anon using (
  exists (select 1 from public.sessions s where s.id = players.session_id and s.status in ('lobby','live','final'))
);
create policy "players_anon_insert" on public.players for insert to anon with check (
  exists (select 1 from public.sessions s where s.id = players.session_id and s.status in ('lobby','live'))
);

alter table public.buzzer_queue enable row level security;
create policy "queue_host_all" on public.buzzer_queue for all to authenticated using (
  exists (select 1 from public.sessions s where s.id = buzzer_queue.session_id and s.host_id = auth.uid())
) with check (
  exists (select 1 from public.sessions s where s.id = buzzer_queue.session_id and s.host_id = auth.uid())
);
create policy "queue_anon_select" on public.buzzer_queue for select to anon using (
  exists (select 1 from public.sessions s where s.id = buzzer_queue.session_id and s.status in ('lobby','live','final'))
);
create policy "queue_anon_insert" on public.buzzer_queue for insert to anon with check (
  exists (
    select 1 from public.sessions s
    where s.id = buzzer_queue.session_id
      and s.status = 'live'
      and s.phase in ('question_open','answering')
      and s.current_tile_id = buzzer_queue.tile_id
  )
  and exists (
    select 1 from public.players p
    where p.id = buzzer_queue.player_id
      and p.session_id = buzzer_queue.session_id
      and not p.locked_out
  )
);

alter table public.final_answers enable row level security;
create policy "final_host_all" on public.final_answers for all to authenticated using (
  exists (select 1 from public.sessions s where s.id = final_answers.session_id and s.host_id = auth.uid())
) with check (
  exists (select 1 from public.sessions s where s.id = final_answers.session_id and s.host_id = auth.uid())
);
create policy "final_anon_select" on public.final_answers for select to anon using (
  exists (select 1 from public.sessions s where s.id = final_answers.session_id and s.status = 'final')
);
create policy "final_anon_insert" on public.final_answers for insert to anon with check (
  exists (select 1 from public.sessions s where s.id = final_answers.session_id and s.status = 'final')
);
create policy "final_anon_update" on public.final_answers for update to anon using (
  exists (select 1 from public.sessions s where s.id = final_answers.session_id and s.status = 'final')
);

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
      timer_ends_at = now() + interval '15 seconds',
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

create trigger buzzer_queue_after_insert
  after insert on public.buzzer_queue
  for each row execute function public.on_buzz();

alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.buzzer_queue;
alter publication supabase_realtime add table public.final_answers;