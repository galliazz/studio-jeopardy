# Apply pending Realtime migration for guests

## Current state (verified)
- `select to_regclass('public.session_secrets')` returned `null`.
- `public.sessions` still has both `final_question` and `final_answer` columns.

## What will happen
1. Read `supabase/migrations/20260905140000_realtime_per_ospiti.sql` as-is.
2. Execute it verbatim against the database because `session_secrets` does not exist yet.
3. After execution, re-run `select to_regclass('public.session_secrets');` and report the result plus any errors.

## What the migration does
- Creates `public.session_secrets` and moves each session's `final_question` / `final_answer` out of `sessions` into it, then drops those columns from `sessions`.
- Creates `public.player_secrets` and moves each player's `player_token` out of `players` into it, then drops that column from `players`.
- Adds an `issue_player_token` trigger so new players automatically receive a secret token.
- Restores full `SELECT` access for anonymous guests on `sessions`, `players`, and `buzzer_queue` so Realtime can deliver live updates to phones and overlays again.
- Keeps `session_secrets` readable only by the session host; `player_secrets` is reachable only by the service role.

## Constraints
- No application files will be modified.
- No TypeScript code will be rewritten, no Supabase types regenerated, and no additional migrations created.
- The SQL will run exactly as written in the file.