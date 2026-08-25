# Pastel Material You Overhaul — Visual Only

Styling only. No changes to game logic, scoring, realtime, audio functions, state, or flow. Every edit lands in the stylesheet and in presentation markup (classes, layout wrappers, small UI components).

## 1. Token foundation (`src/styles.css`)

Swap the current dark-board / electric-blue system for a multi-color pastel one:

- Surface tints as named tokens: pastel peach, desaturated coral, muted lilac, blush pink, soft mint, butter yellow — so different cards can carry different tints instead of one flat color.
- Page backgrounds: layered ultra-soft pastel washes (blush → lavender → butter), not flat white or dark.
- Foreground: deep blackberry `#2D1B36` everywhere, including the game board, which becomes light pastel rather than dark.
- Radius scale raised into the 28–36px squircle range for cards, modals, dialogs, overlays.
- New elevation tokens: soft, wide-spread, slightly tinted shadows (three levels) replacing the current hard glow shadows.
- Accent tokens for pills and active states: pastel orange, magenta, lavender-purple, cyan.
- Team colors softened to pastel blue (Alpha) and pastel coral (Bravo).

All screens read these tokens, so no hardcoded colors anywhere.

## 2. Shared shape components

- **Scalloped badge**: an Android 14 flower/wavy shape (CSS mask) used for queue ranks (#1, #2), player avatars, and status indicators on both host and mobile views.
- **Pill / chip / capsule-toggle** styling applied to every action button, so nothing keeps a rectangular button look.
- Generous section padding and consistent gap rhythm between zones.

## 3. Home studio

Pastel dashboard: greeting banner on a tinted surface, enlarged peach/coral "+ Create a new game" pill, floating pill search with a rounded icon chip, and game cards that rotate through the pastel tints with soft elevation and a pill 3-dot menu.

## 4. Canvas editor

Keep the existing in-canvas editing behavior; restyle the chrome:

- Top action header becomes a floating pastel pill island (title, autosave indicator, "Play Game" CTA).
- The tile edit surface and text formatting controls become floating pastel pill toolbars with inline color swatch pills, replacing the panel/form framing.
- Theme bar restyled to pastel with squircle swatches; palette presets renamed to pastel sets (Peach-Lilac, Mint-Sky, Butter-Coral) and radius slider range set to 16–40px.
- Board canvas and category headers get pastel tints and the new radius scale.

## 5. Host game view

Structure unchanged (left host panel, center board, right queue). Restyled:

- Team score containers: hug-content pastel capsules with team color dots.
- Board tiles: soft pastel tints, bold centered numbers, squircle corners.
- Question overlay: absolutely positioned inside the central board container so the full-screen card and its dimming cover **only** the 5×5 grid — header and both sidebars stay fully visible and undimmed. Existing spring entry / pop-down exit motion kept, restyled as a pastel card.
- Correct/Wrong as pastel green / pastel red pills.
- Sidebar tool buttons, soundboard chips, dialogs and QR card converted to pastel pill/squircle surfaces.
- Queue rows: scalloped rank badge, avatar with team-tinted scalloped frame, name + team, latency delta from #2 onward.
- Timer bar restyled as a pastel animated progress bar (same timing logic and audio stages).

## 6. Mobile player view

Pastel portrait background; setup screen (avatar grid, name field, team picker) as pastel squircle cards; buzz button tinted to the team's pastel color — muted greyish-pastel when locked, vibrant when active — with the queue position in a scalloped badge and the lockout state in pastel red. Haptics and SFX untouched.

## Technical notes

- Tailwind v4: tokens go in `@theme inline` / `:root` in `src/styles.css`; the scalloped shape ships as a small component plus a `@utility`.
- Per-game `theme` JSON defaults and presets get pastel values; no schema or migration change.
- Files touched: `src/styles.css`, the four route files, and `src/lib/types.ts` only for the default-theme color constants.
- Verified afterwards in a headless browser at desktop and mobile viewports, including a tile-open check to confirm the overlay dims only the grid.

## Order

Tokens + scalloped shape → studio → editor → host view → mobile view → screenshot pass.
