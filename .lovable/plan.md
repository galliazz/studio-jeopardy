# Studio page restructure

Scope: the Studio board list only. Homepage, editor, host console and player view stay untouched. No new colors — differences are carried by emphasis (filled / tonal / outlined / text), fill and borders using existing theme tokens.

## 1. Remove the floating chrome (Studio only)

- The floating pill in the top-right ("STUDIO / Boards and live games" + Day-Night switch + gear) is global chrome rendered by the root layout. It will be hidden on the Studio route only; every other screen keeps it exactly as today.
- The colored welcome banner ("Welcome, Galliazz / Your Jeopardy Studio") is removed from the Studio page.
- The Day/Night switch gains a home inside the Settings panel (Audio/Profile-style row under General), so the mode is still reachable from Studio.

## 2. Top app bar

- Sticky bar, 64px tall, aligned to the same page container as the content, page-background surface with a bottom hairline border.
- Left: existing logo badge, then the title "Studio" (semibold, title-large).
- Right: one 40px circular avatar showing the account name's initial, inside a 48x48 clickable target. Nothing else.
- Avatar opens a right-aligned shadcn/ui DropdownMenu: non-clickable header row with account name + email, divider, "Settings", "Sign out". Closes on outside click, Esc, or item select (handled natively by the component).
- "Settings" opens the existing settings dialog; "Sign out" uses the existing sign-out call already used in that dialog.

## 3. Page header

Plain text on the page background, no card:
- "Welcome back, {displayName}" in headline-medium.
- Below it, body-medium muted: board count, pluralized ("1 board" / "3 boards").

## 4. Container and grid

- Centered container, max-width 1440px; horizontal padding 16px, 24px from 600px up.
- Card grid columns by window width: <600 → 1, 600–839 → 2, 840–1199 → 3, >=1200 → 4. Gap 16px, 24px from 600px up.
- Cards stretch to equal height within a row.

## 5. Action row

Order: [Create a new game] [Import JSON] — spacer — [search icon]
- "Create a new game": filled primary CTA, 48px tall, "+" icon before the label, the highest-contrast element on the page.
- "Import JSON": outlined, 48px tall, no fill, clearly lower weight.
- Search: standard low-emphasis icon button flush with the container's right edge, separated from the pair.
- Keeps the existing spring expansion, but expands leftward over the other buttons; closes on Esc, outside click, or blur when empty. Filtering by title stays live with no submit.

## Technical notes

- `src/routes/__root.tsx`: skip the floating context bar when the path is `/studio`.
- `src/routes/_authenticated/studio.tsx`: new app bar + header + container/grid/action row; remove the banner; card internals (menu, preview grid, Play button) unchanged.
- `src/components/SettingsDialog.tsx`: add a Day/Night row reusing the existing `ThemeToggle`; email/name for the dropdown header come from the already-loaded session/profile data.
- New `src/components/StudioTopBar.tsx` holding the app bar and dropdown, built on `@/components/ui/dropdown-menu`.
- No changes to server functions, queries, mechanics or realtime.
