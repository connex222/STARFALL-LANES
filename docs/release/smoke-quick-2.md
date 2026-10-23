# Starfall Lanes — Seeded bot balance report

Generated: 2026-10-23T13:14:39.644Z · Seed: `816010` · Games per configuration: **12** · Profile: **baseline**

Total completed: **12** · In-process production rules, test-only accelerated timers.

> **Not human balance evidence.** AI choices, simulated timing and small samples may distort results. A threshold reached below 60%, above 95%, or first/house seat exceeding 1.5× equal share is flagged.

| Mode | Players | Games | Target hit | Mean rounds | Median | Winner Influence | First seat win | Failed orders | Avg toll Credits | Flags |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| quick | 2 | 12 | 66.67% | 7.25 | 7.5 | 9.4167 | 58.33% | 1.13% | 0 | — |

## Influence source mix (mean per player)

| Mode | Players | Stations | Long lanes | Trade routes | Missions | Trophies | Bonuses | Baron cards | Penalty |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| quick | 2 | 4.5417 | 0.0833 | 0.25 | 2.5 | 1.0833 | 0 | 0 | -0 |

## Win rate by starting seat

| Mode | Players | Winning shares by seat (1–N) |
|---|---:|---|
| quick | 2 | 41.7% · 58.3% |

## Advanced — win rate per house leader

| Players | kaia | zibzob | oolu | vex | pyrrhus | nim | skrill | bramble |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|

## Interpretation

Seat and house rates are per eligible seat/house appearance, split proportionally for tied winners. Trophies and other sources are final-score contributions, **not** per-round flows. “Reached target” means final winning Influence equals or exceeds the mode target.

## Simulation methodology

Each configuration runs a single seeded VM with the production game server and its existing AI. Bot starting houses rotate across seats; the rules still use the actual map generator, drafts, events and command-resolution order. Only artificial wait timers are skipped. The production server never reads simulator tuning values unless explicitly launched with a test-only environment flag; normal `npm start` is unaffected. No real player inputs, real WebSockets or device interaction is measured.
