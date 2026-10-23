# Review Phase 5 — Simpler Standard, fairer Advanced, clearer combat

## What players will notice

- **Quick and Standard** retain the Frontier, Expansion and Ascension chapters, but there is no era-upgrade selection and no way to buy an unchosen Era Upgrade with Research. Research continues to offer secret Missions. This removes a pause and a decision layer from the most approachable modes.
- **Advanced** keeps all of its era upgrades, house perks and Cosmic Events. At game end, unfinished Missions cost **at most 1 Influence in total**, however many remain open.
- **Strikes** still compare Fleet strength, a 1–6 die and defensive bonuses (defenders win ties). The **losing side now loses one Fleet**. Capturing attackers move all but one Fleet into the conquered sector when possible, leaving one defending their source. When only one attacks, it moves into the captured sector. Surviving defenders retreat to an adjacent friendly sector; if none exists, they cannot remain in the conquered sector. Captured Spires still downgrade to Outposts.
- The TV battle readout now displays Fleet counts, rolled dice, bonuses, which side lost a Fleet, and how many Fleets entered the captured sector.
- An accessible **“Teach Standard in 60 seconds”** host script is included in How to Play. Previously advertised match-duration estimates have been withdrawn pending actual human timing data; eight-round and twelve-round lengths remain unchanged.

## Values in `server.js` → `TUNING`

| Key | Default | Meaning |
|---|---|---|
| `maxMissionPenalty` | `1` | Maximum total Advanced-mode penalty for unfinished Missions |
| `strikeLoserLoss` | `1` | Fleets lost by losing side of a Strike |
| `captureMove` | `'allButOne'` | Capture policy for attacking Fleets |
| `captureSourceReserve` | `1` | Source garrison size when 2+ attackers are available |

Existing Phase 3 tolls, route scoring, station scaling, Phase 4 backup orders, Quick three-order mode and fast reveals are unchanged. The server is authoritative; no client may override combat or Mission penalties.

## Checks run

Run:

```sh
npm install
npm test
node tests/smoke-phase4-8bots.js
```

The Phase 5 tests cover Quick and Standard restrictions (including crafted illegal era picks and purchased upgrades), Advanced choices, final penalty cap and score reconciliation, attacker/defender combat outcomes, Fleet movement, shared UI wording and TUNING defaults. The full offline regression suite and seeded bot smoke tests also ran successfully.

**Not verified:** human teaching time, game duration in real homes, or multiplayer and audio on actual devices. Bot results cannot establish that combat changes are balanced. Large-scale seeded balance statistics are planned for Phase 6, with physical multiplayer checks later.
