# JEOPARDESTINY — context and open work

Handoff document. Read this before touching anything. It records decisions already made, work already done, and what is still broken. Everything here was decided deliberately — if you disagree with something, say so rather than silently doing it differently.

---

## What the product is

A web app for running Jeopardy-style trivia games, built on Lovable (React 19, Tailwind 4, shadcn/ui, Supabase, GitHub-connected).

There are four surfaces:

- **Studio** — the board list. Desktop. Already rebuilt, treat it as the reference for design decisions on every other page.
- **Board editor** — authoring a 5x5 board. Desktop. Not yet reworked.
- **Host console** — the streamer's control room. Desktop. Partly reworked.
- **Player buzzer page** — the only phone surface. A guest joins with a code, picks a name/avatar/team, and gets a buzzer. Not yet reworked.
- **OBS overlay pages** — public, unauthenticated pages loaded into OBS as Browser Sources, composited over a live stream.

**The product is oriented around streaming.** A streamer runs the console on their machine and broadcasts the game graphics through OBS. Viewers watch the stream and, on their phone, have nothing but a buzzer. Whoever runs the stream is the host for everyone else. Pressing the buzzer starts a 15-second countdown on the clue.

---

## Design system

The app follows **Material Design 3 / M3 Expressive**, adapted for the web. Material Web Components is in maintenance mode and does not implement Expressive, so the tokens and layout rules are applied by hand through Tailwind rather than by using a component library.

Rules that are actually being enforced in this codebase:

- **Semantic colour tokens, never raw hex.** One seed generates tonal palettes; every surface reads a role, not a value. `on-*` pairs guarantee contrast — do not invent colour pairings.
- **Surface hierarchy with real separation.** At least 6% luminance between adjacent surface levels (page background, container, card, hovered card, dialog). Elevation is expressed through tone, not shadow.
- **Emphasis, not hue, carries hierarchy.** Filled for the single primary action in a region, tonal or outlined for secondary, text/icon for minimal. Error colour reserved exclusively for destructive actions.
- **State layers on everything interactive:** hover 8%, focus 10%, pressed 10%. Focus ring is 2px with 2px offset in a theme colour — never the browser default.
- **Sentence case everywhere.** No spaced capitals as section headers. This was a persistent problem and has been corrected page by page.
- **Breakpoints by window width, not device:** compact <600, medium 600–839, expanded 840–1199, large 1200–1599, extra-large ≥1600. Margins 16px compact, 24px from medium up. Desktop gets multiple panes; the layout reclassifies at each breakpoint rather than scaling.
- **Minimum 48x48px touch targets.** On the phone surface this is non-negotiable.
- **Motion uses springs where possible**, and respects `prefers-reduced-motion`.

---

## Decisions already made — do not relitigate these

**The board colour is user-changeable and is the single source of truth.** Whatever value drives the board container's background must also drive tile backgrounds, category headers, the clue card and the answer view. Because the user can change it, **no other panel may use a hue that can collide with it** — this already caused a bug where the join card's green clashed with a green board.

**Opening a tile is a container transform.** The clue view occupies exactly the board grid's footprint — same width, height, position and radius — and morphs in place. It is not a differently-sized overlay on top.

**The Settings dialog is shared across every page.** It was built for Studio and must be imported, never reimplemented. Sections: Account (display name editable, 2–24 chars), Appearance (theme System/Day/Night, reduce motion), Audio (master and effects volume, mute, test sound), Performance (graphics quality, background effects). The guest player page shows a reduced version with only Appearance and Audio.

**There is no floating context chip.** Every page used to have a "PAGE NAME / description" chip plus a NIGHT toggle plus a gear in the top right. These have been removed from Studio and the console. On the player page they are still present and must go. Their contents live in the account avatar menu instead.

**The account avatar menu** contains: name and email header, keyboard shortcuts, board-level actions, Settings, Sign out, and Reset board in the error colour behind a confirmation. It is the only control in the top right.

**Team participant display switches modes at six.** Up to 5 players, show individual overlapping avatars. From the 6th, all avatars collapse into a single 12-lobed cookie shape containing the total count — not 5 avatars plus a "+N" badge. The cookie shape is from the M3 Expressive shape family and matches the app's logo badge; it must be an SVG path, not a border-radius approximation.

**Team scores are centred on the board column's axis, not the viewport's.** The left sidebar shifts the viewport centre. The left team's content is right-aligned and the right team's is left-aligned, so scores expand outward and the axis never moves.

**Soundboard clips are never re-encoded in the browser.** The original file is uploaded to Supabase Storage; `trim_start_ms`, `trim_end_ms` and `gain` are stored alongside and applied at playback. This keeps uploads instant and lets the trim be re-edited later. Clips are decoded into AudioBuffers on mount and triggered from memory — creating `<audio>` elements on demand produces audible latency on a live stream.

