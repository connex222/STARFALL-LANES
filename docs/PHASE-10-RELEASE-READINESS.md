# Phase 10 — Release preflight and handover

**This phase was defined for this continuation; the independent review ends at Phase 8.** It adds repeatable checks and documentation, not unapproved balance changes.

## Commands

```bash
npm install
npm test
npm run test:release
npm run test:live
npm start
```

`npm test` rebuilds TV and phone and runs all game/server/offline tests. `npm run test:release` runs that suite plus shared transport tests and the static release audit and writes `docs/release/phase10-audit.json`. `npm run test:live` separately uses the actual `ws` dependency and an eight-phone real-WebSocket game, with disconnect, reconnect and malformed/oversized packet checks. Keep these gates separate so nobody mistakes a green offline run for live validation.

## Assets and host experience

The static audit checks all 72 256px WebP portraits, 10 MP3 headers, both built TV/phone pages, the common WebSocket transport embedded in each, How to Play / Lore links, bundled files and public assets smaller than 15 MiB. It does not grade sound quality, Safari media permission or image artistic consistency.

## Release checklist — humans

- [ ] Install dependencies and run `npm test`, `npm run test:release`, `npm run test:live` successfully.
- [ ] Start a 2-player Standard game on TV + two real phones, complete a game, verify Mission and Influence breakdown totals.
- [ ] Repeat with four phones, then six to eight phones (planned real acceptance session).
- [ ] Refresh a phone during planning, reconnect with the same seat; open another phone using that saved seat and confirm takeover.
- [ ] Unplug Wi-Fi / switch 4G, then rejoin; host transfers a disconnected player to a bot and back.
- [ ] Verify all three eras and Neutral/Smug/Furious portraits on the actual devices.
- [ ] Test music opt-in, TV mute, volume, ducking and SFX on actual TV speakers, Android Chrome and Safari/iPhone.
- [ ] Verify scrolling, one-thumb phone orders, Backup, accessible ▲/▼ sorting and focus labels.
- [ ] Enable Playtest Log; download JSON and summary at game over and review human observation sheet.
- [ ] Re-run the established 6,300-game seedable balance cohort if scoring changes. Bot statistics never establish human fun.
- [ ] Check Render HTTP health, cold start and deployed `main` commit, then run real devices on the hosted address.

Do not declare Phase 10 a production-ready, human-playtested release while any gate above remains outstanding. No GitHub or Render deployment happens by running these commands.
