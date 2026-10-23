# Starfall Lanes — Batch 3 integration and Batch 4 preparation

## Integrated: Batch 3 (Smug)
- Eight independently generated realistic Smug portraits: Kaia Rho, Zib-Zob, Oolu, Vex Halloran, Pyrrhus, Nim Okafor, Skrill and Bramble.
- Prepared 24 era-specific game files, three per leader, each with a distinct visual treatment. All three variants of a leader reuse the same Smug expression painting.
- The TV, phone and result screens already use `avatarHTML` with era/mood, so no game-rules change was required.
- Existing fallback retains current era Neutral portrait if a specific mood image fails to load.
- Source inputs are recorded in `tools/integrate_smug_batch.py`. The compiled 512×512 PNG assets are stored in `public/art/avatars/` and do not require the source input images at runtime.

## Next: Batch 4 (Furious)
- Eight independently generated Furious facial portraits are required, one for each established leader. Use matching character identity, 1:1 framing and no embedded wording.
- Produce 24 era-specific asset filenames: `<id>_<frontier|expansion|ascension>_furious.png`.
- Avoid marketing collage images that invent characters or house names; such images are not usable game assets.

## Verification
- `node test-era-portraits.js` checks PNG dimensions and runtime portrait filename resolution.
- `python3 tools/audit_portraits.py` lists missing expressions.
- `npm run test:offline` checks gameplay and interface regressions.
- Live device and multiplayer visual QA remains outstanding.
