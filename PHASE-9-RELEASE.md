# STARFALL LANES — Phase 9: Galaxy Intel, mobile sound controls and balance evidence

Date: 22 October 2026

## Shipped

- **Galaxy Intel** on the phone: a persistent in-game shortcut to a complete, screen-reader-readable public map register. All 37/61 sectors are enumerated, including sector type, named station, house ownership and shape badge, building, fleet count, active Solar Storm and next-round warning. Hyperlanes are available in an expandable register with endpoints, segment counts and owner.
- **Filters:** all, own, rival, unclaimed and storm/forecast. Public information only. It is possible to inspect this register during setup, era, Plan and other game phases without issuing a command or leaving the game.
- **Phone audio control:** volume slider (0–100%, retained locally), bounded two-voice playback pools per sound cue, overlapping event support, protection against rapid duplicate cues, and automatically stopping cues while the page is hidden. Phone sound still starts **off** and is only enabled through a deliberate tap.
- **Responsive UI:** Galaxy Intel and sound settings work at 320, 390, 768 and 1280 pixels, with readable 44+ pixel controls.
- **Portrait production discipline:** 8 original cinematic master portraits are preserved; exact filename matrix and audit for 72 possible era × mood variations, explicitly reporting uncommissioned missing art rather than mislabelling colour treatments as fully illustrated characters.
- **Game balance diagnostic:** seeded 27-game bot cohort in Quick, Standard and Advanced at 2, 4 and 8 players. This is a research signal, not a human-play balance decision. The server rules are unchanged.

## Quality results

- All previous offline checks pass.
- Phase 9 new static checks pass.
- In-process 27-game seeded diagnostic finishes with no negative inventories or invalid end scores.
- Isolated Chromium HTML tests passed at 320/390/768/1280 widths, including filtering, complete register, hyperlanes and no observed horizontal overflow or JavaScript exceptions. These use simulated public game state and do **not** exercise real WebSocket multiplayer.
- Existing nine MP3 assets are preserved.

## Observed game balance (bot-only; diagnostic)

| Mode | Games reaching win threshold | Mean winning Influence |
|---|---:|---:|
| Quick (10) | 2 / 9 | 7.89 |
| Standard (15) | 0 / 9 | 11.00 |
| Advanced (15) | 1 / 9 | 11.56 |

**No scoring change made.** Bot behaviour can substantially underestimate human play. Collect human-session data and assess bot strategy before revising the win thresholds.

## Still outstanding

- 64 individually illustrated era/expression variants of the 8 master portraits; the existing CSS era and status effects are not replacement outfit or expression paintings.
- Zib-Zob four-upgrade perk design discrepancy; requires explicit design decision before mechanics are changed.
- Real 2–8 device Wi-Fi/Render, TV/PC/phone acceptance and physical speakers/Bluetooth testing.
- Real screen reader playtesting with VoiceOver and TalkBack, and a manual WCAG 2.2 audit.
- Professionally mastered sound effects (existing nine assets are procedural cues).
- GitHub upload/deployment is not part of this Phase 9 package.
