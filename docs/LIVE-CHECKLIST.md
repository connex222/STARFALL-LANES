# STARFALL LANES — Human multiplayer acceptance checklist

Use after `npm test` and `npm run test:live` both pass. Leave the rules unchanged until real groups have played. Record defects, devices, browsers and timestamps against the opt-in Playtest Log.

## Before the session

- [ ] GitHub Actions is green at the commit deployed to Render. Verify the `/health` endpoint and commit deployment status.
- [ ] Open the TV URL at a safe viewing distance, including a TV with overscan; verify map, score and captions are not clipped.
- [ ] Host from a phone; confirm the QR code, room code, How to Play and 60-second rules explanation are discoverable.
- [ ] Test independent Sound and Music opt-in. On **physical TV speakers**, can you hear the victory, storm, fleet and background music cues without distortion? Verify mute and quiet-room behaviour.
- [ ] Check **Safari on iPhone**, including requiring a first user tap before playing music, speaker vs mute switch, portrait orientation and a refreshed tab.
- [ ] Check **Chrome on Android**, portrait and smaller displays; confirm buttons can be tapped with one thumb and do not overlap.
- [ ] Check **Chrome/Edge on PC** with keyboard-only navigation, focus states and readable map alternatives.

## Live sessions

- [ ] Complete games in Standard mode with **2, 4, and 6–8 players** (not just bots). Record the chosen mode, player count and devices.
- [ ] Try phones on the **same home Wi-Fi** as the TV, then at least one phone via **mobile data/4G** using the publicly hosted Render URL.
- [ ] From each phone, select and submit an order; confirm it appears once and resolves correctly on the TV.
- [ ] Deliberately refresh a phone during Plan. Confirm the seat, resources and queued orders are restored.
- [ ] Open the same player link on a second device. Verify the old session receives a replacement notice and does not act.
- [ ] Turn a disconnected player into a bot from Host controls, then return that seat to a phone.
- [ ] Enable Playtest Log and confirm the game ends with downloadable JSON and Markdown files that contain round timings, failures and final scores.
- [ ] Complete one game with eight phones using two to three homes and record lag and dropped connections.
- [ ] Test a **Render cold start** by leaving the service idle, then opening TV and joining phones; note waiting time and reconnect behaviour.
- [ ] Compare actual duration to the game's Quick/Standard time claims; correct any inaccurate claims.

## Observe and record

- [ ] After **every round**, note confusion, long waits, laughter, rules questions and whether turns felt meaningful.
- [ ] Count failed commands, review how often Backup is useful, and note surprise tolls or unclear Influence gains.
- [ ] Confirm winning score and all breakdown rows agree at Game Over.
- [ ] Log accessibility barriers (text size, sound-only information, colour dependency, one-thumb use and motion sensitivity).

**Release gate:** No automatic test replaces human audio perception, Safari/Android behaviour, real home networks or enjoyment. Do not describe the game as human-playtested until the above is completed.
