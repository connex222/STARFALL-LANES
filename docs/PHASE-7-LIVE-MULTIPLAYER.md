# Phase 7 — Real multiplayer acceptance harness

## What was built

`tests/live-game.js` starts the normal `server.js` using the installed `ws` package and a random local TCP port. It uses actual WebSocket connections, unlike the offline VM test loader. It joins one TV plus eight unique phone players; verifies host settings and Quick mode; tests malformed JSON, 40 KB oversized payload rejection and HTTP health; completes setup with phone messages; disconnects/reconnects a phone during Plan, replaces an existing seat from a second device, hands a dropped seat to a server bot and returns it to phone control; then uses bot and scripted orders to complete a Quick game and checks eight score rows and a playtest report.

The harness runs with `FAST=1` on its own child process; the production server's timing and rules remain unchanged. It kills the child and closes all sockets at the end. The scripted players are not substitutes for real people or physical device tests.

## Run on PC (Node.js 22 recommended)

```bash
npm install
npm test
npm run test:live
```

Expected final message: `PHASE 7 LIVE MULTIPLAYER: PASS`. On any failure the test exits with code 1 and prints an explanation. If `ws` is not installed, it exits with code 2 and asks for `npm install`.

## Automated CI

`.github/workflows/multiplayer-acceptance.yml` runs offline tests and this real-socket harness on push to main or on pull requests. Because the source repository has no lockfile, this workflow currently runs `npm install` rather than `npm ci`; add and commit a valid `package-lock.json` before switching to `npm ci`.

## Outstanding external acceptance

See `docs/LIVE-CHECKLIST.md`. Do not treat script-based acceptance as verification of TV speaker sound, Safari autoplay, Android tap targets, cross-home latency, or human engagement. The performance/balance conclusions are still based on bots.
