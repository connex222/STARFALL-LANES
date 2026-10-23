# STARFALL LANES — Phase 10: Better bots and transparent scoring

Date: 22 October 2026

## Delivered

1. **Smarter computer opponents (server only):** bots keep two starting Missions instead of three; select from the deal based on feasibility; prefer starting production hexes near free Trade Stations; choose era upgrades based on their holdings and route investments instead of randomly; and fill their two command slots using existing legal actions while targeting incomplete Missions, stations, Spires, short hyperlanes and the Grand Armada trophy. Trade, income and command costs remain authoritative and unchanged.
2. **Explainable victory:** each finished game's result rows now include an arithmetic breakdown for Trade Stations/Spires, completed Missions, trophies, Cosmic Event bonuses, conditional Baron cards and unfinished Mission penalties. The phone's Results page has expandable **Where the Influence came from** explanations for all houses, and the TV includes a compact summary for the winner. The backend continues using the original Influence calculator; the breakdown is checked against it.
3. **Onboarding:** the How to Play guide explains where to find the new end-of-match scores. Help and Lore remain accessible. The nine bundled prototype MP3 sounds are preserved, with existing opt-in controls; no new professionally mastered audio is claimed.
4. **Evidence:** added six Phase 10 checks, 27-game seeded diagnostic, preserved the original Phase 9 cohort as historical evidence and added an A/B-style *observational* comparison with limits clearly noted.

## Bot score evidence

Two separate 27-game cohorts (nine games per mode), each with 2, 4 and 8 house bots, three times per configuration:

| Mode | Phase 9 bots: reached target | Phase 10 bots: reached target | Mean winning Influence Phase 9 → 10 |
|---|---:|---:|---:|
| Quick (10) | 2/9 | 6/9 | 7.89 → 9.89 |
| Standard (15) | 0/9 | 6/9 | 11.00 → 14.33 |
| Advanced (15) | 1/9 | 1/9 | 11.56 → 13.00 |

The **game victory thresholds remain 10/15/15**. The new bots do not receive extra resources or actions. These are deterministic but separate simulations; changed AI decisions also change subsequent random-number consumption, so they are *not* a controlled paired statistical experiment. They cannot prove human balance. Advanced still needs investigation and human playtesting.

## Quality

- Offline regression suite: Phase 3–10 source/game checks pass, including six new tests; 9 full game simulations in the existing Phase 6 suite pass.
- The 27-game Phase 10 cohort completes and verifies valid scores, non-negative resource inventories and that every new score breakdown exactly matches the original Influence calculation.
- Both editable and bundled TV/phone HTML were updated; JavaScript syntax tests pass.
- An attempted Chromium screenshot pass was blocked by the execution environment's administrator policy; do **not** treat Phase 10 layouts as visually tested in a browser.
- No real multi-device WebSocket acceptance, actual TV audio, or assistive-technology session has been completed.

## Commands

```bash
npm run test:offline
npm run test:phase10:sim
npm run audit:avatars
npm install
npm start
```

`test:offline` uses an in-process WebSocket stand-in; `npm start` needs the real `ws` runtime package.

## Explicitly deferred / unresolved

- **Character artwork:** the eight realistic Frontier/Neutral master portraits remain. The **64 distinct era-outfit and expression portraits are not yet produced**; CSS era/mood badges are visual treatments, not new paintings. See `docs/PHASE-9-CHARACTER-PRODUCTION.md`.
- **Zib-Zob perk:** “shows 4 Upgrades” is inconsistent with three era cards in Design Doc v2. Do not alter the available upgrades until a rules decision is made.
- **Advanced target:** only 1/9 improved bot games reached 15 Influence. Investigate objective distribution and human play before tuning rules.
- **Audio:** nine procedural cues are bundled but not professionally mastered.
- **Network and deployment:** no GitHub push, Render deployment or real 2–8-device acceptance is included in this package.
