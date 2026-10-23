# Starfall Lanes — Seeded bot balance report

Generated: 2026-10-23T13:14:44.414Z · Seed: `816010` · Games per configuration: **12** · Profile: **baseline**

Total completed: **12** · In-process production rules, test-only accelerated timers.

> **Not human balance evidence.** AI choices, simulated timing and small samples may distort results. A threshold reached below 60%, above 95%, or first/house seat exceeding 1.5× equal share is flagged.

| Mode | Players | Games | Target hit | Mean rounds | Median | Winner Influence | First seat win | Failed orders | Avg toll Credits | Flags |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| advanced | 8 | 12 | 83.33% | 9.5 | 9 | 16.3333 | 0% | 11.37% | 17 | — |

## Influence source mix (mean per player)

| Mode | Players | Stations | Long lanes | Trade routes | Missions | Trophies | Bonuses | Baron cards | Penalty |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| advanced | 8 | 3.8958 | 0.7292 | 0.2813 | 4.4792 | 0.4583 | 0.2396 | 0.0208 | -0.7813 |

## Win rate by starting seat

| Mode | Players | Winning shares by seat (1–N) |
|---|---:|---|
| advanced | 8 | 25.0% · 16.7% · 0.0% · 8.3% · 0.0% · 8.3% · 25.0% · 16.7% |

## Advanced — win rate per house leader

| Players | kaia | zibzob | oolu | vex | pyrrhus | nim | skrill | bramble |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 8 | 16.7% (n=12) | 8.3% (n=12) | 8.3% (n=12) | 16.7% (n=12) | 8.3% (n=12) | 0.0% (n=12) | 33.3% (n=12) | 8.3% (n=12) |

## Interpretation

Seat and house rates are per eligible seat/house appearance, split proportionally for tied winners. Trophies and other sources are final-score contributions, **not** per-round flows. “Reached target” means final winning Influence equals or exceeds the mode target.

## Simulation methodology

Each configuration runs a single seeded VM with the production game server and its existing AI. Bot starting houses rotate across seats; the rules still use the actual map generator, drafts, events and command-resolution order. Only artificial wait timers are skipped. The production server never reads simulator tuning values unless explicitly launched with a test-only environment flag; normal `npm start` is unaffected. No real player inputs, real WebSockets or device interaction is measured.
