# STARFALL LANES — Review Phase 4 Changes

## For players
- **Backup order:** each round, optionally queue one fallback action. It triggers only when your regular action fails, in the same command position, and is used at most once. It costs the normal resources only when executed. Failed-order compensation (+1 Credit) is only awarded when no backup succeeds.
- **Quick mode:** queue **three** regular orders instead of two. Standard and Advanced still have two.
- **More responsive reveal:** independent actions can share a TV animation beat, while the server still determines outcomes in the same authoritative order. Strikes remain last.
- All existing route tolls, route scores, Missions, sound controls, Playtest Mode, phone accessibility controls and reconnection remain in place.

## For the host
- In the phone **Host menu**, select **Normal** (600 ms per command, 1,500 ms per Strike) or **Fast** (250 ms / 700 ms). Only the host can change it. The TV shows Reveal · Fast when applicable.
- The optional Playtest log captures primary and Backup attempts separately. A successful backup is not an extra regular action.

## Tunable values in `server.js` (`TUNING`)

| Key | Default | Meaning |
|---|---:|---|
| `tollPerLane` | 1 | Credit toll per rival lane |
| `longLaneMin` | 3 | Minimum lane segment length for scoring |
| `longLaneInfluence` | 1 | Influence per qualifying lane |
| `tradeRouteInfluence` | 1 | Influence per connected station pair |
| `extraStations` | 2 | Station count: max(6, players + extraStations) |
| `quickCommands` | 3 | Quick mode order slots |
| `regularCommands` | 2 | Standard / Advanced order slots |
| `revealCommandMs` | 600 | Normal command animation pause |
| `revealStrikeMs` | 1500 | Normal Strike pause |
| `revealFastCommandMs` | 250 | Fast command animation pause |
| `revealFastStrikeMs` | 700 | Fast Strike pause |

## Files changed
`server.js`, `src/phone.html`, `src/tv.html`, `public/how-to-play.html`, `package.json`, `tests/test-phase4-agency.js`, `tests/smoke-phase4-8bots.js`, `docs/PHASE-4-AGENCY.md`, `README.md`, generated `public/phone.html` and `public/tv.html`.

## Verification / limitations
`npm test` passed, including **11 new Phase 4 tests** and the existing suites. Five seeded offline bot matches completed at 2/4/8 Quick, 4 Standard and 8 Advanced players. `node --check` passed for all edited JS and extracted client scripts. Public assets retain **72 WebP portraits** and remain below 15 MB. This is **not** human multiplayer, real-browser, performance or device-audio acceptance. GitHub/Render remain unchanged until separately updated.
