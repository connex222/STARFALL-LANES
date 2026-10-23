# STARFALL LANES

A server-authoritative science-fiction strategy game for **2–8 players**. The TV or PC displays the shared galaxy; each player privately plans on their phone. Includes Quick, Standard and Advanced modes, house portraits, music, a How to Play guide and lore.

## Start a game on your home Wi-Fi

1. Install Node.js 18 or later.
2. Run `npm install` in the project folder (requires internet the first time).
3. Run `npm start` and read the printed local address.
4. Open that address on the TV or host PC. Players join using the displayed QR code or room code on their phones, while connected to the same network.
5. Choose houses and a game mode, then start.

## Online hosting

Push the project to GitHub and connect it to a **Render Web Service**. Build command: `npm install --omit=dev`; start command: `npm start`. Use Render's assigned URL from a TV and phones. The game's static HTML, sound and image assets require no CDNs.

## Phase 2: optional Playtest Mode

The host opens the **⋯ Host menu** on their phone in the lobby and ticks **Playtest log** before starting. Logging is off by default. A TV message confirms it is on. The server collects actual time per round and phase, executed commands and failures, trade proposals and acceptance, Strikes, Influence per round and the final score breakdown. On the **Game Over** screen select **Download playtest log (JSON)** and **Download playtest summary** on the TV. Backup download buttons also appear on the host's phone.

This keeps the data only in the game server's memory until the game room is cleared; no account, browser analytics or external upload is used. Files are downloaded directly by the browser. Display names appear in the export; get consent before sharing playtest logs.

Print [`docs/PLAYTEST-SHEET.md`](docs/PLAYTEST-SHEET.md) to record things code cannot measure: rules questions, boredom and moments of fun. The [`docs/playtest/`](docs/playtest/) folder contains an example **four-bot** report, whose sped-up durations are **not** meaningful human play timings.

## Developer tasks

- Editable interfaces are in `src/`. Always run `npm run build` after changing them.
- `npm test` rebuilds and runs the complete offline regression suite. `npm run test:sim` performs 6,300 deterministic in-process bot games (300 per mode × player count); `npm run test:sim:smoke` runs the original nine-game smoke test; `npm run test:balance` runs the earlier 27-game diagnostic cohort. `npm run test:legacy-sim` uses `ws` and needs `npm install`.
- `npm run test:live` runs the Phase 7 real-WebSocket acceptance harness after `npm install`: one TV, eight phones, reconnect, device takeover, bot handover and a complete Quick game. The harness cannot run without the actual `ws` dependency. Follow `docs/LIVE-CHECKLIST.md` for physical-device acceptance.
- `python3 tools/audit_portraits.py` checks all 72 WebP portraits.
- Regenerate portrait images with `python3 tools/convert_portraits.py` (requires Pillow and local PNG originals in `art-source/avatars/`).
- Recompose the 48 kHz stereo theme using `python3 tools/compose_starfall_music.py` (requires NumPy, SciPy and ffmpeg).
- `build.py` can rebuild offline from the checked-in generated page's embedded font and QR data when the optional build packages are unavailable. No external assets are fetched by game pages.

## Artwork sources and release size

The 72 web-served portraits are in `public/art/avatars/` as 256px WebP images. Their original 512px PNG files are archived in `art-source/avatars/`, which is excluded from Git using `.gitignore`. Keep a private copy of the originals; including them in Git makes the repository larger but preserves the editable master assets.

## Phase 6 — Balance measurement and tuning

Quick long lanes now score **2 Influence** each (Standard/Advanced still 1); Standard targets **16 Influence**, Quick 10 and Advanced 15. These values have been checked across 300 bot matches per player-count/mode configuration. Read [the before/after comparison](docs/balance/comparison.md) and [the full current balance statistics](docs/balance/latest.md). This does not replace human playtesting.

`npm run test:sim -- --mode quick --players 6 --games 300 --seed 61803` runs one repeatable cohort and writes its own report, without overwriting the published full balance dataset.

## History

Earlier change notes are in [`docs/changelog/`](docs/changelog/). This Phase 1 cleanup fixes the broken portrait paths and test suite; it does **not** change gameplay rules. Real multiplayer testing and balance investigation remain outstanding.

## Review Phase 4 — Orders and faster reveal
Quick games offer 3 regular orders; Standard and Advanced offer 2. Tap **Backup** on your phone to select an optional fallback which resolves only if a regular order fails. The host can select **Normal** or **Fast** Reveal in the Host menu. Run `npm test` for offline checks and `node tests/smoke-phase4-8bots.js` for seeded bot smoke matches. See [Phase 4 details](docs/PHASE-4-AGENCY.md).

## Review Phase 5 — Easier Standard, fairer Advanced and clear Strikes

Standard and Quick show three era chapters without stopping for upgrade choices. Advanced retains the upgrade draft but caps unfinished Mission penalties at one Influence total. Strikes cost one Fleet to the defeated side; captured sectors receive the attacking Fleets except for a source garrison, if possible. The TV battle panel shows dice, modifiers and fleet outcomes. A **Teach Standard in 60 seconds** script is available under **How to Play**. Previous unverified duration estimates have been removed. Details: [Phase 5 changes](docs/PHASE-5-MODES-AND-COMBAT.md).

## Review Phases 8–10 — Shared engine, reconnection and release QA

Phase 8 extracts the generic room, WebSocket and static HTTP transport into [`lib/room-engine.js`](lib/room-engine.js), and the shared TV/phone connection implementation into [`src/connection.js`](src/connection.js). The game rules and authoritative state still live in `server.js`. See [ENGINE.md](docs/ENGINE.md).

Phases 9 and 10 add reconnect reliability tests and a repeatable release gate; they were not defined in the original independent review. Run `npm run test:release` for the offline build/asset gate and `npm run test:live` separately on a computer that has installed the `ws` dependency. See [connection QA](docs/PHASE-9-CONNECTION-RELIABILITY.md) and [release checklist](docs/PHASE-10-RELEASE-READINESS.md). No gameplay balance values were changed.
