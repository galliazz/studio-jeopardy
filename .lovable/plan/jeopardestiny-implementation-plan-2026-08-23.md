# JEOPARDESTINY — Implementation Plan

A Jeopardy-style trivia studio: host console on desktop, players buzz in from their phones, everything synced live. Built on the existing TanStack Start + React 19 + Tailwind v4 + shadcn stack, with Lovable Cloud (Supabase) for auth, database, storage, and realtime.

## Resolved decisions

- Host auth: email/password + a profiles table with username and avatar (powers "Welcome, [Username]").
- Default SFX (buzzer, ding, wrong, ticks, alarm) synthesized in-app via the Web Audio API — no audio assets to ship.
- New hosts get a fully playable 5x5 demo board auto-created on signup.
- Media uploads capped: images 5MB, audio 10MB, stored in Cloud Storage, scoped per game.

## Routes

```text
/                            Public landing: "Host sign in" + "Join with game code"
/auth                        Host login / signup (email + password + username)
/_authenticated/studio       Dashboard of saved boards (greeting, search, game cards)
/_authenticated/edit/$gameId Canva-style in-canvas WYSIWYG board editor
/_authenticated/host/$sessionId   Host game view (3-zone layout)
/play/$code                  Mobile player view: setup -> buzzer (no account)
```

The host-only routes live under the integration-managed `_authenticated` gate; `/play/$code` and `/` stay public.

## Phase 1 — Cloud, schema, auth, realtime foundation

1. Enable Lovable Cloud.
2. Migration with tables + GRANTs + RLS:
   - `profiles` (id -> auth.users, username, avatar_url) with auto-create trigger on signup; the same trigger also builds the seeded demo game.
   - `games` (host_id, title, join_code, theme jsonb: colors/radius/row points, timestamps).
   - `categories` (game_id, title, position).
   - `tiles` (category_id, row, points, question, answer, hint, media urls, is_daily_double).
   - `sessions` (game_id, status: lobby/live/final/finished, current_tile_id, timer_ends_at, phase, daily double state).
   - `players` (session_id, name, avatar emoji, team alpha/bravo).
   - `buzzer_queue` (session_id, tile_id, player_id, created_at server timestamp — used for latency deltas).
   - `final_answers` (session_id, team, wager, answer).
3. RLS: host-only writes on games/categories/tiles/sessions and scoring; anon SELECT by join_code + anon INSERT on `players` and `buzzer_queue` restricted to live sessions.
4. Storage buckets: `game-media` (public read, host write) and `avatars`, with size/type limits enforced client- and server-side.
5. Realtime: `postgres_changes` subscriptions on `sessions`, `buzzer_queue`, `players`, plus broadcast events for buzzer unlock/lock. Server timestamps in `buzzer_queue.created_at` drive the +140ms style latency deltas (client clocks are untrusted).
6. Server functions in `src/lib/*.functions.ts`: board CRUD/autosave, session start, buzz, judge correct/wrong, reset, wager — host actions behind `requireSupabaseAuth`, buzz/join as validated public functions. Server-authoritative scoring (correct = +100%, wrong = -50%, lockout, queue purge/advance) lives in these handlers, never in client code.

## Phase 2 — Home Studio + WYSIWYG Editor

- Studio: greeting header, gradient pill "+ Create a new game", pill search, rounded game cards (mini-grid thumbnail, category count, last-edited, 3-dot menu: Duplicate / Export JSON / Delete).
- Editor: click any board element to edit inline (title, category, points, question, answer). Selecting an element floats a Material-style contextual bar (font size, bold/italic/underline, color, alignment). Media pickers upload image/audio into a tile.
- Floating theme pill bar: color presets (background/cards/accents), corner-radius slider 0-40px, batch row-points editor across all 5 categories.
- Debounced autosave to Cloud on every change (no save button), big pill "Play Game" top-right that creates a session and shows the join code + QR.

## Phase 3 — Host Game View

Three fixed zones, dark high-contrast board:

- Left sidebar (host only): answer/notes preview, synthesized-SFX soundboard pills + custom audio upload, master tools (toggle Daily Doubles, analytics chart, trigger Final Jeopardy).
- Center: dynamic-width Team Alpha / Team Bravo score pills above the JEOPARDESTINY logo; 5x5 grid; question overlay pops (springy overshoot via Motion) centered over the grid only — header and sidebars stay visible and undimmed; Correct/Wrong buttons under the question; 15s progress bar synced from `timer_ends_at`.
- Right sidebar: live buzzer queue with rank, avatar + team badge, latency deltas; Reset Game and Clear Queue.

Timer/audio: steady tick 15-6s, urgency tick 5-1s, alarm + flashing red "0" at expiry (3s).

## Phase 4 — Mobile Player View + realtime wiring

- Join by code/link: avatar picker, name, team selection.
- Buzzer button in team color (electric blue Alpha / vibrant red Bravo); states: locked ("Ready to play — wait for next question"), active (BUZZ + flash icon), queued ("#1 in line — get ready to play!", live-updating), locked out (blocked icon + "Incorrect — locked out for this question").
- Haptics via `navigator.vibrate()` + local click sound on buzz.
- End-to-end realtime: tile open unlocks all buzzers instantly; buzzes, lockouts, scores, timers propagate to every device.

## Phase 5 — Extras

- Daily Double: 1-2 random hidden tiles per session, wager input before reveal.
- Final Jeopardy: wagering phase with simultaneous answer collection from both teams.
- Win celebration: victory podium + canvas-confetti + match stats (latency deltas, accuracy).
- Data portability: export/import full quiz packs as JSON; match summary export as .xlsx (client-side SheetJS).

## Design system

- MD3 Expressive tokens in `src/styles.css`: lavender #E8DEF8, deep purple #4A4458, electric blue #0061A4, pastel blue #D3E3FD, magenta accents; 28-32px radii, pill/squircle shapes, tonal surfaces; dark board theme for the game view.
- Fonts via `<link>` in root head: Roboto Flex / Plus Jakarta Sans (Google Sans-style hierarchy).
- Motion (framer-motion) for springy pop-in/out, overshoot easing, layout morphs. New deps: `motion`, `canvas-confetti`, `xlsx`.

## Technical notes

- No Supabase Edge Functions — all backend logic is `createServerFn`; storage via the Cloud Storage API; schema changes via migrations only.
- `.functions.ts` files stay thin (declarations only); privileged helpers in `*.server.ts`; env reads inside handlers.
- Root route gets session-aware sign-in affordance and the `onAuthStateChange` invalidation subscriber; sign-out follows the cancel/clear/signOut/replace flow.
- Every route gets unique `head()` metadata; `/play/$code` and `/` get full OG tags.
- Verification per phase: build output, then Playwright runs driving two browser contexts (host + phone viewport) to prove buzz -> queue -> scoring sync.

## Build order

Phase 1 (schema/auth/realtime) -> Phase 2 (studio + editor) -> Phase 3 (host view with live queue) -> Phase 4 (player view end-to-end) -> Phase 5 (doubles, final, celebration, exports).
