# STARFALL LANES — Phases 8, 9 and 10 verification

The independent game review provided specifications through Phase 8 only. For this continuation, Phase 9 is **Connection Reliability** and Phase 10 is **Release Preflight / Handover**. Neither phase invents new scoring or resources. They are technical follow-ups to the Phase 8 extraction.

## Implemented

- **Phase 8:** Reusable `lib/room-engine.js` handles room registry and codes, TV/phone joining, seat reconnection and takeover, lobby management, host repair, bot-seat handover, static media, `/health` and `/info`, bounded WebSocket packets and stale-room cleanup. The server injects its game-specific serializers and authoritative intent handler. `src/connection.js` is used by both clients and inlined at build time. All game decisions, balance tuning and score calculations remain in `server.js`.
- **Phase 9:** Client-side `Conn` now guards against stale WebSocket callbacks, cancels pending timers on `stop()`, and does not reconnect after replacement. Added deterministic transport/HTTP tests, including a deliberate malicious path probe.
- **Phase 10:** Added a repeatable `npm run test:release` command, 72-image and 10-MP3 audit, combined built-pages audit, two human-device checklists, and saved release audit JSON. Updated the existing GitHub Actions multiplayer workflow to perform this preflight before the real-WebSocket harness.

## Verification actually performed

| Test | Result |
|---|---|
| Existing offline suite (`npm test`) | **Passed** |
| New shared-engine and client-connection tests (`npm run test:architecture`) | **8 of 8 passed** |
| Static production audit (`node tests/release-audit.js --report`) | **Passed**, 72 WebP portraits, 10 MP3 files, both controllers, **7.97 MiB** public assets |
| `node --check` on touched/packaged JS | **Passed** |
| Seeded Quick 2-player games, seed 816010 | 12 after and 12 before, **identical metrics** |
| Seeded Standard 4-player games, same seed | 12 after and 12 before, **identical metrics** |
| Seeded Advanced 8-player games, same seed | 12 after and 12 before, **identical metrics** |
| Additional Quick 8-player smoke | 12 simulated games completed |
| `npm run test:live` | **Not run** — `ws` unavailable; `npm install` failed with DNS error `EAI_AGAIN` |
| Live Render site and physical TV/phones | **Not tested** |
| Human multiplayer experience | **Not tested** |

The 12-game Quick/Standard/Advanced comparisons are **regression checks**, not a new balance study; the earlier 300-per-configuration balance reports remain authoritative for bot-only results. In these smoke samples Standard/4 reached the target in all 12 games, which the small-sample balance checker flagged; the **same result occurs in the untouched Phase 7 build**. Do not infer an actual balance regression from this.

## How to reproduce on a PC

```bash
npm install
npm run test:release
npm run test:live
npm start
```

For a 6–8-player November rehearsal, follow `docs/LIVE-CHECKLIST.md` and `docs/PHASE-10-RELEASE-READINESS.md`. The server remains authoritative, TV is public-only, and phones receive private state.

## Deployment

No GitHub or Render push has been performed for these phases. If deploying manually, use the smaller deployable ZIP, commit its contents to `main` and let Render build with `npm install --omit=dev` and start with `npm start`. Verify `/health` and complete the real-client checklist after rollout.
