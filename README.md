# Studio Jeopardy

Build a complete, production-ready, highly interactive web application called "JEOPARDESTINY" — a dynamic, multi-device Jeopardy-style trivia studio with a live host console and real-time mobile buzzers.

--- 0. TECH STACK & ARCHITECTURE (CRITICAL) ---

Stack: React + TypeScript + Tailwind CSS + shadcn/ui components, Framer Motion for animations.

Backend: Use Supabase for database, auth, file storage (images/audio uploads), and — most importantly — Realtime channels.

Real-time sync is mandatory: the Host View (desktop) and each Player View (mobile phone) are separate devices/sessions. They must stay in sync live via Supabase Realtime (or Postgres change subscriptions): buzzer presses, lockouts, score changes, timer state, question open/close, and Daily Double/Final Jeopardy state must all propagate instantly to every connected client.

Data model: games, categories, tiles/questions, teams, players, buzzer_queue, game_state (current tile, timer, phase). Each game session has a unique join code/link that players use to connect from their phone.

Auth: simple host login (email/password via Supabase Auth) is enough; players join via a game code, no account required.

--- 1. DESIGN SYSTEM & AESTHETIC DIRECTION (MATERIAL YOU / MD3 EXPRESSIVE) --- Recreate the visual language strictly inspired by Google Material Design 3 Expressive (modern Android 14+ system UI, Material You dynamic color):

Shapes & Surfaces: ultra-rounded containers (border-radius 28–32px), pill-shaped chips/buttons, squircle buttons, soft elevation shadows, expressive tonal surfaces.

Palette: soft lavender #E8DEF8, deep purple #4A4458, electric blue accent #0061A4, pastel blue #D3E3FD, vibrant pink/magenta accents. Dark, high-contrast surfaces for the active game board.

Typography: bold, kinetic Google Sans–style hierarchy (use "Google Sans" fallback or "Roboto Flex" / "Plus Jakarta Sans" if unavailable). High legibility on both mobile and desktop.

Motion: springy pop entry/exit transitions (overshoot/bounce easing via Framer Motion), smooth surface morphing, fluid layout state changes.

--- 2. HOME SCREEN STUDIO ---

Dashboard of saved quiz boards for the logged-in host.

Top greeting header: "Welcome, [Username] — Your Jeopardy Studio".

Primary pill-shaped CTA "+ Create a new game" with pastel gradient glow.

Pill-shaped search/filter input with icon adornments.

Game Cards Grid: rounded cards showing a mini grid thumbnail, title, category count, last-edited timestamp, and a 3-dot menu (Duplicate, Export JSON, Delete).

--- 3. EDIT PAGE (CANVA-STYLE IN-CANVAS WYSIWYG) --- No traditional grey accordions or side form panels — direct visual editing only:

Click directly on any board element (title, category name, point value, question text, answer text) to edit it inline in place.

Selecting an element reveals a floating Material contextual formatting bar (font, size, bold/italic/underline, color picker, alignment).

Floating media pickers to upload local images or audio clips into any question tile (store in Supabase Storage).

Global floating theme pill bar: color presets for background/cards/accents, card corner-radius slider (0–40px), and a batch editor to set baseline points per row across all 5 categories at once.

Auto-save every change to Supabase in real time — no manual save button.

Top-right enlarged pill CTA "Play Game" that generates/opens the live session and player join code.

--- 4. GAME VIEW & HOST LAYOUT (DESKTOP) --- Three fixed zones:

A. LEFT SIDEBAR — HOST ONLY (never shown to players):

Answer/notes preview: correct answer, hints, and reference notes visible before revealing the question.

Custom soundboard: preloaded SFX (buzzer, correct ding, wrong buzzer, Daily Double reveal) plus "Upload Custom Audio" (MP3/WAV) with custom naming, triggered via tappable audio pills.

Game master tools: toggle Daily Double tiles, open live analytics (score progression chart), trigger Final Jeopardy.

B. CENTRAL BOARD ZONE:

Dynamic-width scoreboard header above the game logo: hug-content rounded containers for Team Alpha (left) and Team Bravo (right) — score, name, color indicator.

5×5 grid: 5 categories × 5 point tiles.

Full-screen question/answer overlay centered ONLY over the 5×5 grid area when a tile is clicked — header and both side panels stay fully visible, undimmed.

Background dimming applies only to the grid backdrop.

Springy pop-in / overshoot pop-out card animation.

Host action buttons "Correct (✓)" / "Wrong (✗)" below the question content.

C. RIGHT SIDEBAR — BUZZER QUEUE (always visible, live via Realtime):

Ranked list: # rank, player avatar with team color badge, player + team name, latency delta from the previous player (e.g. +140ms, +1.24s).

"Reset Game" (hard reset: scores, tiles, buzzers) and "Clear Queue" buttons.

--- 5. GAME FLOW & SCORING LOGIC (server-authoritative via Supabase) ---

Buzzers are fully locked on all player devices while the main grid is shown.

Opening a tile instantly unlocks all connected player buzzers (via realtime broadcast).

CORRECT: award 100% of tile value to the buzzing player's team, purge the entire buzzer queue, flip card to reveal the answer.

WRONG: deduct 50% of tile value, remove only that player from the queue and mark them locked out (🚫) for this question, then after a short pause pass focus to the next queued player and restart their 15s timer; if the queue is empty, clear the timer and wait for new buzzes.

--- 6. TIMER & AUDIO FX ---

15-second progress bar per active question.

15–6s: subtle steady tick each second.

5–1s: distinct urgency tick (fixed volume, no crescendo).

0s: expiration alarm plays, red "0" flashes for 3 seconds.

--- 7. MOBILE PLAYER VIEW (BUZZER) ---

Portrait-optimized mobile page, joined via game code/link (no install required).

Setup screen: avatar picker, name entry, team selection (Alpha/Bravo).

Buzz button: color matches the player's team (e.g. electric blue for Alpha, vibrant red for Bravo).

Idle/locked: greyed surface, "Ready to play — Wait for next question".

Active: vibrant surface, large flash icon, "BUZZ" label.

After buzzing: live queue position, e.g. "#1 in line — get ready to play!" (updates in real time as others buzz).

Lockout: greys out with 🚫 icon and "Incorrect — Locked out for this question" after the host marks them wrong.

Feedback: navigator.vibrate() haptic pulse + local click SFX on successful buzz.

--- 8. EXTRA FEATURES ---

Daily Double: 1–2 hidden tiles chosen at random per game, wager input before the question is shown.

Final Jeopardy: end-game wagering phase with simultaneous answer collection from both teams.

Win celebration: 3D-style victory podium reveal with confetti (use canvas-confetti), plus end-match stats (latency deltas, accuracy rate).

Data portability: export/import full quiz packs as JSON, export match summaries as .xlsx.

--- BUILD ORDER (recommended) ---

Data model + Supabase schema + auth + realtime channels.

Home Studio + Edit Page (WYSIWYG).

Host Game View (board, scoreboard, question overlay) with mocked local buzzer queue.

Mobile Player View + wire up real-time buzzer sync end-to-end.

Timer/audio system, Daily Double, Final Jeopardy.

Win celebration, analytics, JSON/xlsx export/import.

Ask me any clarifying questions you need before proposing an implementation plan

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/268a2f92-ead3-4283-8b8b-936827828873).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