**Overlays never receive unrevealed answers.** The overlay routes are public. If the projection includes answer text before the host reveals it, anyone watching the stream can open the URL and read the answers out of the network payload. `active_answer` is present only when `phase === 'revealed'`, enforced server-side.

---

## The session state contract

This is the shape the frontend has been written against. The backend implementing it is the main outstanding piece of work.

```
phase: 'lobby' | 'board' | 'clue_open' | 'buzzed' | 'revealed' | 'final' | 'ended'
active_tile_id: uuid | null
active_clue: { category, value, text } | null
active_answer: string | null          // ONLY when phase === 'revealed'
buzz_order: [{ player_id, display_name, team_id, buzzed_at }]   // ordered
active_player_id: uuid | null
timer_started_at: timestamptz | null
timer_duration_ms: number             // default 15000
timer_state: 'idle' | 'running' | 'expired' | 'stopped'
players: [{ id, display_name, avatar_url, team_id, connected }]
teams: [{ id, name, color, score }]
tiles: [{ id, category, value, used }]
board_color: the single value driving every board surface
server_time_offset_ms: number         // measured once on connect
overlay_token: unguessable string for public overlay access
```

**The timer is server-authoritative and derived, never stored as a decrementing number.**

```
remaining_ms = timer_duration_ms
             - ((Date.now() + server_time_offset_ms) - Date.parse(timer_started_at))
```

Computed with `requestAnimationFrame` on every surface. No client ever writes a remaining value back. This is what makes the console, every overlay and every player phone show the same number — which matters because all three are visible to the audience simultaneously.

**Game flow:** host opens tile → `clue_open`, buzzers armed, no timer. First buzz → appended to `buzz_order` with a server timestamp, `phase = 'buzzed'`, `active_player_id` set, `timer_started_at = now()`. Buzz ordering resolved server-side by received timestamp so latency cannot game it. Later buzzes append but do not restart the timer. Correct → score updated, tile used, back to `board`. Wrong → `active_player_id` advances, timer restarts. Timer hits zero → `expired`, nothing auto-scores.

All changes broadcast over a Supabase Realtime channel scoped to the session. Never poll. Reconnect with exponential backoff — an OBS source stays open for hours.

---

## Known bugs, diagnosed but not all fixed

**Countdown bar does not track the number.** The numeric countdown derives from the timestamp while the progress bar is animated by a CSS animation with its own duration set at mount. Two symptoms: the bar does not follow the count, and resetting the timer restarts the number but not the bar, because a CSS animation does not restart when data changes. The fix is to delete the CSS animation and derive both from the same value in one rAF loop, with no transition on the bar's width. The bar also currently reads backwards — it shows time elapsed when it should show time remaining, draining from full to empty.

**Overlays render in light theme.** The board on the overlay is pale mint with dark text while the console's is dark green with light text; the team chips are dark purple on near-black and invisible. Same tokens resolving to light-theme values, because the overlay routes mount outside the theme provider and an OBS Browser Source has no session or stored preference. Must resolve the theme from the host's session and never fall back to light.

**Overlays are a reimplementation, not a mirror.** The overlay board is separate code from the console board, which is why it looks different and why it drifts. It must import and render the same components in a read-only mode. If those components are inline in the console page, extract them into shared components first. Any visual difference between console centre and overlay is a bug.

**Overlays do not update.** They read a snapshot on mount instead of subscribing. Opening a tile in the console changes nothing on the overlay.

**Overlay canvas is clipped.** The fifth board column is cut off. Needs a fixed 1920x1080 root scaled to fit with a transform, overflow hidden, 60px safe area, and three anchored regions with empty space between them so each can be isolated with a rectangular crop in OBS.

**Player page name limit is too short.** Must allow 25 characters, with a counter past 20 and validation between 2 and 25 after trimming.

**Avatar picker allows two presets selected at once** and its selection ring is too low-contrast on the purple presets. Low priority, deferred.

**Player page still has the old floating chip** (PLAYER / Buzzer · scoreboard, NIGHT toggle, gear). Not yet removed.

---

## Working preferences

- Minor cosmetic issues go on a backlog rather than being fixed one at a time — batch them.
- When something cannot be done, say so explicitly and stop. Do not fall back to mock data or a static snapshot. A silently broken overlay is worse than a missing one, because the host will not notice until they are live.
- Prefer editing shared components over duplicating. Several bugs in this codebase trace back to the same UI existing in two places.

---

## Highest-value work remaining

1. The session state machine, server timer, realtime channel, overlay token and read-only projection. Everything else on the overlay and player surfaces is blocked on this.
2. The countdown bar fix.
3. Overlays: theme, shared components, live subscription, canvas.
4. Player page rebuild.
5. Board editor — not yet touched. Known issues: the tile shows the point value at display size while the question text is tiny and truncated, which is backwards for an authoring tool; there is no indicator of which tiles are complete; the bottom toolbar mixes styling controls with game configuration; and there is no undo/redo or save indicator.
