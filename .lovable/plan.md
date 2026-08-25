# JEOPARDESTINY — Material You Pastel Redesign

Good news on feasibility: the whole app you spec'd already exists and works end to end — studio hub, in-canvas WYSIWYG editor with floating theme bar, three-zone host console, real-time mobile buzzers with haptics, 15s timer with tick/urgency/alarm audio, custom audio upload, Daily Double, Final Jeopardy, confetti podium, JSON + .xlsx export, and server-authoritative buzz ordering.

So this is not a rebuild. It is a **visual-system swap plus gap closure**, roughly 90% presentation work. No database changes, no game-logic changes.

## What changes

### 1. Design system (foundation)
Replace the current dark-board / electric-blue direction with the multi-color pastel Material You palette in the global stylesheet:
- Backgrounds: blush pink, soft lavender, butter cream, muted sky — layered tonal surfaces.
- Component surfaces: pastel peach, sage mint, desaturated coral, muted lilac, warm sand as named tokens so cards can rotate tints instead of all being one color.
- Accents: pastel orange, magenta, lavender-purple, cyan for pills, FABs, active states.
- Text: deep plum `#2D1B36` as foreground everywhere; no white-on-dark.
- Radii bumped to the 28–36px squircle range; new ultra-soft, wide-spread pastel shadow tokens.
- New scalloped/wavy badge component (Android 14 flower shape, CSS mask) for queue ranks and the player's "#1 in line" badge.

Every screen reads from these tokens, so nothing is hardcoded.

### 2. Studio hub
Pastel dashboard restyle: greeting banner, enlarged peach/coral "+ Create a new game" pill with icon, floating pill search with a rounded icon chip, and game cards that rotate through the pastel surface tints with mini 5×5 thumbnails and a pill 3-dot menu.

### 3. Editor
Keep the direct-manipulation canvas, restyle to pastel. Two upgrades to match your spec: the text formatting toolbar becomes a true **floating pill island** (font selector, size +/−, bold/italic/underline, color swatch pills) that appears next to the selected element rather than inside a panel, and the theme bar's palette switcher offers the named pastel themes (Peach-Lilac, Mint-Sky, Butter-Coral) with instant preview. Radius slider range set to 16–40px.

### 4. Host console
Structure stays (it already matches: host-only left panel, central board, always-visible queue). Restyled to pastel light instead of dark, with:
- Auto-sizing hug-content team pills with team color dots, above the title.
- Board tiles in pastel tints with bold clean numbers.
- Question overlay: full-screen **within the central board container only** — dimming and the overlay are scoped to that container so header and both sidebars stay fully visible and undimmed. Springy entry, overshoot pop-down exit.
- Correct/Wrong as pastel green / pastel red pills below the clue.
- Queue rows get scalloped rank badges, avatar with team color badge, name + team, and latency delta from #2 onward.
- "Reset Game" restored as a full labeled control alongside the icon Clear Queue, doing a hard reset: scores to zero, all tiles restored, queue and lockouts cleared, new Daily Doubles.
- 15s timer becomes a pastel animated progress bar; existing tick / urgency / alarm audio stages kept.

### 5. Mobile player view
Pastel portrait layout; setup screen (avatar, name, team) restyled; buzz button tinted to the team's pastel color — greyish-pastel when locked, vibrant with lightning icon when active, scalloped badge for queue position, red 🚫 lockout state. Vibration + local click SFX already fire on buzz.

### 6. Celebration
Podium upgraded to a dimensional three-tier pastel podium with confetti and end-match stats (accuracy, average buzz latency).

## Technical notes

- All color/shadow/radius values land in `src/styles.css` as oklch tokens; components keep using semantic classes.
- Board tiles read tint from the per-game `theme` JSON, so the pastel presets are just new preset values — no migration.
- Scalloped badge is one small reusable component.
- Motion springs standardized (one entry spring, one overshoot exit) for consistent feel.
- Verification per screen with a headless browser at desktop and mobile viewports, including a two-context host+player buzz round trip, to confirm the overlay scoping and dimming behave as specified.

## Order of work

1. Pastel token foundation + scalloped badge + shadow/radius scale
2. Studio hub
3. Editor (floating format island, pastel presets)
4. Host console (board, overlay scoping, queue badges, Reset Game)
5. Mobile player view
6. Podium/celebration polish, then full end-to-end verification
