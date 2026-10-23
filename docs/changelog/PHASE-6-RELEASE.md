# STARFALL LANES — Phase 6 handoff

## Scope

Gameplay-rule reconciliation and network resilience, continuing the Phase 5 cinematic/audio code and Phase 4 phone controller. No external packages, production game modes, avatar identities, existing client art or sound assets were removed.

## Verified fixes

1. Era upgrades awarded sequentially in increasing Influence order (last place first); deterministic tie handling and explicit 10-second turn timeout.
2. Research restricted to upgrade types actually left unpicked across era drafts.
3. Supply Drop resource selected on the phone during Plan, with low-stock fallback for omitted choices.
4. Supernova doubles the catch-up Credit along with all other income.
5. Trade acceptance enforces offer expiry even between periodic cleanup ticks.
6. WebSocket packet size capped at 32 KiB; malformed message shape, URL decoding errors and static-path traversal handled.
7. Draft rank IDs checked against server pool and duplicate IDs removed.

## Reproducible tests

```sh
npm run test:ui
npm run test:rules
npm run test:phase6
```

The Phase 6 offline test suite uses a seeded, in-memory test-loader stand-in for `ws`; it **does not** exercise real WebSocket networking. Test coverage includes representative maps, income and influence, strikes, Research and Supply Drop, trade expiration, reconnection credentials and attempted URL traversal. The separate AI simulation exercises 9 full games across Quick, Standard and Advanced with 2, 4 and 8 bot houses.

## Still required before release

- Install dependencies and run `npm test` with the real `ws` implementation in a network-enabled environment.
- Test physical TV and phone reconnections, host changes, idle Render wake-ups, browser audio and disconnections.
- Resolve the Zib-Zob “shows 4 Upgrades” perk ambiguity in Design Doc v2.
- Confirm the original design document’s precise scoring edge cases with a manual rules review.
- Create remaining Expansion/Ascension avatar outfit and expression art.

## Deployment

Source and bundled runtime pages are included. Upload to GitHub, deploy to Render separately, and verify network test logs before using it at a game night.
