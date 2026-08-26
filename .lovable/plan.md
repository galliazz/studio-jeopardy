# Comment round-up + guest player join

## What the comments ask for (10 open threads, all unanswered)

### Global top bar (2 threads)
1. `7135e986` — Move the dark-mode button into the centre of the top bar and visually separate it from the page-description text; apply on every page it appears.
2. `7ce65b86` — Turn it into a labelled switch reading "Day" in light mode and "Night" in dark mode, everywhere.

### Studio (5 threads)
3. `3a0c286f` — Make the greeting/profile block a bigger button that opens a centred settings panel (Account, Preferences, General).
4. `c165840a` — The displayed name must come from the account username set at sign-up.
5. `4d8538e2` — Search field should expand from the magnifier with an overshoot (springy) animation.
6. `539aaf18` — Nudge the game-card title down so it aligns with the 3-dot menu row.
7. `ded23c1f` + `19ec2b94` — Move the join code, "Copy link" and "QR code" actions into the card's 3-dot menu; make the Play button large and bottom-centred in the card.

### Editor (3 threads)
8. `23cd7366` — Make the join-code chip a button that opens a popover next to it (pop animation + sound) with QR code, copy link and the code.
9. `32554954` — Add a text-styling section: font, size, bold, italic, underline, with a target selector (all numbers / all questions / all categories).
10. `592827c0` — Reorganise the editor panels to be more appealing and functional.

### Host (1 thread)
11. `e9415551` — Add a visible close/back button to leave the host console.

## Execution plan

1. **Top bar** — rebuild `TopContextBar` in `src/routes/__root.tsx`: pill bar with the screen label on the left, a divider, and a centred Day/Night switch (label + spring-animated thumb) built in `src/components/ThemeToggle.tsx`. Single global bar, so it lands on all pages at once.
2. **Host close button** — add a back/close pill (returns to `/studio`, with confirm on a live session) in `src/routes/_authenticated/host.$sessionId.tsx`.
3. **Studio card rework** (`src/routes/_authenticated/studio.tsx`) — title aligned to the menu row, join code + copy link + QR moved into the 3-dot menu (QR opens a centred dialog), large bottom-centred Play button.
4. **Studio header + settings** — greeting becomes a large button opening a centred settings dialog with Account (username, avatar), Preferences (theme, sounds) and General (sign out) sections; username reads from and writes to the profile record so it matches the sign-up name.
5. **Studio search** — magnifier toggles the field open with a spring/overshoot transition and autofocus.
6. **Editor share popover** (`src/routes/_authenticated/edit.$gameId.tsx`) — code chip becomes a button; anchored popover with spring pop animation + existing SFX click, containing QR, code, copy-link.
7. **Editor typography controls** — new "Text style" panel in the theme bar: target selector (numbers / questions / categories / all), font family, size scale, bold / italic / underline toggles. Stored as a `textStyles` block inside the existing `theme` JSON (`src/lib/types.ts`), applied when rendering tiles, category headers and point numbers in the editor, host board and question overlay. No schema migration needed.
8. **Editor layout pass** — regroup the floating toolbars into clear sections (Board, Theme, Text, Share, Play), tighten the tile editor panel, keep mobile bottom-sheet behaviour.

## Guest player join (no login)

Current state confirmed: `/play/$code` already sits outside the `_authenticated` gate, its server functions use a public anon client, and the published site visibility is public — so scanning the QR or opening the link never hits an app login. Remaining work is to make that explicit and airtight:

- Rename the join screen copy to a clear **Guest Player Setup** step (Display name, Avatar, Team) in `src/routes/play.$code.tsx`; no account fields, no "sign in" links anywhere in the player flow.
- Ensure error states ("game not found" / "not started") offer retry only — never a redirect to `/auth`.
- Keep guest identity in `localStorage` per session so a refresh rejoins without re-entering data.
- Leave host auth untouched.

## Technical notes

- Files touched: `src/routes/__root.tsx`, `src/components/ThemeToggle.tsx`, `src/routes/_authenticated/studio.tsx`, `src/routes/_authenticated/edit.$gameId.tsx`, `src/routes/_authenticated/host.$sessionId.tsx`, `src/routes/play.$code.tsx`, `src/lib/types.ts`.
- No database migration; text styles ride in the existing `games.theme` JSON.
- No changes to game mechanics, scoring, realtime or audio synthesis beyond reusing existing SFX calls.
- Each thread gets a reply as its work completes.
