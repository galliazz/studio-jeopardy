# Pending comment sweep

## 1. Code-comment scan result

A full search for `TODO`, `FIXME`, `FIX:`, `HACK`, `XXX` across `src/` returned **no matches** — there are no leftover to-do markers in the code. All pending work comes from the 16 unanswered preview comment threads (13 new ones from Aug 27, plus 3 older ones still open).

## 2. Checklist of detected tasks

### Host console (`/host`)
- [ ] Join-code panel: copy-code button + expandable QR section, click to open/close, spring animation + SFX.
- [ ] Sound set rework: Victory, Sad, Drum roll, Funny, Suspense, Wrong answer — more appealing.
- [ ] Move the Day/Night switch into the host top bar next to "Reset board"; keep the "Play · Host console" label chip top-right.
- [ ] Panel headers ("Buzzer queue" etc.) centred; trash icon vertically centred on the header text so it stops overlapping the player card.
- [ ] Question card: bigger, more readable answer text.
- [ ] Judge row order: Reveal answer centred, Close tile centred in its row, Wrong on the right (Correct left).
- [ ] Timer hides as soon as Reveal answer or Correct is pressed.
- [ ] QR code in the host sidebar currently doesn't scan/work — fix the encoded URL.
- [ ] New "OBS Overlay Links" pill + popover with copy buttons for three overlay URLs.

### OBS overlay routes (new)
- [ ] `/obs/board`, `/obs/queue`, `/obs/combined` — transparent background, no chrome, live-synced.

### Editor (`/edit/$gameId`)
- [ ] Top header bar 3-tier hierarchy: Play Game = coral primary pill; title + code badge = mint/soft secondary; back arrow + mode toggle = neutral lavender chips. Grid colours untouched.
- [ ] Board shell: grid widened to align exactly with the top bar edges; same top-bar height as play mode.
- [ ] Roundness slider range 0–50, and the numeric field must accept typed values reliably.
- [ ] Floating toolbar redesign: light pastel surface, blackberry text, three divided sections (Theme & Shape / Text formatting / Teams & Points), 40px consistent control heights, generous padding.

### Studio (`/studio`)
- [ ] Button colour hierarchy: Play + Create new game = bright pastel primary; Import JSON + 3-dot menu = lilac secondary; Settings + Search = lavender surface utility pills of equal height.
- [ ] Settings modal expansion: profile name + avatar, master FX volume slider, mute-all toggle, default team names/colours, default timer duration, mobile haptics toggle, export-all-games JSON, reset local studio data with confirm.
- [ ] Settings becomes a gear icon button, present on every page.

## 3. Files to modify

| File | Work |
|---|---|
| `src/routes/_authenticated/host.$sessionId.tsx` | join panel, headers, judge row order, timer hide, answer type scale, top-bar layout, OBS popover |
| `src/lib/sfx.ts` | new synthesized sound set (victory, sad, drumroll, funny, suspense, wrong) |
| `src/routes/obs/board.tsx`, `queue.tsx`, `combined.tsx` (new) | transparent overlay routes |
| `src/routes/_authenticated/edit.$gameId.tsx` | header tiers, board shell sizing, roundness control, toolbar redesign |
| `src/routes/_authenticated/studio.tsx` | button tiers, gear button, settings modal |
| `src/components/SettingsDialog.tsx` (new) | shared Material You settings modal |
| `src/components/SettingsButton.tsx` (new) | gear pill reused on every page |
| `src/lib/settings.ts` (new) | local studio preferences store (volume, mute, timer default, haptics, team presets) |
| `src/routes/__root.tsx` | mount the gear button in the global top bar |
| `src/styles.css` | pastel tier tokens, toolbar surface, squircle utilities |
| `src/lib/play.functions.ts` (read-only check) | reuse existing public state fetch for OBS routes |

## 4. Execution order

1. **Preferences foundation** — `src/lib/settings.ts` + shared `SettingsDialog` / gear `SettingsButton`, mounted globally; wire volume/mute into `sfx.ts` playback only (no logic change).
2. **Sound set** — rewrite the six synthesized cues.
3. **Host console pass** — expandable join/QR panel, centred headers + trash alignment, judge row reordering, timer hiding on reveal/correct, larger answer text, top bar with Day/Night next to Reset board.
4. **QR fix** — encode the absolute `/play/<code>` URL from `window.location.origin`.
5. **OBS overlays** — three new public routes rendering board / queue / combined with transparent backgrounds, subscribing to the same realtime channel via the existing `useSessionRealtime` hook; host popover with copy links.
6. **Editor pass** — header tier restyle, board shell alignment, roundness 0–50 with a typable field, segmented toolbar redesign.
7. **Studio pass** — tiered button colours, utility pills, gear settings entry.
8. **Verify** — typecheck + Playwright pass over studio / editor / host / an OBS route, then reply on each thread as its work lands.

## 5. Technical notes

- No database migration. Team presets and gameplay defaults live in local studio preferences; per-game team names keep using the existing `games.theme` JSON.
- Game mechanics, scoring, buzz ordering, session phases, and all realtime listeners stay untouched; timer changes are render-side only (hide the display when phase is `reveal` or the tile is judged), not timer state changes.
- OBS routes are read-only views: public route (outside `_authenticated`), anon-key reads through existing public server functions, `background: transparent`, no interaction.
- SFX volume/mute is applied at the gain node in `sfx.ts` — no changes to when sounds fire.
