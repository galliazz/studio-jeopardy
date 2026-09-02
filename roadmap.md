# Roadmap

## Done
- Host Console restructure: app bar (status, progress, centred score chips, account menu),
  phase-aware left column (join card, roster, OBS links, soundboard, tools),
  single live control panel, manual score correction, keyboard shortcuts + reference.

## In progress
- Public OBS mirror overlays
  - [ ] `games.overlay_token` + public token-scoped read + regenerate
  - [ ] `/overlay/board/$token`, `/overlay/queue/$token`, `/overlay/combined/$token`
        (1920x1080 fixed canvas, transparent, realtime only, no polling)
  - [ ] Host "OBS overlay links" panel: real URLs, copy + open, regenerate behind confirm,
        explicit OBS Browser Source settings
