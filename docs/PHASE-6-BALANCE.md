# Starfall Lanes — Phase 6 Bot Balance QA

## Result

300 seeded bot games were completed for each of **Quick, Standard and Advanced** at **2, 3, 4, 5, 6, 7 and 8 players** (6,300 games per 21-configuration set). An initial 6,300-game baseline was measured. Quick long-lane Influence then rose from **1 to 2**, and Standard target Influence rose from **15 to 16**. We reran every Quick and Standard configuration (4,200 new matches) and reused the unchanged Advanced mode's 2,100 matches. **0/21** final configurations triggered the review's 60–95% target-hit or 1.5× fairness alert, compared with **6/21** beforehand.

The review wanted per-seat and Advanced per-house win rates, player counts, targets, rounds, Influence sources, failure rates and Credit tolls. All metrics are in [`balance/latest.json`](balance/latest.json) and [`balance/latest.md`](balance/latest.md). The side-by-side tuning analysis is in [`balance/comparison.md`](balance/comparison.md).

## Run on your computer

From the project folder:

```bash
npm install
npm test
npm run test:sim
```

This writes a fresh `docs/balance/latest.json` and `latest.md` using the current server's tuning defaults. You can run a focused and reproducible sample:

```bash
npm run test:sim -- --mode advanced --players 8 --games 300 --seed 61803
```

The `--games`, `--seed`, `--mode`, `--players`, `--profile` and `--output` arguments are supported. Filtered runs write an `adhoc-` report instead of overwriting the complete results. Use `--profile beforeTuning` to rerun the original values within the isolated simulator; only simulation processes can read this profile. Default batch size and alert thresholds are collected in the `TUNING` object at the top of `server.js`.

## How it works

The test-only loader uses production game rules and bot decision-making inside a seeded isolated JavaScript VM. It skips **visual and artificial phase-wait timers only**. It never supplies free resources, skips a command's cost, bypasses a rule or fakes a victory. Seat and house samples are rotated; split winners receive fractional shares. The simulator checks that each final Influence equals the sum of all scoring components minus penalties. The live server, its WebSocket protocol and the game screens use their normal timing and rules.

The results do not measure the time real people spend planning or discussing rules. Advanced house data partly measures **AI strategy** as well as perk strength. The 60–95% band is a deliberately chosen acceptance filter, not a scientifically established ideal game duration. Differences of a few percentage points may be random even in 300 games.

## After this phase

Play with real people at 2, 4 and 6–8 seats, using the optional in-game Playtest Log and `docs/PLAYTEST-SHEET.md`. Monitor rule explanations, round times, failed commands, emotion and replay motivation. Balance tuning should respond to those observations before new visual or audio work.
