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

## Review Phase 5 — Modes and Combat

### Players
- **Standard and Quick:** era chapter transitions remain, but there are no upgrade drafts. Research only offers Missions. Standard can be explained with the new three-sentence How to Play host script.
- **Advanced:** still includes upgrades, events and house perks; unfinished Missions can now cost only **1 Influence in total** at game end.
- **Strike:** dice and defence modifiers still decide the winner (defender wins ties). The losing side loses **1 Fleet**. A successful attacker occupies the target and normally leaves **1 Fleet** at its origin. The TV shows scores, dice and the resulting Fleet movement and losses.
- Unverified play-time promises have been removed from How to Play until people have played real matches.

### Host
- No new setting is needed. The game continues to support 2–8 players, Quick three-order games, Backup orders, normal/fast reveal, optional Playtest Log and accessible phone/TV guides.

### Phase 5 TUNING defaults

| Key | Default |
|---|---|
| `maxMissionPenalty` | `1` |
| `strikeLoserLoss` | `1` |
| `captureMove` | `'allButOne'` |
| `captureSourceReserve` | `1` |

All existing Phase 3–4 tuning defaults stay as listed above.

### Files changed
`server.js`, `src/phone.html`, `src/tv.html`, `public/how-to-play.html`, regenerated `public/phone.html` and `public/tv.html`, `package.json`, `tests/test-phase5-rules.js`, `docs/PHASE-5-MODES-AND-COMBAT.md`, `README.md` and this `CHANGES.md`.

### Verification
`npm test` passed (full offline suite including 12 new Phase 5 tests). Seeded Quick/Standard/Advanced bot smoke matches completed. A passing offline test does not replace human multiplayer, accessible device, performance, or sound acceptance testing.

## Review Phase 6 — Evidence-led balance tuning

### For players
- **Quick:** a claimed hyperlane 3+ segments long now contributes **2 Influence** (was 1). The extra point makes route building more central to Quick games, especially with 4–7 houses.
- **Standard:** the target is now **16 Influence** (was 15) to reduce prematurely reached targets. Quick stays at 10; Advanced stays at 15. The game still ends at its round limit if nobody reaches the target.
- Scoring and mode target are server-authoritative, with the same live values shown on TV and phone. No other mechanics, command costs, phases or modes changed in this phase.

### For the host
- `npm run test:sim` runs the seedable, accelerated, production-rules bot simulator with **300 matches per mode × 2–8 players** (6,300 games), then exports `docs/balance/latest.json` and `.md`.
- `npm run test:sim -- --mode quick --players 6 --games 300 --seed 61803` runs one configuration. Filtered runs save to `docs/balance/adhoc-*`, protecting the published `latest` report.
- `npm run test:balance:merge` reproduces the before/after release comparison from the saved per-group samples. The current results are in `docs/balance/comparison.md`.

### New server.js TUNING defaults

| Name | Default | Purpose |
|---|---:|---|
| `quickLongLaneInfluence` | 2 | Influence per qualifying long lane in Quick only |
| `quickTarget` | 10 | Quick victory threshold, unchanged |
| `standardTarget` | 16 | Standard victory threshold, raised from 15 |
| `advancedTarget` | 15 | Advanced victory threshold, unchanged |
| `balanceGamesPerConfiguration` | 300 | Default simulation batch size |
| `balanceTargetMinPct` | 60 | Below this is a target-hit warning |
| `balanceTargetMaxPct` | 95 | Above this is a target-hit warning |
| `balanceFairnessMultiplier` | 1.5 | Maximum accepted seat/house advantage vs even share |
| `balanceMinHouseAppearances` | 20 | Avoid warning on tiny house samples |

`longLaneInfluence=1` continues to apply to Standard and Advanced. Every previous tuning value is unchanged. An isolated test environment can apply alternative tuning profiles; production servers never read them unless deliberately launched with a simulation-only environment flag.

### Verification and limits
- **6,300** baseline simulations, then **4,200** additional Quick/Standard tests. Advanced's original 2,100 matches remain valid because its rules and tuning were unchanged.
- The baseline had **6 of 21** configurations outside the review's 60–95% hit-rate band. The final release has **0 of 21** warnings at 300 matches per configuration, and no flagged first-seat or house imbalance under the specified threshold.
- A seeded replay test confirms reproducibility; per-game final scores are checked against each end-game breakdown. The whole offline test suite passes.
- Bot data **cannot** establish human enjoyment, perceived waiting, teachability or accessibility. Continue Phase 2 Playtest Mode with human groups before treating balance as final.

Full methodology, raw groups, win-rate tables, and before/after evidence: [`docs/balance/comparison.md`](docs/balance/comparison.md), [`docs/balance/latest.md`](docs/balance/latest.md), [`docs/PHASE-6-BALANCE.md`](docs/PHASE-6-BALANCE.md).

## Phase 7 — WebSocket acceptance harness

- Added real-`ws` TV and eight-phone lifecycle test: joins, setup, full Quick match, reconnect, device takeover, bot handoff/return and packet rejection.
- Added GitHub Actions multiplayer workflow and human device/live checklist.
- No changes to gameplay TUNING or server-authoritative rules.

## Phase 8 — Shared TV-and-phone foundation

- Shared server room/TV/phone handshake, reconnection, host repair, HTTP and WebSocket transport in `lib/room-engine.js`.
- Shared source WebSocket adapter in `src/connection.js`, inlined during build without external browser dependencies.
- Production game rules, authorisation, scoring and bot strategy remain server-authoritative in `server.js`. No gameplay values changed.

## Phase 9 — Reliability hardening (post-review scope)

- Stopped/replaced phones no longer reconnect through stale queued timers.
- Mock transport tests cover room lifecycle, eight seats, same-seat reconnection, device replacement, host repair and HTTP errors.

## Phase 10 — Repeatable release gate (post-review scope)

- New `npm run test:release` rebuilds/runs offline tests, shared engine tests and checks portraits, music, game help and bundle size, writing `docs/release/phase10-audit.json`.
- Live eight-phone WebSocket test remains a separate mandatory gate (`npm run test:live`). Physical acceptance and real-player playtests remain outstanding.

No TUNING values were changed in these phases.
