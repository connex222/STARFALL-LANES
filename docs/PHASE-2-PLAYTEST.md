# Phase 2 — Playtest Mode

**Purpose:** collect evidence about where matches stall, why commands fail and when players become disengaged, before changing rules.

**Host flow:** open ⋯ Host menu in the lobby → enable Playtest log → start game → at Game Over download JSON and Markdown files from TV (or host phone).

The log is optional and **off by default**. Only the host can enable it in the lobby. No existing gameplay or protocol message was removed. All decisions remain server-authoritative.

## JSON schema `starfall.playtest.v1`

- `session`: map, mode, participants (display names, seats, avatars, bots at start), real-time UTC stamps and total elapsed ms. **No tokens or secret connection credentials.**
- `phases[]`: phase name, round, start and elapsed real milliseconds.
- `rounds[]`: elapsed milliseconds and Influence by player before/after each round.
- `commands[]`: every executed order (type, slot, target, success/failed, failure reason and Strike outcome).
- `trades[]`: bank exchanges and proposed/accepted/declined/expired offers.
- `strikes[]`: target, attacker/defender, totals and win result.
- `finalScores[]`: score breakdown returned by the game engine; `summary`: averages, counts, command frequency and per-player failures by round.

The Markdown report includes phase totals, average round duration, failure rate, progression by round, commands, trades, Strikes and final scores. Manual observations should be recorded on `docs/PLAYTEST-SHEET.md`.

## Reproducible acceptance

`npm test` checks access restrictions, off-by-default behaviour, a completed 2-bot game with valid JSON/Markdown, no connection tokens in exports, and both client download routes. `node tools/create_playtest_example.js` creates sample artefacts from a completed 4-bot Quick game. The FAST setting distorts human play timings.

A full live multiplayer acceptance session is still required.
