# Phase 9 — Connection reliability and compatibility QA

**This phase was defined for this continuation; the independent review ends at Phase 8.** No resource costs, scoring values or game modes have been changed.

- Guarded TV/phone connection retry with a generation counter so stale callbacks from a replaced socket cannot reopen the old controller.
- `stop()` cancels any queued retry and heartbeat interval. `restart()` opens exactly one fresh socket.
- Incoming malformed JSON and arrays are ignored by the shared client adapter.
- Added `tests/test-phase9-connection.js` to simulate disconnects, replacement, reconnect, malformed messages and timer cleanup in a deterministic local test.
- Added `tests/test-phase8-engine.js` for room ownership, host repair, eight-seat limit, private snapshots, static HTTP routing and unsafe path errors.

**Pending:** Real WebSocket acceptance (`npm run test:live`) on a machine with `npm install` completed; Safari/iPhone and Android Chrome reconnection and device listening in a physical playtest.
