# Plan — Address all 15 preview comments

All 15 comments are fixable. No schema changes required (team names go into the existing `theme` JSONB on `games`).

## Host console (`src/routes/_authenticated/host.$sessionId.tsx`)

1. **Timer blip scoped to timer only** (thread `c83e9ada`) — On timer expiry, stop re-coloring/pulsing the whole question overlay. Only the timer digits and progress bar flash red.
2. **No wrong-answer-style blip at start** (thread `b92d22cd`) — Flash only fires when a real countdown ran to zero (guard against the initial/null timer state being treated as expired).
3. **Big-picture centered question** (thread `fec5f8ab`) — The question overlay becomes a large card centered on the screen (fixed, viewport-centered, max-width), with the board, sidebars, and header visible around it instead of covering only the grid.
4. **Centered, renameable team pills** (thread `05702202`) — Alpha/Bravo score pills move to the center of the host header. Team names become editable in the board editor (see 9 below) and the host console + player view show the custom names.
5. **Solid question card** (thread `2d96093b`) — Overlay background becomes a fully solid color (no translucency), with the category name and point value displayed large in the center of the card.
6. **No dollar signs** (thread `3c156eb5`) — Remove `$` from score pills, question overlay, and Daily Double wager displays; plain numbers everywhere.
7. **Fun new sound set** (thread `11433afc`) — Rework `src/lib/sfx.ts`: game-show style sounds using noise-based synthesis — drum hits, claps, rimshot/boing for wrong answers, drum-roll fanfare — replacing the current harsh beeps.
8. **Clear Queue as icon** (thread `1ceb1a54`) — Replace the full-width button with a small trash icon at the top-right of the Buzzer Queue panel header.
9. **QR code during the game** (thread `9ada1e0f`) — Add a compact "Players join" card (join code + QR code) to the host console sidebar so late players can join mid-game.

## Board editor (`src/routes/_authenticated/edit.$gameId.tsx`)

10. **Team names section** (supports thread `05702202`) — New "Teams" editor section to rename Alpha/Bravo; saved into the game's theme settings and reflected in host + player views.
11. **Hide number spinners** (thread `f2ecc735`) — Remove the native up/down arrows from the row-points number inputs (CSS `appearance` fix).
12. **Roundness slider fixes** (thread `d6e4d477`) — Slider updates the board preview instantly with an animated radius transition, saves debounced; double-clicking the number turns it into an editable input.

## Studio (`src/routes/_authenticated/studio.tsx`)

13. **Editable profile name** (thread `dffdbd69`) — Pencil/inline-edit on the username in the studio header, saved via a new `updateProfile` server function.
14. **3-dot menu closes on outside click** (thread `e281327f`) — Add a click-away backdrop behind the open menu (also closes on Escape).
15. **Rename boards from the studio** (thread `62f9fa4e`) — Inline rename on the card title (or a Rename item in the 3-dot menu) calling the existing `updateGame` function.
16. **New game card layout** (thread `24b77600`) — Replace the mini-grid preview with a big themed card: game name on top, two clear buttons below — **Play** (starts a session and opens the host console) and **Edit** (opens the editor). The 3-dot menu keeps Duplicate / Export JSON / Export Excel / Delete.

## Verification

- Build passes, then a Playwright run on `/studio`, `/edit/$gameId`, and `/host/$sessionId` to confirm: centered solid question card, timer-only red flash, centered team pills, QR visible in-game, slider drag + double-click editing, menu click-away, profile/board rename, and the new card layout with Play/Edit.
- Reply on each of the 15 comment threads as its fix lands.
