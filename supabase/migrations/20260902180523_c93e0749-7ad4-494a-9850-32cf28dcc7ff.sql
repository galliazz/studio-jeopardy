-- 1. Per-player secret token
alter table public.players add column if not exists player_token uuid not null default gen_random_uuid();

-- Guests may only read safe player columns, and may no longer insert directly
drop policy if exists "players_anon_insert" on public.players;
revoke all on public.players from anon;
grant select (id, session_id, name, avatar, team, locked_out, created_at) on public.players to anon;
grant all on public.players to service_role;

-- 2. Hide sensitive session columns from guests
revoke all on public.sessions from anon;
grant select (id, game_id, host_id, status, phase, current_tile_id, active_player_id, timer_ends_at, score_alpha, score_bravo, used_tile_ids, dd_wager, created_at, updated_at) on public.sessions to anon;
grant all on public.sessions to service_role;

-- 3. Buzzer queue: guests read only; buzzes go through the verified server path
drop policy if exists "queue_anon_insert" on public.buzzer_queue;
revoke all on public.buzzer_queue from anon;
grant select on public.buzzer_queue to anon;
grant all on public.buzzer_queue to service_role;

-- 4. Final answers: no guest access at all
drop policy if exists "final_anon_select" on public.final_answers;
drop policy if exists "final_anon_insert" on public.final_answers;
drop policy if exists "final_anon_update" on public.final_answers;
revoke all on public.final_answers from anon;
grant all on public.final_answers to service_role;

-- 5. SECURITY DEFINER exposure
drop function if exists public.get_public_tile_points(text);
revoke all on function public.on_buzz() from public, anon, authenticated;